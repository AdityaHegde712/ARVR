package com.arvr.app.ar

import com.google.ar.core.Config
import com.google.ar.core.Session

enum class DepthMode { API, ML, NONE }

class DepthManager(private val session: Session) {

    private var currentMode: DepthMode = DepthMode.NONE
    private var mlSource: MLDepthSource? = null

    fun isDepthSupported(): Boolean =
        session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)

    fun configureDepth(config: Config): Config.DepthMode {
        val mode = if (isDepthSupported()) {
            Config.DepthMode.AUTOMATIC
        } else {
            Config.DepthMode.DISABLED
        }
        try {
            config.depthMode = mode
        } catch (_: Throwable) {
        }
        return mode
    }

    fun attachMlSource(source: MLDepthSource) {
        mlSource = source
    }

    fun detachMlSource() {
        mlSource = null
    }

    fun setMode(mode: DepthMode): Boolean {
        return when (mode) {
            DepthMode.API -> {
                if (isDepthSupported()) {
                    currentMode = DepthMode.API
                    true
                } else {
                    false
                }
            }
            DepthMode.ML -> {
                val source = mlSource
                if (source != null && source.isAvailable()) {
                    currentMode = DepthMode.ML
                    true
                } else {
                    false
                }
            }
            DepthMode.NONE -> {
                currentMode = DepthMode.NONE
                true
            }
        }
    }

    fun getMode(): DepthMode = currentMode
}
