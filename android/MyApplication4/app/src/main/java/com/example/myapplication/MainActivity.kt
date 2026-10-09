package com.example.myapplication

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var serviceStatusText: TextView
    private lateinit var statusText: TextView
    private lateinit var editServerHost: EditText
    private lateinit var btnSaveHost: Button
    private lateinit var btnToggleService: Button
    private lateinit var btnSendSms: Button
    private lateinit var btnClearCache: Button
    private lateinit var logScrollView: ScrollView
    private lateinit var logTextView: TextView

    private lateinit var prefs: SharedPreferences
    private val PERMISSION_REQUEST_CODE = 101

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val message = intent?.getStringExtra(TrafficSmsForegroundService.EXTRA_LOG_MESSAGE)
            if (!message.isNullOrEmpty()) {
                appendLog(message)
            }
            updateUiState()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(TrafficSmsForegroundService.PREFS_NAME, Context.MODE_PRIVATE)

        serviceStatusText = findViewById(R.id.serviceStatusText)
        statusText = findViewById(R.id.statusText)
        editServerHost = findViewById(R.id.editServerHost)
        btnSaveHost = findViewById(R.id.btnSaveHost)
        btnToggleService = findViewById(R.id.btnToggleService)
        btnSendSms = findViewById(R.id.btnSendSms)
        btnClearCache = findViewById(R.id.btnClearCache)
        logScrollView = findViewById(R.id.logScrollView)
        logTextView = findViewById(R.id.logTextView)

        // Load saved server host
        val savedHost = prefs.getString(
            TrafficSmsForegroundService.KEY_SERVER_HOST,
            TrafficSmsForegroundService.DEFAULT_SERVER_HOST
        )
        editServerHost.setText(savedHost)

        btnSaveHost.setOnClickListener {
            val newHost = editServerHost.text.toString().trim()
            if (newHost.isNotEmpty()) {
                prefs.edit().putString(TrafficSmsForegroundService.KEY_SERVER_HOST, newHost).apply()
                Toast.makeText(this, "Server host saved: $newHost", Toast.LENGTH_SHORT).show()
                appendLog("[Config] Server host set to http://$newHost")
            }
        }

        btnToggleService.setOnClickListener {
            if (TrafficSmsForegroundService.isServiceRunning) {
                stopForegroundSmsService()
            } else {
                if (hasRequiredPermissions()) {
                    startForegroundSmsService()
                } else {
                    requestPermissions()
                }
            }
        }

        btnSendSms.setOnClickListener {
            if (hasRequiredPermissions()) {
                appendLog("[Action] Triggering immediate check...")
                val intent = Intent(this, TrafficSmsForegroundService::class.java).apply {
                    action = TrafficSmsForegroundService.ACTION_TRIGGER_ONCE
                }
                startService(intent)
            } else {
                requestPermissions()
            }
        }

        btnClearCache.setOnClickListener {
            prefs.edit().remove(TrafficSmsForegroundService.KEY_SENT_CASES).apply()
            appendLog("[Cache] Cleared sent cases log. Fines will be re-sent on next poll.")
            Toast.makeText(this, "Cleared sent cases cache", Toast.LENGTH_SHORT).show()
        }

        // Auto-start foreground service if permissions granted
        if (hasRequiredPermissions()) {
            startForegroundSmsService()
        } else {
            requestPermissions()
        }

        updateUiState()
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(TrafficSmsForegroundService.BROADCAST_LOG)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(logReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(logReceiver, filter)
        }
        updateUiState()
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(logReceiver)
        } catch (_: Exception) {}
    }

    private fun startForegroundSmsService() {
        val intent = Intent(this, TrafficSmsForegroundService::class.java).apply {
            action = TrafficSmsForegroundService.ACTION_START
        }
        ContextCompat.startForegroundService(this, intent)
        updateUiState()
    }

    private fun stopForegroundSmsService() {
        val intent = Intent(this, TrafficSmsForegroundService::class.java).apply {
            action = TrafficSmsForegroundService.ACTION_STOP
        }
        startService(intent)
        updateUiState()
    }

    private fun updateUiState() {
        runOnUiThread {
            if (TrafficSmsForegroundService.isServiceRunning) {
                serviceStatusText.text = "● AUTOMATED DISPATCHER: ACTIVE (FOREGROUND)"
                serviceStatusText.setTextColor(Color.parseColor("#16A34A"))
                statusText.text = "Polling backend every 5s • Auto-dispatching SMS on newly issued fines."
                btnToggleService.text = "Stop Auto-Dispatch Service"
                btnToggleService.setBackgroundColor(Color.parseColor("#EF4444"))
            } else {
                serviceStatusText.text = "○ AUTOMATED DISPATCHER: STOPPED"
                serviceStatusText.setTextColor(Color.parseColor("#DC2626"))
                statusText.text = "Service is idle. Click below to start automated foreground monitoring."
                btnToggleService.text = "Start Foreground Auto-Dispatch"
                btnToggleService.setBackgroundColor(Color.parseColor("#16A34A"))
            }
        }
    }

    private fun appendLog(line: String) {
        runOnUiThread {
            val current = logTextView.text.toString()
            val newText = if (current.isEmpty()) line else "$current\n$line"
            logTextView.text = newText
            logScrollView.post {
                logScrollView.fullScroll(ScrollView.FOCUS_DOWN)
            }
        }
    }

    private fun hasRequiredPermissions(): Boolean {
        val smsGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        return smsGranted && notifGranted
    }

    private fun requestPermissions() {
        val list = mutableListOf(Manifest.permission.SEND_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            list.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        ActivityCompat.requestPermissions(this, list.toTypedArray(), PERMISSION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE && hasRequiredPermissions()) {
            Toast.makeText(this, "Permissions Granted! Starting SMS Dispatcher...", Toast.LENGTH_SHORT).show()
            startForegroundSmsService()
        } else {
            Toast.makeText(this, "SMS / Notification Permissions Required for Foreground Dispatcher", Toast.LENGTH_LONG).show()
            appendLog("[Permission] SEND_SMS permission denied by user.")
        }
    }
}
