package com.ribhlab.ribhmeasure;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.Locale;

public final class CameraMeasureActivity extends BaseActivity {
    private static final int CAPTURE=11, CAMERA_PERMISSION=45;
    private PhotoMeasureView photo;
    private TextView step,result;
    private EditText known;
    private File photoFile;
    private double measuredCm=Double.NaN;
    @Override protected void onCreate(Bundle b){super.onCreate(b);
        File cache=getExternalCacheDir();if(cache==null)cache=getCacheDir();photoFile=new File(cache,"ribhmeasure_camera.jpg");render();
        if(photoFile.exists())loadImage();
    }
    private void render(){
        LinearLayout root=Ui.vertical(this);root.setBackgroundColor(Ui.BG);
        LinearLayout body=Ui.column(this,R.string.camera_measure);
        Ui.desc(body,this,R.string.photo_guide);
        Button take=Ui.button(this,R.string.take_photo,true);take.setOnClickListener(v->capture());body.addView(take,Ui.lp(this,50));Ui.gap(this,body,10);
        photo=new PhotoMeasureView(this);photo.setListener(n->refresh());body.addView(photo,new LinearLayout.LayoutParams(-1,Ui.dp(this,350)));Ui.gap(this,body,10);
        step=Ui.text(this,"",16,Ui.GOLD,true);body.addView(step);Ui.gap(this,body,12);
        known=new EditText(this);known.setText("100");known.setSingleLine(true);known.setInputType(android.text.InputType.TYPE_CLASS_NUMBER|android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        known.setTextColor(Ui.TEXT);known.setHintTextColor(Ui.SUB);known.setHint(R.string.reference_length);known.setTextSize(18);
        known.setBackground(Ui.shape(Ui.CARD2,Ui.dp(this,12)));Ui.pad(known,12);
        body.addView(Ui.text(this,getString(R.string.reference_length),13,Ui.SUB,false));body.addView(known,Ui.lp(this,54));Ui.gap(this,body,15);
        known.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int f){}public void onTextChanged(CharSequence s,int a,int b,int c){refresh();}public void afterTextChanged(android.text.Editable e){}});
        result=Ui.text(this,"",24,Ui.TEAL,true);body.addView(result);Ui.gap(this,body,12);
        Button reset=Ui.button(this,R.string.reset_points,false);reset.setOnClickListener(v->photo.reset());body.addView(reset,Ui.lp(this,50));Ui.gap(this,body,12);
        Button save=Ui.button(this,R.string.save,true);save.setOnClickListener(v->{
            if(!Double.isFinite(measuredCm)){Ui.toast(this,R.string.valid_reference);return;}
            Measurements.add(this,"Camera size",measuredCm,"cm","Reference: "+known.getText()+" cm (same depth required)");
        });body.addView(save,Ui.lp(this,52));Ui.gap(this,body,17);
        Ui.desc(body,this,R.string.photo_warning);
        root.addView(Ui.scroll(this,body),new LinearLayout.LayoutParams(-1,0,1));setContentView(root);refresh();
    }
    private void capture(){
        if(checkSelfPermission(android.Manifest.permission.CAMERA)!=android.content.pm.PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{android.Manifest.permission.CAMERA},CAMERA_PERMISSION);return;
        }
        Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if(intent.resolveActivity(getPackageManager())==null){Ui.toast(this,R.string.camera_unavailable);return;}
        try{
            Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",photoFile);
            intent.putExtra(MediaStore.EXTRA_OUTPUT,uri);
            intent.setClipData(android.content.ClipData.newRawUri("camera output",uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(intent,CAPTURE);
        }catch(Exception e){android.util.Log.e("MeasurePhoto","Camera launch",e);new android.app.AlertDialog.Builder(this).setMessage(getString(R.string.camera_unavailable)+" ("+e.getClass().getSimpleName()+")").setPositiveButton(android.R.string.ok,null).show();}
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request!=CAMERA_PERMISSION)return;if(grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED){capture();}else{new android.app.AlertDialog.Builder(this).setMessage(R.string.hm_camera_permission).setPositiveButton(R.string.settings,(dialog,which)->startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())))).setNegativeButton(android.R.string.cancel,null).show();}}
    @Override protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);
        if(req==CAPTURE&&res==RESULT_OK)loadImage();
    }
    private void loadImage(){
        try{
            BitmapFactory.Options meta=new BitmapFactory.Options();meta.inJustDecodeBounds=true;BitmapFactory.decodeFile(photoFile.getPath(),meta);
            int longest=Math.max(meta.outWidth,meta.outHeight);int sample=1;while(longest/sample>2000)sample*=2;
            BitmapFactory.Options opt=new BitmapFactory.Options();opt.inSampleSize=sample;
            Bitmap bmp=BitmapFactory.decodeFile(photoFile.getPath(),opt);
            if(bmp==null)throw new IllegalStateException("Failed decoding camera image");
            // EXIF rotate for correct reference/target placement.
            androidx.exifinterface.media.ExifInterface exif=new androidx.exifinterface.media.ExifInterface(photoFile.getAbsolutePath());
            int orientation=exif.getAttributeInt(androidx.exifinterface.media.ExifInterface.TAG_ORIENTATION,1);
            android.graphics.Matrix m=new android.graphics.Matrix();
            if(orientation==6)m.postRotate(90);else if(orientation==3)m.postRotate(180);else if(orientation==8)m.postRotate(270);
            if(!m.isIdentity())bmp=Bitmap.createBitmap(bmp,0,0,bmp.getWidth(),bmp.getHeight(),m,true);
            photo.setImage(bmp);
        }catch(Exception e){Ui.toast(this,R.string.generic_error);}
    }
    private void refresh(){
        if(photo==null||step==null||result==null||known==null)return;
        final int[] labels={R.string.photo_step_0,R.string.photo_step_1,R.string.photo_step_2,R.string.photo_step_3,R.string.photo_step_4};
        step.setText(labels[Math.min(photo.count(),4)]);
        measuredCm=Double.NaN;
        if(photo.count()==4){
            try{double ref=Double.parseDouble(known.getText().toString());measuredCm=Geometry.scaledPhotoLength(ref,photo.coords());}
            catch(NumberFormatException ignored){}
        }
        result.setText(Double.isFinite(measuredCm)?getString(R.string.measured_size)+": "+Ui.length(this,measuredCm/100):"—");
    }
}
