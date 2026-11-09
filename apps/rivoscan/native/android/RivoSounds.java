package com.ribhlab.rivoscan;

import android.content.Context;
import android.media.AudioManager;
import android.media.ToneGenerator;

/** Tiny offline, optional feedback tones. Never reads the microphone or stores audio. */
final class RivoSounds {
    private static final String PREFS = "RivoScanPreferences";
    private static final String KEY = "soundEnabled";
    private static ToneGenerator speaker;
    private RivoSounds() {}

    static boolean enabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY, true);
    }

    static void setEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY, enabled).apply();
    }

    static synchronized void play(Context context, String event) {
        if (!enabled(context)) return;
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

    static synchronized void release() {
        if(speaker!=null){
            try{speaker.release();}catch(Exception ignored){}
            speaker=null;
        }
    }
}
