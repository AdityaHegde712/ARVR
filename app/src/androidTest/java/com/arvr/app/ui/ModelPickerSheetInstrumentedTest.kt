package com.arvr.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.arvr.app.model.FurnitureModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T3.5). ModelPickerSheet must render the model list,
 * activate placement mode when a model is tapped, and call onDismiss. The
 * stub renders "STUB", so every test fails until the builder implements it.
 */
@RunWith(AndroidJUnit4::class)
class ModelPickerSheetInstrumentedTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val sofa = FurnitureModel("sofa", "Sofa", "models/sofa.glb", "seating", 1.0f, 0f)
    private val table = FurnitureModel("table", "Table", "models/table.glb", "tables", 1.0f, 0f)

    @Test
    fun should_show_the_list_of_available_models() {
        val state = ModelPickerState(listOf(sofa, table))

        composeRule.setContent {
            ModelPickerSheet(state = state, onDismiss = {})
        }

        composeRule.onNodeWithText("Sofa").assertIsDisplayed()
        composeRule.onNodeWithText("Table").assertIsDisplayed()
    }

    @Test
    fun should_activate_placement_mode_when_a_model_is_tapped() {
        val state = ModelPickerState(listOf(sofa, table))

        composeRule.setContent {
            ModelPickerSheet(state = state, onDismiss = {})
        }

        composeRule.onNodeWithText("Sofa").performClick()

        assertEquals("sofa", state.selectedId)
        assertTrue(state.placementMode)
    }

    @Test
    fun should_call_onDismiss_when_the_sheet_is_dismissed() {
        val state = ModelPickerState(listOf(sofa, table))
        var dismissed = false

        composeRule.setContent {
            ModelPickerSheet(state = state, onDismiss = { dismissed = true })
        }

        composeRule.onNodeWithTag("picker_dismiss").performClick()

        assertTrue(dismissed)
    }
}