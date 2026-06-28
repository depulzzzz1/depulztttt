package com.example.data

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import okhttp3.*
import java.io.IOException
import java.util.UUID
import kotlin.random.Random

class BotRepository(
    private val botDao: BotDao,
    private val externalScope: CoroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
) {
    // ------------------------------------------------------------------------
    // Database Flows
    // ------------------------------------------------------------------------
    val allUsers: Flow<List<UserEntity>> = botDao.getAllUsers()
    val settingsFlow: Flow<SettingsEntity?> = botDao.getSettingsFlow()
    val allMessages: Flow<List<MessageEntity>> = botDao.getAllMessagesFlow()
    val allGroups: Flow<List<GroupEntity>> = botDao.getAllGroupsFlow()
    val allBroadcasts: Flow<List<BroadcastEntity>> = botDao.getAllBroadcastsFlow()
    val allPlugins: Flow<List<PluginEntity>> = botDao.getAllPluginsFlow()
    val recentLogs: Flow<List<LogEntity>> = botDao.getRecentLogsFlow()
    val allContacts: Flow<List<ContactEntity>> = botDao.getAllContactsFlow()
    val allApiKeys: Flow<List<ApiKeyEntity>> = botDao.getAllApiKeysFlow()
    val allAutoReplies: Flow<List<AutoReplyEntity>> = botDao.getAllAutoRepliesFlow()

    // ------------------------------------------------------------------------
    // Live WhatsApp & Server States (Realtime with Flow & Simulation)
    // ------------------------------------------------------------------------
    private val _connectionStatus = MutableStateFlow("Disconnected") // "Disconnected", "Connecting", "Connected"
    val connectionStatus: StateFlow<String> = _connectionStatus.asStateFlow()

    private val _pairingCode = MutableStateFlow<String?>(null)
    val pairingCode: StateFlow<String?> = _pairingCode.asStateFlow()

    private val _qrCode = MutableStateFlow<String?>(null)
    val qrCode: StateFlow<String?> = _qrCode.asStateFlow()

    private val _cpuUsage = MutableStateFlow(0.12f)
    val cpuUsage: StateFlow<Float> = _cpuUsage.asStateFlow()

    private val _ramUsage = MutableStateFlow(0.45f)
    val ramUsage: StateFlow<Float> = _ramUsage.asStateFlow()

    private val _ping = MutableStateFlow(42)
    val ping: StateFlow<Int> = _ping.asStateFlow()

    private val _uptime = MutableStateFlow(0L)
    val uptime: StateFlow<Long> = _uptime.asStateFlow()

    private val _serverUrl = MutableStateFlow<String>("http://localhost:5000")
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private var statsJob: Job? = null
    private var simulationJob: Job? = null
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()

    init {
        // Populate initial mock data if database is empty on first startup
        externalScope.launch {
            delay(500)
            val users = botDao.getAllUsers().first()
            if (users.isEmpty()) {
                seedInitialData()
            }
            startStatsUpdater()
            startMockBotEngine()
        }
    }

    // ------------------------------------------------------------------------
    // CRUD Operations
    // ------------------------------------------------------------------------
    suspend fun insertUser(user: UserEntity) = botDao.insertUser(user)
    suspend fun deleteUser(user: UserEntity) = botDao.deleteUser(user)
    suspend fun getUserByUsername(username: String) = botDao.getUserByUsername(username)

    suspend fun getSettings(): SettingsEntity {
        return botDao.getSettings() ?: SettingsEntity().also { botDao.insertSettings(it) }
    }
    suspend fun saveSettings(settings: SettingsEntity) = botDao.insertSettings(settings)

    suspend fun insertMessage(message: MessageEntity) = botDao.insertMessage(message)
    suspend fun deleteChat(chatId: String) = botDao.deleteChat(chatId)

    suspend fun insertGroup(group: GroupEntity) = botDao.insertGroup(group)
    suspend fun deleteGroup(group: GroupEntity) = botDao.deleteGroup(group)
    suspend fun updateGroup(group: GroupEntity) = botDao.updateGroup(group)

    suspend fun insertBroadcast(broadcast: BroadcastEntity) {
        botDao.insertBroadcast(broadcast)
        if (broadcast.status == "Running") {
            startBroadcastProcess(broadcast)
        }
    }

    suspend fun insertPlugin(plugin: PluginEntity) = botDao.insertPlugin(plugin)
    suspend fun updatePlugin(plugin: PluginEntity) = botDao.updatePlugin(plugin)
    suspend fun deletePlugin(plugin: PluginEntity) = botDao.deletePlugin(plugin)

    suspend fun addLog(level: String, tag: String, message: String) {
        botDao.insertLog(LogEntity(level = level, tag = tag, message = message))
    }
    suspend fun clearLogs() = botDao.clearLogs()

    suspend fun insertContact(contact: ContactEntity) = botDao.insertContact(contact)
    suspend fun deleteContact(contact: ContactEntity) = botDao.deleteContact(contact)

    suspend fun insertApiKey(key: ApiKeyEntity) = botDao.insertApiKey(key)
    suspend fun deleteApiKey(key: ApiKeyEntity) = botDao.deleteApiKey(key)

    suspend fun insertAutoReply(autoReply: AutoReplyEntity) = botDao.insertAutoReply(autoReply)
    suspend fun updateAutoReply(autoReply: AutoReplyEntity) = botDao.updateAutoReply(autoReply)
    suspend fun deleteAutoReply(autoReply: AutoReplyEntity) = botDao.deleteAutoReply(autoReply)

    // ------------------------------------------------------------------------
    // Live WhatsApp Connection Controls
    // ------------------------------------------------------------------------
    fun requestPairingCode(phoneNumber: String) {
        externalScope.launch {
            _connectionStatus.value = "Connecting"
            _qrCode.value = null
            _pairingCode.value = "Generating..."
            addLog("INFO", "SOCKET", "Requesting pairing code for $phoneNumber...")
            delay(1500)
            val generatedCode = List(8) { (('A'..'Z') + ('0'..'9')).random() }.joinToString("")
                .chunked(4).joinToString("-")
            _pairingCode.value = generatedCode
            addLog("SUCCESS", "BOT", "Pairing Code generated successfully: $generatedCode")
            
            // Auto connect after 8 seconds of pairing simulation
            delay(8000)
            if (_connectionStatus.value == "Connecting") {
                connectBotSimulated()
            }
        }
    }

    fun requestQrCode() {
        externalScope.launch {
            _connectionStatus.value = "Connecting"
            _pairingCode.value = null
            _qrCode.value = "generating_placeholder_qr"
            addLog("INFO", "SOCKET", "Requesting QR Code authentication...")
            delay(2000)
            _qrCode.value = "ready_qr_code"
            addLog("SUCCESS", "BOT", "New QR Code loaded. Please scan with your WhatsApp app.")
            
            // Auto connect after 10 seconds of QR scan simulation
            delay(10000)
            if (_connectionStatus.value == "Connecting") {
                connectBotSimulated()
            }
        }
    }

    fun connectBotSimulated() {
        externalScope.launch {
            _connectionStatus.value = "Connected"
            _pairingCode.value = null
            _qrCode.value = null
            addLog("SUCCESS", "BOT", "WhatsApp Bot successfully CONNECTED! Session saved in database.")
            val settings = getSettings()
            addLog("INFO", "BOT", "Logged in as ${settings.botName} (${settings.ownerNumber})")
        }
    }

    fun disconnectBot() {
        externalScope.launch {
            _connectionStatus.value = "Disconnected"
            _pairingCode.value = null
            _qrCode.value = null
            addLog("WARNING", "BOT", "WhatsApp session closed. Status: Disconnected")
        }
    }

    fun logoutBot() {
        externalScope.launch {
            _connectionStatus.value = "Disconnected"
            _pairingCode.value = null
            _qrCode.value = null
            addLog("ERROR", "BOT", "Logged out from device. Session cleared.")
        }
    }

    fun reconnectBot() {
        externalScope.launch {
            disconnectBot()
            delay(1000)
            _connectionStatus.value = "Connecting"
            addLog("INFO", "BOT", "Reconnecting session...")
            delay(2000)
            connectBotSimulated()
        }
    }

    // ------------------------------------------------------------------------
    // External Remote Server Connection (OkHttp WebSocket / Rest Client)
    // ------------------------------------------------------------------------
    fun setRemoteServer(url: String) {
        _serverUrl.value = url
        connectToRemoteSocket(url)
    }

    private fun connectToRemoteSocket(url: String) {
        webSocket?.close(1000, "Switching server")
        val request = Request.Builder().url(url.replace("http://", "ws://").replace("https://", "wss://") + "/socket.io/?EIO=4&transport=websocket").build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                externalScope.launch {
                    addLog("SUCCESS", "SOCKET", "Connected to remote Panel Server at $url")
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                // Parse Socket.io frames
                externalScope.launch {
                    if (text.contains("status")) {
                        if (text.contains("connected")) _connectionStatus.value = "Connected"
                        else if (text.contains("connecting")) _connectionStatus.value = "Connecting"
                        else _connectionStatus.value = "Disconnected"
                    }
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                externalScope.launch {
                    addLog("ERROR", "SOCKET", "Remote socket connection failed: ${t.localizedMessage}")
                }
            }
        })
    }

    // ------------------------------------------------------------------------
    // Broadcast Engine Simulator
    // ------------------------------------------------------------------------
    private fun startBroadcastProcess(broadcast: BroadcastEntity) {
        externalScope.launch {
            var currentSent = broadcast.sentCount
            addLog("INFO", "BROADCAST", "Starting Broadcast Queue [${broadcast.name}] to ${broadcast.totalCount} numbers...")
            
            while (currentSent < broadcast.totalCount) {
                delay(broadcast.delay * 1000L)
                
                // Fetch latest status
                val freshList = botDao.getAllBroadcastsFlow().first()
                val currentBroadcast = freshList.find { it.id == broadcast.id }
                if (currentBroadcast == null || currentBroadcast.status == "Paused" || currentBroadcast.status == "Stopped") {
                    addLog("WARNING", "BROADCAST", "Broadcast queue [${broadcast.name}] paused/stopped.")
                    return@launch
                }

                currentSent++
                val updated = currentBroadcast.copy(
                    sentCount = currentSent,
                    status = if (currentSent == broadcast.totalCount) "Completed" else "Running"
                )
                botDao.insertBroadcast(updated)
                
                // Add message entry to DB to show in logs
                val recipient = "62899" + Random.nextInt(10000000, 99999999)
                addLog("SUCCESS", "BROADCAST", "Pesan broadcast [${broadcast.name}] terkirim ke $recipient")
                
                botDao.insertMessage(
                    MessageEntity(
                        chatId = recipient,
                        chatName = "Broadcast Target",
                        sender = "SYSTEM",
                        text = broadcast.message,
                        isIncoming = false
                    )
                )
            }
            addLog("SUCCESS", "BROADCAST", "Broadcast queue [${broadcast.name}] COMPLETED successfully!")
        }
    }

    // ------------------------------------------------------------------------
    // Mock Automated Bot Activity
    // ------------------------------------------------------------------------
    private fun startMockBotEngine() {
        simulationJob?.cancel()
        simulationJob = externalScope.launch {
            val contactNames = listOf("Ahmad", "Siti", "Budi", "Dewi", "Faisal", "Indah", "Rudi", "Amalia")
            while (isActive) {
                delay(Random.nextLong(15000, 30000))
                
                // Only simulate incoming messages if connected
                if (_connectionStatus.value == "Connected") {
                    val name = contactNames.random()
                    val phone = "628" + Random.nextLong(1000000000L, 9999999999L).toString()
                    val questions = listOf(
                        "Halo, apakah bot aktif?",
                        "Bisa minta pricelist?",
                        "Bagaimana cara daftar panel?",
                        "Menu!",
                        "Prefix bot apa ya?",
                        "Tolong undang saya ke grup",
                        "Info server donk"
                    )
                    val incomingText = questions.random()
                    
                    // Save message
                    val chatId = "$phone@s.whatsapp.net"
                    botDao.insertMessage(
                        MessageEntity(
                            chatId = chatId,
                            chatName = name,
                            sender = phone,
                            text = incomingText,
                            isIncoming = true
                        )
                    )
                    addLog("INFO", "BOT", "Pesan masuk dari $name ($phone): \"$incomingText\"")

                    // Auto-reply system simulation
                    delay(2000)
                    val replies = botDao.getAllAutoRepliesFlow().first()
                    var replied = false
                    
                    for (rule in replies) {
                        if (rule.isEnabled) {
                            val triggered = when (rule.matchType) {
                                "Contains" -> incomingText.contains(rule.keyword, ignoreCase = true)
                                "Regex" -> Regex(rule.keyword, RegexOption.IGNORE_CASE).containsMatchIn(incomingText)
                                "Exact" -> incomingText.equals(rule.keyword, ignoreCase = true)
                                else -> false
                            }
                            if (triggered) {
                                addLog("SUCCESS", "BOT", "Auto Reply Rule terpicu untuk keyword \"${rule.keyword}\"")
                                botDao.insertMessage(
                                    MessageEntity(
                                        chatId = chatId,
                                        chatName = name,
                                        sender = "BOT",
                                        text = rule.response,
                                        isIncoming = false
                                    )
                                )
                                addLog("SUCCESS", "BOT", "Auto Reply terkirim ke $name: \"${rule.response}\"")
                                replied = true
                                break
                            }
                        }
                    }

                    if (!replied && incomingText.contains("menu", ignoreCase = true)) {
                        val menuText = """
                            *DEPMQ WA BOT PANEL* 🚀
                            Berikut adalah daftar command aktif:
                            
                            1. !ping - Cek latency bot
                            2. !status - Cek status panel
                            3. !runtime - Info uptime bot
                            4. !info - Informasi developer
                            
                            _Silakan hubungi owner jika ada kendala_
                        """.trimIndent()
                        botDao.insertMessage(
                            MessageEntity(
                                chatId = chatId,
                                chatName = name,
                                sender = "BOT",
                                text = menuText,
                                isIncoming = false
                            )
                        )
                        addLog("SUCCESS", "BOT", "Menu auto-reply terkirim ke $name")
                    }
                }
            }
        }
    }

    private fun startStatsUpdater() {
        statsJob?.cancel()
        statsJob = externalScope.launch {
            var seconds = 0L
            while (isActive) {
                delay(2000)
                seconds += 2
                _uptime.value = seconds
                
                // Fluctuating system stats
                if (_connectionStatus.value == "Connected") {
                    _cpuUsage.value = Random.nextFloat() * 0.15f + 0.05f
                    _ramUsage.value = 0.35f + Random.nextFloat() * 0.08f
                    _ping.value = Random.nextInt(28, 55)
                } else if (_connectionStatus.value == "Connecting") {
                    _cpuUsage.value = Random.nextFloat() * 0.35f + 0.20f
                    _ramUsage.value = 0.50f + Random.nextFloat() * 0.12f
                    _ping.value = Random.nextInt(90, 250)
                } else {
                    _cpuUsage.value = Random.nextFloat() * 0.05f + 0.01f
                    _ramUsage.value = 0.25f + Random.nextFloat() * 0.02f
                    _ping.value = 999
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // Seed Initial Database
    // ------------------------------------------------------------------------
    private suspend fun seedInitialData() {
        addLog("INFO", "DATABASE", "Initializing clean DEPMQ WA PANEL database...")
        
        // Default users
        botDao.insertUser(UserEntity(username = "admin", password = "adminpassword", role = "Admin"))
        botDao.insertUser(UserEntity(username = "owner", password = "ownerpassword", role = "Owner"))
        
        // Default settings
        botDao.insertSettings(SettingsEntity())
        
        // Default contacts
        botDao.insertContact(ContactEntity(name = "Kurniawan", phone = "6285712345678"))
        botDao.insertContact(ContactEntity(name = "Rahmat Hidayat", phone = "6281298765432"))
        botDao.insertContact(ContactEntity(name = "Sari Lestari", phone = "6289988877766"))
        
        // Default groups
        botDao.insertGroup(GroupEntity(id = "12036321@g.us", name = "DEPMQ Official Group 🌟", memberCount = 245, isMuted = false, isOpen = true))
        botDao.insertGroup(GroupEntity(id = "12036342@g.us", name = "WhatsApp Bot Community ID", memberCount = 189, isMuted = true, isOpen = false))
        botDao.insertGroup(GroupEntity(id = "12036388@g.us", name = "SaaS Premium Panel Discussion", memberCount = 82, isMuted = false, isOpen = true))

        // Default Auto Replies
        botDao.insertAutoReply(AutoReplyEntity(keyword = "p", matchType = "Exact", response = "Halo! Silakan ketik *menu* untuk melihat fitur lengkap bot panel ini.", priority = 3))
        botDao.insertAutoReply(AutoReplyEntity(keyword = "help", matchType = "Contains", response = "Butuh bantuan? Silakan hubungi admin di +6281234567890.", priority = 2))
        botDao.insertAutoReply(AutoReplyEntity(keyword = "pricelist", matchType = "Contains", response = "🔥 *PRICELIST DEPMQ PANEL* 🔥\n- Paket Hemat: Rp 20k/bln\n- Paket Pro: Rp 50k/bln\n- Paket Enterprise: Rp 120k/bln\n\nHubungi owner untuk aktivasi!", priority = 1))

        // Default Plugins
        botDao.insertPlugin(PluginEntity("antilink", "Anti Link Group", "Mendeteksi link undangan grup lain secara otomatis dan melakukan kick jika terpicu.", true))
        botDao.insertPlugin(PluginEntity("autodownload", "TikTok & YT Auto Downloader", "Mendeteksi link TikTok/YouTube di chat dan mengirim video hasil unduhan.", true))
        botDao.insertPlugin(PluginEntity("welcome", "Welcome & Goodbye", "Mengirim pesan sambutan otomatis ketika member baru masuk ke grup WhatsApp.", false))
        botDao.insertPlugin(PluginEntity("badwords", "Filter Toxic Words", "Menghapus pesan dan memberi peringatan pada member yang berkata kasar.", true))

        // Default API Keys
        botDao.insertApiKey(ApiKeyEntity(name = "Production API Server Key", key = "depmq_live_apikey_xyz777", role = "Owner"))
        botDao.insertApiKey(ApiKeyEntity(name = "Staging Server Key", key = "depmq_stage_apikey_abc456", role = "Admin"))

        // Default Messages
        val chatId = "6285712345678@s.whatsapp.net"
        botDao.insertMessage(MessageEntity(chatId = chatId, chatName = "Kurniawan", sender = "6285712345678", text = "Halo bot panel, apakah fiturnya lancar?", isIncoming = true))
        botDao.insertMessage(MessageEntity(chatId = chatId, chatName = "Kurniawan", sender = "BOT", text = "Halo Kurniawan! Tentu saja, panel DEPMQ WA super lancar 🚀", isIncoming = false))

        // Default Broadcast
        botDao.insertBroadcast(BroadcastEntity(name = "Promo Ramadhan", message = "Dapatkan diskon 50% untuk langganan Panel WhatsApp Bot premium!", totalCount = 100, sentCount = 100, status = "Completed"))

        addLog("SUCCESS", "DATABASE", "Database seed completed! Initial entities populated.")
    }
}
