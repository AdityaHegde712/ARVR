package com.arvr.app.model

/**
 * Source-agnostic catalog of furniture models.
 *
 * The app treats every mesh as if it were fetched from a provider. Today the only
 * live implementation is [LocalAssetModelProvider] (offline-first, APK assets);
 * [RemoteMarketplaceModelProvider] is the prepared seam for fetching meshes from
 * marketplace sites (e.g. Amazon product 3D assets) once the webfetch phase begins.
 */
interface ModelProvider {
    /** Human-readable provider name, shown in the picker header. */
    val providerName: String

    /** Lists the models this provider can currently serve. */
    suspend fun listAvailable(): List<FurnitureModel>

    /**
     * Resolves a model id to loadable GLB bytes.
     * @throws ModelLoadException when the model cannot be served.
     */
    suspend fun fetch(id: String): ModelInstance
}

/** Serves models bundled in the APK via the (test-pinned) [ModelRepository]. */
class LocalAssetModelProvider(
    private val repository: ModelRepository,
) : ModelProvider {

    override val providerName: String = "Bundled catalog"

    override suspend fun listAvailable(): List<FurnitureModel> = repository.listModels()

    override suspend fun fetch(id: String): ModelInstance = repository.loadModel(id)
}

/** Thrown by providers whose backing service is not wired up yet. */
class ProviderUnavailableException(message: String) : Exception(message)

/**
 * STUB — future marketplace integration (post-core-functionality webfetch phase).
 *
 * Planned flow:
 *  1. `listAvailable()` → GET `{baseUrl}/catalog` → parse product entries that expose
 *     a GLB/GLTF asset URL (Amazon and several furniture retailers publish 3D assets
 *     for their AR "view in your room" features).
 *  2. `fetch(id)`      → download the GLB to app-private storage, validate the
 *     `glTF` magic exactly as [ModelRepository] does, cache on disk, return bytes.
 *  3. Downloaded models appear in the picker alongside bundled ones (the picker
 *     already consumes the [ModelProvider] interface, so no UI changes needed).
 *
 * Deliberately throws until the webfetch phase is authorized — the app is
 * offline-first for the MVP.
 */
class RemoteMarketplaceModelProvider(
    @Suppress("unused") private val baseUrl: String,
) : ModelProvider {

    override val providerName: String = "Marketplace (coming soon)"

    override suspend fun listAvailable(): List<FurnitureModel> {
        // Intentionally empty rather than throwing: composite listings should not
        // break when the marketplace backend is absent.
        return emptyList()
    }

    override suspend fun fetch(id: String): ModelInstance {
        throw ProviderUnavailableException(
            "Marketplace fetching is not enabled yet (offline-first MVP). Model requested: $id",
        )
    }
}

/**
 * Merges several providers into one catalog. The picker consumes this, so adding
 * the live marketplace later is a one-line change in MainActivity.
 */
class CompositeModelProvider(
    private val providers: List<ModelProvider>,
) : ModelProvider {

    override val providerName: String = "All sources"

    override suspend fun listAvailable(): List<FurnitureModel> =
        providers.flatMap { runCatching { it.listAvailable() }.getOrDefault(emptyList()) }

    override suspend fun fetch(id: String): ModelInstance {
        for (provider in providers) {
            val hasIt = runCatching {
                provider.listAvailable().any { it.id == id }
            }.getOrDefault(false)
            if (hasIt) return provider.fetch(id)
        }
        throw ModelLoadException("No provider can serve model: $id")
    }
}
