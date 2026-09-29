package com.trafficofficer.app.ui.review

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trafficofficer.app.data.api.ApiClient
import com.trafficofficer.app.data.model.UserProfile
import com.trafficofficer.app.data.model.VideoDetectionsResult
import com.trafficofficer.app.data.model.ViolationCreateRequest
import com.trafficofficer.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfficerReviewScreen(
    user: UserProfile,
    detections: VideoDetectionsResult,
    onBack: () -> Unit,
    onSubmitSuccess: () -> Unit
) {
    // Editable vehicle number initialized from OCR prediction
    var vehicleNumber by remember { mutableStateOf(detections.detectedLicensePlate ?: "TS09EA4412") }

    // Officer toggles for AI detection results (allowing officer to correct false positives)
    var helmetConfirmed by remember { mutableStateOf(detections.helmetViolation.detected) }
    var tripleRidingConfirmed by remember { mutableStateOf(detections.tripleRiding.detected) }

    // Manual Officer Observations
    var minorRiding by remember { mutableStateOf(false) }
    var noLicense by remember { mutableStateOf(false) }
    var drunkDriving by remember { mutableStateOf(false) }
    var drunkDrivingNotes by remember { mutableStateOf("") }
    var officerRemarks by remember { mutableStateOf("") }

    val timestampStr = remember { SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date()) }
    val locationCoords = "17.4504° N, 78.3808° E (Cyber Towers Junction)"

    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = Navy900,
        topBar = {
            TopAppBar(
                title = { Text("Case Review & Verification", color = PoliceGold, fontSize = 16.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = WhiteText)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy800)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // VEHICLE NUMBER OCR & EDIT SECTION
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Navy800),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Vehicle Registration Number",
                            color = WhiteText,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "OCR Conf: ${(detections.plateConfidence * 100).toInt()}%",
                            color = PoliceGold,
                            fontSize = 11.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = vehicleNumber,
                        onValueChange = { vehicleNumber = it.uppercase() },
                        singleLine = true,
                        placeholder = { Text("e.g. TS09EA4412") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PoliceGold,
                            unfocusedBorderColor = Navy700,
                            focusedTextColor = PoliceGold,
                            unfocusedTextColor = PoliceGold
                        )
                    )
                    Text(
                        text = "Officer may edit plate if OCR misread due to angle or mud.",
                        color = SlateGray,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }

            // AI DETECTIONS AUDIT (OFFICER CONFIRMS OR OVERRIDES)
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Navy800),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "AI Visual Detection Findings",
                        color = WhiteText,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "AI is decision-support. Uncheck to correct false detections.",
                        color = SlateGray,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Helmet detection review
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Helmet Violation",
                                color = if (helmetConfirmed) ViolationRed else WhiteText,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp
                            )
                            Text(
                                text = "AI: ${if (detections.helmetViolation.detected) "DETECTED" else "NOT DETECTED"} • ${(detections.helmetViolation.confidence * 100).toInt()}% conf",
                                color = SlateGray,
                                fontSize = 11.sp
                            )
                        }
                        Checkbox(
                            checked = helmetConfirmed,
                            onCheckedChange = { helmetConfirmed = it },
                            colors = CheckboxDefaults.colors(checkedColor = ViolationRed)
                        )
                    }

                    Divider(color = Navy700, modifier = Modifier.padding(vertical = 8.dp))

                    // Triple riding review
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Triple Riding (Overloading)",
                                color = if (tripleRidingConfirmed) ViolationRed else WhiteText,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp
                            )
                            Text(
                                text = "AI: ${if (detections.tripleRiding.detected) "DETECTED" else "NOT DETECTED"} • ${(detections.tripleRiding.confidence * 100).toInt()}% conf",
                                color = SlateGray,
                                fontSize = 11.sp
                            )
                        }
                        Checkbox(
                            checked = tripleRidingConfirmed,
                            onCheckedChange = { tripleRidingConfirmed = it },
                            colors = CheckboxDefaults.colors(checkedColor = ViolationRed)
                        )
                    }
                }
            }

            // MANUAL OFFICER OBSERVATIONS (MANDATORY HUMAN FINDINGS)
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Navy800),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Officer Field Observations",
                        color = PoliceGold,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Select applicable violations observed or tested in person.",
                        color = SlateGray,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Minor Driving / Rider Underage", color = WhiteText, fontSize = 13.sp)
                        Checkbox(checked = minorRiding, onCheckedChange = { minorRiding = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "No Valid Driving Licence Produced", color = WhiteText, fontSize = 13.sp)
                        Checkbox(checked = noLicense, onCheckedChange = { noLicense = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Suspected / Confirmed Drunk Driving", color = WhiteText, fontSize = 13.sp)
                        Checkbox(checked = drunkDriving, onCheckedChange = { drunkDriving = it })
                    }

                    if (drunkDriving) {
                        OutlinedTextField(
                            value = drunkDrivingNotes,
                            onValueChange = { drunkDrivingNotes = it },
                            label = { Text("Breathalyzer Test / BAC reading") },
                            placeholder = { Text("e.g. Alcometer BAC: 65mg/100ml") },
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

            // AUTOMATIC METADATA (LOCATION, TIMESTAMP, OFFICER)
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Navy800),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Enforcement Metadata", color = SlateGray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(text = "Officer: ${user.fullName} (${user.badgeNumber ?: "N/A"})", color = WhiteText, fontSize = 13.sp)
                    Text(text = "Location: $locationCoords", color = WhiteText, fontSize = 13.sp)
                    Text(text = "Timestamp: $timestampStr", color = WhiteText, fontSize = 13.sp)
                }
            }

            if (submitError != null) {
                Text(text = submitError!!, color = ViolationRed, fontSize = 13.sp)
            }

            // SUBMIT BUTTON
            Button(
                onClick = {
                    if (vehicleNumber.isBlank()) {
                        submitError = "Please enter valid vehicle registration number."
                        return@Button
                    }
                    isSubmitting = true
                    submitError = null
                    scope.launch {
                        try {
                            val request = ViolationCreateRequest(
                                vehicleNumber = vehicleNumber.trim(),
                                location = "Cyber Towers Junction, Hitech City, Hyderabad",
                                latitude = 17.4504,
                                longitude = 78.3808,
                                helmetViolation = helmetConfirmed,
                                tripleRiding = tripleRidingConfirmed,
                                aiConfidence = detections.helmetViolation.confidence,
                                minorRiding = minorRiding,
                                noLicense = noLicense,
                                drunkDriving = drunkDriving,
                                drunkDrivingNotes = if (drunkDriving) drunkDrivingNotes else null,
                                evidenceVideoUrl = detections.evidenceVideoUrl,
                                evidenceImageUrl = detections.evidenceFrameUrl,
                                officerRemarks = officerRemarks
                            )
                            val res = ApiClient.getService().submitViolation(request)
                            if (res.isSuccessful) {
                                onSubmitSuccess()
                            } else {
                                submitError = "Submission failed: ${res.code()}"
                            }
                        } catch (e: Exception) {
                            submitError = "Network error: ${e.localizedMessage}"
                        } finally {
                            isSubmitting = false
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PoliceGold),
                shape = RoundedCornerShape(8.dp),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Navy900, modifier = Modifier.size(24.dp))
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Navy900)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "SUBMIT CASE TO CENTRAL DATABASE", color = Navy900, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}
