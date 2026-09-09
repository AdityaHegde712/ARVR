package com.arvr.app.ar

import android.content.Context
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateCentroid
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateRotation
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import com.arvr.app.model.FurnitureModel
import com.arvr.app.model.ModelRepository
import com.google.ar.core.Anchor
import com.google.ar.core.Config
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.InstantPlacementPoint
import com.google.ar.core.Plane
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.math.Rotation
import io.github.sceneview.math.Scale
import io.github.sceneview.rememberEngine
import io.github.sceneview.rememberMaterialLoader
import io.github.sceneview.rememberModelInstance
import io.github.sceneview.rememberModelLoader
import io.github.sceneview.ar.rememberARCameraStream
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.tensorflow.lite.Interpreter
import java.nio.ByteBuffer

/**
 * One placed furniture item. [PlacementController] (test-pinned, imperative) remains
 * the state-of-record; instances of this class are the Compose-observable render
 * handles it hands back through its nodeFactory.
 */
class PlacedItem(
    val model: FurnitureModel,
    anchor: Anchor,
    val id: String = java.util.UUID.randomUUID().toString(),
) {
    var anchor: Anchor by mutableStateOf(anchor)

    /** Absolute rendered size in meters (starts at the model's default). */
    var scale: Float by mutableStateOf(model.defaultScale)

    /** Yaw in degrees (starts at the model's default). */
    var yawDegrees: Float by mutableStateOf(model.defaultYawDegrees)
}

/**
 * Owns everything that lives for the duration of one AR experience: ARCore session
 * hooks, placement state, and the depth pipeline (API + ML fallback).
 */
class ArCoordinator(private val appContext: Context) {

    val repository = ModelRepository(appContext)

    /** Compose-observable snapshot state. */
    val placements = mutableStateListOf<PlacedItem>()
    var session: Session? by mutableStateOf(null)
        private set
    var depthManager: DepthManager? by mutableStateOf(null)
        private set
    var depthMode: DepthMode by mutableStateOf(DepthMode.NONE)
        private set
    var placedCount: Int by mutableStateOf(0)
        private set
    var trackingReady: Boolean by mutableStateOf(false)
        private set
    var lastError: String? by mutableStateOf(null)
    var mlStatus: String? by mutableStateOf(null)
        private set

    /** Fires once when the session reports no Depth API support (drives the alert). */
    var onDepthUnsupported: (() -> Unit)? = null

    val mlDepthSource = MLDepthSource(interpreterProvider = { bytes ->
        val direct = ByteBuffer.allocateDirect(bytes.size)
        direct.put(bytes)
        direct.rewind()
        Interpreter(direct)
    })

    lateinit var placementController: PlacementController
        private set

    private var pendingActiveModel: FurnitureModel? = null

    /** Model the user picked in the sheet; placed on the next surface tap. */
    var activeModel: FurnitureModel?
        get() = if (::placementController.isInitialized) placementController.getActiveModel() else pendingActiveModel
        set(value) {
            pendingActiveModel = value
            if (::placementController.isInitialized) placementController.setActiveModel(value)
        }

    private val scope: CoroutineScope = MainScope()
    private var currentFrame: Frame? = null
    private var frameCounter = 0L
    private var mlBusy = false
    private var depthCheckDone = false

    // ── Session hooks (wired by ARSceneHost) ─────────────────────────────────

    fun configureSession(session: Session, config: Config) {
        config.instantPlacementMode = Config.InstantPlacementMode.LOCAL_Y_UP
        val manager = DepthManager(session)
        manager.configureDepth(config)
        depthManager = manager
    }

    fun onSessionCreated(created: Session) {
        session = created
        val controller = createPlacementController(created)
        placementController = controller
        controller.nodeDisposer = { node ->
            (node as? PlacedItem)?.let { placements.remove(it) }
        }

        val manager = depthManager ?: DepthManager(created).also { depthManager = it }
        if (manager.isDepthSupported()) {
            manager.setMode(DepthMode.API)
            depthMode = manager.getMode()
        } else if (!depthCheckDone) {
            depthCheckDone = true
            onDepthUnsupported?.invoke()
        }
    }

    fun onSessionUpdated(@Suppress("UNUSED_PARAMETER") session: Session, frame: Frame) {
        currentFrame = frame
        frameCounter++
        trackingReady = frame.camera.trackingState == TrackingState.TRACKING

        // ML depth: sample a camera frame periodically while in ML mode.
        if (depthMode == DepthMode.ML && !mlBusy && frameCounter % ML_FRAME_INTERVAL == 0L) {
            runMlDepth(frame)
        }
    }

