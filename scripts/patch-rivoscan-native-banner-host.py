#!/usr/bin/env python3
"""Pin and patch only AdMob 8.2.0's native fixed 320x50 banner host.
Native parent and WebView have different window inset origins on Android 15/16.
Align the actual native host to WebView screen coordinates, never add insets
twice, and suppress the WHOLE ad when it cannot fit. Never scale/crop a creative.
"""
from pathlib import Path
import json
root=Path("node_modules/@capacitor-community/admob")
assert json.loads((root/"package.json").read_text())["version"]=="8.2.0"
p=root/"android/src/main/java/com/getcapacitor/community/admob/banner/BannerExecutor.java"
s=p.read_text()
if "RIVO_FIXED_BANNER_HOST" in s:
 print("Native fixed banner host already installed")
 raise SystemExit(0)
def once(old,new):
 global s
 assert s.count(old)==1, "AdMob native patch anchor not unique: "+old[:100]
 s=s.replace(old,new)
once("mAdViewLayout.setVerticalGravity(Gravity.BOTTOM);","""mAdViewLayout.setVerticalGravity(Gravity.CENTER_VERTICAL);
            // RIVO_FIXED_BANNER_HOST: exact ad dimensions, not a wrap-content overlay.
            mAdViewLayout.setClipChildren(true);
            mAdViewLayout.setClipToPadding(true);
            mAdViewLayout.setVisibility(View.INVISIBLE);""")
once("""CoordinatorLayout.LayoutParams.WRAP_CONTENT,
                CoordinatorLayout.LayoutParams.WRAP_CONTENT""","""mAdView.getAdSize().getWidthInPixels(contextSupplier.get()),
                mAdView.getAdSize().getHeightInPixels(contextSupplier.get())""")
start=s.index("            int densityMargin =")
end=s.index("            createNewAdView(adOptions);",start)
s=s[:start]+"""            // Do not apply window insets here: the WebView itself already owns them.
            // The pre-draw host positions the fixed banner in screen coordinates.
            mAdViewLayoutParams.gravity = Gravity.TOP | Gravity.LEFT;
            mAdViewLayoutParams.setMargins(0, 0, 0, 0);
            mAdViewLayout.setLayoutParams(mAdViewLayoutParams);

"""+s[end:]
once("            mAdViewLayout.addView(adView);","""            mAdViewLayout.addView(adView, new RelativeLayout.LayoutParams(
                adView.getAdSize().getWidthInPixels(contextSupplier.get()),
                adView.getAdSize().getHeightInPixels(contextSupplier.get())));""")
once("""                bannerParent.addView(mAdViewLayout);
                mAdViewLayout.requestApplyInsets();""","""                final RelativeLayout host = mAdViewLayout;
                final android.webkit.WebView web = findRivoWebView(bannerParent, host);
                bannerParent.addView(host);
                installRivoFixedHost(bannerParent, host, web, adView, adOptions.margin);""")
# A resumed banner must still pass the native containment check before drawing.
once("mAdViewLayout.setVisibility(View.VISIBLE);","mAdViewLayout.setVisibility(View.INVISIBLE);")
helper="""
    private android.webkit.WebView findRivoWebView(View node, View excluded) {
        if (node == excluded || node instanceof AdView) return null;
        if (node instanceof android.webkit.WebView) return (android.webkit.WebView) node;
        if (node instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) node;
            for (int i = 0; i < group.getChildCount(); i++) {
                android.webkit.WebView found = findRivoWebView(group.getChildAt(i), excluded);
                if (found != null) return found;
            }
        }
        return null;
    }

    private void installRivoFixedHost(ViewGroup parent, RelativeLayout host,
                                      android.webkit.WebView web, AdView ad, int marginDp) {
        final ViewTreeObserver.OnPreDrawListener listener = () -> {
            if (host.getParent() != parent || host.getVisibility() == View.GONE) return true;
            final int w = ad.getAdSize().getWidthInPixels(contextSupplier.get());
            final int h = ad.getAdSize().getHeightInPixels(contextSupplier.get());
            final int margin = Math.round(marginDp * contextSupplier.get().getResources().getDisplayMetrics().density);
            final android.graphics.Rect visible = new android.graphics.Rect();
            final int[] wp = new int[2], hp = new int[2], pp = new int[2];
            if (web == null || !web.isShown() || !web.getGlobalVisibleRect(visible)
                || web.getWidth() < w || web.getHeight() < h + margin
                || host.getWidth() != w || host.getHeight() != h
                || ad.getWidth() != w || ad.getHeight() != h) {
                host.setVisibility(View.INVISIBLE);
                return true;
            }
            web.getLocationOnScreen(wp);
            host.getLocationOnScreen(hp);
            parent.getLocationOnScreen(pp);
            final int x = wp[0] + (web.getWidth() - w) / 2;
            final int y = wp[1] + web.getHeight() - margin - h;
            // Compare in the same coordinate system, with a full-size host.
            // Never show any partly clipped or out-of-parent advertisement.
            if (x < pp[0] || y < pp[1] || x + w > pp[0] + parent.getWidth()
                || y + h > pp[1] + parent.getHeight()) {
                host.setVisibility(View.INVISIBLE);
                return true;
            }
            if (hp[0] != x) host.setTranslationX(host.getTranslationX() + x - hp[0]);
            if (hp[1] != y) host.setTranslationY(host.getTranslationY() + y - hp[1]);
            // The actual WebView rect, not a duplicate system-bar margin, is authoritative.
            if (host.getVisibility() != View.VISIBLE) {
                host.setVisibility(View.VISIBLE);
                Log.d(logTag, "RIVO_BANNER_CONTAINED " + x + "," + y + " " + w + "x" + h);
            }
            return true;
        };
        parent.getViewTreeObserver().addOnPreDrawListener(listener);
        host.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override public void onViewAttachedToWindow(View v) {}
            @Override public void onViewDetachedFromWindow(View v) {
                ViewTreeObserver observer = parent.getViewTreeObserver();
                if (observer.isAlive()) observer.removeOnPreDrawListener(listener);
                v.removeOnAttachStateChangeListener(this);
            }
        });
    }
"""
assert s.rstrip().endswith("}")
s=s.rstrip()[:-1]+helper+"}\n"
p.write_text(s)
print("PASS: AdMob 8.2.0 native fixed banner host patched; full-size or invisible.")
