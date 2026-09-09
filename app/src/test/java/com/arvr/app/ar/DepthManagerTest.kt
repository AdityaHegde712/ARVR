package com.arvr.app.ar

import com.google.ar.core.Config
import com.google.ar.core.Session
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. DepthManager must configure the ARCore session for
 * automatic depth and switch between API/ML/NONE modes. The stub throws
 * NotImplementedError, so every test fails until the builder implements it.
 */
class DepthManagerTest {

    private val session = mockk<Session>()

    private fun supportedSession(): DepthManager {
        every { session.isDepthModeSupported(Config.DepthMode.AUTOMATIC) } returns true
        return DepthManager(session)
    }

    @Test
    fun `should report depth support when the session supports automatic depth`() {
        val manager = supportedSession()

        assertTrue(manager.isDepthSupported())
    }

    @Test
    fun `should report no depth support when the session rejects automatic depth`() {
        every { session.isDepthModeSupported(Config.DepthMode.AUTOMATIC) } returns false
        val manager = DepthManager(session)

        assertFalse(manager.isDepthSupported())
    }

    @Test
    fun `should configure the session with automatic depth when supported`() {
        val manager = supportedSession()
        val config = mockk<Config>()

        assertEquals(Config.DepthMode.AUTOMATIC, manager.configureDepth(config))
    }

    @Test
    fun `should configure the session with disabled depth when unsupported`() {
        every { session.isDepthModeSupported(Config.DepthMode.AUTOMATIC) } returns false
        val manager = DepthManager(session)
        val config = mockk<Config>()

        assertEquals(Config.DepthMode.DISABLED, manager.configureDepth(config))
    }

    @Test
    fun `should start with no active depth mode`() {
        val manager = supportedSession()

        assertEquals(DepthMode.NONE, manager.getMode())
    }

    @Test
    fun `should switch to API mode when depth is supported`() {
        val manager = supportedSession()

        assertTrue(manager.setMode(DepthMode.API))
        assertEquals(DepthMode.API, manager.getMode())
    }

    @Test
    fun `should refuse API mode when depth is unsupported`() {
        every { session.isDepthModeSupported(Config.DepthMode.AUTOMATIC) } returns false
        val manager = DepthManager(session)

        assertFalse(manager.setMode(DepthMode.API))
        assertEquals(DepthMode.NONE, manager.getMode())
    }

    @Test
    fun `should refuse ML mode when no ML source is attached`() {
        val manager = supportedSession()

        assertFalse(manager.setMode(DepthMode.ML))
        assertEquals(DepthMode.NONE, manager.getMode())
    }

    @Test
    fun `should switch to ML mode when an available ML source is attached`() {
        val manager = supportedSession()
        val mlSource = mockk<MLDepthSource>()
        every { mlSource.isAvailable() } returns true

        manager.attachMlSource(mlSource)

        assertTrue(manager.setMode(DepthMode.ML))
        assertEquals(DepthMode.ML, manager.getMode())
    }

    @Test
    fun `should refuse ML mode when the attached ML source is unavailable`() {
        val manager = supportedSession()
        val mlSource = mockk<MLDepthSource>()
        every { mlSource.isAvailable() } returns false

        manager.attachMlSource(mlSource)

        assertFalse(manager.setMode(DepthMode.ML))
        assertEquals(DepthMode.NONE, manager.getMode())
    }

    @Test
    fun `should keep the previous mode when a mode switch fails`() {
        val manager = supportedSession()
        manager.setMode(DepthMode.API)

        assertFalse(manager.setMode(DepthMode.ML))
        assertEquals(DepthMode.API, manager.getMode())
    }

    @Test
    fun `should detach the ML source`() {
        val manager = supportedSession()
        val mlSource = mockk<MLDepthSource>()
        every { mlSource.isAvailable() } returns true
        manager.attachMlSource(mlSource)

        manager.detachMlSource()

        assertFalse(manager.setMode(DepthMode.ML))
    }
}