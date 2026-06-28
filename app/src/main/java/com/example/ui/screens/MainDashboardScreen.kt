package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.LogEntity
import com.example.ui.BotViewModel
import com.example.ui.components.*
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val connectionStatus by viewModel.connectionStatus.collectAsState()
    val cpuUsage by viewModel.cpuUsage.collectAsState()
    val ramUsage by viewModel.ramUsage.collectAsState()
    val ping by viewModel.ping.collectAsState()
    val uptime by viewModel.uptime.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val groups by viewModel.groups.collectAsState()
    val broadcasts by viewModel.broadcasts.collectAsState()
    val plugins by viewModel.plugins.collectAsState()

    val totalMsgs = messages.size
    val totalGroups = groups.size
    val totalBroadcasts = broadcasts.size
    val activePlugins = plugins.filter { it.isEnabled }.size

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Dashboard",
            subtitle = "Status dan statistik server bot real-time",
            icon = Icons.Default.Dashboard
        )

        // Real-time server connection alert
        val statusColor = when (connectionStatus) {
            "Connected" -> SuccessGreen
            "Connecting" -> WarningYellow
            else -> DangerRed
        }
        val statusBg = statusColor.copy(alpha = 0.08f)

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp)
                .background(statusBg, shape = RoundedCornerShape(16.dp))
                .border(1.dp, statusColor.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(statusColor, shape = RoundedCornerShape(50))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Status WhatsApp Bot: $connectionStatus",
                            color = SlateText,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = if (connectionStatus == "Connected") "Bot sedang mengawasi chat masuk" else "Bot tidak aktif",
                            color = SlateMuted,
                            fontSize = 11.sp
                        )
                    }
                }
                Text(
                    text = "Uptime: ${uptime / 60}m ${uptime % 60}s",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = SlateText
                )
            }
        }

        // Stats Cards Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                title = "Total Chat",
                value = "$totalMsgs",
                icon = Icons.Default.Chat,
                iconColor = PrimaryBlue,
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "Total Group",
                value = "$totalGroups",
                icon = Icons.Default.Group,
                iconColor = SuccessGreen,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                title = "Broadcasts",
                value = "$totalBroadcasts",
                icon = Icons.Default.Share,
                iconColor = WarningYellow,
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "Plugins",
                value = "$activePlugins/${plugins.size}",
                icon = Icons.Default.Extension,
                iconColor = DangerRed,
                modifier = Modifier.weight(1f)
            )
        }

        // System Performance Meters
        Text(
            text = "Kinerja Server Bot",
            color = SlateText,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        PremiumCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // CPU Progress
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("CPU Usage", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SlateText)
                        Text("${(cpuUsage * 100).toInt()}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryBlue)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { cpuUsage },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = PrimaryBlue,
                        trackColor = BorderGray
                    )
                }

                // RAM Progress
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("RAM Usage", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SlateText)
                        Text("${(ramUsage * 100).toInt()}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SuccessGreen)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { ramUsage },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = SuccessGreen,
                        trackColor = BorderGray
                    )
                }

                // Ping Info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Server Ping Latency", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SlateText)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.OfflineBolt,
                            contentDescription = null,
                            tint = if (ping < 100) SuccessGreen else WarningYellow,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("$ping ms", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SlateText)
                    }
                }
            }
        }
    }
}

