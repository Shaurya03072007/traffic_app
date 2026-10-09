package com.example.myapplication

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TrafficSmsForegroundService : Service() {

    private var isRunning = false
    private var workerThread: Thread? = null
    private lateinit var prefs: SharedPreferences

    companion object {
        const val CHANNEL_ID = "traffic_sms_foreground_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val ACTION_TRIGGER_ONCE = "ACTION_TRIGGER_ONCE"
        const val BROADCAST_LOG = "com.example.myapplication.LOG_UPDATE"
        const val EXTRA_LOG_MESSAGE = "extra_log_message"
        const val PREFS_NAME = "traffic_sms_prefs"
        const val KEY_SENT_CASES = "sent_cases_set"
        const val KEY_SERVER_HOST = "server_host"
        const val DEFAULT_SERVER_HOST = "192.168.31.113:8000"

        var isServiceRunning = false
            private set
    }

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        when (action) {
            ACTION_STOP -> {
                stopForegroundService()
                return START_NOT_STICKY
            }
            ACTION_TRIGGER_ONCE -> {
                Thread { pollAndSendSms(isManual = true) }.start()
                return START_STICKY
            }
            ACTION_START -> {
                if (!isRunning) {
                    startForegroundService()
                }
            }
        }

        return START_STICKY
    }

    private fun startForegroundService() {
        isRunning = true
        isServiceRunning = true

        val notification = buildNotification("Monitoring backend for new traffic fines...")
        startForeground(NOTIFICATION_ID, notification)
        broadcastLog("Foreground SMS Service started. Polling every 5s...")

        workerThread = Thread {
            while (isRunning) {
                try {
                    pollAndSendSms(isManual = false)
                    Thread.sleep(5000) // Poll every 5 seconds
                } catch (e: InterruptedException) {
                    break
                } catch (e: Exception) {
                    Log.e("TrafficSmsService", "Worker loop error: ${e.message}")
                    broadcastLog("Poll error: ${e.message}")
                    try {
                        Thread.sleep(5000)
                    } catch (_: InterruptedException) {
                        break
                    }
                }
            }
        }.apply {
            name = "TrafficSmsPollingThread"
            start()
        }
    }

    private fun stopForegroundService() {
        isRunning = false
        isServiceRunning = false
        workerThread?.interrupt()
        workerThread = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        broadcastLog("Foreground SMS Service stopped.")
    }

    private fun pollAndSendSms(isManual: Boolean) {
        val host = prefs.getString(KEY_SERVER_HOST, DEFAULT_SERVER_HOST) ?: DEFAULT_SERVER_HOST
        val cleanHost = host.removePrefix("http://").removePrefix("https://").trimEnd('/')
        val apiUrl = "http://$cleanHost/api/violations"

        try {
            val url = URL(apiUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 4000
            connection.readTimeout = 4000

            val responseCode = connection.responseCode
            if (responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    response.append(line)
                }
                reader.close()

                val jsonArray = JSONArray(response.toString())
                val sentCases = prefs.getStringSet(KEY_SENT_CASES, mutableSetOf())?.toMutableSet() ?: mutableSetOf()
                var newDispatched = 0

                for (i in 0 until jsonArray.length()) {
                    val violation = jsonArray.getJSONObject(i)
                    val caseId = violation.optString("id", "")
                    val caseNumber = violation.optString("case_number", "CASE-$i")
                    val status = violation.optString("status", "")
                    val ownerPhone = violation.optString("owner_phone", "").trim()
                    val vehicleNumber = violation.optString("vehicle_number", "Unknown").uppercase()
                    val fineAmount = violation.optInt("fine_amount", 1000)

                    // Unique key to prevent duplicate SMS
                    val uniqueCaseKey = if (caseId.isNotEmpty()) caseId else caseNumber

                    // Send SMS whenever backend issues a fine (Pending Review or Challan Generated)
                    val isActionableStatus = status == "Pending Review" || status == "Challan Generated"

                    if (isActionableStatus && ownerPhone.isNotEmpty() && ownerPhone != "null") {
                        if (!sentCases.contains(uniqueCaseKey)) {
                            // Extract violations
                            val offences = mutableListOf<String>()
                            if (violation.optBoolean("helmet_violation", false)) offences.add("No Helmet")
                            if (violation.optBoolean("triple_riding", false)) offences.add("Triple Riding")
                            if (violation.optBoolean("drunk_driving", false)) offences.add("Drunk Driving")
                            if (violation.optBoolean("no_license", false)) offences.add("No License")
                            if (violation.optBoolean("minor_riding", false)) offences.add("Minor Riding")

                            val offencesStr = if (offences.isNotEmpty()) offences.joinToString(", ") else "Traffic Violation"

                            val message = "TRAFFIC POLICE: E-Challan $caseNumber issued for $vehicleNumber ($offencesStr). Fine: Rs.$fineAmount. Pay at trafficpolice.gov.in."

                            val sent = dispatchSms(ownerPhone, message)
                            if (sent) {
                                sentCases.add(uniqueCaseKey)
                                newDispatched++
                                val logMsg = "DISPATCHED SMS to $ownerPhone for $vehicleNumber | Fine Rs.$fineAmount | Case $caseNumber"
                                Log.i("TrafficSmsService", logMsg)
                                broadcastLog(logMsg)
                                updateNotification("Sent fine notice to $vehicleNumber (Rs.$fineAmount)")
                            }
                        }
                    }
                }

                // Persist sent cases cache
                prefs.edit().putStringSet(KEY_SENT_CASES, sentCases).apply()

                if (isManual && newDispatched == 0) {
                    broadcastLog("Manual check: No new pending fines to dispatch.")
                }
            } else {
                broadcastLog("Backend returned HTTP $responseCode from $apiUrl")
            }
        } catch (e: Exception) {
            Log.e("TrafficSmsService", "Connection failed to $apiUrl: ${e.message}")
            if (isManual) {
                broadcastLog("Connection failed to $apiUrl: ${e.message}")
            }
        }
    }

    private fun dispatchSms(phone: String, message: String): Boolean {
        return try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                applicationContext.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            // Split into parts if message is longer than 160 characters
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(phone, null, message, null, null)
            }
            true
        } catch (e: Exception) {
            Log.e("TrafficSmsService", "Failed to send SMS to $phone: ${e.message}")
            broadcastLog("Failed SMS to $phone: ${e.message}")
            false
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Traffic Police SMS Dispatcher",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors traffic backend and automatically dispatches violation fines via SMS"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Traffic SMS Dispatcher Active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(contentText: String) {
        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    private fun broadcastLog(message: String) {
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val formatted = "[$time] $message"
        val intent = Intent(BROADCAST_LOG).apply {
            putExtra(EXTRA_LOG_MESSAGE, formatted)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        isServiceRunning = false
        workerThread?.interrupt()
        workerThread = null
    }
}
