package com.arvr.app.ar

import android.content.Context
import org.tensorflow.lite.Interpreter
import java.io.FileNotFoundException
import java.nio.ByteBuffer
import java.nio.ByteOrder

class DepthMap(val width: Int, val height: Int, val data: FloatArray)

class MLModelLoadException(message: String, cause: Throwable? = null) : Exception(message, cause)

class MLDepthSource(private val interpreterProvider: (ByteArray) -> Interpreter) {

    private var interpreter: Interpreter? = null
    private var inputShape: IntArray = intArrayOf()
    private var outputShape: IntArray = intArrayOf()

    fun load(context: Context): Boolean {
        return try {
            val bytes = context.assets.open(MODEL_PATH).use { it.readBytes() }
            val interp = interpreterProvider(bytes)
            interpreter = interp
            inputShape = interp.getInputTensor(0).shape()
            outputShape = interp.getOutputTensor(0).shape()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun isAvailable(): Boolean = interpreter != null

    fun runInference(rgb: ByteArray, width: Int, height: Int): DepthMap? {
        val interp = interpreter ?: return null
        return try {
            val inputH = inputShape[1]
            val inputW = inputShape[2]
            val inputChannels = inputShape[3]

            val inputBuffer = ByteBuffer
                .allocateDirect(inputH * inputW * inputChannels * 4)
                .order(ByteOrder.nativeOrder())

            val inputFloats = inputBuffer.asFloatBuffer()
            for (y in 0 until inputH) {
                for (x in 0 until inputW) {
                    val srcX = (x.toFloat() / inputW * width).toInt().coerceIn(0, width - 1)
                    val srcY = (y.toFloat() / inputH * height).toInt().coerceIn(0, height - 1)
                    val srcIdx = (srcY * width + srcX) * 3
                    for (c in 0 until inputChannels) {
                        val value = if (srcIdx + c < rgb.size) {
                            (rgb[srcIdx + c].toInt() and 0xFF) / 255.0f
                        } else {
                            0.5f
                        }
                        inputFloats.put(value)
                    }
                }
            }

            val outputH = outputShape[1]
            val outputW = outputShape[2]
            val outputBuffer = ByteBuffer
                .allocateDirect(outputH * outputW * 4)
                .order(ByteOrder.nativeOrder())

            interp.run(inputBuffer, outputBuffer)

            outputBuffer.rewind()
            val depthData = FloatArray(outputH * outputW)
            outputBuffer.asFloatBuffer().get(depthData)

            DepthMap(outputW, outputH, depthData)
        } catch (e: Exception) {
            null
        }
    }

    fun close() {
        try {
            interpreter?.close()
        } catch (_: Throwable) {
        }
        interpreter = null
    }

    companion object {
        private const val MODEL_PATH = "ml/depth_anything_v2_small_float.tflite"
    }
}
