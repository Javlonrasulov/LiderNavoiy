package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.favoritesDataStore by preferencesDataStore("client_favorites")

@Singleton
class FavoritesRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val favoritesKey = stringSetPreferencesKey("product_ids")

    val favoriteIds: Flow<Set<String>> = context.favoritesDataStore.data.map { prefs ->
        prefs[favoritesKey].orEmpty()
    }

    suspend fun toggle(productId: String) {
        context.favoritesDataStore.edit { prefs ->
            val current = prefs[favoritesKey].orEmpty().toMutableSet()
            if (current.contains(productId)) current.remove(productId) else current.add(productId)
            prefs[favoritesKey] = current
        }
    }

    suspend fun setFavorite(productId: String, favorite: Boolean) {
        context.favoritesDataStore.edit { prefs ->
            val current = prefs[favoritesKey].orEmpty().toMutableSet()
            if (favorite) current.add(productId) else current.remove(productId)
            prefs[favoritesKey] = current
        }
    }
}
