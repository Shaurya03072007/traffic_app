package com.trafficofficer.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trafficofficer.app.data.api.ApiClient
import com.trafficofficer.app.data.model.UserProfile
import com.trafficofficer.app.data.model.ViolationCase
import com.trafficofficer.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun OfficerDashboardScreen(
    user: UserProfile,
    onCaptureLiveVideo: () -> Unit,
    onUploadVideo: () -> Unit,
    onLogout: () -> Unit
) {
    var recentCases by remember { mutableStateOf<List<ViolationCase>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            isLoading = true
            try {
                val res = ApiClient.getService().getOfficerCases()
                if (res.isSuccessful && res.body() != null) {
                    recentCases = res.body()!!
                }
            } catch (e: Exception) {
                // Keep local cached cases if LAN disconnects
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        containerColor = Navy900,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Navy800)
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Traffic Officer",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = PoliceGold
                    )
                    Text(
                        text = "${user.fullName} • Badge: ${user.badgeNumber ?: "N/A"}",
                        fontSize = 13.sp,
                        color = SlateGray
                    )
                }
                IconButton(onClick = onLogout) {
                    Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = SlateGray)
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // ACTION BUTTONS SECTION
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onCaptureLiveVideo,
                    modifier = Modifier
                        .weight(1f)
                        .height(64.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ViolationRed)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.Videocam, contentDescription = null, tint = WhiteText)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "CAPTURE\nLIVE VIDEO",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WhiteText
                        )
                    }
                }

                Button(
                    onClick = onUploadVideo,
                    modifier = Modifier
                        .weight(1f)
                        .height(64.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PoliceGold)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.Upload, contentDescription = null, tint = Navy900)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "UPLOAD\nVIDEO",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Navy900
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // RECENT CASES SECTION
            Text(
                text = "Recent Cases",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = WhiteText,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            if (isLoading) {
                Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PoliceGold)
                }
            } else if (recentCases.isEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Navy800),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "No cases recorded on this patrol shift yet. Use video capture to detect violations.",
                        color = SlateGray,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(recentCases) { caseItem ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Navy800),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = caseItem.caseNumber,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = PoliceGold
                                    )
                                    Text(
                                        text = caseItem.status,
                                        fontSize = 11.sp,
                                        color = if (caseItem.status == "Challan Generated") SafeGreen else PoliceGold
                                    )
                                }
                                Text(
                                    text = "Vehicle: ${caseItem.vehicleNumber}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = WhiteText,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                )
                                Text(
                                    text = buildString {
                                        if (caseItem.helmetViolation) append("• Helmet Violation ")
                                        if (caseItem.tripleRiding) append("• Triple Riding ")
                                        if (caseItem.noLicense) append("• No Licence ")
                                        if (caseItem.drunkDriving) append("• Drunk Driving ")
                                    },
                                    fontSize = 12.sp,
                                    color = SlateGray
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
