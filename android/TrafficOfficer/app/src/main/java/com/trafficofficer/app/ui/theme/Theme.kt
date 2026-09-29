package com.trafficofficer.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Navy900 = Color(0xFF0B1120)
val Navy800 = Color(0xFF1E293B)
val Navy700 = Color(0xFF334155)
val PoliceGold = Color(0xFFF59E0B)
val ViolationRed = Color(0xFFEF4444)
val SafeGreen = Color(0xFF10B981)
val SlateGray = Color(0xFF94A3B8)
val WhiteText = Color(0xFFF8FAFC)

private val DarkColorScheme = darkColorScheme(
    primary = PoliceGold,
    secondary = Color(0xFF38BDF8),
    tertiary = ViolationRed,
    background = Navy900,
    surface = Navy800,
    onPrimary = Navy900,
    onSecondary = Navy900,
    onBackground = WhiteText,
    onSurface = WhiteText
)

@Composable
fun TrafficOfficerTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography(),
        content = content
    )
}
