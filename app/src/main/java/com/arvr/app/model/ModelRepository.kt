package com.arvr.app.model

import android.content.Context

class ModelLoadException(message: String, cause: Throwable? = null) : Exception(message, cause)

class ModelInstance(val model: FurnitureModel, val glbBytes: ByteArray)

class ModelRepository(private val context: Context) {

    private val instanceCache = mutableMapOf<String, ModelInstance>()
    private val rawBytesCache = mutableMapOf<String, ByteArray>()

    fun listModels(): List<FurnitureModel> {
        val files = context.assets.list(MODELS_DIR) ?: emptyArray()
        return files
            .filter { it.endsWith(GLB_EXT) && !it.startsWith("_") }
            .map { name ->
                val id = name.removeSuffix(GLB_EXT)
                FurnitureModel(
                    id = id,
                    name = id.replaceFirstChar { it.uppercase() },
                    assetPath = "$MODELS_DIR/$name",
                    category = "furniture",
                    defaultScale = 1.0f,
                    defaultYawDegrees = 0f,
                )
            }
    }

    fun getModel(id: String): FurnitureModel? =
        listModels().find { it.id == id }

    fun loadModel(id: String): ModelInstance {
        instanceCache[id]?.let { return it }

        val model = getModel(id)
            ?: throw ModelLoadException("Model not found: $id")

        val bytes = rawBytesCache.getOrPut(id) {
            val raw = context.assets.open(model.assetPath).use { it.readBytes() }
            if (raw.size < 4) {
                throw ModelLoadException("File too small to be a valid GLB: ${model.assetPath}")
            }
            val magic = raw.copyOfRange(0, 4).toString(Charsets.US_ASCII)
            if (magic != GLB_MAGIC) {
                throw ModelLoadException(
                    "Invalid GLB magic in ${model.assetPath}: expected '$GLB_MAGIC', got '$magic'"
                )
            }
            raw
        }

        val instance = ModelInstance(model, bytes)
        instanceCache[id] = instance
        return instance
    }

    fun releaseModel(id: String) {
        instanceCache.remove(id)
    }

    companion object {
        private const val MODELS_DIR = "models"
        private const val GLB_EXT = ".glb"
        private const val GLB_MAGIC = "glTF"
    }
}
