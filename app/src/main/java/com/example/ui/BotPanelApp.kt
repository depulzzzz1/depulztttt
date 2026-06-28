package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import com.example.data.UserEntity
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

        BoxWithConstraints(modifier = modifier.fillMaxSize()) {
            val isWideScreen = maxWidth >= 840.dp
            val scope = rememberCoroutineScope()
            val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

            if (isWideScreen) {
                // 1. Premium Wide Screen Layout: Permanent left Sidebar + Off-white Content Area card
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.White)
                ) {
                    // Sidebar navigation component on the left side
                    Box(
                        modifier = Modifier
                            .width(280.dp)
                            .fillMaxHeight()
                            .padding(vertical = 16.dp, horizontal = 16.dp)
                    ) {
                        SidebarContent(
                            currentScreen = currentScreen,
                            menuItems = menuItems,
                            user = user,
                            connectionStatus = connectionStatus,
                            onNavigate = { route -> viewModel.navigateTo(route) },
                            onLogout = { viewModel.logout() }
                        )
                    }

                    // Content Area with FAFAFA background, 20px radius, and soft shadows
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .padding(top = 16.dp, bottom = 16.dp, end = 16.dp)
                            .shadow(
                                elevation = 10.dp,
                                shape = RoundedCornerShape(20.dp),
                                clip = true,
                                ambientColor = Color.Black.copy(alpha = 0.04f),
                                spotColor = Color.Black.copy(alpha = 0.08f)
                            ),
                        shape = RoundedCornerShape(20.dp),
                        color = BackgroundGray // #FAFAFA
                    ) {
                        Scaffold(
                            topBar = {
                                ContentAreaTopBar(
                                    currentScreen = currentScreen,
                                    menuItems = menuItems,
                                    connectionStatus = connectionStatus,
                                    onToggleDrawer = null
                                )
                            },
                            containerColor = Color.Transparent,
                            modifier = Modifier.fillMaxSize()
                        ) { padding ->
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(padding)
                            ) {
                                ActiveScreenContent(currentScreen = currentScreen, viewModel = viewModel)
                            }
                        }
                    }
                }
            } else {
                // 2. Compact Screen Layout: Collapsible drawer-based sidebar
                ModalNavigationDrawer(
                    drawerState = drawerState,
                    drawerContent = {
                        ModalDrawerSheet(
                            drawerShape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp),
                            drawerContainerColor = Color.White,
                            modifier = Modifier.width(280.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .padding(16.dp)
                            ) {
                                SidebarContent(
                                    currentScreen = currentScreen,
                                    menuItems = menuItems,
                                    user = user,
                                    connectionStatus = connectionStatus,
                                    onNavigate = { route ->
                                        viewModel.navigateTo(route)
                                        scope.launch { drawerState.close() }
                                    },
                                    onLogout = { viewModel.logout() }
                                )
                            }
                        }
                    }
                ) {
                    // Mobile content frame styled as a beautiful 20px rounded card
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.White)
                            .padding(8.dp)
                    ) {
                        Surface(
                            modifier = Modifier
                                .fillMaxSize()
                                .shadow(
                                    elevation = 6.dp,
                                    shape = RoundedCornerShape(20.dp),
                                    clip = true,
                                    ambientColor = Color.Black.copy(alpha = 0.03f),
                                    spotColor = Color.Black.copy(alpha = 0.06f)
                                ),
                            shape = RoundedCornerShape(20.dp),
                            color = BackgroundGray // #FAFAFA
                        ) {
                            Scaffold(
                                topBar = {
                                    ContentAreaTopBar(
                                        currentScreen = currentScreen,
                                        menuItems = menuItems,
                                        connectionStatus = connectionStatus,
                                        onToggleDrawer = { scope.launch { drawerState.open() } }
                                    )
                                },
                                containerColor = Color.Transparent,
                                modifier = Modifier.fillMaxSize()
                            ) { padding ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(padding)
                                ) {
                                    ActiveScreenContent(currentScreen = currentScreen, viewModel = viewModel)
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
fun SidebarContent(
    currentScreen: String,
    menuItems: List<Triple<String, ImageVector, String>>,
    user: UserEntity,
    connectionStatus: String,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxHeight()
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
                Icon(
                    imageVector = Icons.Default.Android,
                    contentDescription = null,
                    tint = PrimaryBlue,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = "DEPMQ WA PANEL",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = SlateText
                )
                Text(
                    text = "Premium Control Hub",
                    fontSize = 10.sp,
                    color = SlateMuted
                )
            }
        }

        Divider(color = BorderGray, modifier = Modifier.padding(vertical = 12.dp))

        // Scrollable Navigation Menu items
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            menuItems.forEach { (route, icon, label) ->
                val selected = currentScreen == route
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (selected) SecondaryBlue else Color.Transparent)
                        .clickable { onNavigate(route) }
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

        // User Account Profile & Logout Controller
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
                    Text(
                        text = user.username.take(2).uppercase(),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = SuccessGreen
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = user.username,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = SlateText
                    )
                    Text(
                        text = user.role,
                        fontSize = 9.sp,
                        color = SlateMuted
                    )
                }
            }
            IconButton(onClick = onLogout) {
                Icon(
                    imageVector = Icons.Default.ExitToApp,
                    contentDescription = "Logout",
                    tint = DangerRed
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentAreaTopBar(
    currentScreen: String,
    menuItems: List<Triple<String, ImageVector, String>>,
    connectionStatus: String,
    onToggleDrawer: (() -> Unit)?
) {
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
                    // Default to offline state
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
            if (onToggleDrawer != null) {
                IconButton(onClick = onToggleDrawer) {
                    Icon(
                        imageVector = Icons.Default.Menu,
                        contentDescription = "Menu",
                        tint = SlateText
                    )
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
    )
}

@Composable
fun ActiveScreenContent(
    currentScreen: String,
    viewModel: BotViewModel
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
