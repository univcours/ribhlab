package com.ribhlab.ribhmeasure

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Build
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    private var adAllowed by mutableStateOf(false)
    private var returningFromTool = false
    override fun attachBaseContext(base: Context) { super.attachBaseContext(Prefs.locale(base)) }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MeasureTheme { HomeScreen { type, gpsArea -> open(type, gpsArea) } } }
        Ads.setup(this)
        render()
    }
    public fun render() { adAllowed = Ads.permitted() }
    override fun onResume() {
        super.onResume(); Ads.initializeIfAllowed(this); render()
        if(returningFromTool) { returningFromTool = false; Ads.returnedHome(this) }
    }
    private fun open(type: Class<*>, gpsArea: Boolean? = null) {
        returningFromTool = type != SettingsActivity::class.java && type != HistoryActivity::class.java && type != RoomProjectsActivity::class.java
        startActivity(Intent(this, type).apply { gpsArea?.let { putExtra("area",it) } })
    }
    @Composable private fun MeasureTheme(content: @Composable () -> Unit) {
        val context = LocalContext.current
        val dark = isSystemInDarkTheme()
        val colors = when {
            Build.VERSION.SDK_INT >= 31 && dark -> dynamicDarkColorScheme(context)
            Build.VERSION.SDK_INT >= 31 -> dynamicLightColorScheme(context)
            dark -> darkColorScheme(primary = Color(0xFF8AE4D3), primaryContainer = Color(0xFF164941), background = Color(0xFF101B20))
            else -> lightColorScheme(primary = Color(0xFF00695F), primaryContainer = Color(0xFF9CF2DE), background = Color(0xFFF2FAF8))
        }
        MaterialTheme(colorScheme = colors, shapes = Shapes(extraSmall = RoundedCornerShape(12.dp), small = RoundedCornerShape(16.dp), medium = RoundedCornerShape(22.dp), large = RoundedCornerShape(28.dp), extraLarge = RoundedCornerShape(36.dp)), content = content)
    }
    private data class Tool(val title:Int, val subtitle:Int,val icon:Int,val activity:Class<*>,val area:Boolean?=null)
    @Composable private fun HomeScreen(open:(Class<*>,Boolean?)->Unit) {
        val tools = listOf(
            Tool(R.string.hm_manual,R.string.hm_manual_desc,R.drawable.ms_architecture,RoomManualActivity::class.java),
            Tool(R.string.hm_projects,R.string.hm_projects_desc,R.drawable.ms_folder,RoomProjectsActivity::class.java),
            Tool(R.string.camera_measure,R.string.hm_photo_desc,R.drawable.ms_photo_camera,CameraMeasureActivity::class.java),
            Tool(R.string.ruler,R.string.hm_ruler_desc,R.drawable.ms_straighten,RulerActivity::class.java),
            Tool(R.string.level,R.string.hm_level_desc,R.drawable.ms_explore,LevelActivity::class.java),
            Tool(R.string.gps_area,R.string.hm_area_desc,R.drawable.ms_map,GpsMeasureActivity::class.java,true),
            Tool(R.string.gps_distance,R.string.hm_distance_desc,R.drawable.ms_route,GpsMeasureActivity::class.java,false),
            Tool(R.string.history,R.string.hm_history_desc,R.drawable.ms_history,HistoryActivity::class.java)
        )
        Scaffold(containerColor=MaterialTheme.colorScheme.background,
            bottomBar = {
                if(adAllowed) {
                    Surface(color=MaterialTheme.colorScheme.surfaceContainer, modifier=Modifier.fillMaxWidth().navigationBarsPadding().clipToBounds()) {
                        Column(Modifier.fillMaxWidth().clipToBounds()) {
                            HorizontalDivider()
                            AndroidView(factory={ LinearLayout(it).apply { orientation=LinearLayout.VERTICAL; clipChildren=true; clipToPadding=true; Ads.addBanner(this@MainActivity,this) } }, modifier=Modifier.fillMaxWidth().clipToBounds())
                        }
                    }
                }
            }
        ) { padding ->
            LazyVerticalGrid(columns=GridCells.Adaptive(155.dp),contentPadding=PaddingValues(18.dp),
                verticalArrangement=Arrangement.spacedBy(12.dp),horizontalArrangement=Arrangement.spacedBy(12.dp),
                modifier=Modifier.fillMaxSize().padding(padding)) {
                item(span={GridItemSpan(maxLineSpan)}) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment=Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("RibhLab",style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary)
                            Text(stringResource(R.string.app_name),style=MaterialTheme.typography.headlineMedium)
                            Text(stringResource(R.string.hm_subtitle),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        FilledTonalIconButton(onClick={open(SettingsActivity::class.java,null)}) {
                            Icon(painterResource(R.drawable.ms_settings),stringResource(R.string.settings))
                        }
                    }
                }
                item(span={GridItemSpan(maxLineSpan)}) {
                    Card(shape=RoundedCornerShape(30.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.primaryContainer)) {
                        Column(Modifier.fillMaxWidth().padding(22.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                            Surface(shape=RoundedCornerShape(20.dp),color=MaterialTheme.colorScheme.primary) {
                                Icon(painterResource(R.drawable.ms_view_in_ar),null,Modifier.padding(14.dp).size(34.dp),tint=MaterialTheme.colorScheme.onPrimary)
                            }
                            Text(stringResource(R.string.hm_scan),style=MaterialTheme.typography.headlineSmall,color=MaterialTheme.colorScheme.onPrimaryContainer)
                            Text(stringResource(R.string.hm_scan_desc),style=MaterialTheme.typography.bodyLarge,color=MaterialTheme.colorScheme.onPrimaryContainer)
                            Button(onClick={open(RoomArActivity::class.java,null)},modifier=Modifier.fillMaxWidth().heightIn(min=54.dp)) {
                                Icon(painterResource(R.drawable.ms_view_in_ar),null,Modifier.size(22.dp))
                                Spacer(Modifier.width(10.dp));Text(stringResource(R.string.hm_start))
                            }
                        }
                    }
                }
                item(span={GridItemSpan(maxLineSpan)}){Text(stringResource(R.string.hm_tools),style=MaterialTheme.typography.titleLarge,modifier=Modifier.padding(top=6.dp))}
                items(tools) { t ->
                    ElevatedCard(onClick={open(t.activity,t.area)},shape=RoundedCornerShape(22.dp),modifier=Modifier.fillMaxWidth().heightIn(min=145.dp)){
                        Column(Modifier.padding(15.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
                            Icon(painterResource(t.icon),null,Modifier.size(29.dp),tint=MaterialTheme.colorScheme.primary)
                            Text(stringResource(t.title),style=MaterialTheme.typography.titleMedium)
                            Text(stringResource(t.subtitle),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                item(span={GridItemSpan(maxLineSpan)}){
                    Text(stringResource(R.string.hm_note),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
