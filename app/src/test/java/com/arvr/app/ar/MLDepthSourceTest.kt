package com.arvr.app.ar

import android.content.Context
import android.content.res.AssetManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.Tensor
import java.io.ByteArrayInputStream
import java.io.FileNotFoundException
import java.nio.ByteBuffer

/**
 * LOCKED — TDD red phase. MLDepthSource must load the TFLite model, resize
 * camera frames to the 518x518 model input, run inference, and return a
 * DepthMap matching the output tensor. The stub throws NotImplementedError,
 * so every test fails until the builder implements it.
 */
class MLDepthSourceTest {

    private val interpreter = mockk<Interpreter>()
    private val inputTensor = mockk<Tensor>()
    private val outputTensor = mockk<Tensor>()

    private fun sourceWithMockedInterpreter(): MLDepthSource {
        every { interpreter.getInputTensor(0) } returns inputTensor
        every { inputTensor.shape() } returns intArrayOf(1, 518, 518, 3)
        every { inputTensor.dataType() } returns DataType.FLOAT32
        every { interpreter.getOutputTensor(0) } returns outputTensor
        every { outputTensor.shape() } returns intArrayOf(1, 518, 518, 1)
        every { outputTensor.dataType() } returns DataType.FLOAT32
        return MLDepthSource(interpreterProvider = { interpreter })
    }

    private fun contextWithModelAsset(): Context {
        val context = mockk<Context>()
        val assetManager = mockk<AssetManager>()
        every { context.assets } returns assetManager
        every { assetManager.open("ml/depth_anything_v2_small_float.tflite") } returns
            ByteArrayInputStream(ByteArray(64))
        return context
    }

    @Test
    fun `should report unavailable before the model is loaded`() {
        val source = sourceWithMockedInterpreter()

        assertFalse(source.isAvailable())
    }

    @Test
    fun `should load the depth model from assets`() {
        val source = sourceWithMockedInterpreter()

        assertTrue(source.load(contextWithModelAsset()))
        assertTrue(source.isAvailable())
    }

    @Test
    fun `should report unavailable when the model asset is missing`() {
        val context = mockk<Context>()
        val assetManager = mockk<AssetManager>()
        every { context.assets } returns assetManager
        every { assetManager.open("ml/depth_anything_v2_small_float.tflite") } throws
            FileNotFoundException("missing")

        val source = sourceWithMockedInterpreter()

        assertFalse(source.load(context))
        assertFalse(source.isAvailable())
    }

    @Test
    fun `should allocate a 518 by 518 by 3 float input buffer for inference`() {
        val source = sourceWithMockedInterpreter()
        source.load(contextWithModelAsset())
        val inputSlot = slot<ByteBuffer>()
        every { interpreter.run(capture(inputSlot), any()) } returns Unit

        source.runInference(ByteArray(640 * 480 * 3), 640, 480)

        assertEquals(518 * 518 * 3 * 4, inputSlot.captured.capacity())
    }

    @Test
    fun `should produce a depth map matching the output tensor shape`() {
        val source = sourceWithMockedInterpreter()
        source.load(contextWithModelAsset())
        every { interpreter.run(any(), any()) } answers {
            val output = secondArg<ByteBuffer>()
            val floats = output.asFloatBuffer()
            for (i in 0 until 518 * 518) floats.put(0.5f)
        }

        val depth = source.runInference(ByteArray(640 * 480 * 3), 640, 480)

        assertNotNull(depth)
        assertEquals(518, depth?.width)
        assertEquals(518, depth?.height)
        assertEquals(518 * 518, depth?.data?.size)
        assertEquals(0.5f, depth?.data?.get(0))
    }

    @Test
    fun `should return null when inference fails`() {
        val source = sourceWithMockedInterpreter()
        source.load(contextWithModelAsset())
        every { interpreter.run(any(), any()) } throws RuntimeException("inference boom")

        assertNull(source.runInference(ByteArray(640 * 480 * 3), 640, 480))
    }

    @Test
    fun `should close the interpreter on close`() {
        val source = sourceWithMockedInterpreter()
        source.load(contextWithModelAsset())

        source.close()

        verify { interpreter.close() }
    }
}