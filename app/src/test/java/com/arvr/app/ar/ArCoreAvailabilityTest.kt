package com.arvr.app.ar

import android.content.Context
import com.google.ar.core.ArCoreApk
import com.google.ar.core.ArCoreApk.Availability
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. ArCoreAvailabilityChecker must map the ARCore
 * Availability enum to the app's sealed classification. The stub throws
 * NotImplementedError, so every test fails until the builder implements it.
 */
class ArCoreAvailabilityTest {

    private val context = mockk<Context>()

    private fun checkerWithAvailability(availability: Availability): ArCoreAvailabilityChecker {
        mockkStatic(ArCoreApk::class)
        val arCoreApk = mockk<ArCoreApk>()
        every { ArCoreApk.getInstance() } returns arCoreApk
        every { arCoreApk.checkAvailability(context) } returns availability
        return ArCoreAvailabilityChecker()
    }

    @Test
    fun `should report supported when ARCore is installed`() {
        val checker = checkerWithAvailability(Availability.SUPPORTED_INSTALLED)

        assertEquals(ArCoreAvailability.Supported, checker.check(context))
    }

    @Test
    fun `should report needs install when ARCore is not installed`() {
        val checker = checkerWithAvailability(Availability.SUPPORTED_NOT_INSTALLED)

        assertEquals(ArCoreAvailability.NeedsInstall, checker.check(context))
    }

    @Test
    fun `should report unsupported on unsupported devices`() {
        val checker = checkerWithAvailability(Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE)

        assertEquals(ArCoreAvailability.Unsupported, checker.check(context))
    }

    @Test
    fun `should report unknown on transient errors`() {
        val checker = checkerWithAvailability(Availability.UNKNOWN_ERROR)

        assertEquals(ArCoreAvailability.Unknown, checker.check(context))
    }
}