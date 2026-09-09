package com.arvr.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.arvr.app.ar.DepthMode

@Composable
fun TopBar(modelCount: Int, depthMode: DepthMode, onReset: () -> Unit) {
    Row(modifier = Modifier.padding(8.dp)) {
        Text(
            text = "$modelCount",
            color = androidx.compose.ui.graphics.Color.White,
            modifier = Modifier.padding(end = 8.dp),
        )
        Text(
            text = depthMode.name,
            color = androidx.compose.ui.graphics.Color.White,
            modifier = Modifier.padding(end = 8.dp),
        )
        Text(
            text = "Reset",
            color = androidx.compose.ui.graphics.Color(0xFFFF8A80),
            modifier = Modifier
                .testTag("reset_button")
                .clickable { onReset() }
                .padding(8.dp),
        )
    }
}
