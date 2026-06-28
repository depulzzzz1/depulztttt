package com.example.ui.screens

import androidx.compose.animation.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ContactEntity
import com.example.data.GroupEntity
import com.example.data.MessageEntity
import com.example.ui.BotViewModel
import com.example.ui.components.*
import com.example.ui.theme.*

@Composable
fun ChatScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val messages by viewModel.messages.collectAsState()
    val selectedChatId by viewModel.selectedChatId.collectAsState()
    val searchQuery by viewModel.chatSearchQuery.collectAsState()

    var typedText by remember { mutableStateOf("") }

    // Map unique chats
    val chats = remember(messages) {
        messages.groupBy { it.chatId }.map { entry ->
            val lastMsg = entry.value.maxByOrNull { it.timestamp }
            lastMsg!!
        }
    }

    val filteredChats = remember(chats, searchQuery) {
        if (searchQuery.isEmpty()) chats
        else chats.filter { it.chatName.contains(searchQuery, ignoreCase = true) || it.chatId.contains(searchQuery) }
    }

    Row(modifier = modifier.fillMaxSize()) {
        // Left Column: Chat lists (1/3 width or standard compact layout)
        Column(
            modifier = Modifier
                .weight(1.2f)
                .fillMaxHeight()
                .border(width = 1.dp, color = BorderGray, shape = RoundedCornerShape(topStart = 20.dp, bottomStart = 20.dp))
                .background(Color.White)
                .padding(12.dp)
        ) {
            Text("Daftar Chat", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = SlateText)
            Spacer(modifier = Modifier.height(8.dp))

            PremiumTextField(
                value = searchQuery,
                onValueChange = { viewModel.updateSearchQuery(it) },
                label = "Cari Chat...",
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = SlateMuted) }
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (filteredChats.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text("Tidak ada chat ditemukan", color = SlateMuted, fontSize = 12.sp)
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(filteredChats) { chat ->
                        val isSelected = chat.chatId == selectedChatId
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    if (isSelected) SecondaryBlue else Color.Transparent,
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .clickable { viewModel.selectChat(chat.chatId) }
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(PrimaryBlue.copy(alpha = 0.15f), shape = RoundedCornerShape(50)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(18.dp))
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(chat.chatName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                Text(chat.text, color = SlateMuted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }

        // Right Column: Active Chat Panel (2/3 width)
        Column(
            modifier = Modifier
                .weight(2f)
                .fillMaxHeight()
                .border(width = 1.dp, color = BorderGray, shape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp))
                .background(BackgroundGray)
        ) {
            if (selectedChatId == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Forum, contentDescription = null, tint = SlateMuted, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Pilih chat untuk memulai percakapan", color = SlateMuted, fontSize = 13.sp)
                    }
                }
            } else {
                val activeChatId = selectedChatId!!
                val chatMessages = messages.filter { it.chatId == activeChatId }
                val chatName = chatMessages.firstOrNull()?.chatName ?: "Active Chat"

                // Active Chat Top Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .background(SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(50)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(18.dp))
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(chatName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = SlateText)
                            Text(activeChatId, fontSize = 11.sp, color = SlateMuted)
                        }
                    }

                    IconButton(onClick = { viewModel.deleteChat(activeChatId) }) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete chat", tint = DangerRed)
                    }
                }

                // Chat Messages Thread
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(chatMessages) { msg ->
                        val isSelf = msg.sender == "SAYA" || msg.sender == "SYSTEM" || msg.sender == "BOT"
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isSelf) Arrangement.End else Arrangement.Start
                        ) {
                            Box(
                                modifier = Modifier
                                    .widthIn(max = 240.dp)
                                    .background(
                                        if (isSelf) PrimaryBlue else Color.White,
                                        shape = RoundedCornerShape(
                                            topStart = 16.dp,
                                            topEnd = 16.dp,
                                            bottomStart = if (isSelf) 16.dp else 4.dp,
                                            bottomEnd = if (isSelf) 4.dp else 16.dp
                                        )
                                    )
                                    .border(
                                        width = 1.dp,
                                        color = if (isSelf) PrimaryBlue else BorderGray,
                                        shape = RoundedCornerShape(16.dp)
                                    )
                                    .padding(horizontal = 14.dp, vertical = 10.dp)
                            ) {
                                Column {
                                    if (isSelf) {
                                        Text(
                                            text = msg.sender,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 9.sp,
                                            color = Color.White.copy(alpha = 0.7f),
                                            modifier = Modifier.padding(bottom = 2.dp)
                                        )
                                    }
                                    Text(
                                        text = msg.text,
                                        color = if (isSelf) Color.White else SlateText,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Chat Input Panel with media attach options
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(12.dp)
                ) {
                    // Send Media short buttons
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(
                            Icons.Default.Image to "image",
                            Icons.Default.Description to "document",
                            Icons.Default.Place to "location",
                            Icons.Default.ContactPage to "contact"
                        ).forEach { (icon, type) ->
                            Box(
                                modifier = Modifier
                                    .background(SecondaryBlue, shape = RoundedCornerShape(8.dp))
                                    .clickable {
                                        viewModel.sendMessage(
                                            activeChatId,
                                            "[Media Attachment: $type]",
                                            type
                                        )
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(imageVector = icon, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(type.uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = PrimaryBlue)
                                }
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = typedText,
                            onValueChange = { typedText = it },
                            placeholder = { Text("Ketik pesan...", fontSize = 13.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PrimaryBlue,
                                unfocusedBorderColor = BorderGray
                            )
                        )

                        IconButton(
                            onClick = {
                                if (typedText.isNotEmpty()) {
                                    viewModel.sendMessage(activeChatId, typedText)
                                    typedText = ""
                                }
                            },
                            modifier = Modifier.background(PrimaryBlue, shape = RoundedCornerShape(12.dp))
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "Kirim", tint = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BroadcastScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val broadcasts by viewModel.broadcasts.collectAsState()
    var broadcastName by remember { mutableStateOf("") }
    var broadcastMsg by remember { mutableStateOf("") }
    var broadcastDelay by remember { mutableStateOf("3") }
    var manualNumbers by remember { mutableStateOf("") }
    var isImportedCsv by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Broadcast Manager",
            subtitle = "Kirim pesan siaran massal dengan delay dan media",
            icon = Icons.Default.Campaign
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Left Input Card
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Buat Broadcast Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = broadcastName, onValueChange = { broadcastName = it }, label = "Nama Kampanye")
                    Spacer(modifier = Modifier.height(10.dp))

                    PremiumTextField(value = broadcastMsg, onValueChange = { broadcastMsg = it }, label = "Isi Pesan Siaran")
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        PremiumTextField(
                            value = broadcastDelay,
                            onValueChange = { broadcastDelay = it },
                            label = "Delay (Detik)",
                            modifier = Modifier.weight(1f)
                        )

                        Box(
                            modifier = Modifier
                                .background(
                                    if (isImportedCsv) SuccessGreen.copy(alpha = 0.12f) else SecondaryBlue,
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .border(1.dp, if (isImportedCsv) SuccessGreen else PrimaryBlue, RoundedCornerShape(12.dp))
                                .clickable { isImportedCsv = !isImportedCsv }
                                .padding(horizontal = 14.dp, vertical = 14.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if (isImportedCsv) Icons.Default.CheckCircle else Icons.Default.FileUpload,
                                    contentDescription = null,
                                    tint = if (isImportedCsv) SuccessGreen else PrimaryBlue,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    if (isImportedCsv) "Excel Siap" else "Import Excel/CSV",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isImportedCsv) SuccessGreen else PrimaryBlue
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    PremiumTextField(
                        value = manualNumbers,
                        onValueChange = { manualNumbers = it },
                        label = "Nomor Manual (Pisahkan koma)",
                        placeholder = "6281234567, 6289876543"
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    PremiumButton(
                        text = "Mulai Broadcast",
                        onClick = {
                            val list = if (isImportedCsv) {
                                List(35) { "6285" + (10000000..99999999).random() }
                            } else {
                                manualNumbers.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                            }
                            if (list.isNotEmpty() && broadcastName.isNotEmpty() && broadcastMsg.isNotEmpty()) {
                                viewModel.startBroadcast(
                                    broadcastName,
                                    broadcastMsg,
                                    broadcastDelay.toIntOrNull() ?: 3,
                                    list
                                )
                                broadcastName = ""
                                broadcastMsg = ""
                                manualNumbers = ""
                                isImportedCsv = false
                            }
                        },
                        icon = Icons.Default.PlayArrow,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = broadcastName.isNotEmpty() && broadcastMsg.isNotEmpty()
                    )
                }
            }

            // Right History Card
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Riwayat Siaran", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (broadcasts.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Belum ada riwayat broadcast", color = SlateMuted, fontSize = 12.sp)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(320.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(broadcasts) { bc ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                        .padding(10.dp)
                                ) {
                                    Column {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(bc.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                            val color = when (bc.status) {
                                                "Completed" -> SuccessGreen
                                                "Running" -> PrimaryBlue
                                                else -> DangerRed
                                            }
                                            Text(
                                                bc.status,
                                                color = color,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(bc.message, fontSize = 11.sp, color = SlateMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Spacer(modifier = Modifier.height(8.dp))
                                        LinearProgressIndicator(
                                            progress = { bc.sentCount.toFloat() / bc.totalCount.toFloat() },
                                            modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                                            color = PrimaryBlue,
                                            trackColor = BorderGray
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("Progress: ${bc.sentCount}/${bc.totalCount} Terkirim", fontSize = 10.sp, color = SlateText)
                                    }
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
fun GroupManagerScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val groups by viewModel.groups.collectAsState()
    var inviteUrl by remember { mutableStateOf("") }
    var newGroupName by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Group Manager",
            subtitle = "Kelola grup tempat bot aktif dengan command super admin",
            icon = Icons.Default.Groups
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Left Input Card
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Daftar Grup WhatsApp Bot", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (groups.isEmpty()) {
                        Box(modifier = Modifier.height(150.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Text("Bot tidak bergabung ke grup mana pun", color = SlateMuted, fontSize = 12.sp)
                        }
                    } else {
                        groups.forEach { group ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 10.dp)
                                    .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                Column {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(group.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                            Text("${group.memberCount} Members", fontSize = 11.sp, color = SlateMuted)
                                        }

                                        IconButton(onClick = { viewModel.leaveGroup(group.id, group.name) }) {
                                            Icon(Icons.Default.ExitToApp, contentDescription = "Leave", tint = DangerRed)
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .background(PrimaryBlue, shape = RoundedCornerShape(8.dp))
                                                .clickable { viewModel.groupAction("tag_all", group.id, group.name) }
                                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Text("Tag All", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }

                                        Box(
                                            modifier = Modifier
                                                .background(SuccessGreen, shape = RoundedCornerShape(8.dp))
                                                .clickable { viewModel.groupAction("promote", group.id, group.name, "Member") }
                                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Text("Promote Admin", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }

                                        Box(
                                            modifier = Modifier
                                                .background(if (group.isMuted) SuccessGreen else DangerRed, shape = RoundedCornerShape(8.dp))
                                                .clickable {
                                                    viewModel.groupAction(
                                                        if (group.isMuted) "unmute" else "mute",
                                                        group.id,
                                                        group.name
                                                    )
                                                }
                                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Text(
                                                if (group.isMuted) "Unmute" else "Mute",
                                                color = Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Right Group Join/Create
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Gabung via Link", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = inviteUrl, onValueChange = { inviteUrl = it }, label = "Link Undangan Grup")
                    Spacer(modifier = Modifier.height(12.dp))
                    PremiumButton(
                        text = "Gabung Grup",
                        onClick = {
                            viewModel.joinGroup(inviteUrl)
                            inviteUrl = ""
                        },
                        icon = Icons.Default.Add,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = inviteUrl.isNotEmpty()
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Buat Grup Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = newGroupName, onValueChange = { newGroupName = it }, label = "Nama Grup Baru")
                    Spacer(modifier = Modifier.height(12.dp))
                    PremiumButton(
                        text = "Buat Grup",
                        onClick = {
                            viewModel.createGroup(newGroupName, listOf("62812345", "6289988"))
                            newGroupName = ""
                        },
                        icon = Icons.Default.Groups,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = newGroupName.isNotEmpty()
                    )
                }
            }
        }
    }
}

@Composable
fun ContactsScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    val contacts by viewModel.contacts.collectAsState()
    var searchPhone by remember { mutableStateOf("") }
    var contactName by remember { mutableStateOf("") }
    var contactPhone by remember { mutableStateOf("") }

    val filteredContacts = remember(contacts, searchPhone) {
        if (searchPhone.isEmpty()) contacts
        else contacts.filter { it.name.contains(searchPhone, ignoreCase = true) || it.phone.contains(searchPhone) }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        SectionHeader(
            title = "Manajemen Kontak",
            subtitle = "Kelola kontak target siaran atau customer service bot",
            icon = Icons.Default.ContactPage,
            actionButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PremiumButton(text = "Import Excel", onClick = { viewModel.importContacts() }, icon = Icons.Default.FileUpload, backgroundColor = SecondaryBlue, contentColor = PrimaryBlue)
                    PremiumButton(text = "Export Excel", onClick = { viewModel.exportContacts() }, icon = Icons.Default.FileDownload, backgroundColor = SuccessGreen)
                }
            }
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Add contact
            Column(modifier = Modifier.weight(1f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Tambah Kontak Baru", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(value = contactName, onValueChange = { contactName = it }, label = "Nama Lengkap")
                    Spacer(modifier = Modifier.height(10.dp))
                    PremiumTextField(value = contactPhone, onValueChange = { contactPhone = it }, label = "Nomor Telepon (WA)")
                    Spacer(modifier = Modifier.height(16.dp))

                    PremiumButton(
                        text = "Simpan Kontak",
                        onClick = {
                            if (contactName.isNotEmpty() && contactPhone.isNotEmpty()) {
                                viewModel.addContact(contactName, contactPhone)
                                contactName = ""
                                contactPhone = ""
                            }
                        },
                        icon = Icons.Default.Save,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = contactName.isNotEmpty() && contactPhone.isNotEmpty()
                    )
                }
            }

            // Contact lists
            Column(modifier = Modifier.weight(1.2f)) {
                PremiumCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Daftar Kontak Terdaftar", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SlateText)
                    Spacer(modifier = Modifier.height(12.dp))

                    PremiumTextField(
                        value = searchPhone,
                        onValueChange = { searchPhone = it },
                        label = "Cari Kontak...",
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = SlateMuted) }
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    if (filteredContacts.isEmpty()) {
                        Box(modifier = Modifier.height(200.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Text("Tidak ada kontak ditemukan", color = SlateMuted, fontSize = 12.sp)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(280.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(filteredContacts) { contact ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(SecondaryBlue.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(contact.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SlateText)
                                        Text(contact.phone, fontSize = 11.sp, color = SlateMuted)
                                    }
                                    IconButton(onClick = { viewModel.deleteContact(contact) }) {
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
}
