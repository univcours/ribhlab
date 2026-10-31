package com.ribhlab.rivoscan;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.util.Locale;

/**
 * Persist RivoScan exports in public Downloads/RivoScan via Android MediaStore.
 * No broad file permission is required for files created by this application (API 29+).
 * Keep file URIs out of untrusted intents: opening/sharing/deleting only for our folder.
 */
@CapacitorPlugin(name = "RivoDocuments")
public class RivoDocumentsPlugin extends Plugin {
    private static final String FOLDER = Environment.DIRECTORY_DOWNLOADS + "/RivoScan/";
    private static final int MAX_BYTES = 60 * 1024 * 1024;

    private void requireModernAndroid(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Public RivoScan Documents requires Android 10 or later.");
        }
    }

    private String safeName(String raw) {
        String name = (raw == null ? "" : raw).replaceAll("[\\\\/\\x00-\\x1f:*?\"<>|]", "_").trim();
        if (name.startsWith(".")) name = "Scan" + name;
        if (name.isEmpty()) name = "RivoScan_" + System.currentTimeMillis() + ".pdf";
        if (name.length() > 110) name = name.substring(name.length()-110);
        return name;
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        String encoded = call.getString("base64");
        String name = safeName(call.getString("name"));
        String mime = call.getString("mimeType", "application/pdf");
        if (encoded == null || encoded.isEmpty()) { call.reject("No document data supplied."); return; }
        if (encoded.length() > (MAX_BYTES * 4L / 3L) + 1024) { call.reject("File exceeds the 60 MB limit."); return; }
        byte[] bytes;
        try {
            bytes = Base64.decode(encoded, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid document data.", e); return;
        }
        if (bytes.length > MAX_BYTES) { call.reject("File exceeds the 60 MB limit."); return; }
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, FOLDER);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri target = null;
        try {
            target = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (target == null) throw new IllegalStateException("Could not create a document in Downloads.");
            try (OutputStream output = resolver.openOutputStream(target, "w")) {
                if (output == null) throw new IllegalStateException("Could not write the selected file.");
                output.write(bytes);
                output.flush();
            }
            ContentValues visible = new ContentValues();
            visible.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(target, visible, null, null);
            JSObject out = new JSObject();
            out.put("uri", target.toString());
            out.put("name", name);
            out.put("mimeType", mime);
            out.put("size", bytes.length);
            out.put("folder", FOLDER);
            call.resolve(out);
        } catch (Exception e) {
            if (target != null) { try { resolver.delete(target, null, null); } catch (Exception ignored) {} }
            call.reject("Document could not be saved to Downloads/RivoScan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void listFiles(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        JSArray items = new JSArray();
        try (Cursor cursor = getContext().getContentResolver().query(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                new String[]{MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME,
                        MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.DATE_ADDED, MediaStore.MediaColumns.MIME_TYPE},
                MediaStore.MediaColumns.RELATIVE_PATH + "=? AND " + MediaStore.MediaColumns.IS_PENDING + "=0",
                new String[]{FOLDER},
                MediaStore.MediaColumns.DATE_ADDED + " DESC")) {
            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count++ < 400) {
                    long id = cursor.getLong(0);
                    JSObject doc = new JSObject();
                    doc.put("uri", ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id).toString());
                    doc.put("name", cursor.getString(1));
                    doc.put("size", cursor.isNull(2) ? 0 : cursor.getLong(2));
                    doc.put("created", cursor.isNull(3) ? 0 : cursor.getLong(3) * 1000L);
                    doc.put("mimeType", cursor.getString(4));
                    items.put(doc);
                }
            }
            JSObject result = new JSObject();
            result.put("files", items);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not load saved documents: " + e.getMessage(), e);
        }
    }

    private Uri verifiedUri(PluginCall call) {
        String raw = call.getString("uri");
        if (raw == null || !raw.startsWith(MediaStore.Downloads.EXTERNAL_CONTENT_URI.toString() + "/")) {
            call.reject("Invalid RivoScan document link."); return null;
        }
        Uri uri = Uri.parse(raw);
        try (Cursor cursor = getContext().getContentResolver().query(uri,
                new String[]{MediaStore.MediaColumns.RELATIVE_PATH},
                null, null, null)) {
            if (cursor == null || !cursor.moveToFirst() || !FOLDER.equals(cursor.getString(0))) {
                call.reject("This document is not inside RivoScan Downloads."); return null;
            }
        } catch (Exception e) {
            call.reject("Cannot access this document.", e); return null;
        }
        return uri;
    }

    private String mimeOf(Uri uri) {
        String mime = getContext().getContentResolver().getType(uri);
        return mime == null ? "*/*" : mime;
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        try {
            Intent open = new Intent(Intent.ACTION_VIEW);
            open.setDataAndType(uri, mimeOf(uri));
            open.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(Intent.createChooser(open, "Open RivoScan document")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            call.resolve();
        } catch (Exception e) { call.reject("No compatible app can open this document.", e); }
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        try {
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType(mimeOf(uri));
            share.putExtra(Intent.EXTRA_STREAM, uri);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(share, "Share RivoScan document"));
            call.resolve();
        } catch (Exception e) { call.reject("Sharing failed: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        try {
            int deleted = getContext().getContentResolver().delete(uri, null, null);
            if (deleted < 1) throw new IllegalStateException("Nothing was deleted.");
            call.resolve();
        } catch (Exception e) { call.reject("Could not delete document: " + e.getMessage(), e); }
    }
}
