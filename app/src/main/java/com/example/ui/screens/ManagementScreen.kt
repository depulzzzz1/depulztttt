package com.example.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ApiKeyEntity
import com.example.data.AutoReplyEntity
import com.example.data.PluginEntity
import com.example.data.UserEntity
import com.example.ui.BotViewModel
import com.example.ui.components.*
import com.example.ui.theme.*

@Composable
fun PluginScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val plugins by viewModel.plugins.collectAsState()
    var pluginName by remember { mutableStateOf("") }
    var pluginDesc by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Plugin Manager",
            subtitle = "Muat dan kelola plugin bot dari folder /plugins secara modular",
            icon = Icons.Default.Extension,
            actionButton = {
                PremiumButton(
                    text = "Reload Plugins",
                    onClick = { viewModel.reloadPlugins() },
                    icon = Icons.Default.Refresh,
                    backgroundColor = PrimaryBlue
                )
            }
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Left Form
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Install Plugin Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = pluginName, onValueChange = { pluginName = it }, label = "Nama Plugin")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = pluginDesc, onValueChange = { pluginDesc = it }, label = "Deskripsi Plugin")

                    Spacer(modifier = Modifier.height(16.dp))
                    PremiumButton(
                        text = "Install Plugin",
                        onClick = {
                            if (pluginName.isNotEmpty() && pluginDesc.isNotEmpty()) {
                                viewModel.installPlugin(pluginName, pluginDesc)
                                pluginName = ""
                                pluginDesc = ""
                            }
                        },
                        icon = Icons.Default.Add,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = pluginName.isNotEmpty() && pluginDesc.isNotEmpty()
                    )
                }
            }

            // Right list
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Plugin Aktif", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    plugins.forEach { plugin ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(plugin.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                Text(plugin.description, fontSize = 11.sp, color = SlateMuted)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Switch(
                                    checked = plugin.isEnabled,
                                    onCheckedChange = { viewModel.togglePlugin(plugin) },
                                    colors = SwitchDefaults.colors(checkedThumbColor = SuccessGreen, checkedTrackColor = SuccessGreen.copy(alpha = 0.5f))
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                IconButton(onClick = { viewModel.deletePlugin(plugin) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AutoReplyScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val autoReplies by viewModel.autoReplies.collectAsState()
    var keyword by remember { mutableStateOf("") }
    var response by remember { mutableStateOf("") }
    var matchType by remember { mutableStateOf("Contains") } // "Contains", "Regex", "Exact"
    var priority by remember { mutableStateOf("1") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Aturan Auto Reply",
            subtitle = "Konfigurasi respon chat otomatis berdasarkan keyword pencarian",
            icon = Icons.Default.Quickreply
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Left Add Card
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Tambah Aturan Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = keyword, onValueChange = { keyword = it }, label = "Kata Kunci (Keyword)")
                    Spacer(modifier = Modifier.height(10.dp))

                    Text("Metode Pencocokan", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SlateText)
                    Row(
                        modifier = Modifier.padding(top = 4.dp, bottom = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("Contains", "Exact", "Regex").forEach { type ->
                            val selected = matchType == type
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .background(if (selected) PrimaryBlue.copy(alpha = 0.1f) else Color.Transparent, shape = RoundedCornerShape(8.dp))
                                    .border(1.dp, if (selected) PrimaryBlue else BorderGray, shape = RoundedCornerShape(8.dp))
                                    .clickable { matchType = type }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(type, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (selected) PrimaryBlue else SlateText)
                            }
                        }
                    }

                    PremiumTextField(value = response, onValueChange = { response = it }, label = "Respon Balasan")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = priority, onValueChange = { priority = it }, label = "Prioritas Aturan (Angka)")

                    Spacer(modifier = Modifier.height(16.dp))
                    PremiumButton(
                        text = "Simpan Aturan",
                        onClick = {
                            if (keyword.isNotEmpty() && response.isNotEmpty()) {
                                viewModel.addAutoReplyRule(
                                    keyword,
                                    matchType,
                                    response,
                                    priority.toIntOrNull() ?: 1
                                )
                                keyword = ""
                                response = ""
                                priority = "1"
                            }
                        },
                        icon = Icons.Default.Save,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = keyword.isNotEmpty() && response.isNotEmpty()
                    )
                }
            }

            // Right list Card
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Aturan Terdaftar", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    autoReplies.forEach { rule ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(rule.keyword, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .background(PrimaryBlue.copy(alpha = 0.15f), shape = RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(rule.matchType, fontSize = 8.sp, color = PrimaryBlue, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Text(rule.response, fontSize = 11.sp, color = SlateMuted)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Switch(
                                    checked = rule.isEnabled,
                                    onCheckedChange = { viewModel.toggleAutoReplyRule(rule) },
                                    colors = SwitchDefaults.colors(checkedThumbColor = SuccessGreen, checkedTrackColor = SuccessGreen.copy(alpha = 0.5f))
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                IconButton(onClick = { viewModel.deleteAutoReplyRule(rule) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ApiScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val apiKeys by viewModel.apiKeys.collectAsState()
    var keyName by remember { mutableStateOf("") }
    var keyRole by remember { mutableStateOf("Admin") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "REST API & Webhook",
            subtitle = "Gunakan API key untuk mengirim pesan WhatsApp dari aplikasi eksternal",
            icon = Icons.Default.Key
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Key Generator
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Generate API Key Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = keyName, onValueChange = { keyName = it }, label = "Nama Aplikasi Pengguna")
                    Spacer(modifier = Modifier.height(10.dp))

                    Text("Hak Akses API", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SlateText)
                    Row(
                        modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("Admin", "Owner").forEach { role ->
                            val selected = keyRole == role
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .background(if (selected) PrimaryBlue.copy(alpha = 0.1f) else Color.Transparent, shape = RoundedCornerShape(8.dp))
                                    .border(1.dp, if (selected) PrimaryBlue else BorderGray, shape = RoundedCornerShape(8.dp))
                                    .clickable { keyRole = role }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(role, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (selected) PrimaryBlue else SlateText)
                            }
                        }
                    }

                    PremiumButton(
                        text = "Generate Key",
                        onClick = {
                            if (keyName.isNotEmpty()) {
                                viewModel.generateApiKey(keyName, keyRole)
                                keyName = ""
                            }
                        },
                        icon = Icons.Default.VpnKey,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = keyName.isNotEmpty()
                    )
                }
            }

            // Keys list
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("API Keys Aktif", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    apiKeys.forEach { apiKey ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(apiKey.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                Text(apiKey.key, fontSize = 10.sp, color = PrimaryBlue, fontFamily = FontFamily.Monospace)
                            }
                            IconButton(onClick = { viewModel.deleteApiKey(apiKey) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // API Docs
        PremiumCard(modifier = Modifier.fillMaxWidth()) {
            Text("REST API Documentation", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
            Spacer(modifier = Modifier.height(8.dp))

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .background(SuccessGreen, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("POST", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("/api/v1/messages/send", color = Color.White, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Kirim pesan WhatsApp teks secara langsung.", color = SlateMuted, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun UsersScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val users by viewModel.users.collectAsState()
    var userUsername by remember { mutableStateOf("") }
    var userPassword by remember { mutableStateOf("") }
    var userRole by remember { mutableStateOf("Admin") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Manajemen Pengguna",
            subtitle = "Atur hak akses admin dan owner ke panel kontrol",
            icon = Icons.Default.People
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Add user card
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Tambah User Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = userUsername, onValueChange = { userUsername = it }, label = "Username")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = userPassword, onValueChange = { userPassword = it }, label = "Password")
                    Spacer(modifier = Modifier.height(10.dp))

                    Text("Pilih Role", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SlateText)
                    Row(
                        modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("Admin", "Owner").forEach { role ->
                            val selected = userRole == role
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .background(if (selected) PrimaryBlue.copy(alpha = 0.1f) else Color.Transparent, shape = RoundedCornerShape(8.dp))
                                    .border(1.dp, if (selected) PrimaryBlue else BorderGray, shape = RoundedCornerShape(8.dp))
                                    .clickable { userRole = role }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(role, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (selected) PrimaryBlue else SlateText)
                            }
                        }
                    }

                    PremiumButton(
                        text = "Tambah User",
                        onClick = {
                            if (userUsername.isNotEmpty() && userPassword.isNotEmpty()) {
                                viewModel.register(userUsername, userPassword, userRole, onSuccess = {}, onError = {})
                                userUsername = ""
                                userPassword = ""
                            }
                        },
                        icon = Icons.Default.Add,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = userUsername.isNotEmpty() && userPassword.isNotEmpty()
                    )
                }
            }

            // Users list card
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Daftar Pengguna Aktif", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    users.forEach { user ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(user.username, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .background(PrimaryBlue.copy(alpha = 0.15f), shape = RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(user.role, fontSize = 8.sp, color = PrimaryBlue, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Text(if (user.isSuspended) "Ditangguhkan" else "Aktif", fontSize = 11.sp, color = if (user.isSuspended) DangerRed else SuccessGreen)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                PremiumButton(
                                    text = if (user.isSuspended) "Unsuspend" else "Suspend",
                                    onClick = { viewModel.toggleSuspendUser(user) },
                                    backgroundColor = if (user.isSuspended) SuccessGreen else WarningYellow,
                                    modifier = Modifier.height(34.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                IconButton(onClick = { viewModel.deleteUser(user) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val settings by viewModel.settings.collectAsState()
    var botName by remember(settings) { mutableStateOf(settings.botName) }
    var ownerNumber by remember(settings) { mutableStateOf(settings.ownerNumber) }
    var prefix by remember(settings) { mutableStateOf(settings.prefix) }
    var timezone by remember(settings) { mutableStateOf(settings.timezone) }
    var language by remember(settings) { mutableStateOf(settings.language) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Pengaturan Bot",
            subtitle = "Konfigurasikan metadata nama prefix dan backup database",
            icon = Icons.Default.Settings
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // General settings form
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Metadata & Profil Bot", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = botName, onValueChange = { botName = it }, label = "Nama Bot")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = ownerNumber, onValueChange = { ownerNumber = it }, label = "Nomor Owner Bot")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = prefix, onValueChange = { prefix = it }, label = "Prefix Command Bot")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = timezone, onValueChange = { timezone = it }, label = "Zona Waktu")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = language, onValueChange = { language = it }, label = "Bahasa")

                    Spacer(modifier = Modifier.height(16.dp))
                    PremiumButton(
                        text = "Simpan Perubahan",
                        onClick = { viewModel.updateBotSettings(botName, ownerNumber, prefix, timezone, language) },
                        icon = Icons.Default.Save,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // System recovery buttons
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Reboot & Pemulihan Server", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumButton(
                        text = "Restart Bot Engine",
                        onClick = { viewModel.restartBot() },
                        icon = Icons.Default.PowerSettingsNew,
                        backgroundColor = DangerRed,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    PremiumButton(
                        text = "Backup Database",
                        onClick = { viewModel.backupDatabase() },
                        icon = Icons.Default.Backup,
                        backgroundColor = PrimaryBlue,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumButton(
                        text = "Restore Database",
                        onClick = { viewModel.restoreDatabase() },
                        icon = Icons.Default.Restore,
                        backgroundColor = SuccessGreen,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}
