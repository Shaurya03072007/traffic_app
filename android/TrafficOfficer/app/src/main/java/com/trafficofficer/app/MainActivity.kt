package com.trafficofficer.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.trafficofficer.app.data.model.UserProfile
import com.trafficofficer.app.data.model.VideoDetectionsResult
import com.trafficofficer.app.ui.capture.VideoCaptureScreen
import com.trafficofficer.app.ui.dashboard.OfficerDashboardScreen
import com.trafficofficer.app.ui.login.LoginScreen
import com.trafficofficer.app.ui.review.OfficerReviewScreen
import com.trafficofficer.app.ui.theme.TrafficOfficerTheme

sealed class Screen {
    object Login : Screen()
    object Dashboard : Screen()
    data class VideoCapture(val isLiveMode: Boolean) : Screen()
    data class CaseReview(val detections: VideoDetectionsResult) : Screen()
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        com.trafficofficer.app.data.api.ApiClient.baseUrl = getString(R.string.api_base_url)
        
        setContent {
            TrafficOfficerTheme {
                var currentScreen by remember { mutableStateOf<Screen>(Screen.Login) }
                var currentUser by remember { mutableStateOf<UserProfile?>(null) }

                when (val screen = currentScreen) {
                    is Screen.Login -> {
                        LoginScreen(
                            onLoginSuccess = { user ->
                                currentUser = user
                                // Security verification: Only opens officer workflow
                                currentScreen = Screen.Dashboard
                            }
                        )
                    }

                    is Screen.Dashboard -> {
                        currentUser?.let { user ->
                            OfficerDashboardScreen(
                                user = user,
                                onCaptureLiveVideo = {
                                    currentScreen = Screen.VideoCapture(isLiveMode = true)
                                },
                                onUploadVideo = {
                                    currentScreen = Screen.VideoCapture(isLiveMode = false)
                                },
                                onLogout = {
                                    currentUser = null
                                    currentScreen = Screen.Login
                                }
                            )
                        } ?: run {
                            currentScreen = Screen.Login
                        }
                    }

                    is Screen.VideoCapture -> {
                        VideoCaptureScreen(
                            isLiveCaptureMode = screen.isLiveMode,
                            onBack = { currentScreen = Screen.Dashboard },
                            onAnalysisComplete = { detections ->
                                currentScreen = Screen.CaseReview(detections)
                            }
                        )
                    }

                    is Screen.CaseReview -> {
                        currentUser?.let { user ->
                            OfficerReviewScreen(
                                user = user,
                                detections = screen.detections,
                                onBack = { currentScreen = Screen.Dashboard },
                                onSubmitSuccess = {
                                    Toast.makeText(this, "Violation case submitted successfully!", Toast.LENGTH_LONG).show()
                                    currentScreen = Screen.Dashboard
                                }
                            )
                        } ?: run {
                            currentScreen = Screen.Login
                        }
                    }
                }
            }
        }
    }
}
