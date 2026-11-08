package com.ribhlab.rivoscan

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.widget.TextView

/**
 * RivoScan's Android-native camera/editor chrome.
 * The HTML/Capacitor feature screens use rivoscan-premium-native.css;
 * this Kotlin class gives the actual CameraX Activity the same design tokens.
 * Never changes scanner capture settings, permissions, or saved files.
 */
object RivoPremiumChrome {
    @JvmField val NAVY: Int = 0xFF031022.toInt()
    @JvmField val PANEL: Int = 0xFF092641.toInt()
    @JvmField val CYAN: Int = 0xFF2CE9F1.toInt()
    @JvmField val MUTED: Int = 0xFFB5D9E9.toInt()
    private val PANEL_BRIGHT: Int = 0xFF104467.toInt()

    @JvmStatic
    fun styleSurface(view: View) {
        view.setBackgroundColor(NAVY)
    }

    @JvmStatic
    fun styleToolbar(view: View) {
        view.setBackgroundColor(PANEL)
    }

    @JvmStatic
    fun styleTouchTarget(label: TextView) {
        val density = label.resources.displayMetrics.density
        val radius = 12f * density
        val border = kotlin.math.max(1, (1.5f * density).toInt())
        val background = GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            intArrayOf(PANEL_BRIGHT, PANEL)
        )
        background.cornerRadius = radius
        background.setStroke(border, 0xFF237D9B.toInt())
        label.background = background
        label.minHeight = (40f * density).toInt()
        label.isFocusable = true
        // Preserve caller's color: selected/disabled/danger controls use state colors.
    }

    @JvmStatic
    fun stylePrimaryButton(label: TextView) {
        val d = label.resources.displayMetrics.density
        val background = GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            intArrayOf(0xFF06CFCB.toInt(), 0xFF1375D8.toInt(), 0xFF1646BE.toInt())
        )
        background.cornerRadius = 14f * d
        background.setStroke(kotlin.math.max(1, (2f * d).toInt()), 0xFF83F7FF.toInt())
        label.background = background
        label.setTextColor(Color.WHITE)
        label.minHeight = (44f * d).toInt()
    }
}
