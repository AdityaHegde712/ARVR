package com.arvr.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

class CrosshairState {
    var placementMode: Boolean = false
        private set

    fun toggle() {
        placementMode = !placementMode
    }
}

@Composable
fun CrosshairOverlay(placementMode: Boolean) {
    if (placementMode) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .testTag("crosshair"),
            contentAlignment = Alignment.Center,
        ) {
            Text("+", modifier = Modifier.size(32.dp))
        }
    }
}
