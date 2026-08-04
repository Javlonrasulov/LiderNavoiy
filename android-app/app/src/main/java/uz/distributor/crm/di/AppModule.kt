package uz.distributor.crm.di

import android.content.Context
import androidx.room.Room
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.local.AppDatabase
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.TokenRefreshInterceptor
import uz.distributor.crm.security.ApiDns
import uz.distributor.crm.security.TlsPins
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides @Singleton
    fun provideGson(): Gson = GsonBuilder().create()

    @Provides @Singleton
    fun provideOkHttpClient(
        tokenHolder: TokenHolder,
        tokenRefreshInterceptor: TokenRefreshInterceptor,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            // BODY multipart rasmni sekinlashtiradi / timeout beradi
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.HEADERS
            else HttpLoggingInterceptor.Level.NONE
        }
        val authInterceptor = Interceptor { chain ->
            val token = tokenHolder.peekToken()
            val request = if (token != null) {
                chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build()
            } else chain.request()
            chain.proceed(request)
        }
        val builder = OkHttpClient.Builder()
            .dns(ApiDns)
            .addInterceptor(authInterceptor)
            .addInterceptor(tokenRefreshInterceptor)
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .callTimeout(90, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
        TlsPins.pinnerOrNull()?.let { builder.certificatePinner(it) }
        return builder.build()
    }

    @Provides @Singleton
    fun provideRetrofit(client: OkHttpClient, gson: Gson): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

    @Provides @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService =
        retrofit.create(ApiService::class.java)

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "distributor_crm.db")
            .fallbackToDestructiveMigration()
            .build()
}
