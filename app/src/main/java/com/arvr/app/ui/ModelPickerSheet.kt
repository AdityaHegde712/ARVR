package com.arvr.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.arvr.app.model.FurnitureModel

class ModelPickerState(models: List<FurnitureModel>) {
    val models: List<FurnitureModel> = models
    var selectedId: String? = null
        private set
    var placementMode: Boolean = false
        private set

    fun select(id: String): Boolean {
        val model = models.find { it.id == id } ?: return false
        selectedId = model.id
        placementMode = true
        return true
    }

    fun dismiss() {
        selectedId = null
        placementMode = false
    }
}

@Composable
fun ModelPickerSheet(state: ModelPickerState, onDismiss: () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        state.models.forEach { model ->
            Text(
                text = model.name,
                color = androidx.compose.ui.graphics.Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        state.select(model.id)
                    }
                    .padding(8.dp),
            )
        }
        Text(
            text = "Dismiss",
            color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.7f),
            modifier = Modifier
                .testTag("picker_dismiss")
                .clickable { onDismiss() }
                .padding(8.dp),
        )
    }
}
