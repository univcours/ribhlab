package com.ribhlab.rivoscan;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.drawable.GradientDrawable;
import android.hardware.camera2.CameraCharacteristics;
import androidx.camera.camera2.interop.Camera2CameraInfo;
import androidx.camera.core.CameraInfo;
import java.util.Locale;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.Space;
import androidx.camera.core.Camera;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.exifinterface.media.ExifInterface;
import com.google.common.util.concurrent.ListenableFuture;
import org.opencv.android.OpenCVLoader;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Native live document camera: draws edges, captures full-resolution, then allows corner edits. */
public final class RivoLiveScannerActivity extends AppCompatActivity {
    private FrameLayout root,content;
    private PreviewView cameraView;
    private LiveEdges overlay;
    private ImageCapture capture;
    private Camera boundCamera;
    private boolean torchOn=false;
    private boolean highQuality=true;
    private boolean batchMode=false;
    private String scanMode="Document";
    private TextView batchButton,singleButton,flashButton,qualityButton,countLabel,cameraPickerButton;
    private final ArrayList<CameraChoice> cameraChoices=new ArrayList<>();
    private CameraChoice selectedCamera=null; // null means the ordinary default rear camera
    private ProcessCameraProvider cameraProvider;
    private int cameraBindSerial=0;

    private static final class CameraChoice {
        final String id,label;
        final int facing;
        CameraChoice(String id,String label,int facing){this.id=id;this.label=label;this.facing=facing;}
    }
    private ExecutorService analyzer;
    private RivoCropEditor editor;
    private Bitmap current;
    private TextView message;
    private boolean editing=false;
    private boolean openCvReady=false;
    private int frames=0;
    private final ArrayList<String> savedImages=new ArrayList<>();
    private final ActivityResultLauncher<String> gallery=registerForActivityResult(
        new ActivityResultContracts.GetContent(), uri->{if(uri!=null)importImage(uri);});
    private final ActivityResultLauncher<String[]> documentPicker=registerForActivityResult(
        new ActivityResultContracts.OpenDocument(), uri->{if(uri!=null)importImage(uri);});

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        try{openCvReady=OpenCVLoader.initLocal();}
        catch(Throwable failure){openCvReady=false;}
        if(!openCvReady){
            Toast.makeText(this,"Edge detection unavailable on this device. Basic capture remains available.",Toast.LENGTH_LONG).show();
        }
        analyzer=Executors.newSingleThreadExecutor();
        root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(16,27,59));
        content=new FrameLayout(this);
        root.addView(content,new FrameLayout.LayoutParams(-1,-1));
        // RivoScan brand: deep blue camera chrome, white system icons.
        getWindow().setStatusBarColor(Color.rgb(16,28,58));
        getWindow().setNavigationBarColor(Color.rgb(16,28,58));
        getWindow().getDecorView().setSystemUiVisibility(
            getWindow().getDecorView().getSystemUiVisibility()
              & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        // Live scanner must not cover Samsung's clock, Wi-Fi, battery or nav bar.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if(Build.VERSION.SDK_INT >= 35){
            ViewCompat.setOnApplyWindowInsetsListener(root,(view,insets)->{
                Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars());
                view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
                return insets;
            });
            ViewCompat.requestApplyInsets(root);
        }
        setContentView(root);
        showCamera();
        String imageUri=getIntent().getStringExtra("imageUri");
        if(imageUri!=null){importImage(Uri.parse(imageUri));}
        else if(getIntent().getBooleanExtra("gallery",false))gallery.launch("image/*");
    }


    private int dp(float units){return Math.round(units*getResources().getDisplayMetrics().density);}
    private GradientDrawable rounded(int color,int radius){
        GradientDrawable drawable=new GradientDrawable();
        drawable.setColor(color);drawable.setCornerRadius(dp(radius));return drawable;
    }
    private TextView text(String title,int size,int color,boolean bold){
        TextView result=new TextView(this);
        result.setText(title);result.setTextSize(size);result.setTextColor(color);
        result.setGravity(Gravity.CENTER);
        if(bold)result.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        return result;
    }
    private TextView touchLabel(String title,int size,int color,Runnable action){
        TextView label=text(title,size,color,false);label.setOnClickListener(v->action.run());
        label.setClickable(true);label.setFocusable(true);
        label.setContentDescription(title);
        return label;
    }
    private LinearLayout.LayoutParams weighted(){
        return new LinearLayout.LayoutParams(0,-1,1);
    }
    private Button button(String title,Runnable onTap){
        Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setTextSize(13);
        b.setTextColor(Color.WHITE);b.setBackground(rounded(Color.rgb(34,51,100),12));
        b.setOnClickListener(v->onTap.run());return b;
    }
    private void layout(View body,String hint,Button... buttons){
        // A dedicated document-corners editor with a visible safe header and bottom actions.
        content.removeAllViews();
        LinearLayout shell=new LinearLayout(this);shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(14,24,54));
        content.addView(shell,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(14),0,dp(14),0);
        TextView back=touchLabel("✕",27,Color.WHITE,()->showCamera());
        header.addView(back,new LinearLayout.LayoutParams(dp(44),dp(55)));
        TextView title=text("Adjust document edges",17,Color.WHITE,true);
        header.addView(title,new LinearLayout.LayoutParams(0,dp(55),1));
        shell.addView(header);
        shell.addView(body,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout bottom=new LinearLayout(this);bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(14),dp(10),dp(14),dp(13));
        bottom.setBackgroundColor(Color.rgb(16,28,58));
        message=text(hint,12,Color.rgb(184,197,206),false);
        bottom.addView(message,new LinearLayout.LayoutParams(-1,dp(45)));
        LinearLayout actions=new LinearLayout(this);actions.setGravity(Gravity.CENTER);
        for(int i=0;i<buttons.length;i++){
            Button action=buttons[i];
            if(i==buttons.length-1){action.setBackground(rounded(Color.rgb(49,85,218),13));action.setTextColor(Color.WHITE);}
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(53),1);
            p.setMargins(dp(4),0,dp(4),0);actions.addView(action,p);
        }
        bottom.addView(actions,new LinearLayout.LayoutParams(-1,dp(57)));
        shell.addView(bottom,new LinearLayout.LayoutParams(-1,-2));
    }
    private void showCamera(){
        editing=false;
        cameraView=new PreviewView(this);
        cameraView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        cameraView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        content.removeAllViews();
        content.setBackgroundColor(Color.rgb(14,24,54));
        LinearLayout frame=new LinearLayout(this);frame.setOrientation(LinearLayout.VERTICAL);
        frame.setBackgroundColor(Color.rgb(14,24,54));
        content.addView(frame,new FrameLayout.LayoutParams(-1,-1));

        // The native status bar (time, signal, battery) remains outside the scanner.
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(7),0,dp(7),0);
        top.setBackgroundColor(Color.rgb(16,28,58));
        TextView close=touchLabel("✕",28,Color.WHITE,this::finishWithPages);
        top.addView(close,new LinearLayout.LayoutParams(dp(54),dp(56)));
        top.addView(new Space(this),new LinearLayout.LayoutParams(0,1,1));
        cameraPickerButton=touchLabel(selectedCamera==null?"Cameras ▾":shortCameraName(selectedCamera)+" ▾",12,Color.WHITE,this::showCameraPicker);
        cameraPickerButton.setBackground(rounded(Color.rgb(37,51,91),11));
        cameraPickerButton.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        top.addView(cameraPickerButton,new LinearLayout.LayoutParams(dp(92),dp(43)));
        flashButton=touchLabel(torchOn?"ϟ On":"ϟ Off",12,Color.WHITE,this::toggleTorch);
        top.addView(flashButton,new LinearLayout.LayoutParams(dp(52),dp(56)));
        qualityButton=touchLabel(highQuality?"HD":"SD",14,Color.WHITE,this::toggleQuality);
        qualityButton.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        top.addView(qualityButton,new LinearLayout.LayoutParams(dp(38),dp(56)));
        TextView more=touchLabel("⋮",26,Color.WHITE,this::showMore);
        top.addView(more,new LinearLayout.LayoutParams(dp(34),dp(56)));
        frame.addView(top,new LinearLayout.LayoutParams(-1,dp(56)));

        FrameLayout cameraFrame=new FrameLayout(this);
        cameraFrame.setBackgroundColor(Color.rgb(18,28,54));
        cameraFrame.addView(cameraView,new FrameLayout.LayoutParams(-1,-1));
        overlay=new LiveEdges(this);
        cameraFrame.addView(overlay,new FrameLayout.LayoutParams(-1,-1));
        message=text("Align your document inside the frame",12,Color.WHITE,false);
        message.setPadding(dp(10),dp(5),dp(10),dp(5));
        message.setBackground(rounded(Color.argb(168,0,0,0),15));
        FrameLayout.LayoutParams hint=new FrameLayout.LayoutParams(-2,dp(33),Gravity.TOP|Gravity.CENTER_HORIZONTAL);
        hint.topMargin=dp(12);cameraFrame.addView(message,hint);
        countLabel=text(savedImages.size()+" page(s)",12,Color.WHITE,true);
        countLabel.setPadding(dp(10),dp(4),dp(10),dp(4));
        countLabel.setBackground(rounded(Color.argb(170,0,0,0),10));
        FrameLayout.LayoutParams countParam=new FrameLayout.LayoutParams(dp(91),dp(33),Gravity.BOTTOM|Gravity.LEFT);
        countParam.bottomMargin=dp(14);countParam.leftMargin=dp(14);
        cameraFrame.addView(countLabel,countParam);
        frame.addView(cameraFrame,new LinearLayout.LayoutParams(-1,0,1));

        LinearLayout footer=new LinearLayout(this);footer.setOrientation(LinearLayout.VERTICAL);
        footer.setBackgroundColor(Color.rgb(16,28,58));footer.setPadding(dp(10),dp(3),dp(10),dp(8));
        LinearLayout switches=new LinearLayout(this);
        switches.setGravity(Gravity.CENTER);
        switches.setBackground(rounded(Color.rgb(37,51,91),23));
        singleButton=touchLabel("Single",14,Color.WHITE,()->setBatch(false));
        batchButton=touchLabel("Batch",14,Color.WHITE,()->setBatch(true));
        switches.addView(singleButton,new LinearLayout.LayoutParams(dp(85),dp(40)));
        switches.addView(batchButton,new LinearLayout.LayoutParams(dp(85),dp(40)));
        LinearLayout switchRow=new LinearLayout(this);switchRow.setGravity(Gravity.CENTER);
        switchRow.addView(switches);
        footer.addView(switchRow,new LinearLayout.LayoutParams(-1,dp(43)));
        updateBatchButtons();

        LinearLayout modes=new LinearLayout(this);modes.setGravity(Gravity.CENTER_VERTICAL);
        String[] modesList={"Document","ID Card","Whiteboard"};
        for(String mode:modesList){
            TextView item=touchLabel(mode,13,scanMode.equals(mode)?Color.rgb(114,185,255):Color.rgb(190,193,202),()->{
                scanMode=mode;showCamera();
            });
            if(scanMode.equals(mode))item.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
            modes.addView(item,weighted());
        }
        footer.addView(modes,new LinearLayout.LayoutParams(-1,dp(47)));

        LinearLayout actions=new LinearLayout(this);actions.setGravity(Gravity.CENTER_VERTICAL);
        TextView photos=touchLabel("▧\nPhotos",12,Color.WHITE,()->gallery.launch("image/*"));
        photos.setGravity(Gravity.CENTER);
        actions.addView(photos,new LinearLayout.LayoutParams(0,dp(87),1));
        Shutter shutter=new Shutter(this);
        shutter.setOnClickListener(v->takePicture());
        shutter.setContentDescription("Capture document");
        LinearLayout.LayoutParams buttonParams=new LinearLayout.LayoutParams(dp(94),dp(94));
        actions.addView(shutter,buttonParams);
        TextView browse=touchLabel("▤\nFiles",12,Color.WHITE,()->documentPicker.launch(new String[]{"image/*"}));
        browse.setGravity(Gravity.CENTER);
        actions.addView(browse,new LinearLayout.LayoutParams(0,dp(87),1));
        footer.addView(actions,new LinearLayout.LayoutParams(-1,dp(103)));
        TextView done=touchLabel(savedImages.size()>0?"✓  Finish · "+savedImages.size():"Scan & save",14,
                savedImages.size()>0?Color.rgb(114,185,255):Color.rgb(134,143,149),this::finishWithPages);
        done.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        footer.addView(done,new LinearLayout.LayoutParams(-1,dp(35)));
        frame.addView(footer,new LinearLayout.LayoutParams(-1,-2));
        startCamera();
    }
    private void setBatch(boolean next){
        batchMode=next;updateBatchButtons();
        if(message!=null)message.setText(next?"Batch: capture as many pages as needed":"Single: save one page and return");
    }
    private void updateBatchButtons(){
        if(singleButton==null||batchButton==null)return;
        singleButton.setBackground(rounded(batchMode?Color.TRANSPARENT:Color.rgb(66,92,185),22));
        batchButton.setBackground(rounded(batchMode?Color.rgb(66,92,185):Color.TRANSPARENT,22));
    }
    private void toggleTorch(){
        if(boundCamera==null||!boundCamera.getCameraInfo().hasFlashUnit()){
            torchOn=false;
            Toast.makeText(this,"Flash is not available on this camera.",Toast.LENGTH_SHORT).show();
        }else{
            torchOn=!torchOn;
            try{boundCamera.getCameraControl().enableTorch(torchOn);}
            catch(Exception e){torchOn=false;Toast.makeText(this,"Flash unavailable",Toast.LENGTH_SHORT).show();}
        }
        if(flashButton!=null)flashButton.setText(torchOn?"ϟ On":"ϟ Off");
    }
    private void toggleQuality(){
        highQuality=!highQuality;
        if(qualityButton!=null)qualityButton.setText(highQuality?"HD":"SD");
        startCamera();
    }
    private void showHelp(){
        new androidx.appcompat.app.AlertDialog.Builder(this).setTitle("RivoScan Smart Scanner")
            .setMessage("Point the camera at a page. The blue outline follows detected borders. Tap the shutter, drag the four corners, and save. Use Batch for a multipage PDF. HD prioritizes image quality.")
            .setPositiveButton("OK",null).show();
    }
    private void showMore(){
        String[] options={"Choose camera / front camera","Import photo","Choose from Files","Finish scanning","Scanner help"};
        new androidx.appcompat.app.AlertDialog.Builder(this).setItems(options,(d,which)->{
            if(which==0)showCameraPicker();
            else if(which==1)gallery.launch("image/*");
            else if(which==2)documentPicker.launch(new String[]{"image/*"});
            else if(which==3)finishWithPages();
            else showHelp();
        }).show();
    }
    private static final class Shutter extends View{
        private final Paint ink=new Paint(Paint.ANTI_ALIAS_FLAG);
        Shutter(Activity activity){super(activity);setClickable(true);setFocusable(true);}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);
            float cx=getWidth()/2f,cy=getHeight()/2f;
            float r=Math.min(getWidth(),getHeight())/2f;
            ink.setStyle(Paint.Style.FILL);ink.setColor(Color.rgb(58,111,238));
            canvas.drawCircle(cx,cy,r-dp(4),ink);
            ink.setColor(Color.rgb(14,24,54));canvas.drawCircle(cx,cy,r-dp(9),ink);
            ink.setColor(Color.WHITE);canvas.drawCircle(cx,cy,r-dp(16),ink);
        }
        private float dp(float n){return n*getResources().getDisplayMetrics().density;}
    }
    private String shortCameraName(CameraChoice choice){
        if(choice==null)return "Cameras";
        return choice.facing==CameraSelector.LENS_FACING_FRONT?"Front":
            choice.facing==CameraSelector.LENS_FACING_BACK?"Rear "+choice.id:"Cam "+choice.id;
    }
    private String cameraLabel(CameraInfo info,String id,int facing){
        String label=facing==CameraSelector.LENS_FACING_FRONT?"Front camera":
            facing==CameraSelector.LENS_FACING_BACK?"Rear camera":"External / other camera";
        String focal="";
        try{
            float[] lengths=Camera2CameraInfo.from(info).getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);
            if(lengths!=null && lengths.length>0){
                focal=String.format(Locale.US," · %.1f mm",lengths[0]);
            }
        }catch(Exception ignored){}
        return label+" · ID "+id+focal;
    }
    private void discoverCameras(ProcessCameraProvider provider){
        cameraChoices.clear();
        for(CameraInfo info:provider.getAvailableCameraInfos()){
            // Use actual Camera2 IDs where Android exposes them; never assume how
            // many cameras a phone has or a vendor-specific rear-camera ID.
            String id;
            try{id=Camera2CameraInfo.from(info).getCameraId();}
            catch(Exception missingCamera2){
                // Older/vendor camera adapters can expose only generic front/back.
                // Keep them usable instead of silently dropping all options.
                id="facing:"+info.getLensFacing();
            }
            boolean exists=false;
            for(CameraChoice c:cameraChoices){if(c.id.equals(id)){exists=true;break;}}
            if(exists)continue;
            int facing=info.getLensFacing();
            String label=id.startsWith("facing:")
                ?(facing==CameraSelector.LENS_FACING_FRONT?"Front camera":
                  facing==CameraSelector.LENS_FACING_BACK?"Rear camera":"Other camera")
                :cameraLabel(info,id,facing);
            cameraChoices.add(new CameraChoice(id,label,facing));
        }
    }
    private CameraSelector cameraSelector(){
        if(selectedCamera==null)return CameraSelector.DEFAULT_BACK_CAMERA;
        // Generic lens-facing fallback works on Android devices without
        // separately exposed Camera2 sensor IDs.
        if(selectedCamera.id.startsWith("facing:")){
            if(selectedCamera.facing==CameraSelector.LENS_FACING_FRONT)return CameraSelector.DEFAULT_FRONT_CAMERA;
            if(selectedCamera.facing==CameraSelector.LENS_FACING_BACK)return CameraSelector.DEFAULT_BACK_CAMERA;
        }
        final String cameraId=selectedCamera.id;
        return new CameraSelector.Builder().addCameraFilter(infos->{
            ArrayList<CameraInfo> matched=new ArrayList<>();
            for(CameraInfo info:infos){
                try{
                    if(cameraId.equals(Camera2CameraInfo.from(info).getCameraId()))matched.add(info);
                }catch(Exception ignored){}
            }
            return matched;
        }).build();
    }
    private void showCameraPicker(){
        if(editing||isFinishing())return;
        if(cameraProvider==null){
            message.setText("Loading available cameras…");
            ListenableFuture<ProcessCameraProvider> future=ProcessCameraProvider.getInstance(this);
            future.addListener(()->{
                try{
                    cameraProvider=future.get();
                    discoverCameras(cameraProvider);
                    showCameraPicker();
                }catch(Exception e){
                    if(message!=null)message.setText("Cameras unavailable: "+e.getMessage());
                }
            },ContextCompat.getMainExecutor(this));
            return;
        }
        discoverCameras(cameraProvider);
        ArrayList<String> labels=new ArrayList<>();
        boolean hasRear=false;
        try{hasRear=cameraProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA);}
        catch(Exception ignored){}
        labels.add(hasRear?"Default rear camera (automatic)":"Default available camera (automatic)");
        for(CameraChoice choice:cameraChoices)labels.add(choice.label);
        if(cameraChoices.isEmpty()){
            new androidx.appcompat.app.AlertDialog.Builder(this).setTitle("Choose camera")
                .setMessage("Android has not exposed another usable camera. Check camera permissions or connect an available camera.")
                .setPositiveButton("OK",null).show();
            return;
        }
        int selectedIndex=0;
        if(selectedCamera!=null){
            for(int i=0;i<cameraChoices.size();i++){
                if(cameraChoices.get(i).id.equals(selectedCamera.id)){selectedIndex=i+1;break;}
            }
        }
        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Choose camera · RivoScan")
            .setSingleChoiceItems(labels.toArray(new String[0]),selectedIndex,(dialog,which)->{
                CameraChoice next=which==0?null:cameraChoices.get(which-1);
                selectedCamera=next;
                torchOn=false;
                if(flashButton!=null)flashButton.setText("ϟ Off");
                if(cameraPickerButton!=null)cameraPickerButton.setText(next==null?"Cameras ▾":shortCameraName(next)+" ▾");
                dialog.dismiss();
                if(message!=null)message.setText(next==null?"Using the default rear camera":"Switching to "+next.label);
                startCamera();
            })
            .setNeutralButton("Default", (dialog,which)->{
                selectedCamera=null;torchOn=false;
                if(cameraPickerButton!=null)cameraPickerButton.setText("Cameras ▾");
                if(flashButton!=null)flashButton.setText("ϟ Off");
                startCamera();
            })
            .setNegativeButton("Cancel",null)
            .show();
    }
    private void startCamera(){
        final int serial=++cameraBindSerial;
        capture=null;
        boundCamera=null;
        ListenableFuture<ProcessCameraProvider> providerFuture=ProcessCameraProvider.getInstance(this);
        providerFuture.addListener(()->{
            if(serial!=cameraBindSerial||editing||isFinishing()||isDestroyed()||cameraView==null)return;
            try{
                ProcessCameraProvider provider=providerFuture.get();
                cameraProvider=provider;
                discoverCameras(provider);
                provider.unbindAll();
                CameraSelector selector=cameraSelector();
                if(selectedCamera==null && !provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)){
                    // Some tablets, damaged devices and external-camera setups
                    // have no accessible rear camera. Pick a working available one.
                    if(provider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)){
                        selectedCamera=new CameraChoice("facing:"+CameraSelector.LENS_FACING_FRONT,
                            "Front camera (rear unavailable)",CameraSelector.LENS_FACING_FRONT);
                    }else if(!cameraChoices.isEmpty()){
                        selectedCamera=cameraChoices.get(0);
                    }else{
                        throw new IllegalStateException("Android did not expose a camera");
                    }
                    selector=cameraSelector();
                    if(cameraPickerButton!=null)cameraPickerButton.setText(shortCameraName(selectedCamera)+" ▾");
                    if(message!=null)message.setText("Rear camera unavailable · using "+shortCameraName(selectedCamera));
                }
                Preview preview=new Preview.Builder().build();
                preview.setSurfaceProvider(cameraView.getSurfaceProvider());
                ImageCapture newCapture=new ImageCapture.Builder()
                    .setCaptureMode(highQuality?ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY:ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build();
                ImageAnalysis analysis=new ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
                analysis.setAnalyzer(analyzer,this::analyze);
                boolean hasLiveEdges=openCvReady;
                if(hasLiveEdges){
                    try{
                        boundCamera=provider.bindToLifecycle(this,selector,preview,analysis,newCapture);
                    }catch(Exception limitedHardware){
                        // CameraX stream-combination limits vary on older/low-end Android phones.
                        // Preserve preview/capture rather than rejecting the whole device.
                        provider.unbindAll();
                        boundCamera=provider.bindToLifecycle(this,selector,preview,newCapture);
                        hasLiveEdges=false;
                    }
                }else{
                    boundCamera=provider.bindToLifecycle(this,selector,preview,newCapture);
                }
                capture=newCapture;
                if(overlay!=null){
                    overlay.setMirrored(selectedCamera!=null && selectedCamera.facing==CameraSelector.LENS_FACING_FRONT);
                    overlay.update(null,1,1);
                }
                frames=0;
                if(boundCamera.getCameraInfo().hasFlashUnit() && torchOn){
                    boundCamera.getCameraControl().enableTorch(true);
                }else{
                    torchOn=false;
                    if(flashButton!=null)flashButton.setText("ϟ Off");
                }
                if(message!=null){
                    String cameraName=selectedCamera==null?"Default rear":shortCameraName(selectedCamera);
                    message.setText(hasLiveEdges?cameraName+" · live edges ready":
                        cameraName+" · basic capture (live edges unsupported)");
                }
            }catch(Exception e){
                capture=null;boundCamera=null;
                if(message!=null)message.setText("This camera is unavailable. Tap Cameras ▾ to choose another.");
                Toast.makeText(this,"This camera could not open. Choose another available camera.",Toast.LENGTH_LONG).show();
            }
        },ContextCompat.getMainExecutor(this));
    }
    private void analyze(@NonNull ImageProxy frame){
        if(editing||!openCvReady){frame.close();return;}
        // Analyze every third frame to preserve battery and preview responsiveness.
        if(++frames%3!=0){frame.close();return;}
        Mat gray=new Mat(),oriented=new Mat();
        try{
            ImageProxy.PlaneProxy plane=frame.getPlanes()[0];
            ByteBuffer buf=plane.getBuffer().duplicate();buf.rewind();
            int width=frame.getWidth(),height=frame.getHeight(),stride=plane.getRowStride();
            byte[] input=new byte[width*height];
            for(int row=0;row<height;row++){
                buf.position(row*stride);buf.get(input,row*width,width);
            }
            gray=new Mat(height,width,CvType.CV_8UC1);gray.put(0,0,input);
            int rotation=frame.getImageInfo().getRotationDegrees();
            if(rotation==90)Core.rotate(gray,oriented,Core.ROTATE_90_CLOCKWISE);
            else if(rotation==180)Core.rotate(gray,oriented,Core.ROTATE_180);
            else if(rotation==270)Core.rotate(gray,oriented,Core.ROTATE_90_COUNTERCLOCKWISE);
            else oriented=gray;
            Point[] corners=RivoEdgeDetector.detectGray(oriented);
            final int imageWidth=oriented.width(),imageHeight=oriented.height();
            runOnUiThread(()->{if(!editing&&overlay!=null)overlay.update(corners,imageWidth,imageHeight);});
        }catch(Exception ignored){}finally{if(oriented!=gray)oriented.release();gray.release();frame.close();}
    }
    private void takePicture(){
        if(capture==null||editing)return;
        File file=new File(getCacheDir(),"rivo_original_"+System.currentTimeMillis()+".jpg");
        ImageCapture.OutputFileOptions options=new ImageCapture.OutputFileOptions.Builder(file).build();
        message.setText("Capturing page…");
        capture.takePicture(options,ContextCompat.getMainExecutor(this),new ImageCapture.OnImageSavedCallback(){
            @Override public void onImageSaved(@NonNull ImageCapture.OutputFileResults result){
                try{Bitmap bmp=decodeFile(file);openEditor(bmp);}catch(Exception e){message.setText("Image error: "+e.getMessage());}
                finally{file.delete();}
            }
            @Override public void onError(@NonNull androidx.camera.core.ImageCaptureException e){message.setText("Capture failed: "+e.getMessage());}
        });
    }
    private static Bitmap scaleDecode(InputStream stream) throws Exception {
        Bitmap original=BitmapFactory.decodeStream(stream);
        if(original==null)throw new Exception("Cannot decode photo.");
        double scale=Math.min(1,2800.0/Math.max(original.getWidth(),original.getHeight()));
        if(scale==1)return original;
        Bitmap smaller=Bitmap.createScaledBitmap(original,(int)(original.getWidth()*scale),(int)(original.getHeight()*scale),true);
        original.recycle();return smaller;
    }
    private Bitmap decodeFile(File file)throws Exception{
        Bitmap bitmap;
        try(InputStream in=new java.io.FileInputStream(file)){bitmap=scaleDecode(in);}
        ExifInterface exif=new ExifInterface(file.getAbsolutePath());
        int orientation=exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
        int deg=orientation==ExifInterface.ORIENTATION_ROTATE_90?90:orientation==ExifInterface.ORIENTATION_ROTATE_180?180:orientation==ExifInterface.ORIENTATION_ROTATE_270?270:0;
        if(deg!=0){Matrix matrix=new Matrix();matrix.postRotate(deg);Bitmap fixed=Bitmap.createBitmap(bitmap,0,0,bitmap.getWidth(),bitmap.getHeight(),matrix,true);bitmap.recycle();return fixed;}
        return bitmap;
    }
    private void importImage(Uri uri){
        try{
            try(InputStream input=getContentResolver().openInputStream(uri)){
                if(input==null)throw new Exception("Selected image cannot be opened.");
                Bitmap img=scaleDecode(input);
                // Respect EXIF rotation for photos imported from gallery or another app.
                try(InputStream exifStream=getContentResolver().openInputStream(uri)){
                    if(exifStream!=null){
                        ExifInterface exif=new ExifInterface(exifStream);
                        int orientation=exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
                        int degrees=orientation==ExifInterface.ORIENTATION_ROTATE_90?90:
                            orientation==ExifInterface.ORIENTATION_ROTATE_180?180:
                            orientation==ExifInterface.ORIENTATION_ROTATE_270?270:0;
                        if(degrees!=0){
                            Matrix m=new Matrix();m.postRotate(degrees);
                            Bitmap rotated=Bitmap.createBitmap(img,0,0,img.getWidth(),img.getHeight(),m,true);
                            img.recycle();img=rotated;
                        }
                    }
                }catch(Exception ignored){}
                openEditor(img);
            }
        }catch(Exception e){Toast.makeText(this,"Unable to import image: "+e.getMessage(),Toast.LENGTH_LONG).show();}
    }
    private void openEditor(Bitmap bitmap){
        if(!openCvReady){
            // If a vendor/CPU cannot load OpenCV, offer ordinary photo capture
            // rather than closing the entire scanner.
            saveWithoutCrop(bitmap);
            return;
        }
        editing=true;current=bitmap;
        // The same interactive four-point editor handles both camera images and gallery images.
        Point[] found=RivoEdgeDetector.detect(bitmap);
        editor=new RivoCropEditor(this);editor.setDocument(bitmap,found);
        layout(editor,found==null?"Document not found automatically · drag the 4 dots":"Drag the 4 green corners to adjust the detected paper",
            button("Retake",this::showCamera),
            button("Detect",()->{editor.useAutoCorners();message.setText("Adjust the four green dots if needed.");}),
            button("Save page",this::saveCroppedPage));
    }
    private void saveWithoutCrop(Bitmap bitmap){
        try{
            File target=new File(getCacheDir(),"rivoscan_uncropped_"+
                System.currentTimeMillis()+"_"+savedImages.size()+".jpg");
            try(FileOutputStream out=new FileOutputStream(target)){
                bitmap.compress(Bitmap.CompressFormat.JPEG,90,out);
            }
            savedImages.add(Uri.fromFile(target).toString());
            Toast.makeText(this,"Photo captured without auto-crop on this device.",Toast.LENGTH_SHORT).show();
            if(batchMode)showCamera();else finishWithPages();
        }catch(Exception error){
            Toast.makeText(this,"Could not save photo: "+error.getMessage(),Toast.LENGTH_LONG).show();
        }finally{
            bitmap.recycle();
        }
    }
    private void saveCroppedPage(){
        try{
            Bitmap output=RivoEdgeDetector.warp(current,editor.getCorners());
            File target=new File(getCacheDir(),"rivoscan_scan_"+System.currentTimeMillis()+"_"+savedImages.size()+".jpg");
            try(FileOutputStream out=new FileOutputStream(target)){output.compress(Bitmap.CompressFormat.JPEG,90,out);}
            output.recycle();savedImages.add(Uri.fromFile(target).toString());
            if(current!=null){current.recycle();current=null;}
            if(batchMode)showCamera();else finishWithPages();
        }catch(Exception e){message.setText("Adjust the corners: "+e.getMessage());}
    }
    private void finishWithPages(){
        if(savedImages.isEmpty()){setResult(Activity.RESULT_CANCELED);finish();return;}
        Intent out=new Intent();out.putStringArrayListExtra("images",savedImages);
        setResult(Activity.RESULT_OK,out);finish();
    }
    @Override public void onBackPressed(){
        if(editing)showCamera();else finishWithPages();
    }
    @Override protected void onDestroy(){cameraBindSerial++;super.onDestroy();if(analyzer!=null)analyzer.shutdownNow();}

    /** Live camera overlay; normalized corners from analyzed frame. */
    private static final class LiveEdges extends View{
        private boolean mirrored=false;
        void setMirrored(boolean active){mirrored=active;invalidate();}
        private float screenX(Point point){return mirrored?1f-(float)point.x:(float)point.x;}
        private Point[] points;
        private int imageWidth=1,imageHeight=1;
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        LiveEdges(Activity owner){super(owner);setWillNotDraw(false);}
        void update(Point[] corners,int w,int h){points=corners;imageWidth=Math.max(1,w);imageHeight=Math.max(1,h);invalidate();}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);if(points==null)return;
            // CameraX PreviewView uses FILL_CENTER; map normalized analysis points through
            // the same center-crop transform instead of stretching them to the screen.
            float scale=Math.max(getWidth()/(float)imageWidth,getHeight()/(float)imageHeight);
            float offsetX=(getWidth()-imageWidth*scale)/2f,offsetY=(getHeight()-imageHeight*scale)/2f;
            Path path=new Path();path.moveTo(offsetX+screenX(points[0])*imageWidth*scale,offsetY+(float)points[0].y*imageHeight*scale);
            for(int i=1;i<4;i++)path.lineTo(offsetX+screenX(points[i])*imageWidth*scale,offsetY+(float)points[i].y*imageHeight*scale);path.close();
            paint.setStyle(Paint.Style.FILL);paint.setColor(Color.argb(45,45,123,255));canvas.drawPath(path,paint);
            paint.setColor(Color.rgb(100,189,255));paint.setStrokeWidth(6);paint.setStyle(Paint.Style.STROKE);canvas.drawPath(path,paint);
        }
    }
}
