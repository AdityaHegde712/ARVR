package com.arvr.app.ar

import com.arvr.app.model.FurnitureModel
import com.google.ar.core.Anchor
import com.google.ar.core.Frame
import com.google.ar.core.HitResult
import com.google.ar.core.Session
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * LOCKED — TDD red phase. PlacementController must hit-test taps, create
 * anchors, attach nodes, and apply drag/pinch/twist transforms with clamping.
 * The stub throws NotImplementedError, so every test fails until the builder
 * implements it.
 */
class PlacementControllerTest {

    private val session = mockk<Session>()
    private val frame = mockk<Frame>()
    private val hitResult = mockk<HitResult>()
    private val anchor = mockk<Anchor>()

    private val sofa = FurnitureModel(
        id = "sofa",
        name = "Sofa",
        assetPath = "models/sofa.glb",
        category = "seating",
        defaultScale = 1.0f,
        defaultYawDegrees = 0f,
    )

    private fun controllerWithSurfaceHit(): PlacementController {
        every { frame.hitTest(0.5f, 0.5f) } returns listOf(hitResult)
        every { hitResult.createAnchor() } returns anchor
        return PlacementController(session, nodeFactory = { anchor })
    }

    @Test
    fun `should not place a model before one is selected`() {
        val controller = controllerWithSurfaceHit()

        assertFalse(controller.onTap(frame, 0.5f, 0.5f))
        verify(exactly = 0) { hitResult.createAnchor() }
    }

    @Test
    fun `should create an anchor when a tap hits a surface`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)

        assertTrue(controller.onTap(frame, 0.5f, 0.5f))
        verify { hitResult.createAnchor() }
        assertEquals(1, controller.getPlacedCount())
    }

    @Test
    fun `should not create an anchor when the tap misses all surfaces`() {
        every { frame.hitTest(0.5f, 0.5f) } returns emptyList()
        val controller = PlacementController(session, nodeFactory = { anchor })
        controller.setActiveModel(sofa)

        assertFalse(controller.onTap(frame, 0.5f, 0.5f))
        verify(exactly = 0) { hitResult.createAnchor() }
        assertEquals(0, controller.getPlacedCount())
    }

    @Test
    fun `should track the anchor created for a placed model`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        val id = controller.getPlacedIds().first()

        assertEquals(anchor, controller.getAnchorForModel(id))
    }

    @Test
    fun `should translate the selected node when dragged`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        assertTrue(controller.onDrag(10f, 5f))
    }

    @Test
    fun `should not translate when no model is placed`() {
        val controller = controllerWithSurfaceHit()

        assertFalse(controller.onDrag(10f, 5f))
    }

    @Test
    fun `should scale the selected node by the pinch factor`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        assertEquals(2f, controller.onPinch(2f))
    }

    @Test
    fun `should clamp pinch scale to the maximum`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        assertEquals(5f, controller.onPinch(10f))
    }

    @Test
    fun `should clamp pinch scale to the minimum`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        assertEquals(0.1f, controller.onPinch(0.001f))
    }

    @Test
    fun `should rotate the selected node by the twist angle`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        assertEquals(0.5f, controller.onTwist(0.5f))
    }

    @Test
    fun `should remove a placed model`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)

        val id = controller.getPlacedIds().first()

        assertTrue(controller.removePlacedModel(id))
        assertEquals(0, controller.getPlacedCount())
    }

    @Test
    fun `should return false when removing an unknown model`() {
        val controller = controllerWithSurfaceHit()

        assertFalse(controller.removePlacedModel("missing"))
    }

    @Test
    fun `should clear all placed models`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)
        controller.onTap(frame, 0.5f, 0.5f)
        controller.onTap(frame, 0.5f, 0.5f)

        assertEquals(2, controller.clearAllModels())
        assertEquals(0, controller.getPlacedCount())
    }

    @Test
    fun `should clear the active model`() {
        val controller = controllerWithSurfaceHit()
        controller.setActiveModel(sofa)

        controller.setActiveModel(null)

        assertNull(controller.getActiveModel())
    }
}