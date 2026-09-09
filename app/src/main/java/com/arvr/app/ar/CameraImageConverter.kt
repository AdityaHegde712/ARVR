package com.arvr.app.ar

import android.media.Image

/**
 * Converts an ARCore camera [Image] (YUV_420_888) into a packed RGB ByteArray
 * (3 bytes per pixel, row-major) — the input format [MLDepthSource.runInference]
 * expects. Pure-JVM math so it stays unit-testable.
 */
object CameraImageConverter {

    /** Snapshot of the planes we need, so the Image can be closed immediately. */
    class YuvData(
        val width: Int,
        val height: Int,
        val y: ByteArray,
        val u: ByteArray,
        val v: ByteArray,
        val yRowStride: Int,
        val uvRowStride: Int,
        val uvPixelStride: Int,
    )

    /** Copies plane buffers out of [image]; caller must still close the image. */
    fun snapshot(image: Image): YuvData {
        val yPlane = image.planes[0]
        val uPlane = image.planes[1]
        val vPlane = image.planes[2]

        fun copy(buffer: java.nio.ByteBuffer): ByteArray {
            val bytes = ByteArray(buffer.remaining())
            buffer.get(bytes)
            return bytes
        }

        return YuvData(
            width = image.width,
            height = image.height,
            y = copy(yPlane.buffer),
            u = copy(uPlane.buffer),
            v = copy(vPlane.buffer),
            yRowStride = yPlane.rowStride,
            uvRowStride = uPlane.rowStride,
            uvPixelStride = uPlane.pixelStride,
        )
    }

    /** BT.601 YUV → RGB. Safe (clamped) but not SIMD-fast; run off the main thread. */
    fun toRgb(yuv: YuvData): ByteArray {
        val out = ByteArray(yuv.width * yuv.height * 3)
        var outIdx = 0
        for (row in 0 until yuv.height) {
            val yRow = row * yuv.yRowStride
            val uvRow = (row / 2) * yuv.uvRowStride
            for (col in 0 until yuv.width) {
                val yVal = (yuv.y[yRow + col].toInt() and 0xFF)
                val uvOffset = uvRow + (col / 2) * yuv.uvPixelStride
                val uVal = (yuv.u.getOrElse(uvOffset) { 0 }.toInt() and 0xFF) - 128
                val vVal = (yuv.v.getOrElse(uvOffset) { 0 }.toInt() and 0xFF) - 128

                val r = (yVal + 1.402f * vVal).toInt().coerceIn(0, 255)
                val g = (yVal - 0.344f * uVal - 0.714f * vVal).toInt().coerceIn(0, 255)
                val b = (yVal + 1.772f * uVal).toInt().coerceIn(0, 255)

                out[outIdx++] = r.toByte()
                out[outIdx++] = g.toByte()
                out[outIdx++] = b.toByte()
            }
        }
        return out
    }
}
