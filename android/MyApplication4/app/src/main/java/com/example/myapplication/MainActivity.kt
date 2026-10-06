package com.example.myapplication

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.telephony.SmsManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private val SMS_PERMISSION_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        val btnSendSms = findViewById<Button>(R.id.btnSendSms)

        btnSendSms.setOnClickListener {
            if (checkSmsPermission()) {
                fetchAndSendSms()
            } else {
                requestSmsPermission()
            }
        }
    }

    private fun checkSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestSmsPermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.SEND_SMS),
            SMS_PERMISSION_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == SMS_PERMISSION_CODE && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            fetchAndSendSms()
        } else {
            Toast.makeText(this, "SMS Permission Denied", Toast.LENGTH_SHORT).show()
        }
    }

    private fun fetchAndSendSms() {
        statusText.text = "Fetching pending violations..."
        thread {
            try {
                // Using 10.0.2.2 for Android emulator to access host localhost
                val url = URL("http://192.168.29.248:8000/api/violations")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

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
                    var smsSentCount = 0

                    for (i in 0 until jsonArray.length()) {
                        val violation = jsonArray.getJSONObject(i)
                        val status = violation.optString("status")
                        val ownerPhone = violation.optString("owner_phone", "")
                        
                        // We only process if it is pending and has a phone number
                        if (status == "Pending Review" && ownerPhone.isNotEmpty() && ownerPhone != "null") {
                            val vehicleNumber = violation.getString("vehicle_number")
                            val fineAmount = violation.getInt("fine_amount")
                            
                            val message = "Traffic violation recorded for $vehicleNumber. Please pay the fine amount of Rs.$fineAmount."
                            
                            sendSms(ownerPhone, message)
                            smsSentCount++
                        }
                    }

                    runOnUiThread {
                        statusText.text = "SMS Sent to $smsSentCount vehicles."
                        Toast.makeText(this@MainActivity, "Processed $smsSentCount SMS", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    runOnUiThread {
                        statusText.text = "Error: Server returned $responseCode"
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    statusText.text = "Exception: ${e.message}"
                }
            }
        }
    }

    private fun sendSms(phone: String, message: String) {
        try {
            val smsManager: SmsManager = SmsManager.getDefault()
            smsManager.sendTextMessage(phone, null, message, null, null)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
