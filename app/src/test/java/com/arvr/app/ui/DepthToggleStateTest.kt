package com.arvr.app.ui

import com.arvr.app.ar.DepthMode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. nextDepthMode must switch API <-> ML and block ML
 * when the ML source is unavailable. The stub throws NotImplementedError, so
 * every test fails until the builder implements it.
 */
class DepthToggleStateTest {

    @Test
    fun `should switch from API to ML when ML is available`() {
        assertEquals(DepthMode.ML, nextDepthMode(DepthMode.API, mlAvailable = true))
    }

    @Test
    fun `should switch from ML back to API`() {
        assertEquals(DepthMode.API, nextDepthMode(DepthMode.ML, mlAvailable = true))
    }

    @Test
    fun `should stay on API when ML is unavailable`() {
        assertEquals(DepthMode.API, nextDepthMode(DepthMode.API, mlAvailable = false))
    }

    @Test
    fun `should fall back to API when ML becomes unavailable`() {
        assertEquals(DepthMode.API, nextDepthMode(DepthMode.ML, mlAvailable = false))
    }
}