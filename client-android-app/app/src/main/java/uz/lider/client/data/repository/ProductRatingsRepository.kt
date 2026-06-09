package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.productRatingsDataStore by preferencesDataStore("client_product_ratings")

@Singleton
class ProductRatingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun rating(productId: String): Flow<Int?> {
        val key = intPreferencesKey("rating_$productId")
        return context.productRatingsDataStore.data.map { prefs ->
            prefs[key]?.takeIf { it in 1..5 }
        }
    }

    suspend fun setRating(productId: String, stars: Int) {
        if (stars !in 1..5) return
        val key = intPreferencesKey("rating_$productId")
        context.productRatingsDataStore.edit { prefs ->
            prefs[key] = stars
        }
    }
}
