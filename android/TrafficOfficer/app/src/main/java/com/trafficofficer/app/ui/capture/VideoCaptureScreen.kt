package com.trafficofficer.app.ui.capture

import android.Manifest
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.trafficofficer.app.data.api.ApiClient
import com.trafficofficer.app.data.model.VideoDetectionsResult
import com.trafficofficer.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VideoCaptureScreen(
    isLiveCaptureMode: Boolean,
    onBack: () -> Unit,
    onAnalysisComplete: (VideoDetectionsResult) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var isRecording by remember { mutableStateOf(false) }
    var recordingSeconds by remember { mutableStateOf(0) }
    var isUploading by remember { mutableStateOf(false) }
    var uploadStatusText by remember { mutableStateOf("Ready to capture video evidence") }

    // CameraX variables
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
    var videoCapture by remember { mutableStateOf<VideoCapture<Recorder>?>(null) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }
    
    // Permission state
    var hasCameraPermission by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasCameraPermission = permissions[Manifest.permission.CAMERA] == true &&
                permissions[Manifest.permission.RECORD_AUDIO] == true
    }

    LaunchedEffect(isLiveCaptureMode) {
        if (isLiveCaptureMode) {
            permissionLauncher.launch(
                arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            )
        }
    }

    val uploadVideoFile = { file: File ->
        isUploading = true
        uploadStatusText = "Uploading video to FastAPI computer vision backend..."
        scope.launch {
            try {
                val reqBody = file.asRequestBody("video/mp4".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("file", file.name, reqBody)
                uploadStatusText = "Executing AI Pipeline: YOLO, Rider Tracker, Helmet & Capacity Analyzers..."
                
                val response = ApiClient.getService().uploadVideo(part)
                if (response.isSuccessful && response.body() != null) {
                    onAnalysisComplete(response.body()!!)
                } else {
                    uploadStatusText = "Error: Server returned ${response.code()}"
                }
            } catch (e: Exception) {
                uploadStatusText = "Network Error: ${e.localizedMessage}"
            } finally {
                isUploading = false
            }
        }
    }

    val videoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            isUploading = true
            uploadStatusText = "Processing selected video..."
            scope.launch {
                try {
                    val inputStream = context.contentResolver.openInputStream(it)
                    val tempFile = File(context.cacheDir, "upload_${System.currentTimeMillis()}.mp4")
                    val outputStream = FileOutputStream(tempFile)
                    inputStream?.copyTo(outputStream)
                    inputStream?.close()
                    outputStream.close()
                    uploadVideoFile(tempFile)
                } catch (e: Exception) {
                    uploadStatusText = "File Read Error: ${e.localizedMessage}"
                    isUploading = false
                }
            }
        }
    }

    LaunchedEffect(isRecording) {
        if (isRecording) {
            recordingSeconds = 0
            while (isRecording) {
                delay(1000)
                recordingSeconds++
            }
        }
    }

    Scaffold(
        containerColor = Navy900,
        topBar = {
            TopAppBar(
                title = { Text(if (isLiveCaptureMode) "Live Patrol Camera" else "Upload Video File", color = PoliceGold, fontSize = 16.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = WhiteText)
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
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color.Black),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isLiveCaptureMode && hasCameraPermission) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.setSurfaceProvider(previewView.surfaceProvider)
                                }
                                val recorder = Recorder.Builder()
                                    .setQualitySelector(QualitySelector.from(Quality.HIGHEST))
                                    .build()
                                videoCapture = VideoCapture.withOutput(recorder)

                                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                                try {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        lifecycleOwner, cameraSelector, preview, videoCapture
                                    )
                                } catch (exc: Exception) {
                                    Toast.makeText(ctx, "Camera binding failed", Toast.LENGTH_SHORT).show()
                                }
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                    
                    if (isRecording) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            contentAlignment = Alignment.TopEnd
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .background(ViolationRed, CircleShape)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "REC 00:${recordingSeconds.toString().padStart(2, '0')}",
                                    color = ViolationRed,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                        }
                    }
                } else if (isLiveCaptureMode) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Camera permission required", color = SlateGray)
                    }
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = "MEDIA FILE SELECTION",
                            color = SlateGray,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = uploadStatusText,
                    color = PoliceGold,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                if (isUploading) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth().height(6.dp),
                        color = PoliceGold,
                        trackColor = Navy700
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                if (isLiveCaptureMode) {
                    IconButton(
                        onClick = {
                            if (!isRecording) {
                                val videoFile = File(context.cacheDir, "record_${System.currentTimeMillis()}.mp4")
                                val outputOptions = FileOutputOptions.Builder(videoFile).build()
                                val recording = videoCapture?.output
                                    ?.prepareRecording(context, outputOptions)
                                    ?.withAudioEnabled()
                                    ?.start(ContextCompat.getMainExecutor(context)) { event ->
                                        if (event is VideoRecordEvent.Finalize) {
                                            if (!event.hasError()) {
                                                uploadVideoFile(videoFile)
                                            } else {
                                                uploadStatusText = "Recording Error: ${event.cause?.message ?: event.error}"
                                            }
                                        }
                                    }
                                activeRecording = recording
                                isRecording = true
                            } else {
                                activeRecording?.stop()
                                activeRecording = null
                                isRecording = false
                            }
                        },
                        modifier = Modifier
                            .size(72.dp)
                            .background(if (isRecording) Navy800 else ViolationRed, CircleShape),
                        enabled = !isUploading && hasCameraPermission
                    ) {
                        Icon(
                            imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.FiberManualRecord,
                            contentDescription = "Record",
                            tint = WhiteText,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                } else {
                    Button(
                        onClick = { videoPickerLauncher.launch("*/*") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PoliceGold),
                        shape = RoundedCornerShape(8.dp),
                        enabled = !isUploading
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, tint = Navy900)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "SELECT MEDIA FROM GALLERY", color = Navy900, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
