package uz.distributor.crm.data.local

import androidx.room.*
import uz.distributor.crm.domain.model.LocationPoint

@Entity(tableName = "pending_locations")
data class PendingLocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val latitude: Double,
    val longitude: Double,
    val speed: Float?,
    val accuracy: Float?,
    val altitude: Double?,
    val bearing: Float?,
    val recordedAt: Long,
    val deviceId: String?,
    val syncStatus: String = SyncStatus.PENDING.name,
)

@Entity(tableName = "clients_cache")
data class ClientEntity(
    @PrimaryKey val id: String,
    val code: String,
    val name: String,
    val address: String?,
    val balance: Double,
    val latitude: Double?,
    val longitude: Double?,
    val cachedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "products_cache")
data class ProductEntity(
    @PrimaryKey val id: String,
    val code: String,
    val name: String,
    val category: String?,
    val price: Double,
    val unit: String,
    val stockBalance: Double,
    val cachedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "cart_items")
data class CartItemEntity(
    @PrimaryKey val productId: String,
    val productCode: String,
    val productName: String,
    val price: Double,
    val quantity: Double,
    val unit: String,
    val category: String?,
)

@Entity(tableName = "pending_orders")
data class PendingOrderEntity(
    @PrimaryKey val offlineId: String,
    val clientId: String,
    val itemsJson: String,
    val totalAmount: Double,
    val syncStatus: String = SyncStatus.PENDING.name,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "pending_visits")
data class PendingVisitEntity(
    @PrimaryKey val offlineId: String,
    val clientId: String,
    val visitedAt: Long,
    val checkInLat: Double?,
    val checkInLng: Double?,
    val orderTotal: Double,
    val syncStatus: String = SyncStatus.PENDING.name,
)

enum class SyncStatus { PENDING, SYNCING, SYNCED, FAILED }

@Dao interface PendingLocationDao {
    @Insert suspend fun insert(entity: PendingLocationEntity): Long
    @Query("SELECT * FROM pending_locations WHERE syncStatus = 'PENDING' ORDER BY recordedAt ASC LIMIT :limit")
    suspend fun getPending(limit: Int = 100): List<PendingLocationEntity>
    @Query("UPDATE pending_locations SET syncStatus = :status WHERE id IN (:ids)")
    suspend fun updateStatus(ids: List<Long>, status: String)
    @Query("DELETE FROM pending_locations WHERE syncStatus = 'SYNCED' AND recordedAt < :before")
    suspend fun deleteOldSynced(before: Long)
}

@Dao interface ClientDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertAll(clients: List<ClientEntity>)
    @Query("SELECT * FROM clients_cache ORDER BY name ASC") suspend fun getAll(): List<ClientEntity>
    @Query("SELECT * FROM clients_cache WHERE id = :id") suspend fun getById(id: String): ClientEntity?
    @Query("SELECT * FROM clients_cache WHERE name LIKE '%' || :q || '%' OR code LIKE '%' || :q || '%'")
    suspend fun search(q: String): List<ClientEntity>
}

@Dao interface ProductDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insertAll(products: List<ProductEntity>)
    @Query("SELECT * FROM products_cache ORDER BY category, name") suspend fun getAll(): List<ProductEntity>
    @Query("SELECT DISTINCT category FROM products_cache WHERE category IS NOT NULL") suspend fun getCategories(): List<String>
    @Query("SELECT * FROM products_cache WHERE category = :cat") suspend fun getByCategory(cat: String): List<ProductEntity>
    @Query("SELECT * FROM products_cache WHERE id = :id") suspend fun getById(id: String): ProductEntity?
}

@Dao interface CartDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insert(item: CartItemEntity)
    @Query("SELECT * FROM cart_items") suspend fun getAll(): List<CartItemEntity>
    @Query("DELETE FROM cart_items WHERE productId = :id") suspend fun delete(id: String)
    @Query("DELETE FROM cart_items") suspend fun clear()
}

@Dao interface PendingOrderDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insert(order: PendingOrderEntity)
    @Query("SELECT * FROM pending_orders WHERE syncStatus = 'PENDING'") suspend fun getPending(): List<PendingOrderEntity>
    @Query("UPDATE pending_orders SET syncStatus = :status WHERE offlineId = :id")
    suspend fun updateStatus(id: String, status: String)
}

@Dao interface PendingVisitDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insert(visit: PendingVisitEntity)
    @Query("SELECT * FROM pending_visits WHERE syncStatus = 'PENDING'") suspend fun getPending(): List<PendingVisitEntity>
    @Query("UPDATE pending_visits SET syncStatus = :status WHERE offlineId = :id")
    suspend fun updateStatus(id: String, status: String)
}

@Database(
    entities = [PendingLocationEntity::class, ClientEntity::class, ProductEntity::class,
        CartItemEntity::class, PendingOrderEntity::class, PendingVisitEntity::class],
    version = 1, exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingLocationDao(): PendingLocationDao
    abstract fun clientDao(): ClientDao
    abstract fun productDao(): ProductDao
    abstract fun cartDao(): CartDao
    abstract fun pendingOrderDao(): PendingOrderDao
    abstract fun pendingVisitDao(): PendingVisitDao
}

fun LocationPoint.toEntity(deviceId: String?) = PendingLocationEntity(
    latitude = latitude, longitude = longitude, speed = speed, accuracy = accuracy,
    altitude = altitude, bearing = bearing, recordedAt = recordedAt, deviceId = deviceId,
)

fun ClientEntity.toDomain() = uz.distributor.crm.domain.model.Client(
    id = id, code = code, name = name, address = address, balance = balance,
    latitude = latitude, longitude = longitude,
)

fun ProductEntity.toDomain() = uz.distributor.crm.domain.model.Product(
    id = id, code = code, name = name, category = category ?: "", price = price,
    unit = unit, stockBalance = stockBalance,
)
