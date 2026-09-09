package com.arvr.app.ar

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.ar.core.Config
import com.google.ar.core.Session
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T2.1, T2.5, T4.3). DepthManager must configure a
 * real ARCore session for automatic depth and fall back gracefully when ML
 * mode is requested without a source. Requires a physical ARCore device.
 */
@RunWith(AndroidJUnit4::class)
class DepthManagerInstrumentedTest {

    private fun createSession(): Session {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        return try {
            Session(context)
        } catch (e: Exception) {
            fail("ARCore session unavailable on this device: ${e.message}")
            throw e
        }
    }

    @Test
    fun should_configure_the_session_with_automatic_depth_when_supported() {
        val session = createSession()
        val config = Config(session)
        val manager = DepthManager(session)

        val applied = manager.configureDepth(config)

        if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
            assertEquals(Config.DepthMode.AUTOMATIC, applied)
        } else {
            assertEquals(Config.DepthMode.DISABLED, applied)
        }
        assertEquals(applied, config.depthMode)
    }

    @Test
    fun should_switch_to_API_mode_when_depth_is_supported() {
        val session = createSession()
        val manager = DepthManager(session)

        if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
            assertTrue(manager.setMode(DepthMode.API))
            assertEquals(DepthMode.API, manager.getMode())
        }
    }

    @Test
    fun should_fall_back_gracefully_when_ML_mode_is_requested_without_a_source() {
        val session = createSession()
        val manager = DepthManager(session)
        val before = manager.getMode()

        assertFalse(manager.setMode(DepthMode.ML))
        assertEquals(before, manager.getMode())
    }
}