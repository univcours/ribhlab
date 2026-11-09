package com.ribhlab.rivoscan

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowInsetsControllerCompat

/**
 * RivoScan's Material 3 Android entrance, implemented in Kotlin/Jetpack Compose.
 *
 * Every displayed control launches a real existing Capacitor/CameraX action.
 * The document library itself stays in the existing document engine, to avoid
 * inventing files or losing the persisted SAF/IndexedDB state during migration.
 *
 * Visual target: Figma RivoScan Material 3 Android UI Redesign (Home 2:2,
 * Tools 2:295, Settings 2:353).
 */
class RivoComposeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.WHITE
        window.navigationBarColor = android.graphics.Color.WHITE
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }
        setContent {
            MaterialTheme(colorScheme = RivoColors) {
                RivoShell(onAction = ::openExistingFeature)
            }
        }
    }

    private fun openExistingFeature(route: String) {
        // Do NOT uninstall, clear a storage area, or start CameraX directly:
        // the Capacitor plugin owns the permission and document-save lifecycle.
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra(RIVO_NATIVE_ROUTE, route)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(intent)
    }
}

internal const val RIVO_NATIVE_ROUTE = "rivoscan.ui.route"

private val Ink = Color(0xFF18243B)
private val Muted = Color(0xFF68788E)
private val Brand = Color(0xFF225BE8)
private val BrandDark = Color(0xFF153DA7)
private val Canvas = Color(0xFFF7F9FD)
private val SoftBlue = Color(0xFFEAF0FF)
private val Outline = Color(0xFFDFE5F0)
private val Teal = Color(0xFF008F89)
private val Danger = Color(0xFFD84058)

private val RivoColors = lightColorScheme(
    primary = Brand, onPrimary = Color.White,
    primaryContainer = SoftBlue, onPrimaryContainer = BrandDark,
    secondary = Teal, background = Canvas, onBackground = Ink,
    surface = Color.White, onSurface = Ink,
    surfaceVariant = Color(0xFFEEF2F9), onSurfaceVariant = Muted,
    outline = Outline, error = Danger
)

private data class RivoTool(val title: String, val detail: String, val icon: String, val route: String)
private val tools = listOf(
    RivoTool("Scan document", "Auto-detect edges with CameraX", "▣", "scan"),
    RivoTool("QR / Barcode", "Scan and save codes", "▦", "qr"),
    RivoTool("Import photos", "Choose images from your device", "▧", "gallery"),
    RivoTool("Merge PDFs", "Combine multiple PDF files", "⇉", "tool:merge"),
    RivoTool("Compress PDF", "Reduce file size", "⇣", "tool:compress"),
    RivoTool("PDF to Word", "Convert into editable document", "⇄", "tool:pdf-word"),
    RivoTool("Sign document", "Draw or insert your signature", "✎", "tool:sign"),
    RivoTool("Manage pages", "Reorder, rotate and delete", "▦", "hub:pageManager"),
    RivoTool("Convert images", "Turn pictures into PDF", "▧", "tool:images"),
    RivoTool("More document tools", "Open all available tools", "＋", "tools")
)

@Composable
private fun RivoShell(onAction: (String) -> Unit) {
    var currentTab by rememberSaveable { mutableStateOf("Home") }
    val nav = listOf("Home", "Tools", "Scan", "Files", "Me")
    Scaffold(
        containerColor = Canvas,
        bottomBar = {
            NavigationBar(containerColor = Color.White, tonalElevation = 2.dp) {
                nav.forEachIndexed { i, title ->
                    val selected = currentTab == title
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            when (title) {
                                "Scan" -> onAction("scan")
                                "Files" -> onAction("library")
                                else -> currentTab = title
                            }
                        },
                        icon = {
                            Text(
                                listOf("⌂", "▦", "◎", "▤", "⚙")[i],
                                fontSize = 23.sp,
                                color = if (selected) Brand else Muted
                            )
                        },
                        label = { Text(title, fontSize = 11.sp) },
                        alwaysShowLabel = true
                    )
                }
            }
        }
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 21.dp)
        ) {
            when (currentTab) {
                "Home" -> HomeContent(onAction, onTools = { currentTab = "Tools" })
                "Tools" -> ToolContent(onAction)
                else -> SettingsContent(onAction)
            }
            Spacer(Modifier.height(18.dp))
        }
    }
}

@Composable
private fun RivoHeading(title: String, subtitle: String) {
    Text(title, color = Ink, fontWeight = FontWeight.Bold, fontSize = 27.sp)
    Spacer(Modifier.height(4.dp))
    Text(subtitle, color = Muted, fontSize = 13.sp)
    Spacer(Modifier.height(22.dp))
}

