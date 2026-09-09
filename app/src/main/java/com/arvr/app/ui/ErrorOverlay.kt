package com.arvr.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag

@Composable
fun ErrorOverlay(message: String, testTag: String = "error_overlay") {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .testTag(testTag),
        contentAlignment = Alignment.Center,
    ) {
        Text(message)
    }
}
