package com.trafficofficer.app.data.api

import com.trafficofficer.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface TrafficApiService {

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>

    @Multipart
    @POST("api/videos/upload")
    suspend fun uploadVideo(
        @Part video: MultipartBody.Part
    ): Response<VideoDetectionsResult>

    @POST("api/violations")
    suspend fun submitViolation(
        @Body request: ViolationCreateRequest
    ): Response<ViolationCase>

    @GET("api/officer/cases")
    suspend fun getOfficerCases(): Response<List<ViolationCase>>
}

object ApiClient {

    // LAN environment:
    // Change this IP to the developer PC's Wi-Fi / Ethernet IPv4 address.
    // Example: http://192.168.1.100:8000/
    //
    // Android Emulator running on the same PC:
    // http://10.0.2.2:8000/

    lateinit var baseUrl: String

    private var authToken: String? = null

    fun setToken(token: String?) {
        this.authToken = token
    }

    fun getToken(): String? = authToken

    fun setLanServerIp(ip: String, port: Int = 8000) {
        val cleanIp = ip
            .removePrefix("http://")
            .removePrefix("https://")
            .trimEnd('/')

        this.baseUrl = "http://$cleanIp:$port/"
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val original = chain.request()

            val requestBuilder = original.newBuilder()

            authToken?.let {
                requestBuilder.header(
                    "Authorization",
                    "Bearer $it"
                )
            }

            chain.proceed(requestBuilder.build())
        }
        .addInterceptor(loggingInterceptor)
        .build()

    fun getService(): TrafficApiService {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TrafficApiService::class.java)
    }
}

