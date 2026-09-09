package com.arvr.app.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. FurnitureModel must validate its constructor inputs.
 * The stub performs no validation, so the rejection tests fail until the
 * builder implements it.
 */
class FurnitureModelTest {

    @Test
    fun `should expose catalog metadata fields when constructed`() {
        val model = FurnitureModel(
            id = "sofa",
            name = "Sofa",
            assetPath = "models/sofa.glb",
            category = "seating",
            defaultScale = 1.0f,
            defaultYawDegrees = 0f,
        )

        assertEquals("sofa", model.id)
        assertEquals("Sofa", model.name)
        assertEquals("models/sofa.glb", model.assetPath)
        assertEquals("seating", model.category)
        assertEquals(1.0f, model.defaultScale)
        assertEquals(0f, model.defaultYawDegrees)
    }

    @Test
    fun `should reject a blank id`() {
        assertThrows(IllegalArgumentException::class.java) {
            FurnitureModel("", "Sofa", "models/sofa.glb", "seating", 1.0f, 0f)
        }
    }

    @Test
    fun `should reject a blank name`() {
        assertThrows(IllegalArgumentException::class.java) {
            FurnitureModel("sofa", "", "models/sofa.glb", "seating", 1.0f, 0f)
        }
    }

    @Test
    fun `should reject an asset path that does not end in glb`() {
        assertThrows(IllegalArgumentException::class.java) {
            FurnitureModel("sofa", "Sofa", "models/sofa.obj", "seating", 1.0f, 0f)
        }
    }

    @Test
    fun `should reject a non-positive default scale`() {
        assertThrows(IllegalArgumentException::class.java) {
            FurnitureModel("sofa", "Sofa", "models/sofa.glb", "seating", 0f, 0f)
        }
    }

    @Test
    fun `should reject a negative default scale`() {
        assertThrows(IllegalArgumentException::class.java) {
            FurnitureModel("sofa", "Sofa", "models/sofa.glb", "seating", -1f, 0f)
        }
    }
}