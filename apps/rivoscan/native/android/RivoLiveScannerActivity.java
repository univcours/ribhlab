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
import android.graphics.RectF;
import android.animation.ValueAnimator;
import android.view.animation.AccelerateDecelerateInterpolator;
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
    private TextView nativeLanguageChip;
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
    private final AutoShutterGate autoShutterGate=new AutoShutterGate();
    private Observer<PreviewView.StreamState> streamObserver;
    private final Handler mainHandler=new Handler(Looper.getMainLooper());

    private static final class CameraChoice {
        final String id,label;
        final int facing;
        final double score;
        CameraChoice(String id,String label,int facing,double score){this.id=id;this.label=label;this.facing=facing;this.score=score;}
    }
    /**
     * Auto capture only after a large, stable, plausible page is detected on
     * multiple frames. Never captures a guide/fallback quadrilateral. Gate is
     * distinct from the user's four-corner review and never saves anything.
     */
    private static final class AutoShutterGate {
        private Point[] previous;
        private int stableFrames=0;
        private long stableSince=0,lastFrame=0;
        private boolean triggered=false;
        void reset(){previous=null;stableFrames=0;stableSince=0;lastFrame=0;triggered=false;}
        private boolean geometry(Point[] p){
            if(p==null||p.length!=4)return false;
            double area=0,minEdge=Double.POSITIVE_INFINITY;
            for(int i=0;i<4;i++){
                Point a=p[i],b=p[(i+1)%4];
                if(a==null||b==null||!Double.isFinite(a.x)||!Double.isFinite(a.y)||
                   a.x<.006||a.y<.006||a.x>.994||a.y>.994)return false;
                area+=a.x*b.y-b.x*a.y;
                minEdge=Math.min(minEdge,Math.hypot(b.x-a.x,b.y-a.y));
            }
            return Math.abs(area)*.5>=.14&&minEdge>=.14;
        }
        boolean observe(Point[] corners,long timestamp,boolean readable){
            if(triggered)return false;
            if(!readable||!geometry(corners)){
                previous=null;stableFrames=0;stableSince=0;return false;
            }
            if(previous==null||timestamp-lastFrame>600){
                stableSince=timestamp;stableFrames=1;
            }else{
                double maxMove=0;
                for(int i=0;i<4;i++)
                    maxMove=Math.max(maxMove,Math.hypot(corners[i].x-previous[i].x,
                        corners[i].y-previous[i].y));
                if(maxMove>.025){stableSince=timestamp;stableFrames=1;}
                else stableFrames++;
            }
            lastFrame=timestamp;
            previous=new Point[4];
            for(int i=0;i<4;i++)previous[i]=new Point(corners[i].x,corners[i].y);
            if(stableFrames>=6 && timestamp-stableSince>=1000){
                triggered=true;return true;
            }
            return false;
        }
    }
    /** Cheap luminance/edge contrast guard; full quality review remains after shot. */
    private static boolean readableLuma(byte[] p,int w,int h){
        if(p==null||w<120||h<120)return false;
        long sum=0,contrast=0;int count=0;
        final int step=12;
        for(int y=step;y<h-step;y+=step){
            for(int x=step;x<w-step;x+=step){
                int index=y*w+x,v=p[index]&255;
                sum+=v;
                contrast+=Math.abs(v-(p[index+step]&255))+
                    Math.abs(v-(p[index+step*w]&255));
                count++;
            }
        }
        if(count==0)return false;
        double mean=sum/(double)count,localContrast=contrast/(double)(2*count);
        return mean>=45&&mean<=243&&localContrast>=2.3;
    }

    private ExecutorService analyzer;
    private RivoCropEditor editor;
    private Bitmap current;
    private Bitmap awaitingCaptureApproval; // never save a page before the user confirms ✓
    private Bitmap pendingWarp,enhancementPreview;
    private ImageView enhancementImage;
    private FilterLaserView enhancementLaser;
    private TextView enhancementHint;
    private android.widget.ProgressBar enhancementProgress;
    private Button enhancementSaveButton;
    private RivoCaptureQuality.Result captureQuality;
    private int captureQualitySerial=0;
    private int edgeDetectionSerial=0;
    private static final String AI_FLATTEN="uvdoc";
    private String selectedEnhancement=RivoDocumentEnhancer.ENHANCE;
    private int enhancementSerial=0;
    private boolean savingEnhancedPage=false;
    private boolean captureInProgress=false;
    private Bitmap handwrittenSignature;
    private float signatureCenterX=.73f,signatureCenterY=.88f,signatureWidthFraction=.32f;
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
        getSharedPreferences("RivoScanPreferences",MODE_PRIVATE).edit().putString("language",nativeLanguage).apply();
        try{openCvReady=OpenCVLoader.initLocal();}
        catch(Throwable failure){openCvReady=false;}
        if(!openCvReady && !basicCameraMode){
            Toast.makeText(this,trNative("basicMode"),Toast.LENGTH_LONG).show();
        }
        analyzer=Executors.newSingleThreadExecutor();
        root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(6,55,61));
        content=new FrameLayout(this);
        root.addView(content,new FrameLayout.LayoutParams(-1,-1));
        // RivoScan brand: deep blue camera chrome, white system icons.
        getWindow().setStatusBarColor(Color.rgb(7,61,65));
        getWindow().setNavigationBarColor(Color.rgb(7,61,65));
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
        label.setBackground(outlined(Color.rgb(8,72,77),11,Color.rgb(42,215,194)));
        return label;
    }
    private LinearLayout.LayoutParams weighted(){
        return new LinearLayout.LayoutParams(0,-1,1);
    }
    private Button button(String title,Runnable onTap){
        Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setTextSize(13);
        b.setTextColor(Color.WHITE);
        b.setBackground(outlined(Color.rgb(7,86,90),12,Color.rgb(101,217,202)));
        b.setOnClickListener(v->{RivoSounds.play(this,"tool");onTap.run();});return b;
    }
    /** Tiny language and mute controls stay above the native camera and editors. */
    private LinearLayout scannerQuickControls(){
        LinearLayout row=new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL|Gravity.RIGHT);
        row.setPadding(dp(9),dp(2),dp(9),dp(2));
        row.setBackgroundColor(Color.rgb(7,61,65));
        row.addView(new Space(this),new LinearLayout.LayoutParams(0,1,1));
        TextView locale=touchLabel("🌐 "+nativeLanguage.toUpperCase(java.util.Locale.ROOT)+" ▾",
            11,Color.WHITE,this::chooseNativeLanguage);
        locale.setContentDescription("Language / اللغة / Langue");
        nativeLanguageChip=locale;
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(77),dp(31));
        lp.setMargins(0,0,dp(7),0);row.addView(locale,lp);
        TextView audio=text(RivoSounds.enabled(this)?"🔊":"🔇",16,Color.WHITE,true);
        audio.setBackground(outlined(Color.rgb(8,72,77),10,Color.rgb(42,215,194)));
        audio.setContentDescription(RivoSounds.enabled(this)?"Mute all sounds":"Enable sounds");
        audio.setOnClickListener(v->{
            boolean enabled=!RivoSounds.enabled(this);
            RivoSounds.setEnabled(this,enabled);audio.setText(enabled?"🔊":"🔇");
            audio.setContentDescription(enabled?"Mute all sounds":"Enable sounds");
        });
        row.addView(audio,new LinearLayout.LayoutParams(dp(39),dp(31)));
        return row;
    }
    private void chooseNativeLanguage(){
        final String[] codes={"en","fr","ar","es","de","pt","it"};
        final String[] names={"English","Français","العربية","Español","Deutsch","Português","Italiano"};
        int chosen=0;for(int i=0;i<codes.length;i++)if(codes[i].equals(nativeLanguage)){chosen=i;break;}
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog).setTitle("🌐 Language")
            .setSingleChoiceItems(names,chosen,(dialog,which)->{
                nativeLanguage=codes[which];
                getSharedPreferences("RivoScanPreferences",MODE_PRIVATE)
                    .edit().putString("language",nativeLanguage).apply();
                dialog.dismiss();
                if(nativeLanguageChip!=null)
                    nativeLanguageChip.setText("🌐 "+nativeLanguage.toUpperCase(java.util.Locale.ROOT)+" ▾");
                if(pendingWarp!=null){
                    enhancementSerial++;
                    if(enhancementLaser!=null)enhancementLaser.stop();
                    showEnhancementPreview();
                }else if(!editing)showCamera();
                else if(message!=null)message.setText(trNative("found"));
            }).setNegativeButton(android.R.string.cancel,null).show();
    }

    private void layout(View body,String hint,Button... buttons){
        // A dedicated document-corners editor with a visible safe header and bottom actions.
        content.removeAllViews();
        LinearLayout shell=new LinearLayout(this);shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(6,48,53));
        content.addView(shell,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(14),0,dp(14),0);
        // Show a full, readable Retake label in the editor header, never an
        // ambiguous tiny icon or truncated translated action.
        TextView back=touchLabel(editing?trNative("retake"):"✕",editing?15:27,Color.WHITE,()->showCamera());
        back.setContentDescription(editing?trNative("retake"):trNative("close"));
        back.setBackground(outlined(Color.rgb(4,114,125),13,Color.rgb(91,236,219)));
        header.addView(back,new LinearLayout.LayoutParams(dp(editing?94:44),dp(48)));
        TextView title=text(trNative("title"),17,Color.WHITE,true);
        title.setGravity(Gravity.CENTER);
        header.addView(title,new LinearLayout.LayoutParams(0,dp(55),1));
        TextView close=touchLabel("✕",25,Color.WHITE,this::finishWithPages);
        close.setContentDescription(trNative("close"));
        close.setBackground(outlined(Color.rgb(160,48,73),13,Color.rgb(255,149,166)));
        header.addView(close,new LinearLayout.LayoutParams(dp(48),dp(48)));
        shell.addView(scannerQuickControls(),new LinearLayout.LayoutParams(-1,dp(37)));
        shell.addView(header);
        shell.addView(body,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout bottom=new LinearLayout(this);bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(14),dp(10),dp(14),dp(13));
        bottom.setBackgroundColor(Color.rgb(7,54,56));
        message=text(hint,12,Color.rgb(219,253,247),false);
        message.setMaxLines(2);
        message.setGravity(Gravity.CENTER_VERTICAL);
        bottom.addView(message,new LinearLayout.LayoutParams(-1,dp(editing?52:40)));
        LinearLayout actions=new LinearLayout(this);actions.setGravity(Gravity.CENTER);
        for(int i=0;i<buttons.length;i++){
            Button action=buttons[i];
            if(i==buttons.length-1){action.setBackground(outlined(Color.rgb(6,157,150),13,Color.rgb(42,215,194)));action.setTextColor(Color.WHITE);}
            action.setAllCaps(false);
            action.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP,12);
            action.setSingleLine(false);
            action.setMaxLines(2);
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(46),1);
            p.setMargins(dp(3),0,dp(3),0);actions.addView(action,p);
        }
        bottom.addView(actions,new LinearLayout.LayoutParams(-1,dp(50)));
        shell.addView(bottom,new LinearLayout.LayoutParams(-1,-2));
    }

    private String localizedCapture(String key){
        String code=nativeLanguage==null?"en":nativeLanguage.toLowerCase(java.util.Locale.ROOT);
        String[] languages={"en","ar","fr","es","de","pt","it"};
        String[] review={"Review","مراجعة","Aperçu","Revisar","Prüfen","Rever","Rivedi"};
        String[] analyzing={"Analyzing the document…","جاري تحليل جودة الوثيقة…","Analyse du document…","Analizando documento…","Dokument wird analysiert…","Analisando documento…","Analisi del documento…"};
        String[] processing={"Correcting perspective, shadows and ink…","جاري تصحيح المنظور والظلال وتوضيح الحبر…","Correction de perspective, ombres et encre…","Corrigiendo perspectiva, sombras y tinta…","Perspektive, Schatten und Schrift werden optimiert…","Corrigindo perspectiva, sombras e tinta…","Correzione prospettiva, ombre e inchiostro…"};
        String[] save={"Save","حفظ","Enregistrer","Guardar","Speichern","Guardar","Salva"};
        String[] check={"Compare and choose a filter, then save or retake.","قارن واختار المعالجة ثم احفظ أو عاود التصوير.","Comparez, choisissez un filtre puis enregistrez ou reprenez.","Compara, elige filtro y guarda o repite.","Vergleichen, Filter wählen, speichern oder neu aufnehmen.","Compare, escolha filtro, guarde ou repita.","Confronta, scegli filtro, salva o riprendi."};
        String[] qualityWarning={"Image may need retaking","قد تحتاج الصورة لإعادة التصوير","La photo doit peut-être être reprise","Puede necesitar repetir la foto","Foto möglicherweise neu aufnehmen","Poderá ter de repetir a fotografia","Potrebbe essere necessario ripetere la foto"};
        String[] confirm={"Confirm","تأكيد","Confirmer","Confirmar","Bestätigen","Confirmar","Conferma"};
        String[] approval={"Check the photo. ✓ Continue to default filter, or Retake.","راجع الصورة. ✓ باش تشوف الفلتر الافتراضي، أو Retake للإعادة.","Vérifiez la photo. ✓ pour les filtres, ou reprendre.","Revisa la foto. ✓ para filtros o repetir.","Foto prüfen. ✓ für Filter oder erneut aufnehmen.","Verifique a foto. ✓ para filtros ou repetir.","Controlla foto. ✓ filtri oppure riprendi."};
        String[] done={"Done","تم","Terminé","Listo","Fertig","Concluído","Fine"};
        String[] uvdoc={"UVDoc AI · review result","UVDoc AI · شوف النتيجة","UVDoc IA · voir le résultat",
            "UVDoc IA · revisar resultado","UVDoc KI · Ergebnis prüfen","UVDoc IA · rever resultado",
            "UVDoc IA · verifica il risultato"};
        int index=0;for(int i=0;i<languages.length;i++)if(languages[i].equals(code)){index=i;break;}
        switch(key){
            case "review":return review[index];
            case "confirm":return confirm[index];
            case "approval":return approval[index];
            case "done":return done[index];
            case "analyzing":return analyzing[index];
            case "processing":return processing[index];
            case "save":return save[index];
            case "qualityWarning":return qualityWarning[index];
            case "uvdoc":return uvdoc[index];
            default:return check[index];
        }
    }

    private void showCamera(){
        if(savingEnhancedPage)return;
        edgeDetectionSerial++;
        captureQualitySerial++;
        captureQuality=null;
        clearSessionSignature();
        enhancementSerial++;
        if(!savingEnhancedPage)releaseEnhancement();
        if(awaitingCaptureApproval!=null&&!awaitingCaptureApproval.isRecycled())
            awaitingCaptureApproval.recycle();
        awaitingCaptureApproval=null;
        editing=false;
        autoShutterGate.reset();
        cameraView=new PreviewView(this);
        cameraView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        cameraView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        content.removeAllViews();
        content.setBackgroundColor(Color.rgb(6,48,53));
        LinearLayout frame=new LinearLayout(this);frame.setOrientation(LinearLayout.VERTICAL);
        frame.setBackgroundColor(Color.rgb(6,48,53));
        content.addView(frame,new FrameLayout.LayoutParams(-1,-1));

        // The native status bar (time, signal, battery) remains outside the scanner.
        frame.addView(scannerQuickControls(),new LinearLayout.LayoutParams(-1,dp(37)));
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(7),0,dp(7),0);
        top.setBackgroundColor(Color.rgb(7,61,65));
        TextView close=touchLabel("✕",28,Color.WHITE,this::finishWithPages);
        close.setContentDescription(trNative("close"));
        close.setBackground(outlined(Color.rgb(162,43,72),13,Color.rgb(255,150,169)));
        top.addView(close,new LinearLayout.LayoutParams(dp(54),dp(56)));
        top.addView(new Space(this),new LinearLayout.LayoutParams(0,1,1));
        cameraPickerButton=touchLabel(selectedCamera==null?trNative("bestCamera")+" ▾":shortCameraName(selectedCamera)+" ▾",12,Color.WHITE,this::showCameraPicker);
        cameraPickerButton.setBackground(outlined(Color.rgb(12,82,85),11,Color.rgb(101,217,202)));
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
        cameraFrame.setBackgroundColor(Color.rgb(6,51,55));
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
        countLabel.setOnClickListener(v->openScanPages());
        FrameLayout.LayoutParams countParam=new FrameLayout.LayoutParams(dp(91),dp(33),Gravity.BOTTOM|Gravity.LEFT);
        countParam.bottomMargin=dp(14);countParam.leftMargin=dp(14);
        cameraFrame.addView(countLabel,countParam);
        frame.addView(cameraFrame,new LinearLayout.LayoutParams(-1,0,1));

        LinearLayout footer=new LinearLayout(this);footer.setOrientation(LinearLayout.VERTICAL);
        footer.setBackgroundColor(Color.rgb(7,61,65));footer.setPadding(dp(10),dp(3),dp(10),dp(8));
        LinearLayout switches=new LinearLayout(this);
        switches.setGravity(Gravity.CENTER);
        switches.setBackground(rounded(Color.rgb(12,82,85),23));
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
            TextView item=touchLabel(mode.equals("Document")?trNative("document"):mode.equals("ID Card")?trNative("id"):trNative("board"),13,scanMode.equals(mode)?Color.rgb(42,215,194):Color.rgb(190,193,202),()->{
                // Never reinterpret already captured pages as another document type.
                // In particular, a partial ID card must not become a normal scan
                // or silently finish after the first side.
                if(!savedImages.isEmpty()&&!scanMode.equals(mode)){
                    Toast.makeText(this,trNative("finish")+" · "+savedImages.size()+
                        " — "+trNative("manageScanPages"),Toast.LENGTH_LONG).show();
                    return;
                }
                scanMode=mode;
                if("ID Card".equals(scanMode))setBatch(true);
                for(int i=0;i<modes.getChildCount();i++){
                    TextView tab=(TextView)modes.getChildAt(i);
                    boolean selected=modesList[i].equals(scanMode);
                    tab.setTextColor(selected?Color.rgb(42,215,194):Color.rgb(190,193,202));
                    tab.setTypeface(android.graphics.Typeface.DEFAULT,
                        selected?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL);
                }
                if(message!=null)message.setText((scanMode.equals("Document")?trNative("document"):scanMode.equals("ID Card")?trNative("id"):trNative("board"))+trNative("modeReady"));
            });
            if(scanMode.equals(mode))item.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
            modes.addView(item,weighted());
        }
        if(!basicCameraMode)footer.addView(modes,new LinearLayout.LayoutParams(-1,dp(47)));

        // Scanning is automatic: camera toolbar only offers secondary actions.
        // No manual Take Photo button (but native capture remains callable by gate).
        LinearLayout actions=new LinearLayout(this);
        actions.setGravity(Gravity.CENTER);
        TextView photos=touchLabel("＋  "+trNative("photos"),12,Color.WHITE,
            ()->gallery.launch("image/*"));
        photos.setGravity(Gravity.CENTER);
        TextView browse=touchLabel("▤  "+trNative("files"),12,Color.WHITE,
            ()->documentPicker.launch(new String[]{"image/*"}));
        browse.setGravity(Gravity.CENTER);
        TextView guidance=touchLabel("◎  AUTO",12,Color.rgb(55,235,205),()->{
            if(message!=null)message.setText("ar".equals(nativeLanguage)?
                "ثبت الوثيقة كاملة داخل الإطار حتى يتم التصوير تلقائياً.":
                "Hold the full document steady in the outline to auto-capture.");
        });
        guidance.setGravity(Gravity.CENTER);
        for(TextView option:new TextView[]{photos,guidance,browse}){
            LinearLayout.LayoutParams slot=new LinearLayout.LayoutParams(0,dp(42),1);
            slot.setMargins(dp(3),0,dp(3),0);
            option.setBackground(outlined(Color.rgb(11,86,86),11,Color.rgb(42,177,163)));
            actions.addView(option,slot);
        }
        footer.addView(actions,new LinearLayout.LayoutParams(-1,dp(49)));
        TextView done=touchLabel(savedImages.size()>0?"✓  "+trNative("finish")+" · "+savedImages.size():trNative("saveScan"),14,
                savedImages.size()>0?Color.rgb(42,215,194):Color.rgb(134,143,149),this::finishWithPages);
        done.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        if(savedImages.isEmpty()){
            footer.addView(done,new LinearLayout.LayoutParams(-1,dp(35)));
        }else{
            LinearLayout pageActions=new LinearLayout(this);
            TextView manage=touchLabel(trNative("manageScanPages")+" · "+savedImages.size(),
                13,Color.WHITE,this::openScanPages);
            pageActions.addView(manage,new LinearLayout.LayoutParams(0,dp(45),1));
            pageActions.addView(done,new LinearLayout.LayoutParams(0,dp(45),1));
            footer.addView(pageActions,new LinearLayout.LayoutParams(-1,dp(49)));
        }
        frame.addView(footer,new LinearLayout.LayoutParams(-1,-2));
        startCamera();
    }
    private void setBatch(boolean next){
        // Both sides of an ID must be captured in one session. Single mode
        // would otherwise return immediately after the first side.
        if("ID Card".equals(scanMode)&&!next){
            Toast.makeText(this,trNative("idBack"),Toast.LENGTH_SHORT).show();
            return;
        }
        // Existing pages remain intact when changing Single/Batch.
        batchMode=next;updateBatchButtons();
        if(message!=null)message.setText(next?trNative("batchReady"):trNative("singleReady"));
    }
    private void updateBatchButtons(){
        if(singleButton==null||batchButton==null)return;
        singleButton.setBackground(outlined(batchMode?Color.rgb(12,82,85):Color.rgb(6,115,120),
            20,batchMode?Color.rgb(110,210,200):Color.rgb(42,215,194)));
        batchButton.setBackground(outlined(batchMode?Color.rgb(6,115,120):Color.rgb(12,82,85),
            20,batchMode?Color.rgb(42,215,194):Color.rgb(110,210,200)));
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
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog).setTitle(trNative("helpTitle"))
            .setMessage(trNative("helpText"))
            .setPositiveButton("OK",null).show();
    }
    private void showMore(){
        String[] options={trNative("chooseCamera"),trNative("importPhoto"),trNative("chooseFile"),
            trNative("finishScan"),"Sounds: "+(RivoSounds.enabled(this)?"On":"Off"),trNative("scannerHelp")};
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
            .setTitle("ar".equals(nativeLanguage)?"خيارات الكاميرا":
              "fr".equals(nativeLanguage)?"Options caméra":"Camera options")
            .setItems(options,(d,which)->{
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
            ink.setStyle(Paint.Style.FILL);ink.setColor(Color.rgb(6,157,150));
            canvas.drawCircle(cx,cy,r-dp(4),ink);
            ink.setColor(Color.rgb(6,48,53));canvas.drawCircle(cx,cy,r-dp(9),ink);
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
            new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog).setTitle(trNative("noRearTitle"))
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
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
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
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
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
        autoShutterGate.reset();
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
                final boolean qualityOk=readableLuma(pixels,width,height);
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
                        if(autoShutterGate.observe(points,analysisStamp,qualityOk)
                           && !captureInProgress && !savingEnhancedPage){
                            if(message!=null)message.setText("ar".equals(nativeLanguage)?
                                "تم تحديد الوثيقة. جاري التصوير التلقائي…":
                                "Document stable — capturing automatically…");
                            RivoSounds.play(this,"capture");
                            takePicture();
                        }
                    }else if(analysisStamp-lastValidEdgeTime>650){
                        smoothCorners=null;
                        autoShutterGate.reset();
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
                if(isFinishing()||isDestroyed()){file.delete();return;}
                try{Bitmap bmp=decodeFile(file);showCaptureReview(bmp);}catch(Exception e){message.setText(trNative("imageError")+e.getMessage());}
                finally{file.delete();}
            }
            @Override public void onError(@NonNull androidx.camera.core.ImageCaptureException e){captureInProgress=false;autoShutterGate.reset();file.delete();RivoSounds.play(RivoLiveScannerActivity.this,"error");message.setText(trNative("captureError")+e.getMessage());}
        });
    }
    private static int sampleSize(int width,int height){
        int sample=1;
        while(Math.max(width,height)/sample>3600 && sample<16)sample*=2;
        return sample;
    }
    private static Bitmap resizeForCrop(Bitmap input){
        if(input==null)throw new IllegalArgumentException("Cannot decode photo.");
        double scale=Math.min(1,3600.0/Math.max(input.getWidth(),input.getHeight()));
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
                showCaptureReview(img);
            }
        }catch(Exception e){Toast.makeText(this,trNative("importError")+e.getMessage(),Toast.LENGTH_LONG).show();}
    }
    /** Captured image stays visible. The user must press ✓ or Retake before
     * cropping, filters or a PDF can be finalized. This is NOT auto-save. */
    /** Crop preview immediately follows Capture; user reviews corners BEFORE filters. */
    private void showCaptureReview(Bitmap bitmap){
        if(bitmap==null||bitmap.isRecycled())return;
        editing=true;awaitingCaptureApproval=bitmap;
        // Keep the existing accessible ✓ approval contract across both modes.
        Button confirm=button("✓",this::approveCapturedPhoto);
        confirm.setContentDescription(localizedCapture("confirm"));
        if(!openCvReady){
            ImageView image=new ImageView(this);
            image.setScaleType(ImageView.ScaleType.FIT_CENTER);
            image.setImageBitmap(bitmap);
            layout(image,localizedCapture("approval"),
                button(trNative("retake"),this::showCamera),confirm);
            return;
        }
        editor=new RivoCropEditor(this);
        editor.setDocument(bitmap,null);
        layout(editor,cropHint(false),
            button(trNative("retake"),this::showCamera),
            confirm);
        requestCropEdges(bitmap,editor,false);
    }
    private String cropHint(boolean detected){
        if("ar".equals(nativeLanguage))return detected
            ?"لقينا الحواف. تقدر تحرك الزوايا الأربع باش تحدد المحتوى بدقة ثم ✓."
            :"ما لقيناش حواف مؤكدة. حرّك الزوايا الأربع يدوياً.";
        if("fr".equals(nativeLanguage))return detected
            ?"Contours détectés. Ajustez les quatre coins, puis ✓."
            :"Contours introuvables. Ajustez les quatre coins manuellement.";
        return detected?"Document edges found. Adjust all four corners, then ✓.":
            "No reliable edges. Drag the four corners manually.";
    }
    private void requestCropEdges(Bitmap photo,RivoCropEditor target,boolean forced){
        if(!openCvReady||photo==null||photo.isRecycled()||target==null)return;
        final int serial=++edgeDetectionSerial;
        final int cornerRevision=target.getCornerRevision();
        if(message!=null)message.setText("ar".equals(nativeLanguage)?"جاري تحديد الحواف…":"Detecting edges…");
        analyzer.execute(()->{
            Point[] points=null;
            try{points=RivoEdgeDetector.detect(photo);}
            catch(Throwable error){android.util.Log.w("RivoScan","Edge detection failed",error);}
            final Point[] result=points;
            mainHandler.post(()->{
                if(serial!=edgeDetectionSerial||!editing||editor!=target||photo.isRecycled()||isFinishing())return;
                // The user may drag a corner while OpenCV is analysing; never
                // replace those corrections with a late auto-detection result.
                if(target.getCornerRevision()!=cornerRevision){
                    if(message!=null)message.setText("ar".equals(nativeLanguage)?
                        "الزوايا تضبطات يدوياً. اضغط ✓ للمتابعة.":"Manual corners retained. Tap ✓ to continue.");
                    return;
                }
                if(result==null){
                    // Do not reset a user's valid crop to fallback on a failed retry.
                    if(message!=null)message.setText(cropHint(false));
                    return;
                }
                if(target.updateDetectedCorners(result,forced)&&message!=null)message.setText(cropHint(true));
            });
        });
    }
    private void approveCapturedPhoto(){
        if(awaitingCaptureApproval==null||savingEnhancedPage)return;
        Bitmap photo=awaitingCaptureApproval;
        awaitingCaptureApproval=null;
        // Existing corner editor retains user's manual coordinates; no second editor.
        if(openCvReady&&editor!=null&&editor.getDocument()==photo){
            current=photo;
            prepareEnhancementPreview();
        }else openEditor(photo);
    }
    private void openEditor(Bitmap bitmap){
        if(!openCvReady){
            // Never silently save a document when enhancement is unavailable:
            // the user must see the photo and decide whether to keep or retake.
            new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
                .setTitle("RivoScan")
                .setMessage("Document processing unavailable on this device. Review the original photo before saving.")
                .setNegativeButton(trNative("retake"),(dialog,which)->{
                    if(bitmap!=null&&!bitmap.isRecycled())bitmap.recycle();
                    showCamera();
                })
                .setPositiveButton(trNative("savePage"),(dialog,which)->saveWithoutCrop(bitmap))
                .setCancelable(false).show();
            return;
        }
        editing=true;current=bitmap;
        captureQuality=null;
        final int qualityCheck=++captureQualitySerial;
        // The same interactive four-point editor handles both camera images and gallery images.
        Point[] found=RivoEdgeDetector.detect(bitmap);
        editor=new RivoCropEditor(this);editor.setDocument(bitmap,found);
        layout(editor,trNative("loupe")+"\n"+localizedCapture("analyzing"),
            button(trNative("retake"),this::showCamera),
            button(trNative("signBeforeSave"),this::showSignaturePad),
            button("→  "+localizedCapture("review"),this::prepareEnhancementPreview));
        analyzer.execute(()->{
            RivoCaptureQuality.Result quality=null;
            try{quality=RivoCaptureQuality.analyze(bitmap,found);}
            catch(Throwable error){android.util.Log.w("RivoScan","Capture quality check unavailable",error);}
            final RivoCaptureQuality.Result qualityResult=quality;
            mainHandler.post(()->{
                if(qualityCheck!=captureQualitySerial||current!=bitmap||!editing||isFinishing())return;
                captureQuality=qualityResult;
                if(message!=null)message.setText(qualityResult!=null?
                    qualityResult.summary(nativeLanguage):localizedCapture("review"));
            });
        });
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
                straight=RivoEdgeDetector.warp(source,corners,highQuality?3300:2150);
                output=RivoDocumentEnhancer.apply(straight,
                    autoCleanEnabled?defaultEnhancement:RivoDocumentEnhancer.ORIGINAL);
                composeSignature(output);
                target=writeProcessedJpeg(output);
                final File saved=target;
                // Keep an unmodified copy (in a dedicated Originals folder) so
                // faint stamps can be checked against the captured source later.
                // Keep original in memory until the PDF is finalized; no public JPG backup.
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
        // Internal JPEG page remains in app cache only until PDF assembly.
        // User-visible exports are PDFs, never auto-published JPG duplicates.
        RivoSounds.play(this,"saved");
        if(current!=null&&!current.isRecycled())current.recycle();
        current=null;
        // Processed result already exists on disk; finish any preview bitmaps.
        releaseEnhancement();
        clearSessionSignature();
        savingEnhancedPage=false;
        if("ID Card".equals(scanMode)&&savedImages.size()>=2)finishWithPages();
        else showPostSaveChoices();
    }

    /** The page is saved; now offer to scan one more or finalize the PDF. */
    private void showPostSaveChoices(){
        if(savingEnhancedPage||savedImages.isEmpty()||isFinishing())return;
        String title="ar".equals(nativeLanguage)?"تحفظات الصفحة":
            "fr".equals(nativeLanguage)?"Page enregistrée":"Page saved";
        String prompt="ar".equals(nativeLanguage)?"زيد صفحة أخرى أو حفظ PDF":
            "fr".equals(nativeLanguage)?"Ajouter une page ou enregistrer le PDF":
            "Add another page or save the PDF";
        String add="ar".equals(nativeLanguage)?"+ زيد صفحة":
            "fr".equals(nativeLanguage)?"+ Ajouter une page":"+ Add Page";
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
            .setTitle(title).setMessage(prompt)
            .setNegativeButton(add,(dialog,which)->{setBatch(true);showCamera();})
            .setPositiveButton("✓ "+localizedCapture("save"),
                (dialog,which)->finishWithPages())
            .setCancelable(false).show();
    }

    private void clearSessionSignature(){
        if(handwrittenSignature!=null && !handwrittenSignature.isRecycled())
            handwrittenSignature.recycle();
        handwrittenSignature=null;
        signatureCenterX=.73f;signatureCenterY=.88f;signatureWidthFraction=.32f;
    }
    /**
     * The user draws their OWN signature on a transparent canvas; nothing is
     * forged or inferred. Signing modifies only the new exported scan, never
     * the original photo. The preview allows clearing it before export.
     */
    private void showSignaturePad(){
        if(savingEnhancedPage || current==null || current.isRecycled())return;
        final SignatureDrawView pad=new SignatureDrawView(this);
        LinearLayout view=new LinearLayout(this);view.setOrientation(LinearLayout.VERTICAL);
        view.setPadding(dp(12),dp(8),dp(12),dp(8));
        TextView hint=text(trNative("signPlacementHint"),12,Color.DKGRAY,false);
        view.addView(hint,new LinearLayout.LayoutParams(-1,dp(51)));
        pad.setBackground(outlined(Color.WHITE,9,Color.rgb(42,215,194)));
        view.addView(pad,new LinearLayout.LayoutParams(-1,dp(215)));
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
            .setTitle(trNative("signBeforeSave"))
            .setView(view)
            .setNegativeButton(trNative("enhanceBack"),(dialog,which)->{})
            .setNeutralButton(trNative("signatureClear"),(dialog,which)->{
                clearSessionSignature();
                if(message!=null)message.setText(trNative("signatureCleared"));
            })
            .setPositiveButton("✓  "+trNative("enhanceDone"),(dialog,which)->{
                if(!pad.hasInk()){if(message!=null)message.setText(trNative("signatureEmpty"));return;}
                Bitmap next=pad.toTransparentBitmap();
                clearSessionSignature();
                handwrittenSignature=next;
                if(message!=null)message.setText(trNative("signatureReady"));
                mainHandler.post(this::showSignaturePlacement);
            }).show();
    }
    /** Drag directly on the live document preview; resize with the slider. */
    private void showSignaturePlacement(){
        if(savingEnhancedPage||handwrittenSignature==null||handwrittenSignature.isRecycled()||
            current==null||current.isRecycled())return;
        LinearLayout panel=new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(12),dp(10),dp(12),dp(10));
        TextView title=text(trNative("signDragHint"),13,Color.DKGRAY,false);
        panel.addView(title,new LinearLayout.LayoutParams(-1,dp(46)));
        SignaturePlacementPreview preview=new SignaturePlacementPreview(this,current,handwrittenSignature);
        panel.addView(preview,new LinearLayout.LayoutParams(-1,dp(310)));
        TextView sizeLabel=text(trNative("signSize"),13,Color.DKGRAY,false);
        panel.addView(sizeLabel,new LinearLayout.LayoutParams(-1,dp(30)));
        android.widget.SeekBar scale=new android.widget.SeekBar(this);
        scale.setMax(70);scale.setProgress(Math.round(signatureWidthFraction*100));
        scale.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener(){
            @Override public void onProgressChanged(android.widget.SeekBar bar,int progress,boolean user){
                signatureWidthFraction=Math.max(.12f,Math.min(.70f,progress/100f));
                preview.invalidate();
            }
            @Override public void onStartTrackingTouch(android.widget.SeekBar bar){}
            @Override public void onStopTrackingTouch(android.widget.SeekBar bar){}
        });
        panel.addView(scale,new LinearLayout.LayoutParams(-1,dp(42)));
        new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
            .setTitle(trNative("signPlacementTitle"))
            .setView(panel)
            .setNegativeButton(trNative("enhanceBack"),(dialog,which)->{})
            .setPositiveButton("✓  "+trNative("enhanceDone"),(dialog,which)->{
                if(message!=null)message.setText(trNative("signatureReady"));
            }).show();
    }
    private android.graphics.RectF signatureBounds(float width,float height,float aspect){
        final float w=Math.min(width*.7f,Math.max(width*.12f,width*signatureWidthFraction));
        final float h=Math.min(height*.3f,w*Math.max(.02f,aspect));
        final float x=Math.max(0,Math.min(width-w,signatureCenterX*width-w/2));
        final float y=Math.max(0,Math.min(height-h,signatureCenterY*height-h/2));
        return new android.graphics.RectF(x,y,x+w,y+h);
    }
    private final class SignaturePlacementPreview extends View{
        private final Bitmap doc,signature;
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        private final android.graphics.RectF frame=new android.graphics.RectF();
        SignaturePlacementPreview(android.content.Context ctx,Bitmap document,Bitmap userSignature){
            super(ctx);doc=document;signature=userSignature;
            setBackgroundColor(Color.rgb(227,234,244));
        }
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);
            final float scale=Math.min(getWidth()/(float)doc.getWidth(),getHeight()/(float)doc.getHeight());
            final float w=doc.getWidth()*scale,h=doc.getHeight()*scale;
            frame.set((getWidth()-w)/2,(getHeight()-h)/2,(getWidth()+w)/2,(getHeight()+h)/2);
            canvas.drawBitmap(doc,null,frame,paint);
            final android.graphics.RectF sig=signatureBounds(
                w,h,signature.getHeight()/(float)signature.getWidth());
            sig.offset(frame.left,frame.top);
            canvas.drawBitmap(signature,null,sig,paint);
        }
        @Override public boolean onTouchEvent(MotionEvent event){
            if(event.getActionMasked()==MotionEvent.ACTION_DOWN||
               event.getActionMasked()==MotionEvent.ACTION_MOVE||
               event.getActionMasked()==MotionEvent.ACTION_UP){
                if(frame.width()<=0||frame.height()<=0)return false;
                signatureCenterX=Math.max(0,Math.min(1,(event.getX()-frame.left)/frame.width()));
                signatureCenterY=Math.max(0,Math.min(1,(event.getY()-frame.top)/frame.height()));
                invalidate();
                if(event.getActionMasked()==MotionEvent.ACTION_UP)performClick();
                return true;
            }
            return true;
        }
        @Override public boolean performClick(){super.performClick();return true;}
    }
    private void composeSignature(Bitmap cleaned){
        if(handwrittenSignature==null||handwrittenSignature.isRecycled())return;
        if(!cleaned.isMutable())throw new IllegalStateException("Cannot sign an immutable image");
        final android.graphics.RectF placement=signatureBounds(cleaned.getWidth(),cleaned.getHeight(),
            handwrittenSignature.getHeight()/(float)handwrittenSignature.getWidth());
        Canvas canvas=new Canvas(cleaned);
        Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        canvas.drawBitmap(handwrittenSignature,null,placement,paint);
    }
    private static final class SignatureDrawView extends View{
        private final Paint ink=new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path line=new Path();
        private boolean hasInk=false;
        SignatureDrawView(android.content.Context ctx){
            super(ctx);
            ink.setColor(Color.rgb(7,110,112));ink.setStrokeWidth(5f);
            ink.setStyle(Paint.Style.STROKE);
            ink.setStrokeJoin(Paint.Join.ROUND);ink.setStrokeCap(Paint.Cap.ROUND);
            setLayerType(View.LAYER_TYPE_SOFTWARE,null);
        }
        boolean hasInk(){return hasInk;}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);
            canvas.drawPath(line,ink);
        }
        @Override public boolean onTouchEvent(MotionEvent event){
            switch(event.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    line.moveTo(event.getX(),event.getY());invalidate();return true;
                case MotionEvent.ACTION_MOVE:
                    line.lineTo(event.getX(),event.getY());hasInk=true;invalidate();return true;
                case MotionEvent.ACTION_UP:
                    line.lineTo(event.getX(),event.getY());hasInk=true;invalidate();
                    performClick();return true;
                default:return true;
            }
        }
        @Override public boolean performClick(){super.performClick();return true;}
        Bitmap toTransparentBitmap(){
            Bitmap out=Bitmap.createBitmap(Math.max(1,getWidth()),Math.max(1,getHeight()),
                Bitmap.Config.ARGB_8888);
            Canvas canvas=new Canvas(out);
            canvas.drawPath(line,ink);
            return out;
        }
    }

    /** Keep original corners and transformed photo available until user confirms ✓. */

    /**
     * Real before/after preview animation. The filtered Bitmap lives in the
     * ImageView underneath; this view temporarily draws the ORIGINAL only
     * below the moving turquoise scan line. Nothing is written to the saved
     * page and no approximation is substituted for the real filter output.
     */
    private static final class FilterLaserView extends View {
        private final Paint sourcePaint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        private final Paint glowPaint=new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF documentRect=new RectF();
        private Bitmap original;
        private float progress=0f;
        private ValueAnimator sweep;
        FilterLaserView(Activity activity){super(activity);setWillNotDraw(false);setClickable(false);}
        void stop(){
            if(sweep!=null){ValueAnimator old=sweep;sweep=null;old.cancel();}
            original=null;setVisibility(View.GONE);invalidate();
        }
        void reveal(Bitmap source){
            stop();
            if(source==null||source.isRecycled())return;
            // Honor Android's "Remove animations" accessibility setting.
            if(Build.VERSION.SDK_INT>=26&&!ValueAnimator.areAnimatorsEnabled())return;
            original=source;progress=0f;setVisibility(View.VISIBLE);invalidate();
            final ValueAnimator next=ValueAnimator.ofFloat(0f,1f);
            sweep=next;next.setDuration(960);
            next.setInterpolator(new AccelerateDecelerateInterpolator());
            next.addUpdateListener(anim->{
                if(sweep!=next)return;
                progress=(Float)anim.getAnimatedValue();invalidate();
            });
            next.addListener(new android.animation.AnimatorListenerAdapter(){
                @Override public void onAnimationEnd(android.animation.Animator animator){
                    if(sweep==next)stop();
                }
            });
            next.start();
        }
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);
            if(original==null||original.isRecycled()||getWidth()<1||getHeight()<1)return;
            float scale=Math.min(getWidth()/(float)original.getWidth(),
                getHeight()/(float)original.getHeight());
            float imageW=original.getWidth()*scale,imageH=original.getHeight()*scale;
            float left=(getWidth()-imageW)/2f,top=(getHeight()-imageH)/2f;
            documentRect.set(left,top,left+imageW,top+imageH);
            final float lineY=top+imageH*progress;
            canvas.save();
            canvas.clipRect(left,lineY,left+imageW,top+imageH);
            canvas.drawBitmap(original,null,documentRect,sourcePaint);
            canvas.restore();
            float density=getResources().getDisplayMetrics().density;
            glowPaint.setColor(Color.argb(35,28,246,219));
            glowPaint.setStrokeWidth(20*density);
            canvas.drawLine(left,lineY,left+imageW,lineY,glowPaint);
            glowPaint.setColor(Color.argb(98,17,238,215));
            glowPaint.setStrokeWidth(8*density);
            canvas.drawLine(left,lineY,left+imageW,lineY,glowPaint);
            glowPaint.setColor(Color.rgb(196,255,245));
            glowPaint.setStrokeWidth(2.5f*density);
            canvas.drawLine(left,lineY,left+imageW,lineY,glowPaint);
        }
    }
    private void releaseEnhancement(){
        if(enhancementLaser!=null){enhancementLaser.stop();enhancementLaser=null;}
        if(enhancementPreview!=null && enhancementPreview!=pendingWarp &&
             !enhancementPreview.isRecycled())enhancementPreview.recycle();
        enhancementPreview=null;
        if(pendingWarp!=null&&!pendingWarp.isRecycled())pendingWarp.recycle();
        pendingWarp=null;enhancementImage=null;enhancementHint=null;enhancementProgress=null;enhancementSaveButton=null;
    }
    private void reopenCrop(){
        if(savingEnhancedPage)return;
        enhancementSerial++;
        releaseEnhancement();
        if(current==null||current.isRecycled()){showCamera();return;}
        layout(editor,captureQuality!=null?captureQuality.summary(nativeLanguage):trNative("found"),
            button(trNative("retake"),this::showCamera),
            button(trNative("signBeforeSave"),this::showSignaturePad),
            button("→  "+localizedCapture("review"),this::prepareEnhancementPreview));
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
                warped=RivoEdgeDetector.warp(source,corners,highQuality?3300:2150);
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
        body.setBackgroundColor(Color.rgb(5,43,48));
        enhancementImage=new ImageView(this);
        enhancementImage.setScaleType(ImageView.ScaleType.FIT_CENTER);
        enhancementImage.setAdjustViewBounds(true);
        enhancementImage.setImageBitmap(pendingWarp);
        enhancementImage.setContentDescription(trNative("enhanceTitle"));
        FrameLayout picture=new FrameLayout(this);
        picture.addView(enhancementImage,new FrameLayout.LayoutParams(-1,-1));
        enhancementLaser=new FilterLaserView(this);
        enhancementLaser.setVisibility(View.GONE);
        picture.addView(enhancementLaser,new FrameLayout.LayoutParams(-1,-1));
        body.addView(picture,new LinearLayout.LayoutParams(-1,0,1));
        enhancementProgress=new android.widget.ProgressBar(this,null,
            android.R.attr.progressBarStyleHorizontal);
        enhancementProgress.setIndeterminate(true);
        enhancementProgress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.rgb(20,184,166)));
        enhancementProgress.setVisibility(View.VISIBLE);
        body.addView(enhancementProgress,new LinearLayout.LayoutParams(-1,dp(5)));
        HorizontalScrollView scroll=new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.setFillViewport(true);
        LinearLayout choices=new LinearLayout(this);choices.setGravity(Gravity.CENTER_VERTICAL);
        choices.setPadding(dp(9),dp(8),dp(9),dp(8));
        choices.setBackgroundColor(Color.rgb(8,72,76));
        String[] modes={RivoDocumentEnhancer.PRO_SCAN,AI_FLATTEN,RivoDocumentEnhancer.CREASE,RivoDocumentEnhancer.AUTO,RivoDocumentEnhancer.ORIGINAL,RivoDocumentEnhancer.ENHANCE,
            RivoDocumentEnhancer.MAGIC,RivoDocumentEnhancer.SHADOW,
            RivoDocumentEnhancer.WHITEBOARD,RivoDocumentEnhancer.BW};
        String[] captions={"enhancePro","uvdoc","enhanceCrease","enhanceAuto","enhanceOriginal","enhanceSmart","enhanceMagic",
            "enhanceShadow","enhanceWhiteboard","enhanceBW"};
        int sw=pendingWarp.getWidth(),sh=pendingWarp.getHeight();
        int tw=Math.max(35,(int)(dp(72)*sw/(double)Math.max(sw,sh)));
        int th=Math.max(35,(int)(dp(72)*sh/(double)Math.max(sw,sh)));
        Bitmap thumbnail=Bitmap.createScaledBitmap(pendingWarp,tw,th,true);
        for(int i=0;i<modes.length;i++){
            final String mode=modes[i],caption=AI_FLATTEN.equals(mode)?localizedCapture("uvdoc"):trNative(captions[i]);
            LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);card.setPadding(dp(5),dp(5),dp(5),dp(5));
            card.setBackground(outlined(Color.rgb(8,70,75),9,Color.rgb(24,173,160)));
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
                    choices.getChildAt(j).setBackground(outlined(Color.rgb(8,70,75),9,Color.rgb(24,173,160)));
                card.setBackground(outlined(Color.rgb(8,120,119),9,Color.rgb(42,215,194)));
                selectedEnhancement=mode;renderEnhancementPreview(mode);
            });
        }
        scroll.addView(choices,new HorizontalScrollView.LayoutParams(-2,-1));
        body.addView(scroll,new LinearLayout.LayoutParams(-1,dp(132)));
        enhancementSaveButton=button("✓  "+localizedCapture("done"),this::saveEnhancedPage);
        enhancementSaveButton.setEnabled(false); // Enable only when the result is visible.
        layout(body,captureQuality!=null?captureQuality.summary(nativeLanguage):trNative("enhanceHint"),
            button(trNative("retake"),this::showCamera),
            button(trNative("enhanceBack"),this::reopenCrop),
            button(trNative("enhanceCompare"),()->{
                if(savingEnhancedPage||enhancementImage==null||pendingWarp==null)return;
                boolean showingOriginal="original".equals(enhancementImage.getTag());
                if(showingOriginal){
                    enhancementImage.setImageBitmap(enhancementPreview!=null?enhancementPreview:pendingWarp);
                    enhancementImage.setTag(null);
                }else{
                    enhancementImage.setImageBitmap(pendingWarp);
                    enhancementImage.setTag("original");
                }
            }),
            enhancementSaveButton);
        for(int i=0;i<modes.length;i++)
            if(modes[i].equals(selectedEnhancement)){
                choices.getChildAt(i).setBackground(outlined(Color.rgb(8,120,119),9,Color.rgb(42,215,194)));break;
            }
        enhancementHint=message;
        renderEnhancementPreview(selectedEnhancement);
        // Thumbnails show their REAL filter output, not the same photo copied six times.
        for(int i=0;i<modes.length;i++){
            final String mode=modes[i];
            // UVDoc model must not be run on a thumbnail and must not pretend
            // to show an enhanced preview before the user selects this mode.
            if(AI_FLATTEN.equals(mode))continue;
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
    /** All scan modes share one native preview/save engine. */
    private Bitmap applyScanFilter(Bitmap image,String preset) throws Exception {
        if(AI_FLATTEN.equals(preset))
            return RivoUVDocPlugin.unwarpBitmap(this,image);
        return RivoDocumentEnhancer.apply(image,preset);
    }
    private void renderEnhancementPreview(String preset){
        if(savingEnhancedPage||pendingWarp==null||enhancementImage==null)return;
        if(enhancementLaser!=null)enhancementLaser.stop();
        final int serial=++enhancementSerial;
        final int width=pendingWarp.getWidth(),height=pendingWarp.getHeight();
        final double factor=Math.min(1,1050.0/Math.max(width,height));
        final Bitmap sample=Bitmap.createScaledBitmap(pendingWarp,
            Math.max(1,(int)(width*factor)),Math.max(1,(int)(height*factor)),true);
        enhancementImage.setTag(null);
        enhancementImage.setImageBitmap(pendingWarp);
        if(enhancementSaveButton!=null)enhancementSaveButton.setEnabled(false);
        if(enhancementProgress!=null)enhancementProgress.setVisibility(View.VISIBLE);
        if(enhancementHint!=null)enhancementHint.setText(localizedCapture("processing"));
        analyzer.execute(()->{
            Bitmap processed=null;
            try{
                processed=applyScanFilter(sample,preset);
                final Bitmap result=processed;
                mainHandler.post(()->{
                    if(serial!=enhancementSerial||enhancementImage==null||pendingWarp==null){
                        result.recycle();return;
                    }
                    Bitmap previous=enhancementPreview;
                    enhancementPreview=result;
                    enhancementImage.setImageBitmap(result);
                    if(enhancementLaser!=null&&
                        !RivoDocumentEnhancer.ORIGINAL.equals(preset))
                        {RivoSounds.play(this,"scan");enhancementLaser.reveal(pendingWarp);}
                    if(enhancementSaveButton!=null)enhancementSaveButton.setEnabled(true);
                    if(enhancementProgress!=null)enhancementProgress.setVisibility(View.GONE);
                    if(enhancementHint!=null)enhancementHint.setText(
                        captureQuality!=null?captureQuality.summary(nativeLanguage):
                        localizedCapture("check"));
                    if(previous!=null&&previous!=pendingWarp&&previous!=result&&!previous.isRecycled())
                        previous.recycle();
                });
            }catch(Throwable error){
                if(processed!=null&&!processed.isRecycled())processed.recycle();
                mainHandler.post(()->{
                    if(serial==enhancementSerial&&enhancementHint!=null)
                        enhancementHint.setText(trNative("enhanceFailed")+" · "+String.valueOf(error.getMessage()));
                    // Failed enhancement never silently saves the unprocessed page;
                    // user can choose another filter or retake.
                    if(serial==enhancementSerial&&enhancementSaveButton!=null)
                        enhancementSaveButton.setEnabled(false);
                    if(serial==enhancementSerial&&enhancementProgress!=null)
                        enhancementProgress.setVisibility(View.GONE);
                });
            }finally{if(sample!=pendingWarp&&!sample.isRecycled())sample.recycle();}
        });
    }
    /** User explicitly accepts the visual result; low-quality photos get a retake prompt. */
    private void saveEnhancedPage(){
        if(pendingWarp==null||savingEnhancedPage||enhancementPreview==null)return;
        // Done saves immediately, without a secondary quality-warning confirmation.
        if(captureQuality!=null&&captureQuality.retakeSuggested)
            android.util.Log.i("RivoScan","Saving scan after user accepted quality warning.");
        commitEnhancedPage();
    }
    /** Explicit ✓ applies the selected filter at full source resolution. */
    private void commitEnhancedPage(){
        if(pendingWarp==null||savingEnhancedPage||enhancementPreview==null)return;
        savingEnhancedPage=true;
        final Bitmap input=pendingWarp;
        final String preset=selectedEnhancement;
        final int serial=++enhancementSerial;
        if(message!=null)message.setText(trNative("enhanceSaving"));
        analyzer.execute(()->{
            Bitmap output=null;File target=null;
            try{
                output=applyScanFilter(input,preset);
                composeSignature(output);
                target=writeProcessedJpeg(output);
                final File completed=target;
                // Original is held only in this scan session; do not publish a JPG.
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
            // No duplicate JPG publication: JS combines the temp page into PDF.
            RivoSounds.play(this,"saved");
            if("ID Card".equals(scanMode)&&savedImages.size()>=2)finishWithPages();
            else showPostSaveChoices();
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

    private void openScanPages(){
        if(savingEnhancedPage||captureInProgress||savedImages.isEmpty())return;
        RivoScanPagesManager.show(this,savedImages,nativeLanguage,updated->{
            savedImages.clear();
            savedImages.addAll(updated);
            showCamera();
        });
    }
    private void finishWithPages(){
        if(savingEnhancedPage)return;
        if(savedImages.isEmpty()){setResult(Activity.RESULT_CANCELED);finish();return;}
        // Explicitly warn on a one-sided ID, but never delete or alter it.
        if("ID Card".equals(scanMode)&&savedImages.size()==1){
            new androidx.appcompat.app.AlertDialog.Builder(this,R.style.RivoTurquoiseDialog)
                .setTitle(trNative("id"))
                .setMessage(trNative("idBack"))
                .setNegativeButton(trNative("retake"),(dialog,which)->showCamera())
                .setPositiveButton(trNative("finish"),(dialog,which)->deliverSavedPages())
                .show();
            return;
        }
        deliverSavedPages();
    }
    private void deliverSavedPages(){
        Intent out=new Intent();out.putStringArrayListExtra("images",savedImages);
        out.putExtra("scanMode",scanMode);
        out.putExtra("language",nativeLanguage);
        setResult(Activity.RESULT_OK,out);finish();
    }
    @Override public void onBackPressed(){
        if(savingEnhancedPage)return;
        if(pendingWarp!=null)reopenCrop();
        else if(editing)showCamera();else finishWithPages();
    }
    @Override protected void onDestroy(){
        cameraBindSerial++;enhancementSerial++;edgeDetectionSerial++;
        if(enhancementLaser!=null)enhancementLaser.stop();
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
        private float dp(float n){return n*getResources().getDisplayMetrics().density;}
        void update(Point[] corners,int w,int h){points=corners;imageWidth=Math.max(1,w);imageHeight=Math.max(1,h);invalidate();}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);
            if(getWidth()<1||getHeight()<1)return;
            boolean found=points!=null;
            Point[] drawn=found?points:RivoEdgeDetector.fallback();
            // A guide must remain VISIBLE even before the first analyzed frame
            // (imageWidth/imageHeight are then 1x1) or when no page is found.
            // Only a real detected contour uses CameraX FILL_CENTER mapping.
            float scale=found?Math.max(getWidth()/(float)imageWidth,getHeight()/(float)imageHeight):1f;
            float offsetX=found?(getWidth()-imageWidth*scale)/2f:0f;
            float offsetY=found?(getHeight()-imageHeight*scale)/2f:0f;
            final float contentWidth=found?imageWidth*scale:getWidth();
            final float contentHeight=found?imageHeight*scale:getHeight();
            Path path=new Path();
            float[] sx=new float[4],sy=new float[4];
            for(int i=0;i<4;i++){
                sx[i]=offsetX+screenX(drawn[i])*contentWidth;
                sy[i]=offsetY+(float)drawn[i].y*contentHeight;
                if(i==0)path.moveTo(sx[i],sy[i]);else path.lineTo(sx[i],sy[i]);
            }
            path.close();
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(found?Color.argb(30,24,196,171):Color.argb(10,235,184,73));
            canvas.drawPath(path,paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(dp(found?3:2));
            paint.setColor(found?Color.rgb(40,238,204):Color.rgb(255,207,99));
            paint.setPathEffect(found?null:new android.graphics.DashPathEffect(new float[]{dp(10),dp(6)},0));
            canvas.drawPath(path,paint);
            paint.setPathEffect(null);
            if(found){paint.setStyle(Paint.Style.FILL);
                for(int i=0;i<4;i++)canvas.drawCircle(sx[i],sy[i],dp(5),paint);}

        }
    }
}
