package com.ribhlab.rivoscan;

import android.content.Context;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.media.AudioFormat;
import android.media.AudioTrack;
import java.util.concurrent.atomic.AtomicInteger;

/** Tiny offline, optional feedback tones. Never reads the microphone or stores audio. */
final class RivoSounds {
    private static final String PREFS = "RivoScanPreferences";
    private static final String KEY = "soundEnabled";
    private static ToneGenerator speaker;
    private static volatile AudioTrack activeScannerSound;
    private static final AtomicInteger scannerGeneration=new AtomicInteger();
    private RivoSounds() {}

    static boolean enabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY, true);
    }

    static void setEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY, enabled).apply();
        if(!enabled)stopScannerSound();
    }

    static synchronized void play(Context context, String event) {
        if (!enabled(context)) return;
        if("scan".equals(event)){playScannerSound(context);return;}
        try {
            if (speaker == null) speaker = new ToneGenerator(AudioManager.STREAM_MUSIC, 42);
            int tone=ToneGenerator.TONE_PROP_BEEP;
            int ms=60;
            if ("capture".equals(event)) {tone=ToneGenerator.TONE_PROP_ACK;ms=90;}
            else if ("saved".equals(event)) {tone=ToneGenerator.TONE_PROP_ACK;ms=120;}
            else if ("error".equals(event)) {tone=ToneGenerator.TONE_PROP_NACK;ms=150;}
            else if ("camera".equals(event)) {tone=ToneGenerator.TONE_PROP_BEEP2;ms=70;}
            else if ("switch".equals(event)) {tone=ToneGenerator.TONE_PROP_BEEP;ms=45;}
            else if ("tool".equals(event)) {tone=ToneGenerator.TONE_PROP_PROMPT;ms=55;}
            speaker.startTone(tone,ms);
        } catch (Exception ignored) {
            // Sound must never interrupt document capture or make a camera fail.
        }
    }

    private static synchronized void stopScannerSound(){
        scannerGeneration.incrementAndGet();
        AudioTrack previous=activeScannerSound;activeScannerSound=null;
        if(previous!=null){
            try{previous.pause();previous.flush();previous.release();}catch(Exception ignored){}
        }
    }
    /** Original 370 ms turquoise-laser sound; generated on device, no microphone/files. */
    private static void playScannerSound(Context context){
        final int serial;
        synchronized(RivoSounds.class){stopScannerSound();serial=scannerGeneration.get();}
        new Thread(()->{
            final int sampleRate=22050,count=sampleRate*370/1000;
            short[] wave=new short[count];
            double phase=0;
            for(int i=0;i<count;i++){
                double t=(double)i/count;
                double hz=410+680*t+140*Math.sin(Math.PI*t);
                phase+=2*Math.PI*hz/sampleRate;
                double envelope=Math.pow(Math.sin(Math.PI*t),1.2);
                double sample=(Math.sin(phase)+0.18*Math.sin(phase*2.03))*0.19*envelope;
                wave[i]=(short)(Math.max(-1,Math.min(1,sample))*32767);
            }
            AudioTrack track=null;
            try{
                track=new AudioTrack(AudioManager.STREAM_MUSIC,sampleRate,AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,wave.length*2,AudioTrack.MODE_STATIC);
                if(track.getState()!=AudioTrack.STATE_INITIALIZED){track.release();return;}
                track.write(wave,0,wave.length);
                synchronized(RivoSounds.class){
                    if(serial!=scannerGeneration.get() || !enabled(context)){track.release();return;}
                    activeScannerSound=track;track.play();
                }
                Thread.sleep(410);
            }catch(Exception ignored){
            }finally{
                synchronized(RivoSounds.class){
                    if(track!=null&&activeScannerSound==track){
                        activeScannerSound=null;
                        try{track.stop();track.release();}catch(Exception ignored){}
                    }
                }
            }
        },"RivoScan-laser-sound").start();
    }
    static synchronized void release() {
        stopScannerSound();
        if(speaker!=null){
            try{speaker.release();}catch(Exception ignored){}
            speaker=null;
        }
    }
}
