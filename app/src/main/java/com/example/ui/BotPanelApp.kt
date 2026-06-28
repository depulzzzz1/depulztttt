package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import com.example.ui.screens.*
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BotPanelApp(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val currentScreen by viewModel.currentScreen.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val connectionStatus by viewModel.connectionStatus.collectAsState()

    if (currentUser == null) {
        AuthScreen(viewModel = viewModel)
    } else {
        val user = currentUser!!
        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
        val scope = rememberCoroutineScope()

        // Sidebar Navigation items
        val menuItems = listOf(
            Triple("dashboard", Icons.Default.Dashboard, "Dashboard"),
            Triple("whatsapp", Icons.Default.PhoneAndroid, "WhatsApp"),
            Triple("chat", Icons.Default.Chat, "Chat Inbox"),
            Triple("broadcast", Icons.Default.Campaign, "Broadcast"),
            Triple("group_manager", Icons.Default.Groups, "Group Manager"),
            Triple("contacts", Icons.Default.ContactPage, "Contacts"),
            Triple("plugin", Icons.Default.Extension, "Plugins"),
            Triple("auto_reply", Icons.Default.Quickreply, "Auto Reply"),
            Triple("logs", Icons.Default.Terminal, "Logs Console"),
            Triple("api", Icons.Default.Key, "API Gateway"),
            Triple("users", Icons.Default.People, "Users"),
            Triple("settings", Icons.Default.Settings, "Settings")
        )

        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                ModalDrawerSheet(
                    drawerShape = RoundedCornerShape(topEnd = 24.dp, bottomEnd = 24.dp),
                    drawerContainerColor = Color.White,
                    modifier = Modifier.width(280.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxHeight()
                            .padding(16.dp)
                    ) {
                        // Brand Logo
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(PrimaryBlue.copy(alpha = 0.12f), RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Android, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(20.dp))
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("DEPMQ WA PANEL", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SlateText)
                                Text("Premium Control Hub", fontSize = 10.sp, color = SlateMuted)
                            }
                        }

                        Divider(color = BorderGray, modifier = Modifier.padding(vertical = 12.dp))

                        // Navigation Items list
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            menuItems.forEach { (route, icon, label) ->
                                val selected = currentScreen == route
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(if (selected) SecondaryBlue else Color.Transparent)
                                        .clickable {
                                            viewModel.navigateTo(route)
                                            scope.launch { drawerState.close() }
                                        }
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = label,
                                        tint = if (selected) PrimaryBlue else SlateText,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = label,
                                        fontSize = 13.sp,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (selected) PrimaryBlue else SlateText
                                    )
                                }
                            }
                        }

                        Divider(color = BorderGray, modifier = Modifier.padding(vertical = 12.dp))

                        // Logged in User Profile Info + Logout
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .background(SuccessGreen.copy(alpha = 0.12f), RoundedCornerShape(50)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(user.username.take(2).uppercase(), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = SuccessGreen)
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(user.username, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SlateText)
                                    Text(user.role, fontSize = 9.sp, color = SlateMuted)
                                }
                            }
                            IconButton(onClick = { viewModel.logout() }) {
                                Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = DangerRed)
                            }
                        }
                    }
                }
            }
        ) {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = menuItems.find { it.first == currentScreen }?.third ?: "DEPMQ WA PANEL",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SlateText
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                val statusColor = when (connectionStatus) {
                                    "Connected" -> SuccessGreen
                                    "Connecting" -> WarningYellow
                                    else -> DangerRed
                                }
                                Box(
                                    modifier = Modifier
                                        .background(statusColor.copy(alpha = 0.15f), shape = RoundedCornerShape(6.dp))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = connectionStatus.uppercase(),
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = statusColor
                                    )
                                }
                            }
                        },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(Icons.Default.Menu, contentDescription = "Menu", tint = SlateText)
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
                    )
                },
                containerColor = BackgroundGray,
                modifier = Modifier.fillMaxSize()
            ) { padding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    when (currentScreen) {
                        "dashboard" -> DashboardScreen(viewModel = viewModel)
                        "whatsapp" -> WhatsAppScreen(viewModel = viewModel)
                        "chat" -> ChatScreen(viewModel = viewModel)
                        "broadcast" -> BroadcastScreen(viewModel = viewModel)
                        "group_manager" -> GroupManagerScreen(viewModel = viewModel)
                        "contacts" -> ContactsScreen(viewModel = viewModel)
                        "plugin" -> PluginScreen(viewModel = viewModel)
                        "auto_reply" -> AutoReplyScreen(viewModel = viewModel)
                        "logs" -> LogsScreen(viewModel = viewModel)
                        "api" -> ApiScreen(viewModel = viewModel)
                        "users" -> UsersScreen(viewModel = viewModel)
                        "settings" -> SettingsScreen(viewModel = viewModel)
                        else -> DashboardScreen(viewModel = viewModel)
                    }
                }
            }
        }
    }
}
