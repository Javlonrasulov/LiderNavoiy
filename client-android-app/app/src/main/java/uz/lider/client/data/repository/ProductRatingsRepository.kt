package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.SetProductRatingRequest
import javax.inject.Inject
import javax.inject.Singleton

private val Context.productRatingsDataStore by preferencesDataStore("client_product_ratings")

@Singleton
class ProductRatingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
) {
    private val cache = MutableStateFlow<Map<String, Int>>(emptyMap())

    fun rating(productId: String): Flow<Int?> = cache.map { it[productId] }

    suspend fun refreshAll() {
        runCatching {
            val remote = api.getProductRatings().filterValues { it in 1..5 }
            cache.value = remote
            context.productRatingsDataStore.edit { prefs ->
                prefs.clear()
                remote.forEach { (id, stars) ->
                    prefs[intPreferencesKey("rating_$id")] = stars
                }
            }
        }
    }

    suspend fun loadRating(productId: String): Int? {
        cache.value[productId]?.let { return it }
        val localKey = intPreferencesKey("rating_$productId")
        val local = runCatching {
            context.productRatingsDataStore.data.first()[localKey]?.takeIf { it in 1..5 }
        }.getOrNull()
        if (local != null) {
            cache.update { it + (productId to local) }
        }
        runCatching {
            val remote = api.getProductRating(productId).stars?.takeIf { it in 1..5 }
            if (remote != null) {
                cache.update { it + (productId to remote) }
                context.productRatingsDataStore.edit { it[localKey] = remote }
                return remote
            }
        }
        return local
    }

    suspend fun setRating(productId: String, stars: Int) {
        if (stars !in 1..5) return
        cache.update { it + (productId to stars) }
        val key = intPreferencesKey("rating_$productId")
        context.productRatingsDataStore.edit { prefs -> prefs[key] = stars }
        runCatching {
            api.setProductRating(productId, SetProductRatingRequest(stars))
        }
    }
}
