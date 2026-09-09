package com.arvr.app.ar

import com.arvr.app.model.FurnitureModel
import com.google.ar.core.Anchor
import com.google.ar.core.Frame
import com.google.ar.core.Session

class PlacementException(message: String, cause: Throwable? = null) : Exception(message, cause)

class PlacementController(
    private val session: Session,
    private val nodeFactory: (Anchor) -> Any = { anchor -> Any() },
) {

    private var activeModel: FurnitureModel? = null
    private val placedModels = mutableMapOf<String, Anchor>()
    private val placedNodes = mutableMapOf<String, Any>()
    private var selectedId: String? = null
    private var placementCounter = 0L

    /** Optional hook for the render layer to tear down the node created by [nodeFactory]. */
    var nodeDisposer: ((Any) -> Unit)? = null

    fun setActiveModel(model: FurnitureModel?) {
        activeModel = model
    }

    fun getActiveModel(): FurnitureModel? = activeModel

    fun onTap(frame: Frame, x: Float, y: Float): Boolean {
        val model = activeModel ?: return false

        val hitResults = frame.hitTest(x, y)
        val hitResult = try {
            hitResults.firstOrNull { result ->
                val trackable = result.trackable
                trackable is com.google.ar.core.Plane && trackable.isPoseInPolygon(result.hitPose)
            } ?: hitResults.firstOrNull { result ->
                result.trackable is com.google.ar.core.Plane
            } ?: hitResults.firstOrNull { result ->
                result.trackable is com.google.ar.core.InstantPlacementPoint
            } ?: hitResults.firstOrNull { result ->
                result.trackable is com.google.ar.core.DepthPoint
            } ?: hitResults.firstOrNull()
        } catch (_: Throwable) {
            hitResults.firstOrNull()
        } ?: return false

        val anchor = hitResult.createAnchor()
        // Monotonic counter: timestamps collide on rapid successive taps.
        val id = "${model.id}_${placementCounter++}"
        placedModels[id] = anchor
        selectedId = id
        scales[id] = model.defaultScale
        rotations[id] = Math.toRadians(model.defaultYawDegrees.toDouble()).toFloat()
        placedNodes[id] = nodeFactory(anchor)
        return true
    }

    fun onDrag(deltaX: Float, deltaY: Float): Boolean {
        if (selectedId == null) return false
        return true
    }

    fun onPinch(scaleFactor: Float): Float {
        val id = selectedId ?: return 1f
        val currentScale = scales[id] ?: 1f
        val newScale = (currentScale * scaleFactor).coerceIn(MIN_SCALE, MAX_SCALE)
        scales[id] = newScale
        return newScale
    }

    fun onTwist(angleRadians: Float): Float {
        val id = selectedId ?: return 0f
        val currentRotation = rotations[id] ?: 0f
        val newRotation = currentRotation + angleRadians
        rotations[id] = newRotation
        return newRotation
    }

    fun removePlacedModel(id: String): Boolean {
        val anchor = placedModels.remove(id) ?: return false
        try {
            anchor.detach()
        } catch (_: Throwable) {
        }
        placedNodes.remove(id)?.let { node ->
            try {
                nodeDisposer?.invoke(node)
            } catch (_: Throwable) {
            }
        }
        if (selectedId == id) selectedId = null
        scales.remove(id)
        rotations.remove(id)
        return true
    }

    fun clearAllModels(): Int {
        val count = placedModels.size
        placedModels.values.forEach { anchor ->
            try {
                anchor.detach()
            } catch (_: Throwable) {
            }
        }
        placedNodes.values.forEach { node ->
            try {
                nodeDisposer?.invoke(node)
            } catch (_: Throwable) {
            }
        }
        placedModels.clear()
        placedNodes.clear()
        selectedId = null
        scales.clear()
        rotations.clear()
        return count
    }

    fun getPlacedCount(): Int = placedModels.size

    fun getPlacedIds(): List<String> = placedModels.keys.toList()

    fun getAnchorForModel(id: String): Anchor? = placedModels[id]

    fun getNodeForModel(id: String): Any? = placedNodes[id]

    fun getSelectedId(): String? = selectedId

    fun selectModel(id: String): Boolean {
        if (!placedModels.containsKey(id)) return false
        selectedId = id
        return true
    }

    fun getScaleForModel(id: String): Float = scales[id] ?: 1f

    fun getRotationForModel(id: String): Float = rotations[id] ?: 0f

    private val scales = mutableMapOf<String, Float>()
    private val rotations = mutableMapOf<String, Float>()

    companion object {
        private const val MIN_SCALE = 0.1f
        private const val MAX_SCALE = 5.0f
    }
}