    private fun createPlacementController(session: Session): PlacementController {
        lateinit var controller: PlacementController
        controller = PlacementController(session, nodeFactory = { anchor ->
            val model = controller.getActiveModel()
            if (model != null) PlacedItem(model, anchor) else Unit
        })
        pendingActiveModel?.let { controller.setActiveModel(it) }
        return controller
    }

    // ── Placement + gestures (called from the Compose gesture overlay) ─────

    fun tap(x: Float, y: Float) {
        val frame = currentFrame ?: return
        val controller = if (::placementController.isInitialized) placementController else return
        try {
            if (controller.onTap(frame, x, y)) {
                placedCount = controller.getPlacedCount()
                val id = controller.getSelectedId()
                val item = id?.let { controller.getNodeForModel(it) } as? PlacedItem
                if (item != null && item !in placements) placements.add(item)
            }
        } catch (e: Exception) {
            lastError = "Placement failed: ${e.message}"
        }
    }

    fun pinch(zoom: Float) {
        val controller = if (::placementController.isInitialized) placementController else return
        val id = controller.getSelectedId() ?: return
        val newScale = controller.onPinch(zoom)
        (controller.getNodeForModel(id) as? PlacedItem)?.scale = newScale
    }

    fun twist(angleRadians: Float) {
        val controller = if (::placementController.isInitialized) placementController else return
        val id = controller.getSelectedId() ?: return
        val newYawRadians = controller.onTwist(angleRadians)
        (controller.getNodeForModel(id) as? PlacedItem)?.yawDegrees =
            Math.toDegrees(newYawRadians.toDouble()).toFloat()
    }

    fun drag(deltaX: Float, deltaY: Float, pointerX: Float, pointerY: Float) {
        val controller = if (::placementController.isInitialized) placementController else return
        if (!controller.onDrag(deltaX, deltaY)) return
        val id = controller.getSelectedId() ?: return
        val item = controller.getNodeForModel(id) as? PlacedItem ?: return
        val frame = currentFrame ?: return

        val hit = try {
            val hits = frame.hitTest(pointerX, pointerY)
            hits.firstOrNull { result ->
                val trackable = result.trackable
                trackable is Plane && trackable.isPoseInPolygon(result.hitPose)
            } ?: hits.firstOrNull { result ->
                result.trackable is Plane
            } ?: hits.firstOrNull { result ->
                result.trackable is InstantPlacementPoint
            } ?: hits.firstOrNull { result ->
                result.trackable is DepthPoint
            } ?: hits.firstOrNull()
        } catch (_: Exception) {
            null
        } ?: return

        val oldAnchor = item.anchor
        item.anchor = hit.createAnchor()
        try {
            oldAnchor.detach()
        } catch (_: Throwable) {
        }
    }

    fun clearAll() {
        if (!::placementController.isInitialized) return
        placementController.clearAllModels()
        placements.clear()
        placedCount = 0
    }

    // ── Depth mode management ────────────────────────────────────────────────

    /** Loads the ML model (if bundled) and switches to ML mode. Returns success. */
    suspend fun enableMlFallback(): Boolean {
        val manager = depthManager ?: return false
        val loaded = withContext(Dispatchers.IO) { mlDepthSource.load(appContext) }
        if (!loaded) {
            mlStatus = "ML depth model not bundled — occlusion disabled"
            return false
        }
        manager.attachMlSource(mlDepthSource)
        val ok = manager.setMode(DepthMode.ML)
        depthMode = manager.getMode()
        if (ok) mlStatus = "ML depth active"
        return ok
    }

    fun requestDepthMode(mode: DepthMode) {
        val manager = depthManager ?: return
        if (mode == DepthMode.ML && !mlDepthSource.isAvailable()) {
            scope.launch { enableMlFallback() }
            return
        }
        manager.setMode(mode)
        depthMode = manager.getMode()
    }

