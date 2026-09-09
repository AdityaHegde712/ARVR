package com.arvr.app.model

data class FurnitureModel(
    val id: String,
    val name: String,
    val assetPath: String,
    val category: String,
    val defaultScale: Float,
    val defaultYawDegrees: Float,
) {
    init {
        require(id.isNotBlank()) { "id must not be blank" }
        require(name.isNotBlank()) { "name must not be blank" }
        require(assetPath.isNotBlank()) { "assetPath must not be blank" }
        require(assetPath.endsWith(".glb")) { "assetPath must end with .glb" }
        require(defaultScale > 0f) { "defaultScale must be > 0" }
    }
}
