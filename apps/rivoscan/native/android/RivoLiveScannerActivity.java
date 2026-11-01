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
import android.hardware.camera2.params.StreamConfigurationMap;
import android.graphics.ImageFormat;
import android.util.Size;
import androidx.camera.camera2.interop.Camera2CameraInfo;
import androidx.camera.core.CameraInfo;
import java.util.Locale;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.HorizontalScrollView;
import android.view.MotionEvent;
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
import java.util.HashSet;
import androidx.lifecycle.Observer;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
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
    private boolean autoCleanEnabled=true;
    private boolean saveOriginal=true;
    private int scanJpegQuality=94;
    private String defaultEnhancement=RivoDocumentEnhancer.AUTO;
    private String scanMode="Document";
    private boolean basicCameraMode=false;
    private String nativeLanguage="en";
    private String trNative(String key){return RivoLocale.get(nativeLanguage,key);}
    private TextView batchButton,singleButton,flashButton,qualityButton,countLabel,cameraPickerButton;
    private final ArrayList<CameraChoice> cameraChoices=new ArrayList<>();
    private CameraChoice selectedCamera=null; // null = automatic best supported rear camera
    private String activeCameraId="default";
    private ProcessCameraProvider cameraProvider;
    private int cameraBindSerial=0;
    private final HashSet<String> unusableCameraIds=new HashSet<>();
    private boolean cameraSwitching=false;
    private ImageView frozenPreview;
    private long lastAnalysisTime=0;
    private long lastValidEdgeTime=0;
    private Point[] smoothCorners;
    private Observer<PreviewView.StreamState> streamObserver;
    private final Handler mainHandler=new Handler(Looper.getMainLooper());

    private static final class CameraChoice {
        final String id,label;
        final int facing;
        final double score;
        CameraChoice(String id,String label,int facing,double score){this.id=id;this.label=label;this.facing=facing;this.score=score;}
    }
    private ExecutorService analyzer;
    private RivoCropEditor editor;
    private Bitmap current;
    private Bitmap pendingWarp,enhancementPreview;
    private ImageView enhancementImage;
    private TextView enhancementHint;
    private String selectedEnhancement=RivoDocumentEnhancer.ENHANCE;
    private int enhancementSerial=0;
    private boolean savingEnhancedPage=false;
    private boolean captureInProgress=false;
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
        // Native scanner already has its own toolbar: avoid the duplicated
        // blue "RivoScan" AppCompat ActionBar seen above the crop editor.
        if(getSupportActionBar()!=null)getSupportActionBar().hide();
        basicCameraMode=getIntent().getBooleanExtra("basic",false);
        autoCleanEnabled=getIntent().getBooleanExtra("autoClean",true);
        saveOriginal=getIntent().getBooleanExtra("keepOriginal",true);
        batchMode=getIntent().getBooleanExtra("batchDefault",false);
        highQuality=getIntent().getBooleanExtra("highQuality",true);
        scanJpegQuality=getIntent().getIntExtra("jpegQuality",94);
        if(scanJpegQuality<70||scanJpegQuality>100)scanJpegQuality=94;
        String requestedEnhancement=getIntent().getStringExtra("enhancement");
        if(RivoDocumentEnhancer.isSupportedMode(requestedEnhancement))
            defaultEnhancement=requestedEnhancement;
        scanMode="ID Card".equals(getIntent().getStringExtra("mode"))?"ID Card":"Document";
        if("ID Card".equals(scanMode))batchMode=true;
        String requestedLanguage=getIntent().getStringExtra("language");
        if(requestedLanguage!=null)nativeLanguage=requestedLanguage;
        try{openCvReady=!basicCameraMode && OpenCVLoader.initLocal();}
        catch(Throwable failure){openCvReady=false;}
        if(!openCvReady && !basicCameraMode){
            Toast.makeText(this,trNative("basicMode"),Toast.LENGTH_LONG).show();
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
    /** Contrasting colored stroke makes every native camera control recognizable. */
    private GradientDrawable outlined(int fill,int radius,int frameColor){
        GradientDrawable drawable=rounded(fill,radius);
        drawable.setStroke(dp(1.7f),frameColor);
        return drawable;
    }
    private TextView text(String title,int size,int color,boolean bold){
        TextView result=new TextView(this);
        result.setText(title);result.setTextSize(size);result.setTextColor(color);
        result.setGravity(Gravity.CENTER);
        if(bold)result.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        return result;
    }
    private TextView touchLabel(String title,int size,int color,Runnable action){
        TextView label=text(title,size,color,false);
        label.setOnClickListener(v->{RivoSounds.play(this,"tap");action.run();});
        label.setClickable(true);label.setFocusable(true);
        label.setContentDescription(title);
        label.setBackground(outlined(Color.rgb(26,43,82),11,Color.rgb(4,188,247)));
        return label;
    }
    private LinearLayout.LayoutParams weighted(){
        return new LinearLayout.LayoutParams(0,-1,1);
    }
    private Button button(String title,Runnable onTap){
        Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setTextSize(13);
        b.setTextColor(Color.WHITE);
        b.setBackground(outlined(Color.rgb(34,51,100),12,Color.rgb(102,155,255)));
        b.setOnClickListener(v->{RivoSounds.play(this,"tool");onTap.run();});return b;
    }
    private void layout(View body,String hint,Button... buttons){
        // A dedicated document-corners editor with a visible safe header and bottom actions.
        content.removeAllViews();
        LinearLayout shell=new LinearLayout(this);shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(14,24,54));
        content.addView(shell,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(14),0,dp(14),0);
        TextView back=touchLabel(editing?trNative("retake"):"✕",editing?12:27,Color.WHITE,()->showCamera());
        header.addView(back,new LinearLayout.LayoutParams(dp(editing?76:44),dp(55)));
        TextView title=text(trNative("title"),17,Color.WHITE,true);
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
            if(i==buttons.length-1){action.setBackground(outlined(Color.rgb(8,125,250),13,Color.rgb(4,188,247)));action.setTextColor(Color.WHITE);}
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(53),1);
            p.setMargins(dp(4),0,dp(4),0);actions.addView(action,p);
        }
        bottom.addView(actions,new LinearLayout.LayoutParams(-1,dp(57)));
        shell.addView(bottom,new LinearLayout.LayoutParams(-1,-2));
    }
    private void showCamera(){
        if(savingEnhancedPage)return;
        enhancementSerial++;
        if(!savingEnhancedPage)releaseEnhancement();
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
        cameraPickerButton=touchLabel(selectedCamera==null?trNative("bestCamera")+" ▾":shortCameraName(selectedCamera)+" ▾",12,Color.WHITE,this::showCameraPicker);
        cameraPickerButton.setBackground(outlined(Color.rgb(37,51,91),11,Color.rgb(102,155,255)));
        cameraPickerButton.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        top.addView(cameraPickerButton,new LinearLayout.LayoutParams(dp(92),dp(43)));
        flashButton=touchLabel(torchOn?trNative("flashOn"):trNative("flashOff"),12,Color.WHITE,this::toggleTorch);
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
        if(!basicCameraMode)cameraFrame.addView(overlay,new FrameLayout.LayoutParams(-1,-1));
        message=text("ID Card".equals(scanMode)
            ?trNative(savedImages.isEmpty()?"idFront":"idBack")
            :(basicCameraMode?trNative("basicHint"):trNative("align")),12,Color.WHITE,false);
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
        singleButton=touchLabel(trNative("single"),14,Color.WHITE,()->setBatch(false));
        batchButton=touchLabel(trNative("batch"),14,Color.WHITE,()->setBatch(true));
        switches.addView(singleButton,new LinearLayout.LayoutParams(dp(85),dp(40)));
        switches.addView(batchButton,new LinearLayout.LayoutParams(dp(85),dp(40)));
        LinearLayout switchRow=new LinearLayout(this);switchRow.setGravity(Gravity.CENTER);
        switchRow.addView(switches);
        footer.addView(switchRow,new LinearLayout.LayoutParams(-1,dp(43)));
        updateBatchButtons();

        LinearLayout modes=new LinearLayout(this);modes.setGravity(Gravity.CENTER_VERTICAL);
        String[] modesList={"Document","ID Card","Whiteboard"};
        for(String mode:modesList){
            TextView item=touchLabel(mode.equals("Document")?trNative("document"):mode.equals("ID Card")?trNative("id"):trNative("board"),13,scanMode.equals(mode)?Color.rgb(4,188,247):Color.rgb(190,193,202),()->{
                scanMode=mode;
                if("ID Card".equals(scanMode))setBatch(true);
                for(int i=0;i<modes.getChildCount();i++){
                    TextView tab=(TextView)modes.getChildAt(i);
                    boolean selected=modesList[i].equals(scanMode);
                    tab.setTextColor(selected?Color.rgb(4,188,247):Color.rgb(190,193,202));
                    tab.setTypeface(android.graphics.Typeface.DEFAULT,
                        selected?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL);
                }
                if(message!=null)message.setText((scanMode.equals("Document")?trNative("document"):scanMode.equals("ID Card")?trNative("id"):trNative("board"))+trNative("modeReady"));
            });
            if(scanMode.equals(mode))item.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
            modes.addView(item,weighted());
        }
        if(!basicCameraMode)footer.addView(modes,new LinearLayout.LayoutParams(-1,dp(47)));

        LinearLayout actions=new LinearLayout(this);actions.setGravity(Gravity.CENTER_VERTICAL);
        TextView photos=touchLabel("▧\n"+trNative("photos"),12,Color.WHITE,()->gallery.launch("image/*"));
        photos.setGravity(Gravity.CENTER);
        actions.addView(photos,new LinearLayout.LayoutParams(0,dp(87),1));
        Shutter shutter=new Shutter(this);
        shutter.setOnClickListener(v->{RivoSounds.play(this,"capture");takePicture();});
        shutter.setContentDescription(trNative("capture"));
        LinearLayout.LayoutParams buttonParams=new LinearLayout.LayoutParams(dp(94),dp(94));
        actions.addView(shutter,buttonParams);
        TextView browse=touchLabel("▤\n"+trNative("files"),12,Color.WHITE,()->documentPicker.launch(new String[]{"image/*"}));
        browse.setGravity(Gravity.CENTER);
        actions.addView(browse,new LinearLayout.LayoutParams(0,dp(87),1));
        footer.addView(actions,new LinearLayout.LayoutParams(-1,dp(103)));
        TextView done=touchLabel(savedImages.size()>0?"✓  "+trNative("finish")+" · "+savedImages.size():trNative("saveScan"),14,
                savedImages.size()>0?Color.rgb(4,188,247):Color.rgb(134,143,149),this::finishWithPages);
        done.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        footer.addView(done,new LinearLayout.LayoutParams(-1,dp(35)));
        frame.addView(footer,new LinearLayout.LayoutParams(-1,-2));
        startCamera();
    }
    private void setBatch(boolean next){
        batchMode=next;updateBatchButtons();
        if(message!=null)message.setText(next?trNative("batchReady"):trNative("singleReady"));
    }
    private void updateBatchButtons(){
        if(singleButton==null||batchButton==null)return;
        singleButton.setBackground(outlined(batchMode?Color.rgb(37,51,91):Color.rgb(35,40,221),
            20,batchMode?Color.rgb(107,146,209):Color.rgb(4,188,247)));
        batchButton.setBackground(outlined(batchMode?Color.rgb(35,40,221):Color.rgb(37,51,91),
            20,batchMode?Color.rgb(4,188,247):Color.rgb(107,146,209)));
    }
    private void toggleTorch(){
        if(boundCamera==null||!boundCamera.getCameraInfo().hasFlashUnit()){
            torchOn=false;
            Toast.makeText(this,trNative("noFlash"),Toast.LENGTH_SHORT).show();
        }else{
            torchOn=!torchOn;
            try{boundCamera.getCameraControl().enableTorch(torchOn);}
            catch(Exception e){torchOn=false;Toast.makeText(this,trNative("flash"),Toast.LENGTH_SHORT).show();}
        }
        if(flashButton!=null)flashButton.setText(torchOn?trNative("flashOn"):trNative("flashOff"));
    }
    private void toggleQuality(){
        highQuality=!highQuality;
        if(qualityButton!=null)qualityButton.setText(highQuality?"HD":"SD");
        startCamera();
    }
    private void showHelp(){
        new androidx.appcompat.app.AlertDialog.Builder(this).setTitle(trNative("helpTitle"))
            .setMessage(trNative("helpText"))
            .setPositiveButton("OK",null).show();
    }
    private void showMore(){
        String[] options={trNative("chooseCamera"),trNative("importPhoto"),trNative("chooseFile"),
            trNative("finishScan"),"Sounds: "+(RivoSounds.enabled(this)?"On":"Off"),trNative("scannerHelp")};
        new androidx.appcompat.app.AlertDialog.Builder(this).setItems(options,(d,which)->{
            if(which==0)showCameraPicker();
            else if(which==1)gallery.launch("image/*");
            else if(which==2)documentPicker.launch(new String[]{"image/*"});
            else if(which==3)finishWithPages();
            else if(which==4){
                boolean newState=!RivoSounds.enabled(this);
                RivoSounds.setEnabled(this,newState);
                if(newState)RivoSounds.play(this,"saved");
                Toast.makeText(this,trNative("sounds")+(newState?trNative("soundOn"):trNative("soundOff")),Toast.LENGTH_SHORT).show();
            }else showHelp();
        }).show();
    }
    private static final class Shutter extends View{
        private final Paint ink=new Paint(Paint.ANTI_ALIAS_FLAG);
        Shutter(Activity activity){super(activity);setClickable(true);setFocusable(true);}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);
            float cx=getWidth()/2f,cy=getHeight()/2f;
            float r=Math.min(getWidth(),getHeight())/2f;
            ink.setStyle(Paint.Style.FILL);ink.setColor(Color.rgb(8,125,250));
            canvas.drawCircle(cx,cy,r-dp(4),ink);
            ink.setColor(Color.rgb(14,24,54));canvas.drawCircle(cx,cy,r-dp(9),ink);
            ink.setColor(Color.WHITE);canvas.drawCircle(cx,cy,r-dp(16),ink);
        }
        private float dp(float n){return n*getResources().getDisplayMetrics().density;}
    }
    private String shortCameraName(CameraChoice choice){
        if(choice==null)return trNative("cameras");
        return trNative("rear")+" "+choice.id;
    }
    /** Score only cameras CameraX exposes; high-resolution JPEG, autofocus and
     * standard focal length are preferred over distorted ultrawide lenses. */
    private double cameraScore(CameraInfo info){
        try{
            Camera2CameraInfo camera=Camera2CameraInfo.from(info);
            StreamConfigurationMap map=camera.getCameraCharacteristic(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            long pixels=0;
            if(map!=null){
                Size[] jpeg=map.getOutputSizes(ImageFormat.JPEG);
                if(jpeg!=null)for(Size size:jpeg)
                    pixels=Math.max(pixels,(long)size.getWidth()*size.getHeight());
            }
            if(pixels==0){
                Size sensor=camera.getCameraCharacteristic(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE);
                if(sensor!=null)pixels=(long)sensor.getWidth()*sensor.getHeight();
            }
            float[] focals=camera.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS);
            float focal=focals!=null&&focals.length>0?focals[0]:0;
            Integer focus=camera.getCameraCharacteristic(CameraCharacteristics.CONTROL_MAX_REGIONS_AF);
            double score=Math.log1p(pixels)/Math.log(2);
            if(focal>=3.3f&&focal<=10f)score+=3;
            else if(focal>0&&focal<2.6f)score-=4;
            if(focus!=null&&focus>0)score+=1.3;
            return score;
        }catch(Exception ignored){return 0;}
    }
    private CameraChoice bestAvailableCamera(){
        CameraChoice best=null;
        for(CameraChoice choice:cameraChoices)
            if(!unusableCameraIds.contains(choice.id)&&(best==null||choice.score>best.score))best=choice;
        return best;
    }
    private String cameraLabel(CameraInfo info,String id,int facing){
        String label=trNative("rear");
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
            if(info.getLensFacing()!=CameraSelector.LENS_FACING_BACK)continue;
            String id;
            try{id=Camera2CameraInfo.from(info).getCameraId();}
            catch(Exception ignored){id="facing:"+CameraSelector.LENS_FACING_BACK;}
            if(unusableCameraIds.contains(id))continue;
            final String cid=id;
            CameraSelector candidate=selectorFor(cid);
            try{
                if(!provider.hasCamera(candidate))continue;
            }catch(Exception unavailable){continue;}
            boolean duplicate=false;
            for(CameraChoice c:cameraChoices)if(c.id.equals(id)){duplicate=true;break;}
            if(!duplicate){
                String label=id.startsWith("facing:")?"Rear camera":cameraLabel(info,id,CameraSelector.LENS_FACING_BACK);
                cameraChoices.add(new CameraChoice(id,label,CameraSelector.LENS_FACING_BACK,cameraScore(info)));
            }
        }
        // Make higher-quality supported camera lenses appear first in the manual list.
        cameraChoices.sort((first,second)->Double.compare(second.score,first.score));
    }
    private CameraSelector selectorFor(String cameraId){
        if(cameraId.startsWith("facing:"))return CameraSelector.DEFAULT_BACK_CAMERA;
        return new CameraSelector.Builder().addCameraFilter(infos->{
            ArrayList<CameraInfo> matched=new ArrayList<>();
            for(CameraInfo info:infos){
                if(info.getLensFacing()!=CameraSelector.LENS_FACING_BACK)continue;
                try{
                    if(cameraId.equals(Camera2CameraInfo.from(info).getCameraId()))matched.add(info);
                }catch(Exception ignored){}
            }
            return matched;
        }).build();
    }
    private CameraSelector cameraSelector(){
        CameraChoice choice=selectedCamera!=null?selectedCamera:bestAvailableCamera();
        activeCameraId=choice==null?"default":choice.id;
        return choice==null?CameraSelector.DEFAULT_BACK_CAMERA:selectorFor(choice.id);
    }
    private void showCameraPicker(){
        if(editing||isFinishing())return;
        if(cameraProvider==null){
            message.setText(trNative("loadingCameras"));
            ListenableFuture<ProcessCameraProvider> future=ProcessCameraProvider.getInstance(this);
            future.addListener(()->{
                try{
                    cameraProvider=future.get();
                    discoverCameras(cameraProvider);
                    showCameraPicker();
                }catch(Exception e){
                    if(message!=null)message.setText(trNative("camerasError")+e.getMessage());
                }
            },ContextCompat.getMainExecutor(this));
            return;
        }
        discoverCameras(cameraProvider);
        ArrayList<String> labels=new ArrayList<>();
        boolean hasRear=false;
        try{hasRear=cameraProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA);}
        catch(Exception ignored){}
        labels.add(trNative("bestCamera"));
        for(CameraChoice choice:cameraChoices)labels.add(choice.label);
        if(cameraChoices.isEmpty()&&!hasRear){
            new androidx.appcompat.app.AlertDialog.Builder(this).setTitle(trNative("noRearTitle"))
                .setMessage(trNative("noRearText"))
                .setPositiveButton(trNative("importPhoto"),(d,w)->gallery.launch("image/*"))
                .setNegativeButton(trNative("cancel"),null).show();
            return;
        }
        int selectedIndex=0;
        if(selectedCamera!=null){
            for(int i=0;i<cameraChoices.size();i++){
                if(cameraChoices.get(i).id.equals(selectedCamera.id)){selectedIndex=i+1;break;}
            }
        }
        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(trNative("cameraPicker"))
            .setSingleChoiceItems(labels.toArray(new String[0]),selectedIndex,(dialog,which)->{
                CameraChoice next=which==0?null:cameraChoices.get(which-1);
                if(next!=null && selectedCamera!=null && next.id.equals(selectedCamera.id)){
                    dialog.dismiss();return;
                }
                selectedCamera=next;
                torchOn=false;
                RivoSounds.play(this,"switch");
                if(flashButton!=null)flashButton.setText(trNative("flashOff"));
                if(cameraPickerButton!=null)cameraPickerButton.setText(next==null?trNative("bestCamera")+" ▾":shortCameraName(next)+" ▾");
                dialog.dismiss();
                if(message!=null)message.setText(next==null?trNative("usingAuto"):trNative("switching")+next.label);
                startCamera();
            })
            .setNeutralButton(trNative("bestSelection"), (dialog,which)->{
                selectedCamera=null;torchOn=false;
                RivoSounds.play(this,"switch");
                if(cameraPickerButton!=null)cameraPickerButton.setText(trNative("bestCamera")+" ▾");
                if(flashButton!=null)flashButton.setText(trNative("flashOff"));
                startCamera();
            })
            .setNegativeButton(trNative("cancel"),null)
            .show();
    }
    private void freezePreview(){
        try{
            if(cameraView==null||!(cameraView.getParent() instanceof FrameLayout))return;
            if(frozenPreview!=null)return;
            Bitmap last=cameraView.getBitmap();
            if(last==null)return;
            FrameLayout container=(FrameLayout)cameraView.getParent();
            ImageView frozen=new ImageView(this);
            frozen.setImageBitmap(last);
            frozen.setScaleType(ImageView.ScaleType.CENTER_CROP);
            container.addView(frozen,1,new FrameLayout.LayoutParams(-1,-1));
            frozenPreview=frozen;
        }catch(Exception ignored){
            // Snapshot is cosmetic; camera operation remains safe without it.
        }
    }
    private void clearFrozenPreview(){
        if(streamObserver!=null && cameraView!=null){
            cameraView.getPreviewStreamState().removeObserver(streamObserver);
            streamObserver=null;
        }
        if(frozenPreview!=null){
            ImageView view=frozenPreview;
            frozenPreview=null;
            view.animate().alpha(0).setDuration(140).withEndAction(()->{
                if(view.getParent() instanceof android.view.ViewGroup){
                    ((android.view.ViewGroup)view.getParent()).removeView(view);
                }
                view.setImageDrawable(null);
            }).start();
        }
        cameraSwitching=false;
    }
    private void handleCameraFailure(String reason){
        capture=null;
        boundCamera=null;
        unusableCameraIds.add(activeCameraId);
        if(cameraProvider!=null){
            discoverCameras(cameraProvider);
            CameraChoice next=bestAvailableCamera();
            if(next!=null){
                selectedCamera=null;
                if(cameraPickerButton!=null)cameraPickerButton.setText(trNative("bestCamera")+" ▾");
                if(message!=null)message.setText(trNative("retryCamera"));
                startCamera();
                return;
            }
        }
        clearFrozenPreview();
        if(message!=null)message.setText(trNative("noWorking"));
        RivoSounds.play(this,"error");
        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(trNative("noCamera"))
            .setMessage(trNative("noWorkingText"))
            .setPositiveButton(trNative("importPhoto"),(dialog,which)->gallery.launch("image/*"))
            .setNegativeButton(trNative("close"),null).show();
    }
    private void startCamera(){
        final int serial=++cameraBindSerial;
        if(capture!=null&&!editing){
            freezePreview();cameraSwitching=true;
        }
        capture=null;
        boundCamera=null;
        smoothCorners=null;
        lastValidEdgeTime=0;
        final ListenableFuture<ProcessCameraProvider> future=ProcessCameraProvider.getInstance(this);
        future.addListener(()->{
            if(serial!=cameraBindSerial||editing||isFinishing()||isDestroyed()||cameraView==null)return;
            try{
                ProcessCameraProvider provider=future.get();
                cameraProvider=provider;
                discoverCameras(provider);
                if(!provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)&&cameraChoices.isEmpty()){
                    handleCameraFailure("No accessible rear cameras");return;
                }
                if(selectedCamera!=null && unusableCameraIds.contains(selectedCamera.id))selectedCamera=null;
                if(cameraChoices.isEmpty()&&unusableCameraIds.contains("default")){
                    handleCameraFailure("Rear cameras exhausted");return;
                }
                CameraSelector selector=cameraSelector();
                if(!provider.hasCamera(selector)){
                    handleCameraFailure("Camera no longer available");return;
                }
                Preview preview=new Preview.Builder().build();
                preview.setSurfaceProvider(cameraView.getSurfaceProvider());
                ImageCapture nextCapture=new ImageCapture.Builder()
                    .setCaptureMode(highQuality?ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY:
                        ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build();
                ImageAnalysis analysis=new ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
                analysis.setAnalyzer(analyzer,this::analyze);
                provider.unbindAll();
                boolean liveEdges=openCvReady;
                if(liveEdges){
                    try{
                        boundCamera=provider.bindToLifecycle(this,selector,preview,analysis,nextCapture);
                    }catch(Exception unsupportedCombination){
                        provider.unbindAll();
                        boundCamera=provider.bindToLifecycle(this,selector,preview,nextCapture);
                        liveEdges=false;
                    }
                }else{
                    boundCamera=provider.bindToLifecycle(this,selector,preview,nextCapture);
                }
                capture=nextCapture;
                frames=0;
                if(overlay!=null)overlay.update(null,1,1);
                if(boundCamera!=null){
                    torchOn=torchOn && boundCamera.getCameraInfo().hasFlashUnit();
                    if(torchOn)boundCamera.getCameraControl().enableTorch(true);
                    if(flashButton!=null)flashButton.setText(torchOn?trNative("flashOn"):trNative("flashOff"));
                    boundCamera.getCameraInfo().getCameraState().observe(this,state->{
                        if(serial==cameraBindSerial && !editing && !isFinishing()
                            && state.getError()!=null){
                            mainHandler.post(()->{
                                if(serial==cameraBindSerial)handleCameraFailure("Camera reported error");
                            });
                        }
                    });
                }
                if(streamObserver!=null){
                    cameraView.getPreviewStreamState().removeObserver(streamObserver);
                }
                streamObserver=new Observer<PreviewView.StreamState>(){
                    @Override public void onChanged(PreviewView.StreamState state){
                        if(serial==cameraBindSerial && state==PreviewView.StreamState.STREAMING){
                            mainHandler.postDelayed(()->{if(serial==cameraBindSerial)clearFrozenPreview();},140);
                        }
                    }
                };
                cameraView.getPreviewStreamState().observe(this,streamObserver);
                mainHandler.postDelayed(()->{if(serial==cameraBindSerial)clearFrozenPreview();},2300);
                if(message!=null){
                    message.setText((selectedCamera==null?trNative("bestCamera"):shortCameraName(selectedCamera))+
                        (liveEdges?trNative("liveEdges"):trNative("basicMode")));
                }
            }catch(Exception error){
                if(serial==cameraBindSerial)handleCameraFailure(error.getMessage());
            }
        },ContextCompat.getMainExecutor(this));
    }
    private void analyze(@NonNull ImageProxy frame){
        try{
            if(editing || !openCvReady || capture==null)return;
            // Time-based throttling reduces CPU heat and prevents drawing stale
            // polygons when different phones run at 15, 30 or 60 FPS.
            long now=SystemClock.elapsedRealtime();
            if(now-lastAnalysisTime<190)return;
            lastAnalysisTime=now;
            ImageProxy.PlaneProxy plane=frame.getPlanes()[0];
            ByteBuffer buffer=plane.getBuffer().duplicate();
            buffer.rewind();
            int width=frame.getWidth(),height=frame.getHeight();
            int stride=plane.getRowStride(),pixelStride=plane.getPixelStride();
            if(width<60||height<60||pixelStride<1)return;
            byte[] pixels=new byte[width*height];
            // Camera Y planes may include row padding and pixel strides.
            for(int row=0;row<height;row++){
                int start=row*stride;
                if(start+(width-1)*pixelStride>=buffer.limit())return;
                if(pixelStride==1){
                    buffer.position(start);
                    buffer.get(pixels,row*width,width);
                }else{
                    for(int col=0;col<width;col++)
                        pixels[row*width+col]=buffer.get(start+col*pixelStride);
                }
            }
            Mat gray=new Mat(height,width,CvType.CV_8UC1);
            Mat rotated=new Mat();
            try{
                gray.put(0,0,pixels);
                int degrees=frame.getImageInfo().getRotationDegrees();
                if(degrees==90)Core.rotate(gray,rotated,Core.ROTATE_90_CLOCKWISE);
                else if(degrees==180)Core.rotate(gray,rotated,Core.ROTATE_180);
                else if(degrees==270)Core.rotate(gray,rotated,Core.ROTATE_90_COUNTERCLOCKWISE);
                Mat oriented=degrees==0?gray:rotated;
                Point[] points=RivoEdgeDetector.detectGray(oriented);
                final int observedW=oriented.width(),observedH=oriented.height();
                final long analysisStamp=now;
                runOnUiThread(()->{
                    if(editing||overlay==null||capture==null)return;
                    if(points!=null){
                        if(smoothCorners!=null){
                            for(int i=0;i<4;i++){
                                double oldX=smoothCorners[i].x,oldY=smoothCorners[i].y;
                                double diff=Math.hypot(points[i].x-oldX,points[i].y-oldY);
                                if(diff<.16){
                                    points[i].x=oldX*.58+points[i].x*.42;
                                    points[i].y=oldY*.58+points[i].y*.42;
                                }
                            }
                        }
                        smoothCorners=points;
                        lastValidEdgeTime=analysisStamp;
                        overlay.update(points,observedW,observedH);
                    }else if(analysisStamp-lastValidEdgeTime>650){
                        smoothCorners=null;
                        overlay.update(null,observedW,observedH);
                    }
                });
            }finally{
                rotated.release();
                gray.release();
            }
        }catch(Throwable error){
            // A native OpenCV frame can fail on individual vendor buffers.
            // Never allow an analyzer exception to close the camera Activity.
            android.util.Log.w("RivoScan","Skipping unsupported camera frame",error);
        }finally{
            frame.close();
        }
    }
    private void takePicture(){
        if(capture==null||editing||captureInProgress||savingEnhancedPage)return;
        captureInProgress=true;
        File file=new File(getCacheDir(),"rivo_original_"+System.currentTimeMillis()+".jpg");
        ImageCapture.OutputFileOptions options=new ImageCapture.OutputFileOptions.Builder(file).build();
        message.setText(trNative("capturePage"));
        capture.takePicture(options,ContextCompat.getMainExecutor(this),new ImageCapture.OnImageSavedCallback(){
            @Override public void onImageSaved(@NonNull ImageCapture.OutputFileResults result){
                captureInProgress=false;
                try{Bitmap bmp=decodeFile(file);if(basicCameraMode)saveWithoutCrop(bmp);else openEditor(bmp);}catch(Exception e){message.setText(trNative("imageError")+e.getMessage());}
                finally{file.delete();}
            }
            @Override public void onError(@NonNull androidx.camera.core.ImageCaptureException e){captureInProgress=false;file.delete();RivoSounds.play(RivoLiveScannerActivity.this,"error");message.setText(trNative("captureError")+e.getMessage());}
        });
    }
    private static int sampleSize(int width,int height){
        int sample=1;
        while(Math.max(width,height)/sample>2800 && sample<16)sample*=2;
        return sample;
    }
    private static Bitmap resizeForCrop(Bitmap input){
        if(input==null)throw new IllegalArgumentException("Cannot decode photo.");
        double scale=Math.min(1,2800.0/Math.max(input.getWidth(),input.getHeight()));
        if(scale>=1)return input;
        Bitmap resized=Bitmap.createScaledBitmap(input,
            Math.max(1,(int)Math.round(input.getWidth()*scale)),
            Math.max(1,(int)Math.round(input.getHeight()*scale)),true);
        input.recycle();
        return resized;
    }
    private Bitmap decodeFile(File file)throws Exception{
        BitmapFactory.Options bounds=new BitmapFactory.Options();
        bounds.inJustDecodeBounds=true;
        BitmapFactory.decodeFile(file.getAbsolutePath(),bounds);
        if(bounds.outWidth<=0||bounds.outHeight<=0)throw new Exception("Cannot read image dimensions.");
        BitmapFactory.Options opts=new BitmapFactory.Options();
        opts.inSampleSize=sampleSize(bounds.outWidth,bounds.outHeight);
        Bitmap bitmap=resizeForCrop(BitmapFactory.decodeFile(file.getAbsolutePath(),opts));
        ExifInterface exif=new ExifInterface(file.getAbsolutePath());
        int orientation=exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
        int deg=orientation==ExifInterface.ORIENTATION_ROTATE_90?90:
            orientation==ExifInterface.ORIENTATION_ROTATE_180?180:
            orientation==ExifInterface.ORIENTATION_ROTATE_270?270:0;
        if(deg!=0){
            Matrix matrix=new Matrix();matrix.postRotate(deg);
            Bitmap fixed=Bitmap.createBitmap(bitmap,0,0,bitmap.getWidth(),bitmap.getHeight(),matrix,true);
            if(fixed!=bitmap)bitmap.recycle();
            return fixed;
        }
        return bitmap;
    }
    private Bitmap decodeUri(Uri uri)throws Exception{
        BitmapFactory.Options bounds=new BitmapFactory.Options();
        bounds.inJustDecodeBounds=true;
        try(InputStream in=getContentResolver().openInputStream(uri)){
            if(in==null)throw new Exception("Cannot open selected image.");
            BitmapFactory.decodeStream(in,null,bounds);
        }
        if(bounds.outWidth<=0||bounds.outHeight<=0)throw new Exception("Unsupported image.");
        BitmapFactory.Options opts=new BitmapFactory.Options();
        opts.inSampleSize=sampleSize(bounds.outWidth,bounds.outHeight);
        try(InputStream in=getContentResolver().openInputStream(uri)){
            if(in==null)throw new Exception("Cannot read selected image.");
            return resizeForCrop(BitmapFactory.decodeStream(in,null,opts));
        }
    }
    private void importImage(Uri uri){
        try{
            {
                Bitmap img=decodeUri(uri);
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
                if(basicCameraMode)saveWithoutCrop(img);else openEditor(img);
            }
        }catch(Exception e){Toast.makeText(this,trNative("importError")+e.getMessage(),Toast.LENGTH_LONG).show();}
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
        layout(editor,trNative("loupe")+"\n"+(found==null?trNative("notFound"):trNative("found")),
            button(trNative("detect"),()->{editor.useAutoCorners();message.setText(trNative("found"));}),
            button(trNative("enhanceFilters"),this::prepareEnhancementPreview),
            button("✓  "+trNative(autoCleanEnabled?"autoCleanSave":"savePage"),this::autoCleanAndSave));
    }
    /**
     * One-tap confirmation from the corner editor: warp the document, normalize
     * fold illumination, improve text/stamp contrast, and only then save.
     * The optional filter preview remains available via the separate Filters button.
     */
    private void autoCleanAndSave(){
        if(current==null||current.isRecycled()||editor==null||savingEnhancedPage)return;
        final Bitmap source=current;
        final Point[] rawCorners=editor.getCorners();
        // Snapshot UI coordinates before crossing into the image-processing thread.
        final Point[] corners=new Point[rawCorners.length];
        for(int i=0;i<rawCorners.length;i++)
            corners[i]=new Point(rawCorners[i].x,rawCorners[i].y);
        savingEnhancedPage=true;
        final int serial=++enhancementSerial;
        if(message!=null)message.setText(trNative("autoCleaning"));
        analyzer.execute(()->{
            Bitmap straight=null,output=null;
            File target=null;
            try{
                straight=RivoEdgeDetector.warp(source,corners);
                output=RivoDocumentEnhancer.apply(straight,
                    autoCleanEnabled?defaultEnhancement:RivoDocumentEnhancer.ORIGINAL);
                target=writeProcessedJpeg(output);
                final File saved=target;
                // Keep an unmodified copy (in a dedicated Originals folder) so
                // faint stamps can be checked against the captured source later.
                if(saveOriginal)backupOriginalPage(source);
                mainHandler.post(()->completeProcessedPage(saved,serial));
            }catch(Throwable error){
                if(target!=null&&target.exists())target.delete();
                final String details=error.getMessage();
                mainHandler.post(()->{
                    savingEnhancedPage=false;
                    if(serial==enhancementSerial&&message!=null)
                        message.setText(trNative("saveError")+details);
                    android.util.Log.e("RivoScan","Automatic document restoration failed",error);
                });
            }finally{
                if(output!=null&&!output.isRecycled())output.recycle();
                if(straight!=null&&!straight.isRecycled())straight.recycle();
            }
        });
    }
    private File writeProcessedJpeg(Bitmap result)throws Exception{
        File target=new File(getCacheDir(),"rivoscan_clean_"+
            System.currentTimeMillis()+"_"+savedImages.size()+".jpg");
        try(FileOutputStream stream=new FileOutputStream(target)){
            if(!result.compress(Bitmap.CompressFormat.JPEG,scanJpegQuality,stream))
                throw new Exception("Cannot encode enhanced JPEG");
        }
        return target;
    }
    /** Backup is separate from the processed page; failures never block the main scan. */
    private void backupOriginalPage(Bitmap photo){
        File temp=null;
        try{
            temp=new File(getCacheDir(),"rivoscan_original_backup_"+
                System.currentTimeMillis()+".jpg");
            try(FileOutputStream stream=new FileOutputStream(temp)){
                if(!photo.compress(Bitmap.CompressFormat.JPEG,94,stream))
                    throw new Exception("Cannot encode original backup");
            }
            RivoDocumentsPlugin.saveOriginalScannedImage(this,temp,
                "RivoScan_Original_"+System.currentTimeMillis()+".jpg");
        }catch(Exception error){
            android.util.Log.w("RivoScan","Could not back up original capture",error);
        }finally{
            if(temp!=null)temp.delete();
        }
    }
    private void completeProcessedPage(File saved,int serial){
        if(isFinishing()||isDestroyed()||serial!=enhancementSerial){
            if(saved!=null)saved.delete();
            savingEnhancedPage=false;
            return;
        }
        savedImages.add(Uri.fromFile(saved).toString());
        publishPageCopy(saved);
        RivoSounds.play(this,"saved");
        if(current!=null&&!current.isRecycled())current.recycle();
        current=null;
        // Processed result already exists on disk; finish any preview bitmaps.
        releaseEnhancement();
        savingEnhancedPage=false;
        if("ID Card".equals(scanMode)&&savedImages.size()>=2)finishWithPages();
        else if(batchMode)showCamera();else finishWithPages();
    }

    /** Keep original corners and transformed photo available until user confirms ✓. */
    private void releaseEnhancement(){
        if(enhancementPreview!=null && enhancementPreview!=pendingWarp &&
             !enhancementPreview.isRecycled())enhancementPreview.recycle();
        enhancementPreview=null;
        if(pendingWarp!=null&&!pendingWarp.isRecycled())pendingWarp.recycle();
        pendingWarp=null;enhancementImage=null;enhancementHint=null;
    }
    private void reopenCrop(){
        if(savingEnhancedPage)return;
        enhancementSerial++;
        releaseEnhancement();
        if(current==null||current.isRecycled()){showCamera();return;}
        layout(editor,trNative("loupe")+"\n"+trNative("found"),
            button(trNative("detect"),()->{editor.useAutoCorners();message.setText(trNative("found"));}),
            button(trNative("enhanceFilters"),this::prepareEnhancementPreview),
            button("✓  "+trNative(autoCleanEnabled?"autoCleanSave":"savePage"),this::autoCleanAndSave));
    }
    private void prepareEnhancementPreview(){
        if(current==null||current.isRecycled()||savingEnhancedPage)return;
        final Point[] liveCorners=editor.getCorners();
        final Point[] corners=new Point[liveCorners.length];
        for(int i=0;i<liveCorners.length;i++)corners[i]=new Point(liveCorners[i].x,liveCorners[i].y);
        final Bitmap source=current;
        final int serial=++enhancementSerial;
        message.setText(trNative("enhancePreparing"));
        analyzer.execute(()->{
            Bitmap warped=null;
            try{
                warped=RivoEdgeDetector.warp(source,corners);
                final Bitmap result=warped;
                mainHandler.post(()->{
                    if(serial!=enhancementSerial||!editing||isFinishing()){
                        result.recycle();return;
                    }
                    releaseEnhancement();
                    pendingWarp=result;selectedEnhancement=autoCleanEnabled?defaultEnhancement:RivoDocumentEnhancer.ORIGINAL;
                    showEnhancementPreview();
                });
            }catch(Throwable failure){
                if(warped!=null&&!warped.isRecycled())warped.recycle();
                mainHandler.post(()->{
                    if(serial==enhancementSerial&&message!=null)
                        message.setText(trNative("adjustError")+failure.getMessage());
                });
            }
        });
    }
    private void showEnhancementPreview(){
        if(pendingWarp==null)return;
        LinearLayout body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);
        body.setBackgroundColor(Color.rgb(15,23,43));
        enhancementImage=new ImageView(this);
        enhancementImage.setScaleType(ImageView.ScaleType.FIT_CENTER);
        enhancementImage.setAdjustViewBounds(true);
        enhancementImage.setImageBitmap(pendingWarp);
        enhancementImage.setContentDescription(trNative("enhanceTitle"));
        body.addView(enhancementImage,new LinearLayout.LayoutParams(-1,0,1));
        HorizontalScrollView scroll=new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.setFillViewport(true);
        LinearLayout choices=new LinearLayout(this);choices.setGravity(Gravity.CENTER_VERTICAL);
        choices.setPadding(dp(9),dp(8),dp(9),dp(8));
        choices.setBackgroundColor(Color.rgb(25,38,70));
        String[] modes={RivoDocumentEnhancer.AUTO,RivoDocumentEnhancer.ORIGINAL,RivoDocumentEnhancer.ENHANCE,
            RivoDocumentEnhancer.MAGIC,RivoDocumentEnhancer.SHADOW,
            RivoDocumentEnhancer.WHITEBOARD,RivoDocumentEnhancer.BW};
        String[] captions={"enhanceAuto","enhanceOriginal","enhanceSmart","enhanceMagic",
            "enhanceShadow","enhanceWhiteboard","enhanceBW"};
        int sw=pendingWarp.getWidth(),sh=pendingWarp.getHeight();
        int tw=Math.max(35,(int)(dp(72)*sw/(double)Math.max(sw,sh)));
        int th=Math.max(35,(int)(dp(72)*sh/(double)Math.max(sw,sh)));
        Bitmap thumbnail=Bitmap.createScaledBitmap(pendingWarp,tw,th,true);
        for(int i=0;i<modes.length;i++){
            final String mode=modes[i],caption=trNative(captions[i]);
            LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);card.setPadding(dp(5),dp(5),dp(5),dp(5));
            card.setBackground(outlined(Color.rgb(22,42,75),9,Color.rgb(66,133,230)));
            ImageView icon=new ImageView(this);icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
            icon.setImageBitmap(thumbnail);card.addView(icon,new LinearLayout.LayoutParams(dp(66),dp(70)));
            TextView title=text(caption,10,Color.WHITE,false);
            title.setMaxLines(2);card.addView(title,new LinearLayout.LayoutParams(-1,dp(38)));
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(dp(91),dp(119));
            p.setMargins(dp(4),0,dp(4),0);choices.addView(card,p);
            card.setOnClickListener(v->{
                if(savingEnhancedPage||pendingWarp==null)return;
                RivoSounds.play(this,"tool");
                for(int j=0;j<choices.getChildCount();j++)
                    choices.getChildAt(j).setBackground(outlined(Color.rgb(22,42,75),9,Color.rgb(66,133,230)));
                card.setBackground(outlined(Color.rgb(15,68,110),9,Color.rgb(4,188,247)));
                selectedEnhancement=mode;renderEnhancementPreview(mode);
            });
        }
        scroll.addView(choices,new HorizontalScrollView.LayoutParams(-2,-1));
        body.addView(scroll,new LinearLayout.LayoutParams(-1,dp(132)));
        layout(body,trNative("enhanceHint"),
            button(trNative("enhanceBack"),this::reopenCrop),
            button(trNative("enhanceCompare"),()->{
                if(savingEnhancedPage||enhancementImage==null||pendingWarp==null)return;
                enhancementImage.setImageBitmap(enhancementImage.getDrawable()!=null && enhancementPreview!=null
                    ? (enhancementImage.getTag()!=null?enhancementPreview:pendingWarp):pendingWarp);
                enhancementImage.setTag(enhancementImage.getTag()==null?"original":null);
            }),
            button("✓  "+trNative("enhanceDone"),this::saveEnhancedPage));
        for(int i=0;i<modes.length;i++)
            if(modes[i].equals(selectedEnhancement)){
                choices.getChildAt(i).setBackground(outlined(Color.rgb(15,68,110),9,Color.rgb(4,188,247)));break;
            }
        enhancementHint=message;
        renderEnhancementPreview(selectedEnhancement);
        // Thumbnails show their REAL filter output, not the same photo copied six times.
        for(int i=0;i<modes.length;i++){
            final String mode=modes[i];
            final ImageView icon=(ImageView)((LinearLayout)choices.getChildAt(i)).getChildAt(0);
            analyzer.execute(()->{
                Bitmap miniature=null;
                try{
                    miniature=RivoDocumentEnhancer.apply(thumbnail,mode);
                    final Bitmap result=miniature;
                    mainHandler.post(()->{
                        if(!editing||pendingWarp==null||enhancementImage==null){
                            result.recycle();return;
                        }
                        icon.setImageBitmap(result);
                    });
                }catch(Throwable error){
                    if(miniature!=null&&!miniature.isRecycled())miniature.recycle();
                }
            });
        }
    }
    private void renderEnhancementPreview(String preset){
        if(savingEnhancedPage||pendingWarp==null||enhancementImage==null)return;
        final int serial=++enhancementSerial;
        final int width=pendingWarp.getWidth(),height=pendingWarp.getHeight();
        final double factor=Math.min(1,1050.0/Math.max(width,height));
        final Bitmap sample=Bitmap.createScaledBitmap(pendingWarp,
            Math.max(1,(int)(width*factor)),Math.max(1,(int)(height*factor)),true);
        enhancementImage.setTag(null);
        enhancementImage.setImageBitmap(pendingWarp);
        analyzer.execute(()->{
            Bitmap processed=null;
            try{
                processed=RivoDocumentEnhancer.apply(sample,preset);
                final Bitmap result=processed;
                mainHandler.post(()->{
                    if(serial!=enhancementSerial||enhancementImage==null||pendingWarp==null){
                        result.recycle();return;
                    }
                    Bitmap previous=enhancementPreview;
                    enhancementPreview=result;
                    enhancementImage.setImageBitmap(result);
                    if(previous!=null&&previous!=pendingWarp&&previous!=result&&!previous.isRecycled())
                        previous.recycle();
                });
            }catch(Throwable error){
                if(processed!=null&&!processed.isRecycled())processed.recycle();
                mainHandler.post(()->{
                    if(serial==enhancementSerial&&enhancementHint!=null)
                        enhancementHint.setText(trNative("enhanceFailed"));
                });
            }finally{sample.recycle();}
        });
    }
    /** Explicit ✓ applies the chosen processing at full image resolution. */
    private void saveEnhancedPage(){
        if(pendingWarp==null||savingEnhancedPage)return;
        savingEnhancedPage=true;
        final Bitmap input=pendingWarp;
        final String preset=selectedEnhancement;
        final int serial=++enhancementSerial;
        if(message!=null)message.setText(trNative("enhanceSaving"));
        analyzer.execute(()->{
            Bitmap output=null;File target=null;
            try{
                output=RivoDocumentEnhancer.apply(input,preset);
                target=writeProcessedJpeg(output);
                final File completed=target;
                if(saveOriginal&&current!=null)backupOriginalPage(current);
                mainHandler.post(()->completeProcessedPage(completed,serial));
            }catch(Throwable error){
                if(target!=null&&target.exists())target.delete();
                final String details=error.getMessage();
                mainHandler.post(()->{
                    if(serial==enhancementSerial&&message!=null)
                        message.setText(trNative("saveError")+details);
                    savingEnhancedPage=false;
                });
            }finally{
                if(output!=null&&!output.isRecycled())output.recycle();
            }
        });
    }

    private void saveWithoutCrop(Bitmap bitmap){
        try{
            File target=new File(getCacheDir(),"rivoscan_uncropped_"+
                System.currentTimeMillis()+"_"+savedImages.size()+".jpg");
            try(FileOutputStream out=new FileOutputStream(target)){
                if(!bitmap.compress(Bitmap.CompressFormat.JPEG,90,out))
                    throw new java.io.IOException("Could not encode camera photo.");
            }
            savedImages.add(Uri.fromFile(target).toString());
            publishPageCopy(target);
            RivoSounds.play(this,"saved");
            Toast.makeText(this,basicCameraMode?trNative("saveBasic"):trNative("saveUncropped"),Toast.LENGTH_SHORT).show();
            if("ID Card".equals(scanMode)&&savedImages.size()>=2)finishWithPages();
            else if(batchMode)showCamera();else finishWithPages();
        }catch(Exception error){
            Toast.makeText(this,trNative("saveError")+error.getMessage(),Toast.LENGTH_LONG).show();
        }finally{
            bitmap.recycle();
        }
    }
    private void publishPageCopy(File temporaryPage){
        // Make the scan visible to Samsung My Files immediately after Save Page.
        // The original temporary page is still used to assemble the final PDF.
        try{
            String publicName="RivoScan_Page_"+System.currentTimeMillis()
                +"_"+(savedImages.size())+".jpg";
            RivoDocumentsPlugin.saveScannedImage(this,temporaryPage,publicName);
            Toast.makeText(this,trNative("pageStored"),Toast.LENGTH_SHORT).show();
        }catch(Exception e){
            android.util.Log.e("RivoScan","Could not publish scanned page to Documents/RivoScan",e);
            Toast.makeText(this,trNative("pageNotStored"),Toast.LENGTH_LONG).show();
        }
    }

    private void finishWithPages(){
        if(savingEnhancedPage)return;
        if(savedImages.isEmpty()){setResult(Activity.RESULT_CANCELED);finish();return;}
        Intent out=new Intent();out.putStringArrayListExtra("images",savedImages);
        out.putExtra("scanMode",scanMode);
        setResult(Activity.RESULT_OK,out);finish();
    }
    @Override public void onBackPressed(){
        if(savingEnhancedPage)return;
        if(pendingWarp!=null)reopenCrop();
        else if(editing)showCamera();else finishWithPages();
    }
    @Override protected void onDestroy(){
        cameraBindSerial++;enhancementSerial++;
        mainHandler.removeCallbacksAndMessages(null);
        clearFrozenPreview();
        if(cameraProvider!=null)cameraProvider.unbindAll();
        if(analyzer!=null)analyzer.shutdownNow();
        RivoSounds.release();
        super.onDestroy();
    }

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
