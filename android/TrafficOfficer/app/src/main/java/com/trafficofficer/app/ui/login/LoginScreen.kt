package com.trafficofficer.app.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trafficofficer.app.data.api.ApiClient
import com.trafficofficer.app.data.model.LoginRequest
import com.trafficofficer.app.data.model.UserProfile
import com.trafficofficer.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: (UserProfile) -> Unit
) {
    var email by remember { mutableStateOf("officer.sharma@trafficpolice.gov.in") }
    var password by remember { mutableStateOf("OfficerPassword@123") }
    val defaultIp = androidx.compose.ui.res.stringResource(id = com.trafficofficer.app.R.string.api_base_url)
        .removePrefix("http://")
        .removePrefix("https://")
        .substringBefore(":")
    var lanIp by remember { mutableStateOf(defaultIp) }
    var showLanConfig by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy900)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Navy800),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Text(
                    text = "TRAFFIC OFFICER",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = PoliceGold
                )
                Text(
                    text = "Enforcement Division • Field Portal",
                    fontSize = 13.sp,
                    color = SlateGray,
                    modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                )

                // Single unified login form - NO role selection!
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it; errorMessage = null },
                    label = { Text("Officer Email / Username") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = PoliceGold) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PoliceGold,
                        unfocusedBorderColor = Navy700
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; errorMessage = null },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = PoliceGold) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PoliceGold,
                        unfocusedBorderColor = Navy700
                    )
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage ?: "",
                        color = ViolationRed,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        isLoading = true
                        errorMessage = null
                        scope.launch {
                            try {
                                ApiClient.setLanServerIp(lanIp, 8000)
                                val response = ApiClient.getService().login(LoginRequest(email.trim(), password.trim()))
                                if (response.isSuccessful && response.body() != null) {
                                    val authRes = response.body()!!
                                    ApiClient.setToken(authRes.accessToken)
                                    // Security check: Verify user is authorized for field enforcement
                                    if (authRes.user.role == "officer" || authRes.user.role == "admin") {
                                        onLoginSuccess(authRes.user)
                                    } else {
                                        errorMessage = "Access denied: Account role is not authorized for field enforcement."
                                    }
                                } else {
                                    errorMessage = "Authentication failed. Please verify email and password."
                                }
                            } catch (e: Exception) {
                                errorMessage = "Cannot connect to server at $lanIp:8000. Ensure backend is running."
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PoliceGold),
                    shape = RoundedCornerShape(8.dp),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Navy900, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = "OFFICER LOGIN",
                            fontWeight = FontWeight.Bold,
                            color = Navy900,
                            fontSize = 15.sp
                        )
                    }
                }

                // Collapsible LAN Host Setting for easy college testing
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = { showLanConfig = !showLanConfig }) {
                    Icon(Icons.Default.Settings, contentDescription = null, tint = SlateGray, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = if (showLanConfig) "Hide LAN Settings" else "LAN Server IP ($defaultIp / Wi-Fi IP)", color = SlateGray, fontSize = 12.sp)
                }

                if (showLanConfig) {
                    OutlinedTextField(
                        value = lanIp,
                        onValueChange = { lanIp = it },
                        label = { Text("PC IP (e.g. 192.168.1.100 or $defaultIp)") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PoliceGold,
                            unfocusedBorderColor = Navy700
                        )
                    )
                }
            }
        }
    }
}
