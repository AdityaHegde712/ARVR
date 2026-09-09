package com.arvr.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.arvr.app.ar.DepthMode

fun nextDepthMode(current: DepthMode, mlAvailable: Boolean): DepthMode {
    return when (current) {
        DepthMode.API -> if (mlAvailable) DepthMode.ML else DepthMode.API
        DepthMode.ML -> DepthMode.API
        DepthMode.NONE -> DepthMode.API
    }
}

@Composable
fun DepthToggle(
    currentMode: DepthMode,
    mlAvailable: Boolean,
    onModeChange: (DepthMode) -> Unit,
) {
    val label = when (currentMode) {
        DepthMode.API -> "API"
        DepthMode.ML -> "ML"
        DepthMode.NONE -> "NONE"
    }
    Text(
        text = label,
        color = androidx.compose.ui.graphics.Color.White,
        modifier = Modifier.clickable {
            val next = nextDepthMode(currentMode, mlAvailable)
            if (next != currentMode) onModeChange(next)
        },
    )
}
