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
    private TextView batchButton,singleButton,flashButton,qualityButton,countLabel;
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
        openCvReady=OpenCVLoader.initLocal();
        if(!openCvReady){Toast.makeText(this,"Document detection engine unavailable",Toast.LENGTH_LONG).show();finish();return;}
        analyzer=Executors.newSingleThreadExecutor();
        root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(15,23,41));
        content=new FrameLayout(this);
        root.addView(content,new FrameLayout.LayoutParams(-1,-1));
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
        b.setTextColor(Color.WHITE);b.setBackground(rounded(Color.rgb(41,47,56),12));
        b.setOnClickListener(v->onTap.run());return b;
    }
    private void layout(View body,String hint,Button... buttons){
        // A dedicated document-corners editor with a visible safe header and bottom actions.
        content.removeAllViews();
        LinearLayout shell=new LinearLayout(this);shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.BLACK);
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
        bottom.setBackgroundColor(Color.rgb(15,17,21));
        message=text(hint,12,Color.rgb(184,197,206),false);
        bottom.addView(message,new LinearLayout.LayoutParams(-1,dp(45)));
        LinearLayout actions=new LinearLayout(this);actions.setGravity(Gravity.CENTER);
        for(int i=0;i<buttons.length;i++){
            Button action=buttons[i];
            if(i==buttons.length-1){action.setBackground(rounded(Color.rgb(9,191,173),13));action.setTextColor(Color.BLACK);}
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
        content.setBackgroundColor(Color.BLACK);
        LinearLayout frame=new LinearLayout(this);frame.setOrientation(LinearLayout.VERTICAL);
        frame.setBackgroundColor(Color.BLACK);
        content.addView(frame,new FrameLayout.LayoutParams(-1,-1));

        // The native status bar (time, signal, battery) remains outside the scanner.
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(7),0,dp(7),0);
        top.setBackgroundColor(Color.rgb(0,0,0));
        TextView close=touchLabel("✕",28,Color.WHITE,this::finishWithPages);
        top.addView(close,new LinearLayout.LayoutParams(dp(54),dp(56)));
        top.addView(new Space(this),new LinearLayout.LayoutParams(0,1,1));
        flashButton=touchLabel(torchOn?"ϟ On":"ϟ Off",13,Color.WHITE,this::toggleTorch);
        top.addView(flashButton,new LinearLayout.LayoutParams(dp(64),dp(56)));
        qualityButton=touchLabel(highQuality?"HD":"SD",15,Color.WHITE,this::toggleQuality);
        qualityButton.setTypeface(android.graphics.Typeface.DEFAULT,android.graphics.Typeface.BOLD);
        top.addView(qualityButton,new LinearLayout.LayoutParams(dp(43),dp(56)));
        TextView help=touchLabel("?",22,Color.WHITE,this::showHelp);
        top.addView(help,new LinearLayout.LayoutParams(dp(43),dp(56)));
        TextView more=touchLabel("⋮",27,Color.WHITE,this::showMore);
        top.addView(more,new LinearLayout.LayoutParams(dp(35),dp(56)));
        frame.addView(top,new LinearLayout.LayoutParams(-1,dp(56)));

        FrameLayout cameraFrame=new FrameLayout(this);
        cameraFrame.setBackgroundColor(Color.rgb(18,21,24));
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
        footer.setBackgroundColor(Color.BLACK);footer.setPadding(dp(10),dp(3),dp(10),dp(8));
        LinearLayout switches=new LinearLayout(this);
        switches.setGravity(Gravity.CENTER);
        switches.setBackground(rounded(Color.rgb(30,31,35),23));
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
            TextView item=touchLabel(mode,13,scanMode.equals(mode)?Color.rgb(0,226,195):Color.rgb(190,193,202),()->{
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
                savedImages.size()>0?Color.rgb(0,224,192):Color.rgb(134,143,149),this::finishWithPages);
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
        singleButton.setBackground(rounded(batchMode?Color.TRANSPARENT:Color.rgb(87,91,100),22));
        batchButton.setBackground(rounded(batchMode?Color.rgb(87,91,100):Color.TRANSPARENT,22));
    }
    private void toggleTorch(){
        torchOn=!torchOn;
        if(boundCamera==null){torchOn=false;return;}
        try{boundCamera.getCameraControl().enableTorch(torchOn);}
        catch(Exception e){torchOn=false;Toast.makeText(this,"Flash unavailable",Toast.LENGTH_SHORT).show();}
        if(flashButton!=null)flashButton.setText(torchOn?"ϟ On":"ϟ Off");
    }
    private void toggleQuality(){
        highQuality=!highQuality;
        if(qualityButton!=null)qualityButton.setText(highQuality?"HD":"SD");
        startCamera();
    }
    private void showHelp(){
        new androidx.appcompat.app.AlertDialog.Builder(this).setTitle("RivoScan Smart Scanner")
            .setMessage("Point the camera at a page. The green outline follows detected borders. Tap the shutter, drag the four corners, and save. Use Batch for a multipage PDF. HD prioritizes image quality.")
            .setPositiveButton("OK",null).show();
    }
    private void showMore(){
        String[] options={"Import photo","Choose from Files","Finish scanning","Scanner help"};
        new androidx.appcompat.app.AlertDialog.Builder(this).setItems(options,(d,which)->{
            if(which==0)gallery.launch("image/*");
            else if(which==1)documentPicker.launch(new String[]{"image/*"});
            else if(which==2)finishWithPages();
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
            ink.setStyle(Paint.Style.FILL);ink.setColor(Color.rgb(0,213,185));
            canvas.drawCircle(cx,cy,r-dp(4),ink);
            ink.setColor(Color.BLACK);canvas.drawCircle(cx,cy,r-dp(9),ink);
            ink.setColor(Color.WHITE);canvas.drawCircle(cx,cy,r-dp(16),ink);
        }
        private float dp(float n){return n*getResources().getDisplayMetrics().density;}
    }
    private void startCamera(){
        ListenableFuture<ProcessCameraProvider> providerFuture=ProcessCameraProvider.getInstance(this);
        providerFuture.addListener(()->{
            if(editing||isFinishing())return;
            try{
                ProcessCameraProvider provider=providerFuture.get();provider.unbindAll();
                Preview preview=new Preview.Builder().build();preview.setSurfaceProvider(cameraView.getSurfaceProvider());
                capture=new ImageCapture.Builder().setCaptureMode(highQuality?ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY:ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build();
                ImageAnalysis analysis=new ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
                analysis.setAnalyzer(analyzer,this::analyze);
                boundCamera=provider.bindToLifecycle(this,CameraSelector.DEFAULT_BACK_CAMERA,preview,analysis,capture);
                if(torchOn)boundCamera.getCameraControl().enableTorch(true);
            }catch(Exception e){message.setText("Camera unavailable: "+e.getMessage());}
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
        editing=true;current=bitmap;
        // The same interactive four-point editor handles both camera images and gallery images.
        Point[] found=RivoEdgeDetector.detect(bitmap);
        editor=new RivoCropEditor(this);editor.setDocument(bitmap,found);
        layout(editor,found==null?"Document not found automatically · drag the 4 dots":"Drag the 4 green corners to adjust the detected paper",
            button("Retake",this::showCamera),
            button("Detect",()->{editor.useAutoCorners();message.setText("Adjust the four green dots if needed.");}),
            button("Save page",this::saveCroppedPage));
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
    @Override protected void onDestroy(){super.onDestroy();if(analyzer!=null)analyzer.shutdownNow();}

    /** Live camera overlay; normalized corners from analyzed frame. */
    private static final class LiveEdges extends View{
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
            Path path=new Path();path.moveTo(offsetX+(float)points[0].x*imageWidth*scale,offsetY+(float)points[0].y*imageHeight*scale);
            for(int i=1;i<4;i++)path.lineTo(offsetX+(float)points[i].x*imageWidth*scale,offsetY+(float)points[i].y*imageHeight*scale);path.close();
            paint.setStyle(Paint.Style.FILL);paint.setColor(Color.argb(40,18,255,163));canvas.drawPath(path,paint);
            paint.setColor(Color.rgb(30,255,158));paint.setStrokeWidth(6);paint.setStyle(Paint.Style.STROKE);canvas.drawPath(path,paint);
        }
    }
}
