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
import android.net.Uri;
import android.os.Bundle;
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

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        openCvReady=OpenCVLoader.initLocal();
        if(!openCvReady){Toast.makeText(this,"Document detection engine unavailable",Toast.LENGTH_LONG).show();finish();return;}
        analyzer=Executors.newSingleThreadExecutor();
        root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(15,23,41));
        content=new FrameLayout(this);
        root.addView(content,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        showCamera();
        String imageUri=getIntent().getStringExtra("imageUri");
        if(imageUri!=null){importImage(Uri.parse(imageUri));}
        else if(getIntent().getBooleanExtra("gallery",false))gallery.launch("image/*");
    }

    private Button button(String title,Runnable onTap){
        Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setTextSize(13);
        b.setOnClickListener(v->onTap.run());return b;
    }
    private void layout(View body,String hint,Button... buttons){
        content.removeAllViews();
        content.addView(body,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout bottom=new LinearLayout(this);bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(14,9,14,18);bottom.setBackgroundColor(Color.argb(215,14,22,39));
        message=new TextView(this);message.setText(hint);message.setTextColor(Color.WHITE);
        message.setTextSize(14);message.setGravity(Gravity.CENTER);bottom.addView(message);
        LinearLayout controls=new LinearLayout(this);
        for(Button button:buttons){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-2,1);p.setMargins(3,7,3,0);controls.addView(button,p);}
        bottom.addView(controls);
        FrameLayout.LayoutParams params=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);
        content.addView(bottom,params);
    }
    private void showCamera(){
        editing=false;
        cameraView=new PreviewView(this);
        cameraView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        FrameLayout cameraFrame=new FrameLayout(this);
        cameraFrame.addView(cameraView,new FrameLayout.LayoutParams(-1,-1));
        overlay=new LiveEdges(this);cameraFrame.addView(overlay,new FrameLayout.LayoutParams(-1,-1));
        layout(cameraFrame,"Green outline follows detected document · "+savedImages.size()+" page(s)",
            button("Close",()->finishWithPages()),
            button("Gallery",()->gallery.launch("image/*")),
            button("Capture",this::takePicture),
            button("Done",this::finishWithPages));
        startCamera();
    }
    private void startCamera(){
        ListenableFuture<ProcessCameraProvider> providerFuture=ProcessCameraProvider.getInstance(this);
        providerFuture.addListener(()->{
            if(editing||isFinishing())return;
            try{
                ProcessCameraProvider provider=providerFuture.get();provider.unbindAll();
                Preview preview=new Preview.Builder().build();preview.setSurfaceProvider(cameraView.getSurfaceProvider());
                capture=new ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build();
                ImageAnalysis analysis=new ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
                analysis.setAnalyzer(analyzer,this::analyze);
                provider.bindToLifecycle(this,CameraSelector.DEFAULT_BACK_CAMERA,preview,analysis,capture);
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
            runOnUiThread(()->{if(!editing&&overlay!=null)overlay.update(corners);});
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
            showCamera();
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
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        LiveEdges(Activity owner){super(owner);setWillNotDraw(false);}
        void update(Point[] corners){points=corners;invalidate();}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);if(points==null)return;
            Path path=new Path();path.moveTo((float)points[0].x*getWidth(),(float)points[0].y*getHeight());
            for(int i=1;i<4;i++)path.lineTo((float)points[i].x*getWidth(),(float)points[i].y*getHeight());path.close();
            paint.setStyle(Paint.Style.FILL);paint.setColor(Color.argb(40,18,255,163));canvas.drawPath(path,paint);
            paint.setColor(Color.rgb(30,255,158));paint.setStrokeWidth(6);paint.setStyle(Paint.Style.STROKE);canvas.drawPath(path,paint);
        }
    }
}
