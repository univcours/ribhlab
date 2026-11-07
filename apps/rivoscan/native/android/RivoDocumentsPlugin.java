package com.ribhlab.rivoscan;

import android.content.ContentResolver;
import android.content.Context;
import android.provider.DocumentsContract;
import android.content.UriPermission;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import android.widget.Toast;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import androidx.core.content.FileProvider;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.pdf.PdfRenderer;
import android.media.ExifInterface;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.print.PageRange;
import android.os.Handler;
import android.os.Looper;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.util.Locale;

/**
 * Save new RivoScan exports in shared Documents/RivoScan via Android MediaStore.
 * Continue to display user-owned legacy Downloads/RivoScan documents without deleting them.
 * No broad file permission is required for files created by this application (API 29+).
 * Keep file URIs out of untrusted intents: opening/sharing/deleting only for our folder.
 */
@CapacitorPlugin(name = "RivoDocuments")
public class RivoDocumentsPlugin extends Plugin {
    private static final String FOLDER = Environment.DIRECTORY_DOCUMENTS + "/RivoScan/";
    private static final String LEGACY_FOLDER = Environment.DIRECTORY_DOWNLOADS + "/RivoScan/";
    private static final String STORAGE_PREFS="rivoscan-storage";
    private static final String STORAGE_TREE_KEY="selectedRoot";
    private static final String STORAGE_ROOT_ID="primary:RivoScan";
    private static final String[] TYPE_FOLDERS={"PDF","Images","Word","Excel","PowerPoint","Text","Other"};
    private JSArray typeFoldersArray(){JSArray arr=new JSArray();for(String folder:TYPE_FOLDERS)arr.put(folder);return arr;}
    private String fileType(String mime,String name){
        String m=mime==null?"":mime.toLowerCase(Locale.ROOT);
        String n=name==null?"":name.toLowerCase(Locale.ROOT);
        if(m.equals("application/pdf")||n.endsWith(".pdf"))return "PDF";
        if(m.startsWith("image/")||n.matches(".*\\.(jpg|jpeg|png|webp|heic|bmp|gif)$"))return "Images";
        if(m.contains("word")||n.matches(".*\\.(doc|docx|odt)$"))return "Word";
        if(m.contains("spreadsheet")||m.contains("excel")||n.matches(".*\\.(xls|xlsx|csv|ods)$"))return "Excel";
        if(m.contains("presentation")||m.contains("powerpoint")||n.matches(".*\\.(ppt|pptx|odp)$"))return "PowerPoint";
        if(m.startsWith("text/")||n.matches(".*\\.(txt|md|rtf)$"))return "Text";
        return "Other";
    }
    private Uri selectedRoot(){
        String value=getContext().getSharedPreferences(STORAGE_PREFS,Context.MODE_PRIVATE)
            .getString(STORAGE_TREE_KEY,null);
        if(value==null||value.isEmpty())return null;
        Uri tree=Uri.parse(value);
        boolean granted=false;
        for(UriPermission p:getContext().getContentResolver().getPersistedUriPermissions())
            if(p.getUri().equals(tree)&&p.isReadPermission()&&p.isWritePermission()){granted=true;break;}
        if(!granted)throw new IllegalStateException("RivoScan folder access expired. Choose RivoScan again in Documents.");
        return tree;
    }
    private Uri rootDocument(Uri tree){
        return DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
    }
    private Uri findChild(Uri tree,Uri parent,String name,String mime) throws Exception{
        ContentResolver resolver=getContext().getContentResolver();
        Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getDocumentId(parent));
        try(Cursor c=resolver.query(children,new String[]{
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)){
            if(c!=null)while(c.moveToNext()){
                if(name.equals(c.getString(1))&&mime.equals(c.getString(2)))
                    return DocumentsContract.buildDocumentUriUsingTree(tree,c.getString(0));
            }
        }
        return null;
    }
    private Uri ensureChildFolder(Uri tree,Uri parent,String name) throws Exception{
        Uri found=findChild(tree,parent,name,DocumentsContract.Document.MIME_TYPE_DIR);
        if(found!=null)return found;
        Uri created=DocumentsContract.createDocument(getContext().getContentResolver(),parent,
            DocumentsContract.Document.MIME_TYPE_DIR,name);
        if(created==null)throw new IllegalStateException("Cannot create RivoScan/"+name);
        return created;
    }
    private Uri targetTreeFolder(Uri tree,String folderName) throws Exception{
        return ensureChildFolder(tree,rootDocument(tree),folderName);
    }
    private Uri createTreeFile(Uri tree,String folderName,String name,String mime) throws Exception{
        Uri folder=targetTreeFolder(tree,folderName);
        Uri target=DocumentsContract.createDocument(getContext().getContentResolver(),folder,mime,name);
        if(target==null)throw new IllegalStateException("Cannot create file in RivoScan/"+folderName);
        return target;
    }
    private boolean trustedTreeFile(Uri uri){
        try{
            Uri root=selectedRoot();
            if(root==null||!root.getAuthority().equals(uri.getAuthority())||
               !DocumentsContract.isDocumentUri(getContext(),uri))return false;
            String treeId=DocumentsContract.getTreeDocumentId(root);
            String parentId=DocumentsContract.getTreeDocumentId(uri);
            String docId=DocumentsContract.getDocumentId(uri);
            if(!STORAGE_ROOT_ID.equals(treeId)||!treeId.equals(parentId)||
               !docId.startsWith(treeId+"/"))return false;
            try(Cursor c=getContext().getContentResolver().query(uri,new String[]{
                DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)){
                return c!=null&&c.moveToFirst()&&
                    !DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(0));
            }
        }catch(Exception ignore){return false;}
    }
    @PluginMethod
    public void chooseStorageFolder(PluginCall call){
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try{
            intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI,
                DocumentsContract.buildDocumentUri("com.android.externalstorage.documents",STORAGE_ROOT_ID));
        }catch(Exception ignored){}
        startActivityForResult(call,intent,"chosenStorageFolder");
    }
    @ActivityCallback
    private void chosenStorageFolder(PluginCall call,ActivityResult result){
        if(call==null)return;
        if(result.getResultCode()!=android.app.Activity.RESULT_OK||result.getData()==null||
            result.getData().getData()==null){
            call.reject("Folder selection cancelled. Files have not moved.");return;
        }
        Uri root=result.getData().getData();
        try{
            // Never request storage-root or broad file access. The selected
            // child RivoScan must be a sibling of Download on primary storage.
            if(!"com.android.externalstorage.documents".equals(root.getAuthority())||
                !STORAGE_ROOT_ID.equals(DocumentsContract.getTreeDocumentId(root))){
                call.reject("Choose the folder named RivoScan at Internal storage root, next to Download. Do not select Download itself.");
                return;
            }
            int flags=result.getData().getFlags()&
                (Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if((flags&Intent.FLAG_GRANT_READ_URI_PERMISSION)==0||
               (flags&Intent.FLAG_GRANT_WRITE_URI_PERMISSION)==0)
                throw new IllegalStateException("Read/write folder access was not granted.");
            getContext().getContentResolver().takePersistableUriPermission(root,flags);
            // Prepare all type folders before committing preference. A failed
            // selection cannot redirect future saves to a half-working tree.
            for(String folder:TYPE_FOLDERS)targetTreeFolder(root,folder);
            getContext().getSharedPreferences(STORAGE_PREFS,Context.MODE_PRIVATE).edit()
                .putString(STORAGE_TREE_KEY,root.toString()).apply();
            JSObject out=new JSObject();out.put("configured",true);
            out.put("path","RivoScan/");out.put("folders",typeFoldersArray());
            call.resolve(out);
        }catch(Exception e){call.reject("Could not prepare RivoScan folder: "+e.getMessage(),e);}
    }
    @PluginMethod
    public void getStorageFolder(PluginCall call){
        try{
            Uri root=selectedRoot();
            JSObject out=new JSObject();out.put("configured",root!=null);
            out.put("path",root!=null?"RivoScan/":FOLDER);
            out.put("requestedPath","Internal storage/RivoScan/");
            out.put("folders",typeFoldersArray());call.resolve(out);
        }catch(Exception e){call.reject("RivoScan directory permission needs renewal: "+e.getMessage(),e);}
    }
    private static Uri documentsCollection(){
        return MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
    }
    private static Uri legacyDownloadsCollection(){
        return MediaStore.Downloads.EXTERNAL_CONTENT_URI;
    }
    private static boolean isRivoFolder(String relativePath) {
        if(relativePath==null)return false;
        String normalized=relativePath.replace('\\','/').replaceAll("/+$","");
        String current=FOLDER.replaceAll("/+$","");
        String old=LEGACY_FOLDER.replaceAll("/+$","");
        return normalized.equals(current)||normalized.startsWith(current+"/")
            ||normalized.equals(old)||normalized.startsWith(old+"/");
    }
    private static final String[] ORGANIZE_FOLDERS={"","Work","Personal","Archive"};
    private static String safeSubfolder(String requested){
        if(requested==null)return null;
        for(String allowed:ORGANIZE_FOLDERS)if(allowed.equals(requested))
            return FOLDER+(allowed.isEmpty()?"":allowed+"/");
        return null;
    }

    /**
     * Native camera pages are published immediately, before the WebView combines
     * them into a PDF. This preserves scans even if PDF creation later fails.
     */
    static Uri saveScannedImage(Context ctx,File image,String requestedName) throws Exception {
        return saveScannedImageToFolder(ctx,image,requestedName,FOLDER);
    }
    static Uri saveOriginalScannedImage(Context ctx,File image,String requestedName) throws Exception {
        return saveScannedImageToFolder(ctx,image,requestedName,FOLDER+"Originals/");
    }
    private static Uri saveScannedImageToFolder(Context ctx,File image,String requestedName,String targetFolder) throws Exception {
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q)
            throw new IllegalStateException("Public scanner storage requires Android 10+.");
        ContentResolver resolver=ctx.getContentResolver();
        ContentValues meta=new ContentValues();
        meta.put(MediaStore.MediaColumns.DISPLAY_NAME,requestedName);
        meta.put(MediaStore.MediaColumns.MIME_TYPE,"image/jpeg");
        meta.put(MediaStore.MediaColumns.RELATIVE_PATH,targetFolder);
        meta.put(MediaStore.MediaColumns.IS_PENDING,1);
        Uri uri=resolver.insert(documentsCollection(),meta);
        if(uri==null)throw new IllegalStateException("Documents/RivoScan is unavailable.");
        try {
            try (InputStream in=new FileInputStream(image);
                 OutputStream out=resolver.openOutputStream(uri,"w")) {
                if(out==null)throw new IllegalStateException("Cannot write scan to Documents.");
                byte[] buf=new byte[32768];int n;
                while((n=in.read(buf))!=-1)out.write(buf,0,n);
                out.flush();
            }
            ContentValues committed=new ContentValues();
            committed.put(MediaStore.MediaColumns.IS_PENDING,0);
            if(resolver.update(uri,committed,null,null)<1)
                throw new IllegalStateException("Scan was not published in Documents.");
            return uri;
        }catch(Exception e){
            try{resolver.delete(uri,null,null);}catch(Exception ignored){}
            throw e;
        }
    }

    /**
     * Real Android system PDF printing. The print adapter copies the verified
     * RivoScan PDF to Android's print spooler, which presents printer settings.
     * This never modifies or deletes the user's document.
     */
    @PluginMethod
    public void printFile(PluginCall call){
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){requireModernAndroid(call);return;}
        Uri original=verifiedUri(call);
        if(original==null)return;
        String fileName="RivoScan.pdf";
        try(Cursor cursor=getContext().getContentResolver().query(original,
                new String[]{MediaStore.MediaColumns.DISPLAY_NAME,MediaStore.MediaColumns.MIME_TYPE},
                null,null,null)){
            if(cursor==null||!cursor.moveToFirst()){
                call.reject("Could not read PDF metadata.");return;
            }
            fileName=cursor.getString(0);
            String mime=cursor.getString(1);
            if(!"application/pdf".equals(mime) && (fileName==null||!fileName.toLowerCase(Locale.ROOT).endsWith(".pdf"))){
                call.reject("Print accepts PDF documents. Convert images to PDF first.");return;
            }
        }catch(Exception e){call.reject("Could not inspect the PDF for printing.",e);return;}
        final String label=fileName==null?"RivoScan.pdf":fileName;
        final Uri pdf=original;
        getActivity().runOnUiThread(()->{
            try{
                PrintManager manager=(PrintManager)getActivity().getSystemService(Context.PRINT_SERVICE);
                if(manager==null){call.reject("Android printing service is unavailable.");return;}
                PrintDocumentAdapter adapter=new PrintDocumentAdapter(){
                    @Override public void onLayout(PrintAttributes previous,PrintAttributes next,
                            CancellationSignal cancel,LayoutResultCallback callback,Bundle extras){
                        if(cancel.isCanceled()){callback.onLayoutCancelled();return;}
                        PrintDocumentInfo info=new PrintDocumentInfo.Builder(label)
                            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                            .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN).build();
                        callback.onLayoutFinished(info,true);
                    }
                    @Override public void onWrite(PageRange[] pages,ParcelFileDescriptor destination,
                            CancellationSignal cancel,WriteResultCallback callback){
                        new Thread(()->{
                            try(InputStream in=getContext().getContentResolver().openInputStream(pdf);
                                OutputStream out=new ParcelFileDescriptor.AutoCloseOutputStream(destination)){
                                if(in==null)throw new IllegalStateException("Cannot open PDF");
                                byte[] buffer=new byte[32768];int n;
                                while((n=in.read(buffer))!=-1){
                                    if(cancel.isCanceled()){
                                        new Handler(Looper.getMainLooper()).post(callback::onWriteCancelled);
                                        return;
                                    }
                                    out.write(buffer,0,n);
                                }
                                out.flush();
                                new Handler(Looper.getMainLooper()).post(
                                    ()->callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES}));
                            }catch(Exception e){
                                new Handler(Looper.getMainLooper()).post(
                                    ()->callback.onWriteFailed("Could not spool PDF: "+e.getMessage()));
                            }
                        },"RivoScan-PDF-Print").start();
                    }
                };
                manager.print("RivoScan "+label,adapter,
                    new PrintAttributes.Builder().setColorMode(PrintAttributes.COLOR_MODE_COLOR).build());
                call.resolve();
            }catch(Exception e){call.reject("Android print dialog could not start: "+e.getMessage(),e);}
        });
    }

    @PluginMethod
    public void openFolder(PluginCall call) {
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){requireModernAndroid(call);return;}
        try{
            Uri root=selectedRoot();
            Intent browse=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            Uri location=root==null?DocumentsContract.buildDocumentUri(
                "com.android.externalstorage.documents","primary:Documents/RivoScan"):root;
            browse.putExtra(DocumentsContract.EXTRA_INITIAL_URI,location);
            browse.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(browse);
            JSObject out=new JSObject();out.put("path",root!=null?"RivoScan/":FOLDER);
            call.resolve(out);
        }catch(Exception e){call.reject("Could not open Android file browser: "+e.getMessage(),e);}
    }


    private String nativeLanguage(){
        return getContext().getSharedPreferences("rivoscan-preferences",Context.MODE_PRIVATE)
                .getString("language","en");
    }
    @PluginMethod
    public void setLanguage(PluginCall call){
        String chosen=call.getString("language","en");
        if(chosen==null||!("en ar fr es de pt it").contains(chosen)
            ||chosen.length()!=2){call.reject("Unsupported language.");return;}
        getContext().getSharedPreferences("rivoscan-preferences",Context.MODE_PRIVATE)
            .edit().putString("language",chosen).apply();
        call.resolve();
    }
    private String localized(String key){return RivoLocale.get(nativeLanguage(),key);}

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
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, FOLDER+fileType(mime,name)+"/");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri target = null;
        Uri selectedTree = null;
        try {
            selectedTree=selectedRoot();
            target = selectedTree!=null
                ?createTreeFile(selectedTree,fileType(mime,name),name,mime)
                :resolver.insert(documentsCollection(), values);
            if (target == null) throw new IllegalStateException("Could not create a document in RivoScan.");
            try (OutputStream output = resolver.openOutputStream(target, "w")) {
                if (output == null) throw new IllegalStateException("Could not write the selected file.");
                output.write(bytes);
                output.flush();
            }
            if(selectedTree==null){
                ContentValues visible = new ContentValues();
                visible.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if(resolver.update(target,visible,null,null)<1)
                    throw new IllegalStateException("Could not finalize MediaStore document.");
            }
            JSObject out = new JSObject();
            out.put("uri", target.toString());
            out.put("name", name);
            out.put("mimeType", mime);
            out.put("size", bytes.length);
            out.put("folder", selectedTree!=null?"RivoScan/"+fileType(mime,name)+"/":FOLDER+fileType(mime,name)+"/");
            call.resolve(out);
        } catch (Exception e) {
            if (target != null) { try {
                if(selectedTree!=null)DocumentsContract.deleteDocument(resolver,target);
                else resolver.delete(target,null,null);
            } catch (Exception ignored) {} }
            call.reject("Document could not be saved in RivoScan: " + e.getMessage(), e);
        }
    }


    /** List only app-selected RivoScan tree descendants. No access to other
     * internal-storage directories and no MANAGE_EXTERNAL_STORAGE permission. */
    private int appendTreeFiles(JSArray items,Uri tree,Uri parent,String folder,int depth,int limit) throws Exception{
        if(depth>3||limit<=0)return 0;
        ContentResolver resolver=getContext().getContentResolver();
        Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getDocumentId(parent));
        int added=0;
        try(Cursor c=resolver.query(children,new String[]{
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED},null,null,null)){
            if(c==null)return 0;
            while(c.moveToNext()&&added<limit){
                String name=c.getString(1),mime=c.getString(2),id=c.getString(0);
                if(name==null||id==null)continue;
                Uri doc=DocumentsContract.buildDocumentUriUsingTree(tree,id);
                if(DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)){
                    added+=appendTreeFiles(items,tree,doc,folder+name+"/",depth+1,limit-added);
                }else{
                    JSObject item=new JSObject();
                    item.put("uri",doc.toString());item.put("name",name);
                    item.put("size",c.isNull(3)?0:c.getLong(3));
                    item.put("created",c.isNull(4)?0:c.getLong(4));
                    item.put("mimeType",mime);
                    item.put("folder",folder);
                    item.put("legacy",false);
                    items.put(item);added++;
                }
            }
        }
        return added;
    }
    /** Old user documents remain accessible even after changing the default folder. */
    private void appendFolderFiles(JSArray items,Uri collection,String folder) throws Exception{
        ContentResolver resolver=getContext().getContentResolver();
        try(Cursor cursor=resolver.query(collection,
            new String[]{MediaStore.MediaColumns._ID,MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.SIZE,MediaStore.MediaColumns.DATE_ADDED,
                MediaStore.MediaColumns.MIME_TYPE,MediaStore.MediaColumns.RELATIVE_PATH},
            "(" + MediaStore.MediaColumns.RELATIVE_PATH+" = ? OR "+
                MediaStore.MediaColumns.RELATIVE_PATH+" LIKE ?) AND "+
                MediaStore.MediaColumns.IS_PENDING+" = 0",
            new String[]{folder,folder+"%"},MediaStore.MediaColumns.DATE_ADDED+" DESC")){
            if(cursor==null)return;
            int count=0;
            while(cursor.moveToNext()&&count<400){
                if(!isRivoFolder(cursor.getString(5)))continue;
                JSObject item=new JSObject();
                item.put("uri",ContentUris.withAppendedId(collection,cursor.getLong(0)).toString());
                item.put("name",cursor.getString(1));
                item.put("size",cursor.isNull(2)?0:cursor.getLong(2));
                item.put("created",cursor.isNull(3)?0:cursor.getLong(3)*1000L);
                item.put("mimeType",cursor.getString(4));
                item.put("legacy",LEGACY_FOLDER.equals(folder));
                item.put("folder",cursor.getString(5));
                items.put(item);
                count++;
            }
        }
    }

    @PluginMethod
    public void listFiles(PluginCall call){
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){requireModernAndroid(call);return;}
        JSArray items=new JSArray();
        try{
            Uri root=selectedRoot();
            if(root!=null)appendTreeFiles(items,root,rootDocument(root),"RivoScan/",0,400);
            appendFolderFiles(items,documentsCollection(),FOLDER);
            try{appendFolderFiles(items,legacyDownloadsCollection(),LEGACY_FOLDER);}
            catch(Exception legacyError){
                android.util.Log.w("RivoDocuments","Could not enumerate legacy Downloads",legacyError);
            }
            JSObject result=new JSObject();
            result.put("files",items);
            result.put("folder",selectedRoot()!=null?"RivoScan/":FOLDER);
            result.put("configured",selectedRoot()!=null);
            result.put("legacyFolder",LEGACY_FOLDER);
            call.resolve(result);
        }catch(Exception e){
            call.reject("Could not load saved documents: "+e.getMessage(),e);
        }
    }

    private Uri verifiedUri(PluginCall call){
        String raw=call.getString("uri");
        if(raw==null){call.reject("Invalid RivoScan document link.");return null;}
        if(raw.startsWith("content://com.android.externalstorage.documents/")){
            Uri saf=Uri.parse(raw);
            if(trustedTreeFile(saf))return saf;
            call.reject("Invalid RivoScan folder permission or document.");return null;
        }
        boolean isNew=raw.startsWith(documentsCollection().toString()+"/");
        boolean isOld=raw.startsWith(legacyDownloadsCollection().toString()+"/");
        if(!isNew&&!isOld){call.reject("Invalid RivoScan document link.");return null;}
        Uri uri=Uri.parse(raw);
        try(Cursor cursor=getContext().getContentResolver().query(uri,
            new String[]{MediaStore.MediaColumns.RELATIVE_PATH},null,null,null)){
            if(cursor==null||!cursor.moveToFirst()||!isRivoFolder(cursor.getString(0))){
                call.reject("This document is outside RivoScan folders.");return null;
            }
        }catch(Exception e){call.reject("Cannot access this document.",e);return null;}
        return uri;
    }

    private String mimeOf(Uri uri) {
        String mime = getContext().getContentResolver().getType(uri);
        return mime == null ? "*/*" : mime;
    }


    /**
     * Bounded local preview/edits, restricted to items already owned by RivoScan.
     * Large files can still be opened in their usual native app without copying.
     */
    @PluginMethod
    public void readFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        final int previewLimit = 16 * 1024 * 1024;
        ContentResolver resolver = getContext().getContentResolver();
        try (Cursor cursor = resolver.query(uri,
                new String[]{MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.MediaColumns.SIZE},null,null,null)) {
            if (cursor == null || !cursor.moveToFirst()) { call.reject("Document not found."); return; }
            long size = cursor.getLong(1);
            if (size > previewLimit) { call.reject("PREVIEW_TOO_LARGE: Open this document in another app."); return; }
            try (java.io.InputStream in = resolver.openInputStream(uri);
                 java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
                if (in == null) { call.reject("Could not open document."); return; }
                byte[] buffer=new byte[32768]; int count,total=0;
                while ((count=in.read(buffer))!=-1) {
                    total+=count;
                    if (total > previewLimit) { call.reject("PREVIEW_TOO_LARGE: Open this document in another app."); return; }
                    out.write(buffer,0,count);
                }
                JSObject result = new JSObject();
                result.put("base64",Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP));
                result.put("name",cursor.getString(0));
                result.put("mimeType",mimeOf(uri));
                call.resolve(result);
            }
        } catch (Exception e) { call.reject("Cannot read document: " + e.getMessage(),e); }
    }


    /**
     * Bounded thumbnails from real user-owned PDF/image documents.
     * Only RivoScan/legacy RivoScan folder URIs pass verifiedUri().
     * Rasterization is off the UI thread and does not mutate source bytes.
     * Maximum output dimension 220px; never send an entire PDF to WebView.
     */
    @PluginMethod
    public void getThumbnail(PluginCall call){
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){requireModernAndroid(call);return;}
        final Uri uri=verifiedUri(call);
        if(uri==null)return;
        new Thread(()->{
            Bitmap thumbnail=null;
            try{
                ContentResolver resolver=getContext().getContentResolver();
                String mime=mimeOf(uri);
                String name="";
                try(Cursor c=resolver.query(uri,new String[]{MediaStore.MediaColumns.DISPLAY_NAME},null,null,null)){
                    if(c!=null&&c.moveToFirst())name=c.getString(0);
                }
                String lower=name==null?"":name.toLowerCase(Locale.ROOT);
                boolean isPdf="application/pdf".equals(mime)||lower.endsWith(".pdf");
                boolean isImage=(mime!=null&&mime.startsWith("image/"))
                    ||lower.matches(".*\\.(jpg|jpeg|png|webp|heic)$");
                if(!isPdf&&!isImage){call.reject("Preview supports PDF or image files.");return;}
                final int maxDimension=220;
                if(isPdf){
                    try(ParcelFileDescriptor descriptor=resolver.openFileDescriptor(uri,"r")){
                        if(descriptor==null)throw new IllegalStateException("PDF cannot be opened.");
                        try(PdfRenderer pdf=new PdfRenderer(descriptor)){
                            if(pdf.getPageCount()<1)throw new IllegalStateException("Empty PDF.");
                            try(PdfRenderer.Page page=pdf.openPage(0)){
                                float scale=Math.min((float)maxDimension/Math.max(1,page.getWidth()),
                                    (float)maxDimension/Math.max(1,page.getHeight()));
                                int w=Math.max(1,Math.round(page.getWidth()*scale));
                                int h=Math.max(1,Math.round(page.getHeight()*scale));
                                thumbnail=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
                                Canvas canvas=new Canvas(thumbnail);
                                canvas.drawColor(Color.WHITE);
                                page.render(thumbnail,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                            }
                        }
                    }
                }else{
                    BitmapFactory.Options bounds=new BitmapFactory.Options();
                    bounds.inJustDecodeBounds=true;
                    try(InputStream in=resolver.openInputStream(uri)){
                        if(in==null)throw new IllegalStateException("Image unavailable.");
                        BitmapFactory.decodeStream(in,null,bounds);
                    }
                    if(bounds.outWidth<1||bounds.outHeight<1)throw new IllegalStateException("Image unreadable.");
                    BitmapFactory.Options sample=new BitmapFactory.Options();
                    sample.inSampleSize=1;
                    while((bounds.outWidth/sample.inSampleSize)>maxDimension*2
                        ||(bounds.outHeight/sample.inSampleSize)>maxDimension*2)
                        sample.inSampleSize*=2;
                    try(InputStream in=resolver.openInputStream(uri)){
                        if(in==null)throw new IllegalStateException("Image unavailable.");
                        thumbnail=BitmapFactory.decodeStream(in,null,sample);
                    }
                    if(thumbnail==null)throw new IllegalStateException("Image decode failed.");
                    int orientation=ExifInterface.ORIENTATION_NORMAL;
                    try(InputStream in=resolver.openInputStream(uri)){
                        if(in!=null)orientation=new ExifInterface(in).getAttributeInt(
                            ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
                    }catch(Exception ignored){}
                    int degrees=orientation==ExifInterface.ORIENTATION_ROTATE_90?90:
                        orientation==ExifInterface.ORIENTATION_ROTATE_180?180:
                        orientation==ExifInterface.ORIENTATION_ROTATE_270?270:0;
                    if(degrees!=0){
                        Matrix matrix=new Matrix();matrix.postRotate(degrees);
                        Bitmap rotated=Bitmap.createBitmap(thumbnail,0,0,
                            thumbnail.getWidth(),thumbnail.getHeight(),matrix,true);
                        if(rotated!=thumbnail)thumbnail.recycle();
                        thumbnail=rotated;
                    }
                    float ratio=Math.min(1f,(float)maxDimension/
                        Math.max(thumbnail.getWidth(),thumbnail.getHeight()));
                    if(ratio<1f){
                        Bitmap reduced=Bitmap.createScaledBitmap(thumbnail,
                            Math.max(1,Math.round(thumbnail.getWidth()*ratio)),
                            Math.max(1,Math.round(thumbnail.getHeight()*ratio)),true);
                        if(reduced!=thumbnail)thumbnail.recycle();
                        thumbnail=reduced;
                    }
                }
                ByteArrayOutputStream bytes=new ByteArrayOutputStream(35000);
                if(!thumbnail.compress(Bitmap.CompressFormat.JPEG,72,bytes))
                    throw new IllegalStateException("Preview encoding failed.");
                JSObject result=new JSObject();
                result.put("base64",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP));
                result.put("mimeType","image/jpeg");
                call.resolve(result);
            }catch(Exception error){
                call.reject("Cannot render document thumbnail: "+error.getMessage(),error);
            }finally{
                if(thumbnail!=null&&!thumbnail.isRecycled())thumbnail.recycle();
            }
        },"RivoScan-Document-Thumb").start();
    }

    @PluginMethod
    public void renameFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        String proposed=call.getString("name");
        if(proposed==null||proposed.trim().isEmpty()) { call.reject("A document name is required."); return; }
        String original;
        try (Cursor cursor=getContext().getContentResolver().query(uri,
                new String[]{MediaStore.MediaColumns.DISPLAY_NAME},null,null,null)) {
            if(cursor==null||!cursor.moveToFirst()){call.reject("Document not found.");return;}
            original=cursor.getString(0);
        } catch(Exception e){call.reject("Cannot read document name.",e);return;}
        String originalExt=original.contains(".")?original.substring(original.lastIndexOf('.')):"";
        String base=proposed.replaceAll("[\\\\/\\x00-\\x1f:*?\"<>|]","_").trim();
        if(base.lastIndexOf('.')>0)base=base.substring(0,base.lastIndexOf('.'));
        base=base.replaceAll("^[. ]+|[. ]+$","");
        if(base.isEmpty()) { call.reject("A valid document name is required."); return; }
        if(base.length()>90)base=base.substring(0,90);
        String newName=base+originalExt;
        try{
            if(trustedTreeFile(uri)){
                Uri renamed=DocumentsContract.renameDocument(getContext().getContentResolver(),uri,newName);
                if(renamed==null)throw new IllegalStateException("Android could not rename this file.");
            }else{
                ContentValues values=new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME,newName);
                int updated=getContext().getContentResolver().update(uri,values,null,null);
                if(updated<1){call.reject("Could not rename document.");return;}
            }
            JSObject response=new JSObject();response.put("name",newName);call.resolve(response);
        }catch(Exception e){call.reject("Rename failed: "+e.getMessage(),e);}
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        try {
            Intent open = new Intent(Intent.ACTION_VIEW);
            open.setDataAndType(uri, mimeOf(uri));
            open.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(Intent.createChooser(open, localized("openDocument"))
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
            getActivity().startActivity(Intent.createChooser(share, localized("shareDocument")));
            call.resolve();
        } catch (Exception e) { call.reject("Sharing failed: " + e.getMessage(), e); }
    }


    /** Share temporary JPGs produced from a PDF. Unlike saveFile(), this never
     * creates visible files in Documents/RivoScan, so scans remain PDF-only.
     * Android grant URI persists long enough for the receiving application. */
    @PluginMethod
    public void shareJpgPages(PluginCall call){
        JSArray images=call.getArray("imagesBase64");
        if(images==null||images.length()<1||images.length()>30){
            call.reject("Choose between 1 and 30 JPEG pages.");return;
        }
        java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
        java.util.ArrayList<File> written=new java.util.ArrayList<>();
        try{
            File folder=new File(getContext().getCacheDir(),"rivo-shared-jpg");
            if(!folder.isDirectory()&&!folder.mkdirs())
                throw new IllegalStateException("Cannot prepare temporary share folder.");
            File[] old=folder.listFiles();
            if(old!=null)for(File file:old){
                if(file.isFile()&&System.currentTimeMillis()-file.lastModified()>86400000L)file.delete();
            }
            long total=0;
            String authority=getContext().getPackageName()+".rivoscan.share";
            for(int i=0;i<images.length();i++){
                String encoded=images.getString(i);
                if(encoded==null||encoded.length()<4||encoded.length()>16*1024*1024)
                    throw new IllegalArgumentException("Invalid JPEG page.");
                byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);
                total+=bytes.length;
                if(total>60L*1024*1024||bytes.length<4||bytes[0]!=(byte)0xff||bytes[1]!=(byte)0xd8)
                    throw new IllegalArgumentException("JPG sharing limit or format mismatch.");
                File file=new File(folder,"RivoScan_Page_"+System.currentTimeMillis()+"_"+(i+1)+".jpg");
                try(FileOutputStream out=new FileOutputStream(file)){out.write(bytes);}
                written.add(file);
                uris.add(FileProvider.getUriForFile(getContext(),authority,file));
            }
            Intent share=new Intent(uris.size()==1?Intent.ACTION_SEND:Intent.ACTION_SEND_MULTIPLE);
            share.setType("image/jpeg");
            if(uris.size()==1)share.putExtra(Intent.EXTRA_STREAM,uris.get(0));
            else share.putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris);
            android.content.ClipData clips=android.content.ClipData.newUri(
                getContext().getContentResolver(),"RivoScan JPG",uris.get(0));
            for(int i=1;i<uris.size();i++)clips.addItem(new android.content.ClipData.Item(uris.get(i)));
            share.setClipData(clips);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(share,localized("shareDocument")));
            call.resolve();
        }catch(Exception error){
            for(File file:written)file.delete();
            call.reject("Unable to share JPG pages: "+error.getMessage(),error);
        }
    }

    /** Share existing documents together; no copies and no loss of original quality.
     * Each URI is verified against current or legacy RivoScan public folders. */
    @PluginMethod
    public void shareFiles(PluginCall call){
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){requireModernAndroid(call);return;}
        JSArray input=call.getArray("uris");
        if(input==null||input.length()<1||input.length()>30){
            call.reject("Select between 1 and 30 documents to share.");return;
        }
        java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
        try {
            for(int i=0;i<input.length();i++){
                String raw=input.getString(i);
                Uri uri=validatedDocumentUri(raw);
                if(uri==null){call.reject("Cannot share a file outside RivoScan folders.");return;}
                uris.add(uri);
            }
            Intent share=new Intent(uris.size()==1?Intent.ACTION_SEND:Intent.ACTION_SEND_MULTIPLE);
            share.setType(call.getString("mimeType","*/*"));
            if(uris.size()==1)share.putExtra(Intent.EXTRA_STREAM,uris.get(0));
            else share.putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris);
            android.content.ClipData grants=android.content.ClipData.newUri(
                getContext().getContentResolver(),"RivoScan",uris.get(0));
            for(int i=1;i<uris.size();i++)grants.addItem(new android.content.ClipData.Item(uris.get(i)));
            share.setClipData(grants);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(share,localized("shareDocument")));
            call.resolve();
        }catch(Exception error){call.reject("Could not share selected files: "+error.getMessage(),error);}
    }
    private Uri validatedDocumentUri(String raw){
        if(raw==null)return null;
        Uri uri=Uri.parse(raw);
        if(raw.startsWith("content://com.android.externalstorage.documents/"))
            return trustedTreeFile(uri)?uri:null;
        String current=documentsCollection().toString()+"/";
        String legacy=legacyDownloadsCollection().toString()+"/";
        if(!raw.startsWith(current)&&!raw.startsWith(legacy))return null;
        try(Cursor cursor=getContext().getContentResolver().query(uri,
                new String[]{MediaStore.MediaColumns.RELATIVE_PATH},null,null,null)){
            if(cursor==null||!cursor.moveToFirst()||!isRivoFolder(cursor.getString(0)))return null;
            return uri;
        }catch(Exception ignored){return null;}
    }

    /** Copy/move only between explicit RivoScan folders. The source is never removed
     * until the new MediaStore entry has been fully written and published. */
    @PluginMethod
    public void organizeFile(PluginCall call){
        if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){requireModernAndroid(call);return;}
        Uri source=verifiedUri(call);if(source==null)return;
        String folder=safeSubfolder(call.getString("folder",""));
        if(folder==null){call.reject("Invalid destination folder.");return;}
        boolean move=Boolean.TRUE.equals(call.getBoolean("move",false));
        ContentResolver resolver=getContext().getContentResolver();
        Uri destination=null;
        try{
            String name;String mime;long size=0;
            try(Cursor cursor=resolver.query(source,new String[]{
                MediaStore.MediaColumns.DISPLAY_NAME,MediaStore.MediaColumns.MIME_TYPE,
                MediaStore.MediaColumns.SIZE,MediaStore.MediaColumns.RELATIVE_PATH},null,null,null)){
                if(cursor==null||!cursor.moveToFirst()||!isRivoFolder(cursor.getString(3)))
                    throw new IllegalStateException("Cannot access document.");
                name=cursor.getString(0);mime=cursor.getString(1);
                size=cursor.isNull(2)?0:cursor.getLong(2);
                if(move&&folder.equals(cursor.getString(3))){
                    JSObject same=new JSObject();same.put("uri",source.toString());same.put("name",name);
                    same.put("unchanged",true);call.resolve(same);return;
                }
            }
            if(size>300L*1024*1024)throw new IllegalStateException("Files larger than 300 MB cannot be copied here.");
            ContentValues values=new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME,name);
            values.put(MediaStore.MediaColumns.MIME_TYPE,mime==null?"application/octet-stream":mime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH,folder);
            values.put(MediaStore.MediaColumns.IS_PENDING,1);
            destination=resolver.insert(documentsCollection(),values);
            if(destination==null)throw new IllegalStateException("Could not create target document.");
            long written=0;
            try(InputStream in=resolver.openInputStream(source);
                OutputStream out=resolver.openOutputStream(destination,"w")){
                if(in==null||out==null)throw new IllegalStateException("Cannot read or write file.");
                byte[] buffer=new byte[65536];int n;
                while((n=in.read(buffer))!=-1){
                    written+=n;if(written>300L*1024*1024)throw new IllegalStateException("File too large.");
                    out.write(buffer,0,n);
                }
                out.flush();
            }
            if(size>0&&written!=size)throw new IllegalStateException("Copy size verification failed.");
            ContentValues publish=new ContentValues();publish.put(MediaStore.MediaColumns.IS_PENDING,0);
            if(resolver.update(destination,publish,null,null)<1)
                throw new IllegalStateException("Could not publish copied document.");
            if(move&&resolver.delete(source,null,null)<1)
                throw new IllegalStateException("Copy completed, but original could not be removed. Both files were retained.");
            JSObject result=new JSObject();result.put("uri",destination.toString());
            result.put("name",name);result.put("folder",folder);result.put("moved",move);
            call.resolve(result);
        }catch(Exception error){
            // A failed move must keep its source. Never erase the original here.
            if(destination!=null){
                try{
                    // If the target was published but deletion of the source failed, keep the safe copy too.
                    try(Cursor published=resolver.query(destination,new String[]{MediaStore.MediaColumns.IS_PENDING},null,null,null)){
                        if(published!=null&&published.moveToFirst()&&published.getInt(0)==1)
                            resolver.delete(destination,null,null);
                    }
                }catch(Exception ignored){}
            }
            call.reject("Organizing file failed: "+error.getMessage(),error);
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) { requireModernAndroid(call); return; }
        Uri uri = verifiedUri(call); if (uri == null) return;
        try {
            int deleted = trustedTreeFile(uri)
                ? (DocumentsContract.deleteDocument(getContext().getContentResolver(),uri)?1:0)
                : getContext().getContentResolver().delete(uri,null,null);
            if (deleted < 1) throw new IllegalStateException("Nothing was deleted.");
            call.resolve();
        } catch (Exception e) { call.reject("Could not delete document: " + e.getMessage(), e); }
    }
}