    private fun runMlDepth(frame: Frame) {
        val yuv = try {
            val image = frame.acquireCameraImage()
            try {
                CameraImageConverter.snapshot(image)
            } finally {
                image.close()
            }
        } catch (_: Exception) {
            return // NotYetAvailableException etc. — just skip this frame
        }

        mlBusy = true
        scope.launch(Dispatchers.Default) {
            val started = System.nanoTime()
            val rgb = CameraImageConverter.toRgb(yuv)
            val depth = mlDepthSource.runInference(rgb, yuv.width, yuv.height)
            val elapsedMs = (System.nanoTime() - started) / 1_000_000
            withContext(Dispatchers.Main) {
                mlStatus = if (depth != null) {
                    "ML depth ${depth.width}x${depth.height} in ${elapsedMs}ms"
                } else {
                    "ML depth inference failed"
                }
                mlBusy = false
            }
        }
    }

    fun destroy() {
        scope.cancel()
        mlDepthSource.close()
        session = null
    }

    companion object {
        private const val ML_FRAME_INTERVAL = 30L
    }
}

/**
 * Full-screen ARCore scene (SceneView Compose) plus the gesture overlay.
 * Declarative render: [ArCoordinator.placements] drives AnchorNode/ModelNode children.
 */
@Composable
fun ARSceneHost(coordinator: ArCoordinator, modifier: Modifier = Modifier) {
    val engine = rememberEngine()
    val modelLoader = rememberModelLoader(engine)
    val materialLoader = rememberMaterialLoader(engine)
    val cameraStream = rememberARCameraStream(materialLoader)

    Box(modifier = modifier.fillMaxSize().testTag("ar_scene_container")) {
        ARSceneView(
            modifier = Modifier.fillMaxSize(),
            engine = engine,
            modelLoader = modelLoader,
            materialLoader = materialLoader,
            cameraStream = cameraStream,
            planeRenderer = true,
            depthMode = Config.DepthMode.AUTOMATIC,
            sessionConfiguration = { session, config ->
                coordinator.configureSession(session, config)
            },
            onSessionCreated = { session ->
                coordinator.onSessionCreated(session)
            },
            onSessionUpdated = { session, frame ->
                coordinator.onSessionUpdated(session, frame)
            },
        ) {
            coordinator.placements.forEach { item ->
                key(item.id) {
                    val instance = rememberModelInstance(modelLoader, item.model.assetPath)
                    AnchorNode(anchor = item.anchor) {
                        if (instance != null) {
                            ModelNode(
                                modelInstance = instance,
                                scale = Scale(item.scale),
                                rotation = Rotation(y = item.yawDegrees),
                            )
                        }
                    }
                }
            }
        }

        // Real-world occlusion uses the ARCore Depth API texture; only meaningful
        // while the session serves API depth.
        LaunchedEffect(coordinator.depthMode) {
            cameraStream.isDepthOcclusionEnabled = coordinator.depthMode == DepthMode.API
        }

        // Gesture overlay: tap = place, single-finger drag = reposition, pinch = scale, twist = rotate.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    awaitEachGesture {
                        val down = awaitFirstDown(requireUnconsumed = false)
                        var dragOrTransform = false
                        var lastPosition = down.position
                        val initialDownPosition = down.position

                        do {
                            val event = awaitPointerEvent()
                            val pointerCount = event.changes.count { it.pressed }

                            if (pointerCount == 1) {
                                val change = event.changes.firstOrNull { it.pressed }
                                if (change != null) {
                                    val dragDistance = (change.position - initialDownPosition).getDistance()
                                    val touchSlop = viewConfiguration.touchSlop
                                    if (dragDistance > touchSlop) {
                                        dragOrTransform = true
                                        val pan = change.position - lastPosition
                                        coordinator.drag(pan.x, pan.y, change.position.x, change.position.y)
                                        change.consume()
                                    }
                                    lastPosition = change.position
                                }
                            } else if (pointerCount > 1) {
                                dragOrTransform = true
                                val zoom = event.calculateZoom()
                                val rotation = event.calculateRotation()
                                val pan = event.calculatePan()
                                val centroid = event.calculateCentroid()

                                if (zoom != 1f) coordinator.pinch(zoom)
                                if (rotation != 0f) {
                                    coordinator.twist(Math.toRadians(rotation.toDouble()).toFloat())
                                }
                                if (pan.x != 0f || pan.y != 0f) {
                                    coordinator.drag(pan.x, pan.y, centroid.x, centroid.y)
                                }
                                event.changes.forEach { it.consume() }
                            }
                        } while (event.changes.any { it.pressed })

                        if (!dragOrTransform) {
                            coordinator.tap(initialDownPosition.x, initialDownPosition.y)
                        }
                    }
                },
        )
    }
}
