package com.arvr.app.model

import android.content.Context
import android.content.res.AssetManager
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream

/**
 * LOCKED — TDD red phase. ModelRepository must scan assets/models, validate
 * the glTF magic, and cache loaded instances. The stub throws
 * NotImplementedError, so every test fails until the builder implements it.
 */
class ModelRepositoryTest {

    private val context = mockk<Context>()
    private val assetManager = mockk<AssetManager>()

    private fun repositoryWithAssets(files: List<String>): ModelRepository {
        every { context.assets } returns assetManager
        every { assetManager.list("models") } returns files.toTypedArray()
        return ModelRepository(context)
    }

    private fun repositoryWithGlbAsset(): ModelRepository {
        every { context.assets } returns assetManager
        every { assetManager.list("models") } returns arrayOf("sofa.glb")
        every { assetManager.open("models/sofa.glb") } returns
            ByteArrayInputStream("glTF".toByteArray() + ByteArray(16))
        return ModelRepository(context)
    }

    @Test
    fun `should list all glb models found in assets`() {
        val repo = repositoryWithAssets(listOf("sofa.glb", "table.glb"))

        val models = repo.listModels()

        assertEquals(2, models.size)
        assertTrue(models.all { it.assetPath.endsWith(".glb") })
    }

    @Test
    fun `should skip underscore-prefixed files when listing models`() {
        val repo = repositoryWithAssets(listOf("sofa.glb", "_invalid.glb"))

        val models = repo.listModels()

        assertEquals(1, models.size)
        assertEquals("sofa", models[0].id)
    }

    @Test
    fun `should return the model metadata for a known id`() {
        val repo = repositoryWithAssets(listOf("sofa.glb"))

        val model = repo.getModel("sofa")

        assertEquals("sofa", model?.id)
    }

    @Test
    fun `should return null for an unknown model id`() {
        val repo = repositoryWithAssets(listOf("sofa.glb"))

        assertNull(repo.getModel("missing"))
    }

    @Test
    fun `should throw ModelLoadException when the asset file is missing`() {
        val repo = repositoryWithAssets(listOf("sofa.glb"))

        assertThrows(ModelLoadException::class.java) {
            repo.loadModel("missing")
        }
    }

    @Test
    fun `should throw ModelLoadException when the glb magic is invalid`() {
        every { context.assets } returns assetManager
        every { assetManager.list("models") } returns arrayOf("sofa.glb")
        every { assetManager.open("models/sofa.glb") } returns
            ByteArrayInputStream("BOGS".toByteArray())

        val repo = ModelRepository(context)

        assertThrows(ModelLoadException::class.java) {
            repo.loadModel("sofa")
        }
    }

    @Test
    fun `should load a valid glb model from assets`() {
        val repo = repositoryWithGlbAsset()

        val instance = repo.loadModel("sofa")

        assertEquals("sofa", instance.model.id)
        assertTrue(instance.glbBytes.size > 4)
    }

    @Test
    fun `should cache loaded model instances`() {
        val repo = repositoryWithGlbAsset()

        val first = repo.loadModel("sofa")
        val second = repo.loadModel("sofa")

        assertSame(first, second)
    }

    @Test
    fun `should release cached instances`() {
        val repo = repositoryWithGlbAsset()

        val first = repo.loadModel("sofa")
        repo.releaseModel("sofa")
        val second = repo.loadModel("sofa")

        assertNotSame(first, second)
    }
}