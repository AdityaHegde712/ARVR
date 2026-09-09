package com.arvr.app.ui

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. CrosshairState must start with placement mode off
 * and toggle it on and off. The stub has a deliberately wrong default and
 * throws NotImplementedError, so every test fails until the builder
 * implements it.
 */
class CrosshairStateTest {

    @Test
    fun `should start with placement mode off`() {
        val state = CrosshairState()

        assertFalse(state.placementMode)
    }

    @Test
    fun `should toggle placement mode on`() {
        val state = CrosshairState()

        state.toggle()

        assertTrue(state.placementMode)
    }

    @Test
    fun `should toggle placement mode back off`() {
        val state = CrosshairState()
        state.toggle()

        state.toggle()

        assertFalse(state.placementMode)
    }
}