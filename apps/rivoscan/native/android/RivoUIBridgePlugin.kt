package com.ribhlab.rivoscan

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * One-shot Android-to-Web route delivery.
 *
 * The native Compose launcher has only navigation controls, never accesses
 * stored user documents. The existing Capacitor JavaScript engine handles
 * operations, runtime permissions, native CameraX capture and saving.
 */
@CapacitorPlugin(name = "RivoUIBridge")
class RivoUIBridgePlugin : Plugin() {
    @PluginMethod
    fun consumeRoute(call: PluginCall) {
        val activityIntent = activity.intent
        val route = activityIntent?.getStringExtra(RIVO_NATIVE_ROUTE) ?: ""
        activityIntent?.removeExtra(RIVO_NATIVE_ROUTE)
        val result = JSObject()
        result.put("route", route)
        call.resolve(result)
    }

    @PluginMethod
    fun openNativeHome(call: PluginCall) {
        activity.runOnUiThread {
            val intent = Intent(activity, RivoComposeActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            activity.startActivity(intent)
            call.resolve()
        }
    }
}
