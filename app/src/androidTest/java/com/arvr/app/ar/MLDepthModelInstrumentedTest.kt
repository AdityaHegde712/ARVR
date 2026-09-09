package com.arvr.app.ar

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * LOCKED — TDD red phase (T2.3, T2.4). Acceptance test for the real Depth
 * Anything V2 Small float TFLite model.
 *
 * This test is DESIGNED TO PASS once the builder downloads the 94MB model to
 * assets/ml/depth_anything_v2_small_float.tflite. Until then it fails with a
 * clear message. It loads the real model, feeds a dummy 518x518x3 input, and
 * verifies the output tensor shape and value range.
 */
@RunWith(AndroidJUnit4::class)
class MLDepthModelInstrumentedTest {

    private val modelAssetPath = "ml/depth_anything_v2_small_float.tflite"

    private fun readAssetBytes(path: String): ByteArray? {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        return try {
            context.assets.open(path).use { it.readBytes() }
        } catch (e: Exception) {
            null
        }
    }

    private fun loadInterpreter(): Interpreter {
        val bytes = readAssetBytes(modelAssetPath)
        if (bytes == null) {
            fail("Depth Anything V2 Small float TFLite model missing at assets/$modelAssetPath (task T2.4)")
        }
        return Interpreter(bytes)
    }

    @Test
    fun should_load_the_depth_anything_model_from_assets() {
        val interpreter = loadInterpreter()
        try {
            val input = interpreter.getInputTensor(0)

            assertEquals(4, input.shape().size)
            assertEquals(1, input.shape()[0])
            assertEquals(518, input.shape()[1])
            assertEquals(518, input.shape()[2])
            assertEquals(3, input.shape()[3])
            assertEquals(DataType.FLOAT32, input.dataType())
        } finally {
            interpreter.close()
        }
    }

    @Test
    fun should_run_inference_on_dummy_input_and_produce_a_518_by_518_depth_map() {
        val interpreter = loadInterpreter()
        try {
            val input = interpreter.getInputTensor(0)
            val output = interpreter.getOutputTensor(0)

            assertEquals(4, output.shape().size)
            assertEquals(1, output.shape()[0])
            assertEquals(input.shape()[1], output.shape()[1])
            assertEquals(input.shape()[2], output.shape()[2])
            assertEquals(1, output.shape()[3])
            assertEquals(DataType.FLOAT32, output.dataType())

            val inputBuffer = ByteBuffer.allocateDirect(input.numBytes()).order(ByteOrder.nativeOrder())
            val inputFloats = inputBuffer.asFloatBuffer()
            for (i in 0 until input.numElements()) inputFloats.put(0.5f)

            val outputBuffer = ByteBuffer.allocateDirect(output.numBytes()).order(ByteOrder.nativeOrder())
            interpreter.run(inputBuffer, outputBuffer)

            val depth = outputBuffer.asFloatBuffer()
            val values = FloatArray(output.numElements())
            depth.get(values)

            assertEquals(518 * 518, values.size)
            for (v in values) {
                assertTrue(v.isFinite(), "depth value must be finite but was $v")
                assertTrue(v in 0f..255f, "depth value $v outside [0, 255]")
            }
        } finally {
            interpreter.close()
        }
    }
}