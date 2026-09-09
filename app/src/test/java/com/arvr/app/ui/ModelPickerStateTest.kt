package com.arvr.app.ui

import com.arvr.app.model.FurnitureModel
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. ModelPickerState must track the selected furniture
 * model and the placement-mode flag. The stub has deliberately wrong defaults
 * and throws NotImplementedError, so every test fails until the builder
 * implements it.
 */
class ModelPickerStateTest {

    private val sofa = FurnitureModel("sofa", "Sofa", "models/sofa.glb", "seating", 1.0f, 0f)
    private val table = FurnitureModel("table", "Table", "models/table.glb", "tables", 1.0f, 0f)

    @Test
    fun `should start with no model selected`() {
        val state = ModelPickerState(listOf(sofa, table))

        assertNull(state.selectedId)
        assertFalse(state.placementMode)
    }

    @Test
    fun `should expose the list of available models`() {
        val state = ModelPickerState(listOf(sofa, table))

        assertEquals(listOf(sofa, table), state.models)
    }

    @Test
    fun `should select a model and activate placement mode`() {
        val state = ModelPickerState(listOf(sofa, table))

        assertTrue(state.select("sofa"))
        assertEquals("sofa", state.selectedId)
        assertTrue(state.placementMode)
    }

    @Test
    fun `should return false when selecting an unknown model`() {
        val state = ModelPickerState(listOf(sofa, table))

        assertFalse(state.select("missing"))
        assertNull(state.selectedId)
        assertFalse(state.placementMode)
    }

    @Test
    fun `should clear selection when dismissed`() {
        val state = ModelPickerState(listOf(sofa, table))
        state.select("sofa")

        state.dismiss()

        assertNull(state.selectedId)
        assertFalse(state.placementMode)
    }
}