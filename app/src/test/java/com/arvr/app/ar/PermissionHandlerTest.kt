package com.arvr.app.ar

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. PermissionHandler must implement the camera
 * permission state machine Idle -> Requesting -> Granted|Denied, with a
 * Denied -> Requesting retry path. The stub throws NotImplementedError, so
 * every test fails until the builder implements it.
 */
class PermissionHandlerTest {

    @Test
    fun `should start in the idle state`() {
        val handler = PermissionHandler()

        assertEquals(PermissionState.Idle, handler.getState())
    }

    @Test
    fun `should transition to requesting when a request starts`() {
        val handler = PermissionHandler()

        handler.onPermissionRequested()

        assertEquals(PermissionState.Requesting, handler.getState())
    }

    @Test
    fun `should transition to granted when permission is granted`() {
        val handler = PermissionHandler()
        handler.onPermissionRequested()

        handler.onPermissionResult(true)

        assertEquals(PermissionState.Granted, handler.getState())
    }

    @Test
    fun `should transition to denied when permission is denied`() {
        val handler = PermissionHandler()
        handler.onPermissionRequested()

        handler.onPermissionResult(false)

        assertEquals(PermissionState.Denied, handler.getState())
    }

    @Test
    fun `should transition back to requesting when retried after denial`() {
        val handler = PermissionHandler()
        handler.onPermissionRequested()
        handler.onPermissionResult(false)

        handler.onRetry()

        assertEquals(PermissionState.Requesting, handler.getState())
    }
}