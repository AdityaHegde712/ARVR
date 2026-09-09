package com.arvr.app.ar

import android.content.Context
import com.google.ar.core.ArCoreApk
import com.google.ar.core.ArCoreApk.Availability

sealed class ArCoreAvailability {
    object Supported : ArCoreAvailability()
    object NeedsInstall : ArCoreAvailability()
    object Unsupported : ArCoreAvailability()
    object Unknown : ArCoreAvailability()
}

class ArCoreAvailabilityChecker {

    fun check(context: Context): ArCoreAvailability {
        val availability = ArCoreApk.getInstance().checkAvailability(context)
        return when {
            availability == Availability.SUPPORTED_INSTALLED ||
            availability == Availability.SUPPORTED_APK_TOO_OLD -> ArCoreAvailability.Supported
            availability == Availability.SUPPORTED_NOT_INSTALLED -> ArCoreAvailability.NeedsInstall
            availability == Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE -> ArCoreAvailability.Unsupported
            else -> ArCoreAvailability.Unknown
        }
    }
}
