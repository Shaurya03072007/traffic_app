package com.trafficofficer.app.data.model

import com.google.gson.annotations.SerializedName

// 1. AUTH MODELS
data class LoginRequest(
    val email: String,
    val password: String
)

data class UserProfile(
    val id: String,
    val email: String,
    @SerializedName("full_name") val fullName: String,
    val role: String, // "officer" | "admin"
    @SerializedName("badge_number") val badgeNumber: String?,
    val department: String?,
    val phone: String?
)

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
    val user: UserProfile
)

// 2. AI DETECTION MODELS
data class AIDetectionItem(
    val detected: Boolean,
    val confidence: Double,
    val details: String? = null
)

data class VideoDetectionsResult(
    @SerializedName("case_id") val caseId: String,
    @SerializedName("processed_frames") val processedFrames: Int,
    @SerializedName("duration_seconds") val durationSeconds: Double,
    @SerializedName("helmet_violation") val helmetViolation: AIDetectionItem,
    @SerializedName("triple_riding") val tripleRiding: AIDetectionItem,
    @SerializedName("motorcycle_detected") val motorcycleDetected: Boolean,
    @SerializedName("riders_count") val ridersCount: Int,
    @SerializedName("detected_license_plate") val detectedLicensePlate: String?,
    @SerializedName("plate_confidence") val plateConfidence: Double,
    @SerializedName("evidence_frame_url") val evidenceFrameUrl: String?,
    @SerializedName("evidence_video_url") val evidenceVideoUrl: String?,
    @SerializedName("model_name") val modelName: String
)

// 3. VIOLATION SUBMISSION & CASE MODELS
data class ViolationCreateRequest(
    @SerializedName("vehicle_number") val vehicleNumber: String,
    val location: String,
    val latitude: Double,
    val longitude: Double,
    
    // AI flags verified by officer
    @SerializedName("helmet_violation") val helmetViolation: Boolean,
    @SerializedName("triple_riding") val tripleRiding: Boolean,
    @SerializedName("ai_confidence") val aiConfidence: Double,
    
    // Officer manual observations
    @SerializedName("minor_riding") val minorRiding: Boolean,
    @SerializedName("no_license") val noLicense: Boolean,
    @SerializedName("drunk_driving") val drunkDriving: Boolean,
    @SerializedName("drunk_driving_notes") val drunkDrivingNotes: String?,
    
    @SerializedName("evidence_video_url") val evidenceVideoUrl: String?,
    @SerializedName("evidence_image_url") val evidenceImageUrl: String?,
    @SerializedName("officer_remarks") val officerRemarks: String?
)

data class ViolationCase(
    val id: String,
    @SerializedName("case_number") val caseNumber: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    val location: String,
    val timestamp: String,
    @SerializedName("helmet_violation") val helmetViolation: Boolean,
    @SerializedName("triple_riding") val tripleRiding: Boolean,
    @SerializedName("minor_riding") val minorRiding: Boolean,
    @SerializedName("no_license") val noLicense: Boolean,
    @SerializedName("drunk_driving") val drunkDriving: Boolean,
    val status: String,
    @SerializedName("fine_amount") val fineAmount: Int
)
