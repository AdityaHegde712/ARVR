package com.arvr.app.ar

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag

/**
 * State-rendering wrapper for the AR experience (contract: TEST_SPEC §3).
 *
 * - `arSession == null`  → renders the "AR session unavailable" message.
 * - `arSession != null`  → renders the AR scene container (tag "ar_scene_container")
 *   with the caller-provided [content] (overlays, HUD, etc.).
 */
@Composable
fun ARScreen(
    arSession: com.google.ar.core.Session?,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit = {},
) {
    if (arSession == null) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text("AR session unavailable")
        }
    } else {
        Box(
            modifier = modifier
                .fillMaxSize()
                .testTag("ar_scene_container"),
            content = content,
        )
    }
}