@Composable
fun WhatsAppScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val connectionStatus by viewModel.connectionStatus.collectAsState()
    val pairingCode by viewModel.pairingCode.collectAsState()
    val qrCode by viewModel.qrCode.collectAsState()
    var phoneNumber by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Integrasi WhatsApp",
            subtitle = "Sambungkan nomor WA ke bot panel via QR atau pairing code",
            icon = Icons.Default.PhoneAndroid
        )

        val statusColor = when (connectionStatus) {
            "Connected" -> SuccessGreen
            "Connecting" -> WarningYellow
            else -> DangerRed
        }

        PremiumCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "Pendaftaran Device",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = SlateText
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Ketik nomor telepon WhatsApp bot Anda lengkap dengan kode negara (contoh: 628512345678) untuk generate Pairing Code, atau generate QR Code di bawah.",
                fontSize = 12.sp,
                color = SlateMuted
            )

            Spacer(modifier = Modifier.height(20.dp))

            PremiumTextField(
                value = phoneNumber,
                onValueChange = { phoneNumber = it },
                label = "Nomor WhatsApp Bot",
                placeholder = "628xxxxxxxxxx",
                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = SlateMuted) }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PremiumButton(
                    text = "Generate Pairing",
                    onClick = { viewModel.generatePairingCode(phoneNumber) },
                    icon = Icons.Default.VpnKey,
                    modifier = Modifier.weight(1f),
                    enabled = phoneNumber.isNotEmpty() && connectionStatus == "Disconnected"
                )
                PremiumButton(
                    text = "Generate QR Code",
                    onClick = { viewModel.generateQrCode() },
                    icon = Icons.Default.QrCode,
                    backgroundColor = SuccessGreen,
                    modifier = Modifier.weight(1f),
                    enabled = connectionStatus == "Disconnected"
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Connection Output card
        if (connectionStatus == "Connecting" || pairingCode != null || qrCode != null) {
            PremiumCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Metode Autentikasi Aktif",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = SlateText
                )
                Spacer(modifier = Modifier.height(16.dp))

                if (pairingCode != null) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Kode Pairing WhatsApp:", fontSize = 12.sp, color = SlateMuted)
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .background(SecondaryBlue, shape = RoundedCornerShape(12.dp))
                                .border(1.dp, PrimaryBlue, RoundedCornerShape(12.dp))
                                .padding(horizontal = 24.dp, vertical = 12.dp)
                        ) {
                            Text(
                                text = pairingCode!!,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryBlue,
                                letterSpacing = 2.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Masukkan kode di atas pada notifikasi tautkan perangkat di aplikasi WhatsApp Anda.",
                            fontSize = 11.sp,
                            color = SlateMuted,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                if (qrCode != null) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Scan QR Code WhatsApp:", fontSize = 12.sp, color = SlateMuted)
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        // Fake visual QR Code with standard canvas lines
                        Box(
                            modifier = Modifier
                                .size(180.dp)
                                .background(Color.White, shape = RoundedCornerShape(12.dp))
                                .border(1.dp, BorderGray, RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCode2,
                                contentDescription = "QR Code Placeholder",
                                modifier = Modifier.fillMaxSize(),
                                tint = SlateText
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat, lalu scan QR Code di atas.",
                            fontSize = 11.sp,
                            color = SlateMuted,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }

        // Connection Action Control card
        PremiumCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "Kontrol Sesi Bot",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = SlateText
            )
            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(statusColor, shape = RoundedCornerShape(50))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sesi Saat Ini: $connectionStatus",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = SlateText
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PremiumButton(
                        text = "Sambung Ulang",
                        onClick = { viewModel.reconnectDevice() },
                        icon = Icons.Default.Refresh,
                        backgroundColor = PrimaryBlue,
                        modifier = Modifier.weight(1f)
                    )
                    PremiumButton(
                        text = "Putus Sesi",
                        onClick = { viewModel.disconnectDevice() },
                        icon = Icons.Default.LinkOff,
                        backgroundColor = WarningYellow,
                        modifier = Modifier.weight(1f),
                        enabled = connectionStatus != "Disconnected"
                    )
                }
                PremiumButton(
                    text = "Logout Semua Perangkat",
                    onClick = { viewModel.logoutDevice() },
                    icon = Icons.Default.PowerSettingsNew,
                    backgroundColor = DangerRed,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = connectionStatus != "Disconnected"
                )
            }
        }
    }
}

@Composable
fun LogsScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val logs by viewModel.logs.collectAsState()
    val logFilterTag by viewModel.logFilterTag.collectAsState()
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    // Scroll to bottom when logs count increases
    LaunchedEffect(logs.size) {
        if (logs.isNotEmpty()) {
            listState.animateScrollToItem(0)
        }
    }

    val filteredLogs = remember(logs, logFilterTag) {
        if (logFilterTag == "ALL") {
            logs
        } else {
            logs.filter { it.tag == logFilterTag }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Aktivitas Logs Bot",
            subtitle = "Console monitor realtime dari seluruh modul bot",
            icon = Icons.Default.Terminal,
            actionButton = {
                IconButton(
                    onClick = { viewModel.clearLogHistory() },
                    modifier = Modifier.background(DangerRed.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                ) {
                    Icon(Icons.Default.Delete, contentDescription = "Clear logs", tint = DangerRed)
                }
            }
        )

        // Tags Filter Carousel
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("ALL", "BOT", "SOCKET", "DATABASE", "API", "USER", "BROADCAST", "PLUGIN").forEach { item ->
                val selected = logFilterTag == item
                Box(
                    modifier = Modifier
                        .background(
                            if (selected) PrimaryBlue else BorderGray.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .border(1.dp, if (selected) PrimaryBlue else BorderGray, RoundedCornerShape(12.dp))
                        .clickable { viewModel.updateLogFilter(item) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = item,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (selected) Color.White else SlateText
                    )
                }
            }
        }

        // Terminal Log Console
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .background(Color(0xFF0F172A), RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFF334155), RoundedCornerShape(16.dp))
                .padding(12.dp)
        ) {
            if (filteredLogs.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Code, contentDescription = null, tint = SlateMuted, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Belum ada log aktivitas...", color = SlateMuted, fontSize = 12.sp)
                    }
                }
            } else {
                LazyColumn(
                    state = listState,
                    reverseLayout = true,
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredLogs) { log ->
                        val color = when (log.level) {
                            "SUCCESS" -> SuccessGreen
                            "WARNING" -> WarningYellow
                            "ERROR" -> DangerRed
                            else -> PrimaryBlue
                        }
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.Top) {
                                Text(
                                    text = "[${log.tag}]",
                                    color = color,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = log.message,
                                    color = Color.White.copy(alpha = 0.9f),
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
