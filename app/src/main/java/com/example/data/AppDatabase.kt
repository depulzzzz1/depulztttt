package com.example.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ------------------------------------------------------------------------
// Entities
// ------------------------------------------------------------------------

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val username: String,
    val password: String,
    val role: String, // "Admin", "Owner"
    val isSuspended: Boolean = false
)

@Entity(tableName = "settings")
data class SettingsEntity(
    @PrimaryKey val id: Int = 1,
    val botName: String = "DEPMQ Bot",
    val ownerNumber: String = "6281234567890",
    val prefix: String = "!",
    val timezone: String = "GMT+7",
    val language: String = "ID"
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val chatId: String,
    val chatName: String,
    val sender: String,
    val text: String,
    val mediaType: String = "text", // "text", "image", "video", "audio", "document", "location", "contact"
    val mediaUrl: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val isIncoming: Boolean = true
)

@Entity(tableName = "groups")
data class GroupEntity(
    @PrimaryKey val id: String,
    val name: String,
    val memberCount: Int,
    val isMuted: Boolean = false,
    val isOpen: Boolean = true
)

@Entity(tableName = "broadcasts")
data class BroadcastEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val message: String,
    val mediaUri: String = "",
    val totalCount: Int,
    val sentCount: Int,
    val status: String = "Completed", // "Running", "Paused", "Stopped", "Completed"
    val delay: Int = 3,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "plugins")
data class PluginEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val isEnabled: Boolean = true
)

@Entity(tableName = "logs")
data class LogEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val level: String, // "INFO", "WARNING", "ERROR", "SUCCESS"
    val tag: String,   // "BOT", "API", "SOCKET", "BROADCAST", "USER"
    val message: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "contacts")
data class ContactEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val phone: String
)

@Entity(tableName = "api_keys")
data class ApiKeyEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val key: String,
    val role: String = "Admin"
)

@Entity(tableName = "auto_replies")
data class AutoReplyEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val keyword: String,
    val matchType: String, // "Contains", "Regex", "Exact"
    val response: String,
    val mediaUri: String = "",
    val isEnabled: Boolean = true,
    val priority: Int = 1
)

// ------------------------------------------------------------------------
// DAOs
// ------------------------------------------------------------------------

@Dao
interface BotDao {
    // Users
    @Query("SELECT * FROM users")
    fun getAllUsers(): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Delete
    suspend fun deleteUser(user: UserEntity)

    @Query("SELECT * FROM users WHERE username = :username LIMIT 1")
    suspend fun getUserByUsername(username: String): UserEntity?

    // Settings
    @Query("SELECT * FROM settings WHERE id = 1 LIMIT 1")
    fun getSettingsFlow(): Flow<SettingsEntity?>

    @Query("SELECT * FROM settings WHERE id = 1 LIMIT 1")
    suspend fun getSettings(): SettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSettings(settings: SettingsEntity)

    // Messages / Chats
    @Query("SELECT * FROM messages ORDER BY timestamp ASC")
    fun getAllMessagesFlow(): Flow<List<MessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)

    @Query("DELETE FROM messages WHERE chatId = :chatId")
    suspend fun deleteChat(chatId: String)

    // Groups
    @Query("SELECT * FROM groups")
    fun getAllGroupsFlow(): Flow<List<GroupEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGroup(group: GroupEntity)

    @Update
    suspend fun updateGroup(group: GroupEntity)

    @Delete
    suspend fun deleteGroup(group: GroupEntity)

    // Broadcasts
    @Query("SELECT * FROM broadcasts ORDER BY timestamp DESC")
    fun getAllBroadcastsFlow(): Flow<List<BroadcastEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBroadcast(broadcast: BroadcastEntity)

    @Update
    suspend fun updateBroadcast(broadcast: BroadcastEntity)

    // Plugins
    @Query("SELECT * FROM plugins")
    fun getAllPluginsFlow(): Flow<List<PluginEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlugin(plugin: PluginEntity)

    @Update
    suspend fun updatePlugin(plugin: PluginEntity)

    @Delete
    suspend fun deletePlugin(plugin: PluginEntity)

    // Logs
    @Query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 500")
    fun getRecentLogsFlow(): Flow<List<LogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: LogEntity)

    @Query("DELETE FROM logs")
    suspend fun clearLogs()

    // Contacts
    @Query("SELECT * FROM contacts")
    fun getAllContactsFlow(): Flow<List<ContactEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContact(contact: ContactEntity)

    @Delete
    suspend fun deleteContact(contact: ContactEntity)

    // API Keys
    @Query("SELECT * FROM api_keys")
    fun getAllApiKeysFlow(): Flow<List<ApiKeyEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertApiKey(key: ApiKeyEntity)

    @Delete
    suspend fun deleteApiKey(key: ApiKeyEntity)

    // Auto Replies
    @Query("SELECT * FROM auto_replies ORDER BY priority DESC")
    fun getAllAutoRepliesFlow(): Flow<List<AutoReplyEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAutoReply(autoReply: AutoReplyEntity)

    @Update
    suspend fun updateAutoReply(autoReply: AutoReplyEntity)

    @Delete
    suspend fun deleteAutoReply(autoReply: AutoReplyEntity)
}

// ------------------------------------------------------------------------
// Database
// ------------------------------------------------------------------------

@Database(
    entities = [
        UserEntity::class,
        SettingsEntity::class,
        MessageEntity::class,
        GroupEntity::class,
        BroadcastEntity::class,
        PluginEntity::class,
        LogEntity::class,
        ContactEntity::class,
        ApiKeyEntity::class,
        AutoReplyEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun botDao(): BotDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "depmq_wa_panel_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
