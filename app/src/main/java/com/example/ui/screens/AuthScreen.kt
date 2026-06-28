package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.BotViewModel
import com.example.ui.components.PremiumButton
import com.example.ui.components.PremiumCard
import com.example.ui.components.PremiumTextField
import com.example.ui.theme.*

@Composable
fun AuthScreen(
    viewModel: BotViewModel,
    modifier: Modifier = Modifier
) {
    var isLoginMode by remember { mutableStateOf(true) }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Admin") } // "Admin", "Owner"
    var rememberMe by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showPassword by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(SecondaryBlue.copy(alpha = 0.5f), BackgroundGray)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 420.dp)
                .fillMaxWidth()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header / App Branding
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(PrimaryBlue.copy(alpha = 0.12f), shape = MaterialTheme.shapes.large),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = null,
                    tint = PrimaryBlue,
                    modifier = Modifier.size(32.dp)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "DEPMQ WA PANEL",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = SlateText,
                letterSpacing = 0.5.sp
            )
            Text(
                text = "Enterprise WhatsApp Bot Controller",
                fontSize = 12.sp,
                color = SlateMuted,
                modifier = Modifier.padding(top = 4.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Main Auth Card
            PremiumCard {
                Text(
                    text = if (isLoginMode) "Masuk ke Panel" else "Daftar Akun Baru",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = SlateText,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                if (errorMessage != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(DangerRed.copy(alpha = 0.1f), shape = MaterialTheme.shapes.medium)
                            .padding(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Error, contentDescription = null, tint = DangerRed, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(errorMessage!!, color = DangerRed, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                PremiumTextField(
                    value = username,
                    onValueChange = {
                        username = it
                        errorMessage = null
                    },
                    label = "Username",
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = SlateMuted) }
                )

                Spacer(modifier = Modifier.height(16.dp))

                PremiumTextField(
                    value = password,
                    onValueChange = {
                        password = it
                        errorMessage = null
                    },
                    label = "Password",
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = SlateMuted) },
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                imageVector = if (showPassword) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = null,
                                tint = SlateMuted
                            )
                        }
                    },
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation()
                )

                if (!isLoginMode) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Pilih Role", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SlateText)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("Admin", "Owner").forEach { item ->
                            val selected = role == item
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .background(
                                        if (selected) PrimaryBlue.copy(alpha = 0.1f) else Color.Transparent,
                                        shape = MaterialTheme.shapes.medium
                                    )
                                    .border(
                                        width = 1.dp,
                                        color = if (selected) PrimaryBlue else BorderGray,
                                        shape = MaterialTheme.shapes.medium
                                    )
                                    .clickable { role = item }
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = item,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (selected) PrimaryBlue else SlateText
                                )
                            }
                        }
                    }
                }

                if (isLoginMode) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = rememberMe,
                                onCheckedChange = { rememberMe = it },
                                colors = CheckboxDefaults.colors(checkedColor = PrimaryBlue)
                            )
                            Text("Remember Me", fontSize = 12.sp, color = SlateText)
                        }
                        Text(
                            text = "Lupa Password?",
                            fontSize = 12.sp,
                            color = PrimaryBlue,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable {
                                errorMessage = "Silakan hubungi Owner utama bot untuk reset password."
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                PremiumButton(
                    text = if (isLoginMode) "Masuk" else "Daftar Akun",
                    onClick = {
                        if (username.isEmpty() || password.isEmpty()) {
                            errorMessage = "Semua kolom wajib diisi!"
                            return@PremiumButton
                        }
                        if (isLoginMode) {
                            viewModel.login(username, password,
                                onSuccess = {},
                                onError = { errorMessage = it }
                            )
                        } else {
                            viewModel.register(username, password, role,
                                onSuccess = {},
                                onError = { errorMessage = it }
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = if (isLoginMode) "Belum punya akun?" else "Sudah punya akun?",
                    fontSize = 13.sp,
                    color = SlateMuted
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = if (isLoginMode) "Daftar Sekarang" else "Masuk ke Panel",
                    fontSize = 13.sp,
                    color = PrimaryBlue,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable {
                        isLoginMode = !isLoginMode
                        errorMessage = null
                    }
                )
            }
        }
    }
}
