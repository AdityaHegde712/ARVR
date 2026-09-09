package com.arvr.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.arvr.app.ar.ARSceneHost
import com.arvr.app.ar.ArCoordinator
import com.arvr.app.ar.ArCoreAvailability
import com.arvr.app.ar.ArCoreAvailabilityChecker
import com.arvr.app.ar.PermissionHandler
import com.arvr.app.ar.PermissionState
import com.arvr.app.model.CompositeModelProvider
import com.arvr.app.model.FurnitureModel
import com.arvr.app.model.LocalAssetModelProvider
import com.arvr.app.model.RemoteMarketplaceModelProvider
import com.arvr.app.ui.CrosshairOverlay
import com.arvr.app.ui.DepthToggle
import com.arvr.app.ui.ErrorOverlay
import com.arvr.app.ui.ModelPickerSheet
import com.arvr.app.ui.ModelPickerState
import com.arvr.app.ui.TopBar
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                ArvrApp()
            }
        }
    }
}

private const val ARCORE_UNAVAILABLE_MESSAGE =
    "ARCore is not available on this device. Please update from the Play Store."

@Composable
fun ArvrApp() {
    val context = LocalContext.current

    // ── Camera permission (state machine per TEST_SPEC §3) ──────────────────
    val permissionHandler = remember { PermissionHandler() }
    var permissionState by remember {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) permissionHandler.onPermissionResult(true)
        mutableStateOf(permissionHandler.getState())
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        permissionHandler.onPermissionResult(granted)
        permissionState = permissionHandler.getState()
    }

    // ── ARCore availability ─────────────────────────────────────────────────
    var availability by remember { mutableStateOf<ArCoreAvailability?>(null) }
    LaunchedEffect(Unit) {
        val checker = ArCoreAvailabilityChecker()
        // checkAvailability can transiently report Unknown while querying — retry briefly.
        repeat(6) {
            val result = runCatching { checker.check(context) }.getOrDefault(ArCoreAvailability.Unknown)
            availability = result
            if (result != ArCoreAvailability.Unknown) return@LaunchedEffect
            delay(500)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .testTag("main_activity_root"),
    ) {
        when {
            permissionState is PermissionState.Granted -> {
                when (availability) {
                    null, ArCoreAvailability.Unknown -> StatusMessage("Checking AR support…")
                    ArCoreAvailability.Unsupported, ArCoreAvailability.NeedsInstall ->
                        ErrorOverlay(message = ARCORE_UNAVAILABLE_MESSAGE)
                    ArCoreAvailability.Supported -> ArExperience()
                }
            }
            permissionState is PermissionState.Denied -> {
                PermissionRationale(
                    onRetry = {
                        permissionHandler.onRetry()
                        permissionState = permissionHandler.getState()
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    },
                )
            }
            else -> {
                // Idle / Requesting → fire the request once.
                LaunchedEffect(Unit) {
                    if (permissionHandler.getState() is PermissionState.Idle) {
                        permissionHandler.onPermissionRequested()
                        permissionState = permissionHandler.getState()
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                }
                StatusMessage("Camera permission required for AR")
            }
        }
    }
}

@Composable
private fun ArExperience() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val coordinator = remember { ArCoordinator(context.applicationContext) }
    DisposableEffect(Unit) {
        onDispose { coordinator.destroy() }
    }

    // Provider seam: bundled assets today; marketplace provider joins the composite
    // once the webfetch phase lands (requirement: meshes "as if fetched from a provider").
    val provider = remember {
        CompositeModelProvider(
            listOf(
                LocalAssetModelProvider(coordinator.repository),
                RemoteMarketplaceModelProvider(baseUrl = "https://example.invalid/marketplace"),
            ),
        )
    }

    var models by remember { mutableStateOf<List<FurnitureModel>>(emptyList()) }
    LaunchedEffect(provider) {
        models = runCatching { provider.listAvailable() }.getOrDefault(emptyList())
    }
    val pickerState = remember(models) { ModelPickerState(models) }
    var showPicker by remember { mutableStateOf(false) }
    var placementMode by remember { mutableStateOf(false) }

    // Depth fallback alert (user requirement: alert + auto ML fallback).
    var depthAlert by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(coordinator) {
        coordinator.onDepthUnsupported = {
            scope.launch {
                val mlOk = coordinator.enableMlFallback()
                depthAlert = if (mlOk) {
                    "This device does not support the ARCore Depth API. " +
                        "Falling back to on-device ML depth estimation."
                } else {
                    "This device does not support the ARCore Depth API, and the ML depth " +
                        "model is not bundled in this build. Occlusion will be disabled."
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        ARSceneHost(coordinator = coordinator)

        CrosshairOverlay(placementMode = placementMode)

        Column(modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter)) {
            Surface(color = Color.Black.copy(alpha = 0.55f)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    TopBar(
                        modelCount = coordinator.placedCount,
                        depthMode = coordinator.depthMode,
                        onReset = {
                            coordinator.clearAll()
                            pickerState.dismiss()
                            placementMode = false
                        },
                    )
                    Row(modifier = Modifier.padding(8.dp)) {
                        DepthToggle(
                            currentMode = coordinator.depthMode,
                            mlAvailable = coordinator.mlDepthSource.isAvailable(),
                            onModeChange = { coordinator.requestDepthMode(it) },
                        )
                    }
                }
            }
            if (!coordinator.trackingReady) {
                StatusBanner("Move your phone slowly to detect surfaces…")
            }
            coordinator.mlStatus?.let { StatusBanner(it) }
            coordinator.lastError?.let { StatusBanner(it, isError = true) }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
        ) {
            if (showPicker) {
                Surface(color = Color.Black.copy(alpha = 0.5f)) {
                    ModelPickerSheet(
                        state = pickerState,
                        onDismiss = {
                            pickerState.dismiss()
                            showPicker = false
                        },
                    )
                }
                // ModelPickerState mutations aren't Compose-observable; poll selection
                // on each recomposition triggered by the click.
                LaunchedEffect(showPicker) {
                    while (showPicker) {
                        val selected = pickerState.selectedId
                        if (selected != null && pickerState.placementMode) {
                            coordinator.activeModel = models.find { it.id == selected }
                            placementMode = true
                            showPicker = false
                        }
                        delay(100)
                    }
                }
            } else {
                Button(
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .padding(16.dp)
                        .testTag("open_picker_button"),
                    onClick = {
                        pickerState.dismiss()
                        showPicker = true
                    },
                ) {
                    Text(if (placementMode) "Change furniture" else "Browse furniture")
                }
            }
        }

        depthAlert?.let { message ->
            AlertDialog(
                onDismissRequest = { depthAlert = null },
                confirmButton = {
                    TextButton(onClick = { depthAlert = null }) { Text("OK") }
                },
                title = { Text("Depth sensing") },
                text = { Text(message) },
            )
        }
    }
}

@Composable
private fun StatusMessage(text: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text)
    }
}

@Composable
private fun StatusBanner(text: String, isError: Boolean = false) {
    Surface(color = (if (isError) Color(0xFF7F1D1D) else Color.Black).copy(alpha = 0.55f)) {
        Text(
            text = text,
            color = Color.White,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun PermissionRationale(onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("ARVR needs camera access to show furniture in your room.")
        Button(onClick = onRetry, modifier = Modifier.padding(top = 16.dp)) {
            Text("Grant camera access")
        }
    }
}
