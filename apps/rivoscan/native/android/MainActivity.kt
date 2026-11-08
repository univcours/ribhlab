package com.ribhlab.rivoscan

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.BridgeActivity

/**
 * Android host for the premium RivoScan UI.
 *
 * Capacitor owns document tools in the WebView; Android plugins keep handling
 * device camera, public Documents and on-device image processing.
 * This class replaces the former generated Java MainActivity, not the scanner.
 */
class MainActivity : BridgeActivity() {
    private val premiumNavy = Color.rgb(3, 16, 34)

    override fun onCreate(savedInstanceState: Bundle?) {
        // Configure system bars before Capacitor constructs its WebView.
        window.clearFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
                WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
        )
        window.statusBarColor = premiumNavy
        window.navigationBarColor = premiumNavy
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }

        // Register all existing native plugins before super.onCreate.
        registerPlugin(RivoLiveScannerPlugin::class.java)
        registerPlugin(RivoDocumentsPlugin::class.java)
        registerPlugin(RivoUVDocPlugin::class.java)
        registerPlugin(RivoSurface3DPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Hide the AppCompat bar; the HTML header is the only app toolbar.
        supportActionBar?.hide()

        if (Build.VERSION.SDK_INT >= 35) {
            // Android 15+ enforces edge-to-edge: keep clock/battery OUTSIDE
            // of the HTML surface, respecting cutouts on Samsung phones.
            val content = findViewById<View>(android.R.id.content)
            val webView = bridge.webView
            content.setBackgroundColor(premiumNavy)
            webView.setBackgroundColor(premiumNavy)
            ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
                val bars = insets.getInsets(
                    WindowInsetsCompat.Type.statusBars() or
                        WindowInsetsCompat.Type.displayCutout()
                )
                if (view.paddingTop != bars.top) {
                    view.setPadding(
                        view.paddingLeft, bars.top, view.paddingRight, view.paddingBottom
                    )
                }
                insets
            }
            ViewCompat.requestApplyInsets(content)
        }
    }
}
