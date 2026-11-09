package com.ribhlab.rivoscan;

import android.graphics.Bitmap;
import org.opencv.android.Utils;
import org.opencv.core.*;
import org.opencv.imgproc.Imgproc;
import java.util.Locale;

/**
 * Offline document capture QA. Scores blur, exposure, glare and paper edges
 * on a bounded thumbnail; it NEVER edits, saves or uploads the original.
 * Scores are heuristic guidance, not certified document classification/OCR.
 */
final class RivoCaptureQuality {
    private RivoCaptureQuality(){}

    static final class Result {
        final int score;
        final double sharpness,meanLight,glareFraction,areaFraction;
        final boolean hasEdges,blurred,tooDark,tooBright,glare,cutOff;
        final boolean retakeSuggested;
        Result(int score,double sharpness,double meanLight,double glareFraction,
               double areaFraction,boolean hasEdges,boolean blurred,boolean tooDark,
               boolean tooBright,boolean glare,boolean cutOff){
            this.score=score;this.sharpness=sharpness;this.meanLight=meanLight;
            this.glareFraction=glareFraction;this.areaFraction=areaFraction;
            this.hasEdges=hasEdges;this.blurred=blurred;this.tooDark=tooDark;
            this.tooBright=tooBright;this.glare=glare;this.cutOff=cutOff;
            this.retakeSuggested=blurred||tooDark||glare||cutOff||!hasEdges;
        }
        String summary(String language){
            final String lang=(language==null?"en":language).toLowerCase(Locale.ROOT);
            final boolean ar=lang.equals("ar"),fr=lang.equals("fr"),es=lang.equals("es");
            final boolean pt=lang.equals("pt"),de=lang.equals("de"),it=lang.equals("it");
            String found=hasEdges?(ar?"تم اكتشاف الورقة":fr?"Page détectée":es?"Documento detectado":
                pt?"Documento detetado":de?"Dokument erkannt":it?"Documento rilevato":"Paper edges found"):
                (ar?"حدود الورقة غير مؤكدة":fr?"Bords incertains":es?"Bordes no confirmados":
                pt?"Limites não confirmados":de?"Dokumentränder unsicher":it?"Bordi incerti":"Document edges uncertain");
            String level=(ar?"جودة":fr?"Qualité":es?"Calidad":pt?"Qualidade":de?"Qualität":it?"Qualità":"Quality");
            String warning="";
            if(blurred)warning=ar?"الصورة غير واضحة":fr?"Image floue":es?"Foto borrosa":pt?"Imagem desfocada":de?"Bild unscharf":it?"Immagine sfocata":"Blur detected";
            else if(tooDark)warning=ar?"الإضاءة ضعيفة":fr?"Faible lumière":es?"Poca luz":pt?"Pouca luz":de?"Zu dunkel":it?"Poca luce":"Too dark";
            else if(glare||tooBright)warning=ar?"وهج أو ضوء قوي":fr?"Reflets ou surexposition":es?"Brillos o sobreexposición":pt?"Reflexos / exposição":de?"Reflexion / Überbelichtung":it?"Riflessi o troppa luce":"Glare / overexposure";
            else if(cutOff)warning=ar?"الورقة مقطوعة عند الحافة":fr?"Page coupée":es?"Hoja cortada":pt?"Página cortada":de?"Seite abgeschnitten":it?"Pagina tagliata":"Document may be cropped off";
            else if(!hasEdges)warning=ar?"عدل الزوايا يدوياً":fr?"Ajustez les coins":es?"Ajusta las esquinas":pt?"Ajuste os cantos":de?"Ecken anpassen":it?"Regola gli angoli":"Check corners manually";
            String action=retakeSuggested?
                (ar?"يمكنك إعادة التصوير أو متابعة التعديل":fr?"Reprendre ou corriger":es?"Repetir o ajustar":
                pt?"Repetir ou ajustar":de?"Neu aufnehmen oder bearbeiten":it?"Riprendi o modifica":"Retake or correct before saving"):
                (ar?"راجع النتيجة ثم احفظ":fr?"Vérifiez puis enregistrez":es?"Revisa y guarda":
                pt?"Reveja e guarde":de?"Prüfen und speichern":it?"Verifica e salva":"Review then save");
            return found+" • "+level+" "+score+"/100"+
                (warning.isEmpty()?"":" • "+warning)+"\n"+action;
        }
    }

    static Result analyze(Bitmap image,org.opencv.core.Point[] corners) {
        if(image==null||image.isRecycled())throw new IllegalArgumentException("Missing captured photo");
        double factor=Math.min(1.0,960.0/Math.max(image.getWidth(),image.getHeight()));
        int width=Math.max(1,(int)Math.round(image.getWidth()*factor));
        int height=Math.max(1,(int)Math.round(image.getHeight()*factor));
        Bitmap sample=Bitmap.createScaledBitmap(image,width,height,true);
        Mat rgba=new Mat(),gray=new Mat(),blur=new Mat(),lap=new Mat();
        MatOfDouble mean=new MatOfDouble(),dev=new MatOfDouble();
        try {
            Utils.bitmapToMat(sample,rgba);
            Imgproc.cvtColor(rgba,gray,Imgproc.COLOR_RGBA2GRAY);
            Core.meanStdDev(gray,mean,dev);
            double meanLight=mean.get(0,0)[0];
            Imgproc.GaussianBlur(gray,blur,new Size(3,3),0);
            Imgproc.Laplacian(blur,lap,CvType.CV_32F);
            Core.meanStdDev(lap,mean,dev);
            double variance=Math.pow(dev.get(0,0)[0],2);
            // Bright, clipped highlights in a large portion of the capture
            // indicate overexposure. Uniform white paper alone is not enough
            // to force a retake unless sharpness is also poor.
            Mat saturated=new Mat();
            double fraction=0;
            try {
                Imgproc.threshold(gray,saturated,251,255,Imgproc.THRESH_BINARY);
                fraction=Core.countNonZero(saturated)/(double)(width*height);
            }finally{saturated.release();}
            boolean hasEdges=corners!=null&&corners.length==4;
            double area=0;boolean nearEdge=false;
            if(hasEdges){
                for(int i=0;i<4;i++){
                    org.opencv.core.Point a=corners[i],b=corners[(i+1)%4];
                    if(a==null||b==null||!Double.isFinite(a.x)||!Double.isFinite(a.y)){
                        hasEdges=false;break;
                    }
                    area+=a.x*b.y-b.x*a.y;
                    nearEdge|=a.x<.009||a.y<.009||a.x>.991||a.y>.991;
                }
            }
            area=hasEdges?Math.abs(area)/2.0:0;
            boolean blurred=variance<52;
            boolean tooDark=meanLight<69;
            boolean tooBright=meanLight>247&&fraction>.52;
            boolean glare=fraction>.36&&meanLight>206&&variance<170;
            boolean cutOff=hasEdges&&(nearEdge||area<.095);
            int score=100;
            if(!hasEdges)score-=20;
            if(blurred)score-=36;
            if(tooDark)score-=24;
            if(tooBright)score-=24;
            if(glare)score-=18;
            if(cutOff)score-=19;
            if(variance<115&&!blurred)score-=7;
            return new Result(Math.max(0,Math.min(100,score)),variance,meanLight,
                fraction,area,hasEdges,blurred,tooDark,tooBright,glare,cutOff);
        }finally{
            rgba.release();gray.release();blur.release();lap.release();
            mean.release();dev.release();
            if(sample!=image&&!sample.isRecycled())sample.recycle();
        }
    }
}