@Composable
private fun RivoSection(text: String) {
    Text(text, color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
    Spacer(Modifier.height(12.dp))
}

@Composable
private fun HomeContent(onAction: (String) -> Unit, onTools: () -> Unit) {
    RivoHeading("Good morning 👋", "Make every document effortless.")
    Card(
        modifier = Modifier.fillMaxWidth().height(187.dp).clickable { onAction("scan") },
        shape = RoundedCornerShape(23.dp),
        colors = CardDefaults.cardColors(containerColor = Brand)
    ) {
        Column(
            Modifier.padding(19.dp).fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(shape = RoundedCornerShape(15.dp), color = Color(0xFF477BFF)) {
                Text("▣", modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    color = Color.White, fontSize = 25.sp)
            }
            Column {
                Text("Scan a document", color = Color.White, fontSize = 24.sp,
                    fontWeight = FontWeight.Bold)
                Text("Smart crop · enhance · PDF", color = Color(0xFFDDE9FF), fontSize = 13.sp)
                Spacer(Modifier.height(10.dp))
                Surface(color = Color.White, shape = RoundedCornerShape(24.dp)) {
                    Text("Open camera", modifier = Modifier.padding(horizontal = 18.dp, vertical = 9.dp),
                        color = BrandDark, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                }
            }
        }
    }
    Spacer(Modifier.height(13.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FeatureTile("▦", "QR / Barcode", Teal, Modifier.weight(1f)) { onAction("qr") }
        FeatureTile("▧", "From gallery", Brand, Modifier.weight(1f)) { onAction("gallery") }
    }
    Spacer(Modifier.height(23.dp))
    RivoSection("Quick actions")
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        ActionTile("⇉", "Merge PDFs", Modifier.weight(1f)) { onAction("tool:merge") }
        ActionTile("↻", "Convert", Modifier.weight(1f)) { onAction("category:convert") }
    }
    Spacer(Modifier.height(11.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        ActionTile("✎", "Sign", Modifier.weight(1f)) { onAction("tool:sign") }
        ActionTile("⇣", "Compress", Modifier.weight(1f)) { onAction("tool:compress") }
    }
    Spacer(Modifier.height(23.dp))
    RivoSection("Recent files")
    // Never show the example filenames from the Figma drawing as real user data.
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onAction("library") },
        border = BorderStroke(1.dp, Outline),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(15.dp)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(15.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconTile("▤", Brand)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Open my documents", fontWeight = FontWeight.SemiBold, color = Ink)
                Text("View actual saved files on this device", color = Muted, fontSize = 12.sp)
            }
            Text("›", color = Muted, fontSize = 25.sp)
        }
    }
    Spacer(Modifier.height(10.dp))
    Button(
        onClick = onTools, modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(containerColor = SoftBlue, contentColor = Brand)
    ) { Text("Explore all tools", fontWeight = FontWeight.SemiBold) }
}

@Composable
private fun FeatureTile(glyph: String, title: String, tone: Color, modifier: Modifier, action: () -> Unit) {
    Card(
        modifier = modifier.height(90.dp).clickable(onClick = action),
        shape = RoundedCornerShape(17.dp),
        border = BorderStroke(1.dp, Outline),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Text(glyph, fontWeight = FontWeight.Bold, color = tone, fontSize = 25.sp)
            Text(title, color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1)
        }
    }
}

@Composable
private fun ActionTile(glyph: String, title: String, modifier: Modifier, action: () -> Unit) {
    Card(
        modifier = modifier.height(56.dp).clickable(onClick = action),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Outline),
        shape = RoundedCornerShape(13.dp)
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(glyph, color = Brand, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            Spacer(Modifier.width(12.dp))
            Text(title, color = Ink, fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp, maxLines = 2, lineHeight = 17.sp)
        }
    }
}

@Composable
private fun IconTile(icon: String, color: Color) {
    Surface(shape = RoundedCornerShape(12.dp), color = SoftBlue) {
        Text(icon, modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            fontSize = 21.sp, color = color, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ToolContent(onAction: (String) -> Unit) {
    var search by rememberSaveable { mutableStateOf("") }
    RivoHeading("All tools", "Everything you need, one tap away.")
    OutlinedTextField(
        value = search,
        onValueChange = { search = it },
        label = { Text("Search document tools") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp)
    )
    Spacer(Modifier.height(19.dp))
    RivoSection("PDF essentials & scanning")
    tools.filter { it.title.contains(search, ignoreCase = true) ||
        it.detail.contains(search, ignoreCase = true) }.forEach { tool ->
        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
                .clickable { onAction(tool.route) },
            border = BorderStroke(1.dp, Outline),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(15.dp)
        ) {
            Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                IconTile(tool.icon, Brand)
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text(tool.title, fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp)
                    Spacer(Modifier.height(2.dp))
                    Text(tool.detail, color = Muted, fontSize = 11.sp,
                        maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Text("›", color = Muted, fontSize = 22.sp)
            }
        }
    }
    if (tools.none { it.title.contains(search, ignoreCase = true) ||
            it.detail.contains(search, ignoreCase = true) }) {
        Text("No matching tools", color = Muted, modifier = Modifier.padding(16.dp))
    }
}

@Composable
private fun SettingsContent(onAction: (String) -> Unit) {
    RivoHeading("Settings", "Personalize your scanning experience.")
    Card(
        colors = CardDefaults.cardColors(containerColor = Brand),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.fillMaxWidth().padding(22.dp)) {
            Text("RivoScan", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(7.dp))
            Text("Premium document tools", color = Color(0xFFDDE9FF), fontSize = 13.sp)
        }
    }
    Spacer(Modifier.height(26.dp))
    RivoSection("Scanning")
    SettingsRow("Scan quality", "Resolution and enhancement", "◎") { onAction("settings") }
    SettingsRow("Auto edge detection", "Adjust document capture", "◈") { onAction("settings") }
    SettingsRow("Default PDF format", "Page size and orientation", "▤") { onAction("settings") }
    Spacer(Modifier.height(18.dp))
    RivoSection("Application")
    SettingsRow("Language", "Choose application language", "文") { onAction("settings") }
    SettingsRow("Privacy & storage", "Manage documents on this device", "⚿") { onAction("settings") }
}

@Composable
private fun SettingsRow(title: String, detail: String, symbol: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp).clickable(onClick = onClick),
        border = BorderStroke(1.dp, Outline),
        shape = RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            IconTile(symbol, Brand)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp)
                Text(detail, color = Muted, fontSize = 11.sp, maxLines = 1)
            }
            Text("›", color = Muted, fontSize = 23.sp)
        }
    }
}
