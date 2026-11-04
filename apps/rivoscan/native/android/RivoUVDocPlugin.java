package com.ribhlab.rivoscan;

import ai.onnxruntime.*;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.nio.FloatBuffer;
import java.security.MessageDigest;
import java.util.Collections;

/**
 * Real PaddlePaddle UVDoc ONNX inference inside Android (CPU).
 *
 * Model and SHA-256 verified at build and runtime, source photo never changed,
 * no network calls, rejects unvalidated tensor outputs and large requests.
 *
 * Official input/output CHW float32, BGR channels 0..1, dynamic dimensions.
 * The model's rectified image is NOT a physical 3D depth reconstruction.
 */
@CapacitorPlugin(name="RivoUVDoc")
public final class RivoUVDocPlugin extends Plugin {
    private static final String MODEL="uvdoc/inference.onnx";
    private static final String SHA256="54cab30dc2cf347b4f3d6971c833b1c3d84f5ef17280f1f6d15796bff20e63d6";
    private static final Object LOCK=new Object();
    private static OrtEnvironment env;
    private static OrtSession session;

    private static String digest(File file) throws Exception {
        MessageDigest sha=MessageDigest.getInstance("SHA-256");
        try(InputStream in=new FileInputStream(file)) {
            byte[] b=new byte[65536];int n;
            while((n=in.read(b))!=-1)sha.update(b,0,n);
        }
        StringBuilder result=new StringBuilder(64);
        for(byte b:sha.digest())result.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
        return result.toString();
    }
    private static OrtSession ensureSession(android.content.Context ctx) throws Exception {
        synchronized(LOCK){
            if(session!=null)return session;
            File dir=new File(ctx.getFilesDir(),"uvdoc");
            if(!dir.exists()&&!dir.mkdirs())throw new IOException("Unable to prepare private model storage");
            File file=new File(dir,"inference.onnx");
            if(!file.isFile()||!SHA256.equals(digest(file))){
                File staging=new File(dir,"inference.tmp");
                try(InputStream in=ctx.getAssets().open(MODEL);
                    OutputStream out=new FileOutputStream(staging,false)){
                    byte[] buffer=new byte[65536];int n;
                    while((n=in.read(buffer))!=-1)out.write(buffer,0,n);
                }
                if(!SHA256.equals(digest(staging))){
                    staging.delete();
                    throw new IOException("UVDoc model SHA-256 mismatch; refuses untrusted tensor model");
                }
                if(file.exists()&&!file.delete())throw new IOException("Old UVDoc model cannot be replaced");
                if(!staging.renameTo(file))throw new IOException("UVDoc model cannot be activated");
            }
            env=OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions opts=new OrtSession.SessionOptions();
            opts.setIntraOpNumThreads(2);
            opts.setInterOpNumThreads(1);
            try{session=env.createSession(file.getAbsolutePath(),opts);}
            finally{opts.close();}
            return session;
        }
    }
    private static int clamp(int n,int a,int b){return Math.max(a,Math.min(b,n));}
    private static int size32(int n){return Math.max(128,(n/32)*32);}
    private static Bitmap safelyDecode(byte[] bytes){
        BitmapFactory.Options bounds=new BitmapFactory.Options();
        bounds.inJustDecodeBounds=true;
        BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
        if(bounds.outWidth<128||bounds.outHeight<128||bounds.outWidth>12000||bounds.outHeight>12000)
            throw new IllegalArgumentException("Unsupported document dimensions");
        long pixels=(long)bounds.outWidth*bounds.outHeight;
        BitmapFactory.Options opts=new BitmapFactory.Options();
        opts.inSampleSize=1;
        while(pixels/(opts.inSampleSize*opts.inSampleSize)>3000000L)opts.inSampleSize*=2;
        opts.inPreferredConfig=Bitmap.Config.ARGB_8888;
        Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length,opts);
        if(bitmap==null)throw new IllegalArgumentException("Unable to decode document photo");
        return bitmap;
    }

    @PluginMethod
    public void unwarp(PluginCall call){
        final String value=call.getString("imageBase64");
        if(value==null||value.length()<256||value.length()>8*1024*1024){
            call.reject("UVDoc expects one bounded JPEG image; no cloud uploads");
            return;
        }
        getBridge().execute(()->{
            Bitmap original=null,source=null,output=null;
            try{
                byte[] bytes=Base64.decode(value,Base64.DEFAULT);
                if(bytes.length>6*1024*1024)throw new IllegalArgumentException("Photo payload too large");
                original=safelyDecode(bytes);
                final int ow=original.getWidth(),oh=original.getHeight();
                double shrink=Math.min(1.0,1024.0/Math.max(ow,oh));
                int w=size32((int)Math.round(ow*shrink)),h=size32((int)Math.round(oh*shrink));
                if((long)w*h>1600000L)throw new IllegalArgumentException("UVDoc image exceeds safe memory budget");
                source=Bitmap.createScaledBitmap(original,w,h,true);
                final int size=w*h;
                int[] pixels=new int[size];source.getPixels(pixels,0,w,0,0,w,h);
                // Official PaddleX WarpRunnerPredictor: Read BGR, /255, CHW, batch 1.
                float[] channelFirst=new float[3*size];
                for(int i=0;i<size;i++){
                    int color=pixels[i];
                    channelFirst[i]=(color&255)/255f;         // B
                    channelFirst[size+i]=((color>>>8)&255)/255f; // G
                    channelFirst[2*size+i]=((color>>>16)&255)/255f; // R
                }
                long started=System.nanoTime();
                OrtSession active=ensureSession(getContext());
                final String inputName=active.getInputNames().iterator().next();
                float[][][][] result;
                try(OnnxTensor tensor=OnnxTensor.createTensor(env,FloatBuffer.wrap(channelFirst),
                     new long[]{1,3,h,w});
                    OrtSession.Result predictions=active.run(Collections.singletonMap(inputName,tensor))){
                    Object tensorValue=predictions.get(0).getValue();
                    if(!(tensorValue instanceof float[][][][]))
                        throw new IOException("Unexpected UVDoc output type; refusing invalid conversion");
                    result=(float[][][][])tensorValue;
                }
                if(result.length!=1||result[0].length!=3||result[0][0].length<128||
                   result[0][0][0].length<128)throw new IOException("Unexpected UVDoc output shape");
                int rh=result[0][0].length,rw=result[0][0][0].length;
                if((long)rw*rh>1600000L)throw new IOException("Unsafe UVDoc output dimensions");
                int[] corrected=new int[rw*rh];
                for(int y=0;y<rh;y++)for(int x=0;x<rw;x++){
                    float blue=result[0][0][y][x],green=result[0][1][y][x],red=result[0][2][y][x];
                    if(!Float.isFinite(red)||!Float.isFinite(green)||!Float.isFinite(blue)||
                       red<-.05f||red>1.05f||green<-.05f||green>1.05f||blue<-.05f||blue>1.05f)
                        throw new IOException("UVDoc returned invalid pixels");
                    corrected[y*rw+x]=0xff000000|
                     (clamp(Math.round(red*255),0,255)<<16)|
                     (clamp(Math.round(green*255),0,255)<<8)|
                     clamp(Math.round(blue*255),0,255);
                }
                output=Bitmap.createBitmap(corrected,rw,rh,Bitmap.Config.ARGB_8888);
                ByteArrayOutputStream buffer=new ByteArrayOutputStream();
                if(!output.compress(Bitmap.CompressFormat.JPEG,94,buffer))
                    throw new IOException("UVDoc result could not be encoded");
                JSObject res=new JSObject();
                res.put("imageBase64",Base64.encodeToString(buffer.toByteArray(),Base64.NO_WRAP));
                res.put("width",rw);res.put("height",rh);
                res.put("modelSha256",SHA256);
                res.put("engine","UVDoc-ONNX-Android-CPU");
                res.put("inferenceMs",(System.nanoTime()-started)/1000000L);
                res.put("modelInputMaxSide",1024);
                res.put("sourceUntouched",true);
                res.put("neural2D",true);
                res.put("physical3D",false);
                call.resolve(res);
            }catch(Throwable error){
                call.reject("UVDoc Android inference unavailable: "+error.getMessage());
            }finally{
                if(output!=null&&!output.isRecycled())output.recycle();
                if(source!=null&&source!=original&&!source.isRecycled())source.recycle();
                if(original!=null&&!original.isRecycled())original.recycle();
            }
        });
    }
}
