package com.ribhlab.rivoscan;

import android.Manifest;
import android.content.Intent;
import android.app.Activity;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(name = "RivoLiveScanner", permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
})
public class RivoLiveScannerPlugin extends Plugin {
    @PluginMethod
    public void scan(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "onPermission");
            return;
        }
        launch(call);
    }

    @PermissionCallback
    private void onPermission(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) launch(call);
        else call.reject("Camera permission is required to scan documents.");
    }

    private void launch(PluginCall call) {
        Intent intent = new Intent(getActivity(), RivoLiveScannerActivity.class);
        startActivityForResult(call, intent, "onResult");
    }

    @ActivityCallback
    private void onResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Scanner closed without a saved document.", "SCAN_CANCELLED");
            return;
        }
        ArrayList<String> pages = result.getData().getStringArrayListExtra("images");
        if (pages == null || pages.isEmpty()) {
            call.reject("No scanned pages were captured.");
            return;
        }
        JSArray images = new JSArray();
        for (String page : pages) images.put(page);
        JSObject data = new JSObject();
        data.put("scannedImages", images);
        call.resolve(data);
    }
}
