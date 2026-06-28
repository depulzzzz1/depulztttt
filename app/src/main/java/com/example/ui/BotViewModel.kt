package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import kotlin.random.Random

class BotViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getDatabase(application)
    private val repository = BotRepository(database.botDao(), viewModelScope)

    // ------------------------------------------------------------------------
    // Auth & Navigation State
    // ------------------------------------------------------------------------
    private val _currentUser = MutableStateFlow<UserEntity?>(null)
    val currentUser: StateFlow<UserEntity?> = _currentUser.asStateFlow()

    private val _currentScreen = MutableStateFlow("login") // Starts on Login
    val currentScreen: StateFlow<String> = _currentScreen.asStateFlow()

    // ------------------------------------------------------------------------
    // Flow mappings from Repository
    // ------------------------------------------------------------------------
    val users: StateFlow<List<UserEntity>> = repository.allUsers
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val settings: StateFlow<SettingsEntity> = repository.settingsFlow
        .map { it ?: SettingsEntity() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), SettingsEntity())

    val messages: StateFlow<List<MessageEntity>> = repository.allMessages
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val groups: StateFlow<List<GroupEntity>> = repository.allGroups
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val broadcasts: StateFlow<List<BroadcastEntity>> = repository.allBroadcasts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val plugins: StateFlow<List<PluginEntity>> = repository.allPlugins
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val logs: StateFlow<List<LogEntity>> = repository.recentLogs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val contacts: StateFlow<List<ContactEntity>> = repository.allContacts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val apiKeys: StateFlow<List<ApiKeyEntity>> = repository.allApiKeys
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val autoReplies: StateFlow<List<AutoReplyEntity>> = repository.allAutoReplies
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Live states from Connection Manager
    val connectionStatus: StateFlow<String> = repository.connectionStatus
    val pairingCode: StateFlow<String?> = repository.pairingCode
    val qrCode: StateFlow<String?> = repository.qrCode
    val cpuUsage: StateFlow<Float> = repository.cpuUsage
    val ramUsage: StateFlow<Float> = repository.ramUsage
    val ping: StateFlow<Int> = repository.ping
    val uptime: StateFlow<Long> = repository.uptime
    val serverUrl: StateFlow<String> = repository.serverUrl

    // ------------------------------------------------------------------------
    // UI Local Temporary States
    // ------------------------------------------------------------------------
    private val _selectedChatId = MutableStateFlow<String?>(null)
    val selectedChatId: StateFlow<String?> = _selectedChatId.asStateFlow()

    private val _chatSearchQuery = MutableStateFlow("")
    val chatSearchQuery: StateFlow<String> = _chatSearchQuery.asStateFlow()

    private val _logFilterTag = MutableStateFlow<String?>("ALL")
    val logFilterTag: StateFlow<String?> = _logFilterTag.asStateFlow()

    // ------------------------------------------------------------------------
    // Action Handlers
    // ------------------------------------------------------------------------

    // Auth
    fun login(username: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val user = repository.getUserByUsername(username)
            if (user == null) {
                onError("Username tidak ditemukan!")
                repository.addLog("WARNING", "USER", "Gagal login: Username '$username' tidak terdaftar.")
            } else if (user.password != password) {
                onError("Password salah!")
                repository.addLog("WARNING", "USER", "Gagal login: Password salah untuk user '$username'.")
            } else if (user.isSuspended) {
                onError("Akun Anda ditangguhkan!")
                repository.addLog("ERROR", "USER", "Gagal login: Akun '$username' ditangguhkan.")
            } else {
                _currentUser.value = user
                _currentScreen.value = "dashboard"
                onSuccess()
                repository.addLog("SUCCESS", "USER", "User '${user.username}' berhasil login sebagai ${user.role}.")
            }
        }
    }

    fun register(username: String, password: String, role: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val existing = repository.getUserByUsername(username)
            if (existing != null) {
                onError("Username sudah digunakan!")
            } else {
                val newUser = UserEntity(username = username, password = password, role = role)
                repository.insertUser(newUser)
                _currentUser.value = newUser
                _currentScreen.value = "dashboard"
                onSuccess()
                repository.addLog("SUCCESS", "USER", "User baru '${username}' terdaftar sebagai $role.")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            val oldUser = _currentUser.value
            _currentUser.value = null
            _currentScreen.value = "login"
            if (oldUser != null) {
                repository.addLog("INFO", "USER", "User '${oldUser.username}' logout dari panel.")
            }
        }
    }

    fun navigateTo(screen: String) {
        _currentScreen.value = screen
    }

    // Settings
    fun updateBotSettings(botName: String, ownerNumber: String, prefix: String, timezone: String, language: String) {
        viewModelScope.launch {
            val old = settings.value
            val updated = old.copy(
                botName = botName,
                ownerNumber = ownerNumber,
                prefix = prefix,
                timezone = timezone,
                language = language
            )
            repository.saveSettings(updated)
            repository.addLog("SUCCESS", "BOT", "Konfigurasi bot berhasil diperbarui.")
        }
    }

    fun restartBot() {
        viewModelScope.launch {
            repository.addLog("WARNING", "BOT", "Mengirim sinyal restart ke bot engine...")
            repository.disconnectBot()
            kotlinx.coroutines.delay(1500)
            repository.addLog("SUCCESS", "BOT", "Bot Engine berhasil di-restart dan dimuat ulang.")
            repository.connectBotSimulated()
        }
    }

    fun backupDatabase() {
        viewModelScope.launch {
            repository.addLog("INFO", "DATABASE", "Memulai proses backup database...")
            kotlinx.coroutines.delay(1000)
            repository.addLog("SUCCESS", "DATABASE", "Database berhasil di-backup ke file: depmq_backup_${System.currentTimeMillis()}.sql")
        }
    }

    fun restoreDatabase() {
        viewModelScope.launch {
            repository.addLog("WARNING", "DATABASE", "Memulai proses restore database...")
            kotlinx.coroutines.delay(1500)
            repository.addLog("SUCCESS", "DATABASE", "Database berhasil dipulihkan ke versi backup terdekat.")
        }
    }

    // WhatsApp Panel Functions
    fun generatePairingCode(phoneNumber: String) {
        if (phoneNumber.isNotEmpty()) {
            repository.requestPairingCode(phoneNumber)
        }
    }

    fun generateQrCode() {
        repository.requestQrCode()
    }

    fun reconnectDevice() {
        repository.reconnectBot()
    }

    fun disconnectDevice() {
        repository.disconnectBot()
    }

    fun logoutDevice() {
        repository.logoutBot()
    }

    // Chats & Messages
    fun selectChat(chatId: String?) {
        _selectedChatId.value = chatId
    }

    fun updateSearchQuery(query: String) {
        _chatSearchQuery.value = query
    }

    fun sendMessage(chatId: String, text: String, mediaType: String = "text") {
        if (text.isEmpty()) return
        viewModelScope.launch {
            val chatName = messages.value.firstOrNull { it.chatId == chatId }?.chatName ?: "Active Chat"
            val message = MessageEntity(
                chatId = chatId,
                chatName = chatName,
                sender = "SAYA",
                text = text,
                mediaType = mediaType,
                isIncoming = false
            )
            repository.insertMessage(message)
            repository.addLog("SUCCESS", "BOT", "Pesan terkirim ke $chatName: \"$text\"")

            // Simulated immediate response after 1.5 seconds if connected
            if (connectionStatus.value == "Connected") {
                kotlinx.coroutines.delay(1500)
                val response = when {
                    text.contains("halo", ignoreCase = true) -> "Halo juga! Ada yang bisa dibantu?"
                    text.contains("prefix", ignoreCase = true) -> "Prefix bot saat ini adalah: *" + settings.value.prefix + "*"
                    text.contains("ping", ignoreCase = true) -> "Pong! Latency: " + ping.value + "ms"
                    else -> "Pesan Anda diterima: \"$text\""
                }
                repository.insertMessage(
                    MessageEntity(
                        chatId = chatId,
                        chatName = chatName,
                        sender = "BOT",
                        text = response,
                        isIncoming = true
                    )
                )
                repository.addLog("SUCCESS", "BOT", "Auto response terkirim ke $chatName: \"$response\"")
            }
        }
    }

    fun forwardMessage(chatId: String, text: String) {
        sendMessage(chatId, "[Forwarded]: $text")
    }

    fun deleteChat(chatId: String) {
        viewModelScope.launch {
            repository.deleteChat(chatId)
            if (_selectedChatId.value == chatId) {
                _selectedChatId.value = null
            }
            repository.addLog("WARNING", "BOT", "Riwayat chat dengan $chatId telah dihapus.")
        }
    }

    // Group Manager
    fun createGroup(name: String, members: List<String>) {
        viewModelScope.launch {
            val groupId = "120363" + Random.nextInt(10, 99) + "@g.us"
            val group = GroupEntity(id = groupId, name = name, memberCount = members.size + 1, isMuted = false, isOpen = true)
            repository.insertGroup(group)
            repository.addLog("SUCCESS", "BOT", "Grup baru berhasil dibuat: $name")
        }
    }

    fun joinGroup(inviteUrl: String) {
        viewModelScope.launch {
            repository.addLog("INFO", "BOT", "Mencoba bergabung ke grup via link: $inviteUrl...")
            kotlinx.coroutines.delay(1000)
            val name = "Grup Gabungan " + UUID.randomUUID().toString().take(4).uppercase()
            val group = GroupEntity(id = "120363" + Random.nextInt(100, 999) + "@g.us", name = name, memberCount = 120, isMuted = false, isOpen = true)
            repository.insertGroup(group)
            repository.addLog("SUCCESS", "BOT", "Berhasil bergabung ke grup: $name")
        }
    }

    fun leaveGroup(groupId: String, name: String) {
        viewModelScope.launch {
            repository.deleteGroup(GroupEntity(id = groupId, name = name, memberCount = 0))
            repository.addLog("WARNING", "BOT", "Meninggalkan grup: $name")
        }
    }

    fun groupAction(action: String, groupId: String, groupName: String, param: String = "") {
        viewModelScope.launch {
            when (action) {
                "tag_all" -> repository.addLog("SUCCESS", "BOT", "Melakukan Tag All di grup: $groupName")
                "promote" -> repository.addLog("SUCCESS", "BOT", "Mempromosikan member $param menjadi Admin di: $groupName")
                "demote" -> repository.addLog("WARNING", "BOT", "Menurunkan jabatan Admin $param di: $groupName")
                "kick" -> repository.addLog("ERROR", "BOT", "Mengeluarkan member $param dari grup: $groupName")
                "add" -> repository.addLog("SUCCESS", "BOT", "Menambahkan $param ke grup: $groupName")
                "mute" -> {
                    val list = groups.value
                    val old = list.find { it.id == groupId }
                    if (old != null) {
                        repository.updateGroup(old.copy(isMuted = true))
                        repository.addLog("WARNING", "BOT", "Membisukan (Mute) grup: $groupName")
                    }
                }
                "unmute" -> {
                    val list = groups.value
                    val old = list.find { it.id == groupId }
                    if (old != null) {
                        repository.updateGroup(old.copy(isMuted = false))
                        repository.addLog("SUCCESS", "BOT", "Mengaktifkan suara (Unmute) grup: $groupName")
                    }
                }
                "open" -> {
                    val list = groups.value
                    val old = list.find { it.id == groupId }
                    if (old != null) {
                        repository.updateGroup(old.copy(isOpen = true))
                        repository.addLog("SUCCESS", "BOT", "Membuka pengiriman pesan untuk semua member di grup: $groupName")
                    }
                }
                "close" -> {
                    val list = groups.value
                    val old = list.find { it.id == groupId }
                    if (old != null) {
                        repository.updateGroup(old.copy(isOpen = false))
                        repository.addLog("WARNING", "BOT", "Menutup pengiriman pesan (Hanya Admin) di grup: $groupName")
                    }
                }
            }
        }
    }

    // Broadcast
    fun startBroadcast(name: String, message: String, delay: Int, targets: List<String>) {
        viewModelScope.launch {
            val broadcast = BroadcastEntity(
                name = name,
                message = message,
                totalCount = targets.size,
                sentCount = 0,
                status = "Running",
                delay = delay,
                timestamp = System.currentTimeMillis()
            )
            repository.insertBroadcast(broadcast)
        }
    }

    // Contacts
    fun addContact(name: String, phone: String) {
        viewModelScope.launch {
            repository.insertContact(ContactEntity(name = name, phone = phone))
            repository.addLog("SUCCESS", "USER", "Menambahkan kontak baru: $name ($phone)")
        }
    }

    fun deleteContact(contact: ContactEntity) {
        viewModelScope.launch {
            repository.deleteContact(contact)
            repository.addLog("WARNING", "USER", "Kontak ${contact.name} telah dihapus.")
        }
    }

    fun importContacts() {
        viewModelScope.launch {
            repository.addLog("INFO", "DATABASE", "Mengimpor kontak dari file CSV/VCF...")
            kotlinx.coroutines.delay(1000)
            repository.insertContact(ContactEntity(name = "Bambang Pamungkas", phone = "6281211112222"))
            repository.insertContact(ContactEntity(name = "Sri Mulyani", phone = "6281233334444"))
            repository.addLog("SUCCESS", "DATABASE", "Berhasil mengimpor 2 kontak baru.")
        }
    }

    fun exportContacts() {
        viewModelScope.launch {
            repository.addLog("INFO", "DATABASE", "Mengekspor kontak ke file Excel...")
            kotlinx.coroutines.delay(1000)
            repository.addLog("SUCCESS", "DATABASE", "File Excel kontak berhasil disimpan di folder Downloads.")
        }
    }

    // Plugins
    fun togglePlugin(plugin: PluginEntity) {
        viewModelScope.launch {
            val updated = plugin.copy(isEnabled = !plugin.isEnabled)
            repository.updatePlugin(updated)
            val action = if (updated.isEnabled) "diaktifkan" else "dinonaktifkan"
            repository.addLog("INFO", "PLUGIN", "Plugin '${updated.name}' telah $action.")
        }
    }

    fun reloadPlugins() {
        viewModelScope.launch {
            repository.addLog("WARNING", "PLUGIN", "Memuat ulang seluruh plugin dari folder /plugins...")
            kotlinx.coroutines.delay(1200)
            repository.addLog("SUCCESS", "PLUGIN", "Seluruh plugin (total: " + plugins.value.size + ") berhasil dimuat ulang.")
        }
    }

    fun installPlugin(name: String, description: String) {
        viewModelScope.launch {
            val id = name.lowercase().replace(" ", "")
            val newPlugin = PluginEntity(id = id, name = name, description = description, isEnabled = true)
            repository.insertPlugin(newPlugin)
            repository.addLog("SUCCESS", "PLUGIN", "Plugin '$name' berhasil diinstal dari repository.")
        }
    }

    fun deletePlugin(plugin: PluginEntity) {
        viewModelScope.launch {
            repository.deletePlugin(plugin)
            repository.addLog("WARNING", "PLUGIN", "Plugin '${plugin.name}' telah dihapus.")
        }
    }

    // Auto Replies
    fun addAutoReplyRule(keyword: String, matchType: String, response: String, priority: Int) {
        viewModelScope.launch {
            repository.insertAutoReply(
                AutoReplyEntity(
                    keyword = keyword,
                    matchType = matchType,
                    response = response,
                    priority = priority
                )
            )
            repository.addLog("SUCCESS", "BOT", "Aturan Auto Reply baru dibuat untuk keyword: \"$keyword\"")
        }
    }

    fun toggleAutoReplyRule(rule: AutoReplyEntity) {
        viewModelScope.launch {
            val updated = rule.copy(isEnabled = !rule.isEnabled)
            repository.updateAutoReply(updated)
            val action = if (updated.isEnabled) "diaktifkan" else "dinonaktifkan"
            repository.addLog("INFO", "BOT", "Aturan auto reply \"${updated.keyword}\" $action.")
        }
    }

    fun deleteAutoReplyRule(rule: AutoReplyEntity) {
        viewModelScope.launch {
            repository.deleteAutoReply(rule)
            repository.addLog("WARNING", "BOT", "Aturan auto reply \"${rule.keyword}\" telah dihapus.")
        }
    }

    // Logs
    fun updateLogFilter(tag: String?) {
        _logFilterTag.value = tag
    }

    fun clearLogHistory() {
        viewModelScope.launch {
            repository.clearLogs()
            repository.addLog("SUCCESS", "DATABASE", "Log riwayat berhasil dibersihkan.")
        }
    }

    // Users
    fun toggleSuspendUser(user: UserEntity) {
        viewModelScope.launch {
            val updated = user.copy(isSuspended = !user.isSuspended)
            repository.insertUser(updated)
            val status = if (updated.isSuspended) "ditangguhkan" else "diaktifkan kembali"
            repository.addLog("WARNING", "USER", "Status user '${updated.username}' telah $status.")
        }
    }

    fun deleteUser(user: UserEntity) {
        viewModelScope.launch {
            repository.deleteUser(user)
            repository.addLog("WARNING", "USER", "User '${user.username}' telah dihapus dari sistem.")
        }
    }

    fun resetUserPassword(user: UserEntity, newPass: String) {
        viewModelScope.launch {
            val updated = user.copy(password = newPass)
            repository.insertUser(updated)
            repository.addLog("SUCCESS", "USER", "Password untuk user '${user.username}' berhasil di-reset.")
        }
    }

    // API Keys
    fun generateApiKey(name: String, role: String) {
        viewModelScope.launch {
            val generatedKey = "depmq_key_" + UUID.randomUUID().toString().replace("-", "").take(20)
            repository.insertApiKey(ApiKeyEntity(name = name, key = generatedKey, role = role))
            repository.addLog("SUCCESS", "API", "API Key baru dibuat: $name")
        }
    }

    fun deleteApiKey(apiKey: ApiKeyEntity) {
        viewModelScope.launch {
            repository.deleteApiKey(apiKey)
            repository.addLog("WARNING", "API", "API Key '${apiKey.name}' telah dihapus.")
        }
    }

    // Remote Server Connectivity
    fun connectToRemote(url: String) {
        viewModelScope.launch {
            repository.setRemoteServer(url)
        }
    }
}
