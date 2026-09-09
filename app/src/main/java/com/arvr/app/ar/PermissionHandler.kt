package com.arvr.app.ar

sealed class PermissionState {
    object Idle : PermissionState()
    object Requesting : PermissionState()
    object Granted : PermissionState()
    object Denied : PermissionState()
}

class PermissionHandler {

    private var state: PermissionState = PermissionState.Idle

    fun onPermissionRequested() {
        state = PermissionState.Requesting
    }

    fun onPermissionResult(granted: Boolean) {
        state = if (granted) PermissionState.Granted else PermissionState.Denied
    }

    fun onRetry() {
        state = PermissionState.Requesting
    }

    fun getState(): PermissionState = state
}
