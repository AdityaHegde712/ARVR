package com.arvr.app.model

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/**
 * LOCKED — TDD red phase (T3.1, T3.2, T4.4). ModelRepository must scan the
 * real bundled assets, load a real .glb, and throw ModelLoadException for
 * missing or invalid files. The stub throws NotImplementedError, so every
 * test fails until the builder implements it.
 */
@RunWith(AndroidJUnit4::class)
class ModelRepositoryInstrumentedTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val repository = ModelRepository(context)

    @Test
    fun should_list_the_bundled_furniture_models_from_assets() {
        val models = repository.listModels()

        assertTrue(
            models.size >= 3,
            "expected at least 3 furniture models, found ${models.size} (task T3.2)",
        )
        assertTrue(models.all { it.assetPath.endsWith(".glb") })
        assertTrue(models.none { it.assetPath.substringAfterLast('/').startsWith("_") })
    }

    @Test
    fun should_return_metadata_for_a_bundled_model() {
        val models = repository.listModels()
        if (models.isEmpty()) fail("no furniture models bundled (task T3.2)")

        val model = repository.getModel(models.first().id)

        assertNotNull(model)
        assertEquals(models.first().id, model?.id)
    }

    @Test
    fun should_load_a_real_glb_model_from_assets() {
        val models = repository.listModels()
        if (models.isEmpty()) fail("no furniture models bundled (task T3.2)")

        val instance = repository.loadModel(models.first().id)

        assertEquals(models.first().id, instance.model.id)
        assertTrue(instance.glbBytes.size > 4, "glb bytes must be non-empty")
        val magic = instance.glbBytes.copyOfRange(0, 4).toString(Charsets.US_ASCII)
        assertEquals("glTF", magic)
    }

    @Test
    fun should_throw_ModelLoadException_for_a_missing_model() {
        try {
            repository.loadModel("missing-model")
            fail("expected ModelLoadException for a missing model")
        } catch (expected: ModelLoadException) {
            // expected
        }
    }

    @Test
    fun should_throw_ModelLoadException_for_an_invalid_glb() {
        try {
            repository.loadModel("_invalid")
            fail("expected ModelLoadException for an invalid glb")
        } catch (expected: ModelLoadException) {
            // expected
        }
    }
}