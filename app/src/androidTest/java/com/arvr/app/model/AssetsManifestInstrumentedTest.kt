package com.arvr.app.model

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T3.2, T2.4, T4.7). The APK must bundle at least
 * three furniture .glb models under 5MB each and the Depth Anything V2 Small
 * float TFLite model under 100MB. These tests fail until the builder adds the
 * real assets.
 */
@RunWith(AndroidJUnit4::class)
class AssetsManifestInstrumentedTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    private fun listAssetFiles(dir: String): List<String> {
        return context.assets.list(dir)?.toList() ?: emptyList()
    }

    private fun assetSize(path: String): Long {
        return try {
            context.assets.openFd(path).length
        } catch (e: Exception) {
            -1L
        }
    }

    @Test
    fun should_bundle_at_least_three_furniture_models() {
        val models = listAssetFiles("models").filter { it.endsWith(".glb") }

        assertTrue(
            "expected at least 3 furniture .glb files in assets/models, found ${models.size} (task T3.2)",
            models.size >= 3,
        )
    }

    @Test
    fun should_keep_furniture_models_under_five_megabytes() {
        val models = listAssetFiles("models").filter { it.endsWith(".glb") }
        if (models.isEmpty()) fail("no furniture models bundled (task T3.2)")

        for (name in models) {
            val size = assetSize("models/$name")
            assertTrue(
                "model $name is $size bytes, must be under 5MB (task T4.7)",
                size in 1..(5 * 1024 * 1024),
            )
        }
    }

    @Test
    fun should_bundle_the_depth_model_under_one_hundred_megabytes() {
        val path = "ml/depth_anything_v2_small_float.tflite"
        val size = assetSize(path)

        assertTrue(
            "depth model missing at assets/$path (task T2.4)",
            size > 0,
        )
        assertTrue(
            "depth model is $size bytes, must be under 100MB (task T4.7)",
            size <= 100 * 1024 * 1024,
        )
    }
}