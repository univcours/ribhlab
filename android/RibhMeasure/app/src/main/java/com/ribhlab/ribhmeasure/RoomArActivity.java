package com.ribhlab.ribhmeasure;
import android.Manifest;
import android.app.Activity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.opengl.*;
import android.view.*;
import android.widget.*;
import com.google.ar.core.*;
import java.nio.*;
import java.util.*;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

public final class RoomArActivity extends Activity implements GLSurfaceView.Renderer {
 private GLSurfaceView gl; private TextView status, result; private Sketch sketch;
 private volatile Session session; private boolean installRequested=false, depth=false, resumed=false; private volatile boolean active=false, trackingReady=false; private volatile float[][] projected=new float[0][]; private View overlay; private Button mark; private volatile float measuredHeight=Float.NaN; private volatile double measuredArea=0, measuredPerimeter=0; private volatile String detail=""; private boolean requestedPermission=false; private int availabilityAttempts=0; private int boundTexture=-1; private long lastFrameError=0; private boolean retryScheduled=false; private TextView cameraProblem; private Button retryCamera,photoFallback; private volatile boolean autoMode=false, autoAccept=false, autoStart=true; private Button autoButton; private float autoX,autoZ,autoFloor=Float.NaN,autoHeight=Float.NaN; private float[][] autoPolygon=new float[0][]; private int autoStable=0,wallCount=0; private long autoLast=0; private boolean autoOrigin=false,autoConfirmed=false; private final DepthEvidence depthEvidence=new DepthEvidence(); private int scanDirections=0,floorVotes=0; private float floorCandidate=Float.NaN; private float confirmedHeight=Float.NaN;
 private volatile boolean add=false, undo=false, reset=false, ceiling=false; private volatile boolean tapeMode=false,tapeReset=false,tapeAdd=false; private Anchor tapeA,tapeB; private TextView live; private Button tapeButton; private volatile float liveDistance=Float.NaN; private volatile boolean targetReady=false; private long lastLive=0; private float[][] liveWalls=new float[0][]; private float manualFloor=Float.NaN;
 private final ArrayList<Anchor> points=new ArrayList<>();
 private Anchor top; private int tex, program, width=1,height=1;
 private final FloatBuffer quad=buf(new float[]{-1,-1,1,-1,-1,1,1,1});
 private final FloatBuffer uv=buf(new float[8]);
 private long lastUpdate; private volatile float[][] outline=new float[0][];
 private static FloatBuffer buf(float[] a){FloatBuffer b=ByteBuffer.allocateDirect(a.length*4).order(ByteOrder.nativeOrder()).asFloatBuffer();b.put(a).position(0);return b;}
 private String tr(String en,String fr,String ar){String l=getResources().getConfiguration().getLocales().get(0).getLanguage();return l.equals("ar")?ar:l.equals("fr")?fr:en;}
 @Override protected void attachBaseContext(android.content.Context base){super.attachBaseContext(Prefs.locale(base));}
 @Override public void onCreate(Bundle b){super.onCreate(b);
   LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff07111e);
   root.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});
   LinearLayout heading=new LinearLayout(this);heading.setGravity(Gravity.CENTER_VERTICAL);heading.setPadding(dp(12),dp(6),dp(12),dp(4));root.addView(heading);
   Button back=new Button(this);back.setText("‹");back.setContentDescription(tr("Back","Retour","رجوع"));back.setOnClickListener(v->finish());heading.addView(back,new LinearLayout.LayoutParams(dp(48),dp(48)));
   TextView title=label(tr("Room scanner","Scanner de pièce","مسح الغرفة"),22,0xffe5f4f4);heading.addView(title,new LinearLayout.LayoutParams(0,-2,1));
   Button manual=new Button(this);manual.setText(tr("Manual","Manuel","يدوي"));manual.setOnClickListener(v->startActivity(new android.content.Intent(this,RoomManualActivity.class)));heading.addView(manual);
   status=label("",14,0xffa6d7d5);status.setPadding(dp(16),dp(8),dp(16),dp(8));root.addView(status);
   FrameLayout frame=new FrameLayout(this);gl=new GLSurfaceView(this);gl.setEGLContextClientVersion(2);gl.setPreserveEGLContextOnPause(true);gl.setRenderer(this);frame.addView(gl,new FrameLayout.LayoutParams(-1,-1));
   overlay=new View(this){final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);@Override protected void onDraw(Canvas c){float x=getWidth()/2f,y=getHeight()/2f;int col=targetReady?0xff21e0c2:0xffffcc80;p.setColor(col);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(2));c.drawCircle(x,y,dp(18),p);c.drawLine(x-dp(29),y,x-dp(8),y,p);c.drawLine(x+dp(8),y,x+dp(29),y,p);c.drawLine(x,y-dp(29),x,y-dp(8),p);c.drawLine(x,y+dp(8),x,y+dp(29),p);
    float[][] a=projected;p.setStyle(Paint.Style.FILL);p.setTextSize(dp(14));for(int j=0;j<a.length;j++){float[] q=a[j];if(q[2]<=0)continue;float sx=q[0]*getWidth(),sy=q[1]*getHeight();if(j>0&&a[j-1][2]>0){p.setColor(0xff21e0c2);p.setStrokeWidth(dp(3));c.drawLine(a[j-1][0]*getWidth(),a[j-1][1]*getHeight(),sx,sy,p);float mx=(a[j-1][0]+q[0])*getWidth()/2,my=(a[j-1][1]+q[1])*getHeight()/2;String len=String.format(Locale.US,"%.2f m",q[3]);p.setColor(0xdd07111e);c.drawRoundRect(mx-dp(4),my-dp(18),mx+p.measureText(len)+dp(4),my+dp(5),dp(5),dp(5),p);p.setColor(0xffffffff);c.drawText(len,mx,my,p);}
    p.setColor(0xff21e0c2);c.drawCircle(sx,sy,dp(7),p);p.setColor(0xff07111e);c.drawCircle(sx,sy,dp(3),p);p.setColor(0xffffffff);c.drawText(Integer.toString(j+1),sx+dp(10),sy-dp(8),p);}
   }};frame.addView(overlay,new FrameLayout.LayoutParams(-1,-1));
   LinearLayout recovery=new LinearLayout(this);recovery.setOrientation(LinearLayout.VERTICAL);recovery.setGravity(Gravity.CENTER);recovery.setPadding(dp(18),dp(12),dp(18),dp(12));recovery.setBackgroundColor(0xff10232b);
   cameraProblem=label("",15,0xffe1f5f4);cameraProblem.setGravity(Gravity.CENTER);recovery.addView(cameraProblem);
   retryCamera=new Button(this);retryCamera.setText(tr("Retry AR camera","Réessayer la caméra AR","إعادة تشغيل كاميرا AR"));retryCamera.setOnClickListener(v->{requestedPermission=false;availabilityAttempts=0;installRequested=false;restartCamera();});recovery.addView(retryCamera,new LinearLayout.LayoutParams(-1,-2));
   photoFallback=new Button(this);photoFallback.setText(tr("Photo measurement (without AR)","Mesure photo (sans AR)","القياس بالصورة بدون AR"));photoFallback.setOnClickListener(v->startActivity(new android.content.Intent(this,CameraMeasureActivity.class)));recovery.addView(photoFallback,new LinearLayout.LayoutParams(-1,-2));
   Button arServices=new Button(this);arServices.setText(tr("Get / update AR services","Installer / mettre à jour AR","تثبيت أو تحديث خدمات AR"));arServices.setOnClickListener(v->{try{startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,android.net.Uri.parse("market://details?id=com.google.ar.core")));}catch(Exception e){startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,android.net.Uri.parse("https://play.google.com/store/apps/details?id=com.google.ar.core")));}});recovery.addView(arServices,new LinearLayout.LayoutParams(-1,-2));
   recovery.setVisibility(View.GONE);frame.addView(recovery,new FrameLayout.LayoutParams(-1,-1));root.addView(frame,new LinearLayout.LayoutParams(-1,0,1));
   LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setPadding(dp(14),dp(8),dp(14),dp(8));root.addView(panel);
   live=label("",16,0xffe1f5f4);panel.addView(live);result=label("",17,0xffa7f9e8);panel.addView(result);sketch=new Sketch();panel.addView(sketch,new LinearLayout.LayoutParams(-1,dp(88)));
   LinearLayout controls=new LinearLayout(this);controls.setGravity(Gravity.CENTER_VERTICAL);panel.addView(controls);
   mark=button(controls,tr("Add point","Ajouter","إضافة نقطة"),()->{if(tapeMode)tapeAdd=true;else{ceiling=false;add=true;}});mark.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff21bda9));mark.setTextColor(0xff07111e);
   button(controls,tr("Ceiling","Plafond","السقف"),()->{tapeMode=false;ceiling=true;add=true;});button(controls,tr("Undo","Annuler","تراجع"),()->undo=true);
   LinearLayout modes=new LinearLayout(this);panel.addView(modes);tapeButton=button(modes,tr("2-point tape","Mètre 2 points","قياس نقطتين"),()->{tapeMode=true;autoMode=false;autoStart=false;tapeReset=true;});button(modes,tr("Room corners","Coins pièce","زوايا الغرفة"),()->{tapeMode=false;autoMode=false;autoStart=false;}); LinearLayout automatic=new LinearLayout(this);panel.addView(automatic);autoButton=button(automatic,tr("Auto scan","Scan auto","مسح تلقائي"),()->{tapeMode=false;if(autoMode){autoAccept=true;}else{autoStart=true;}});autoButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xff7ddfd2));autoButton.setTextColor(0xff07111e);button(automatic,tr("Cancel auto","Annuler auto","إلغاء تلقائي"),()->{autoMode=false;autoAccept=false;});button(automatic,tr("3D / Plan","3D / Plan","مخطط 3D"),()->openPlan());
   LinearLayout actions=new LinearLayout(this);panel.addView(actions);button(actions,tr("Reset","Effacer","مسح"),()->reset=true);button(actions,tr("Save","Enregistrer","حفظ"),()->saveRoom());button(actions,tr("Share","Partager","مشاركة"),()->shareRoom());
   setContentView(root);msg(tr("Allow camera access, then scan the floor slowly.","Autorisez la caméra puis balayez le sol lentement.","اسمح بالكاميرا ثم حرك الهاتف فوق الأرضية ببطء."));
 }
 private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
 private TextView label(String t,int size,int color){TextView v=new TextView(this);v.setText(t);v.setTextSize(size);v.setTextColor(color);return v;}
 private Button button(LinearLayout l,String t,Runnable r){Button b=new Button(this);b.setText(t);b.setAllCaps(false);b.setTextSize(12);b.setOnClickListener(v->r.run());l.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));return b;}
 private void msg(String s){runOnUiThread(()->status.setText(s));}
 private void saveRoom(){if(tapeMode){if(tapeA==null||tapeB==null||tapeA.getTrackingState()!=TrackingState.TRACKING||tapeB.getTrackingState()!=TrackingState.TRACKING){msg(tr("Mark two tracked points first.","Marquez deux points suivis.","حدد نقطتين متتبعتين أولاً."));return;}Pose a=tapeA.getPose(),b=tapeB.getPose();double d=Math.sqrt(Math.pow(a.tx()-b.tx(),2)+Math.pow(a.ty()-b.ty(),2)+Math.pow(a.tz()-b.tz(),2));Measurements.add(this,"AR tape",d,"m","Two tracked points");msg(tr("Distance saved.","Distance enregistrée.","تم حفظ المسافة."));return;}if(autoMode){msg(tr("Confirm the automatic outline first.","Validez le contour automatique.","أكد المخطط التلقائي أولاً."));return;}if(outline.length<3||!RoomMath.valid(outline)){msg(tr("Add at least three non-crossing corners first.","Ajoutez au moins trois coins sans croisement.","حدد ثلاث زوايا على الأقل دون تقاطع."));return;}Measurements.add(this,"AR room area",measuredArea,"m²",detail);msg(tr("Saved to history.","Enregistré dans l'historique.","تم الحفظ في السجل."));}
 private void shareRoom(){if(autoMode){msg(tr("Confirm the automatic outline first.","Validez le contour automatique.","أكد المخطط التلقائي أولاً."));return;}if(outline.length<3||!RoomMath.valid(outline)){msg(tr("Finish the room outline first.","Terminez le contour.","أكمل مخطط الغرفة أولاً."));return;}android.content.Intent i=new android.content.Intent(android.content.Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(android.content.Intent.EXTRA_TEXT,detail);startActivity(android.content.Intent.createChooser(i,tr("Share room","Partager la pièce","مشاركة الغرفة")));}
 @Override protected void onResume(){super.onResume();resumed=true;startAr();}
 private void showProblem(String text){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;status.setText(text);cameraProblem.setText(text);((View)cameraProblem.getParent()).setVisibility(View.VISIBLE);});}
 private void clearProblem(){runOnUiThread(()->((View)cameraProblem.getParent()).setVisibility(View.GONE));}
 private void restartCamera(){if(!resumed||isFinishing())return;stopCamera();Session old=session;session=null;if(old!=null){try{old.close();}catch(RuntimeException ignored){}}boundTexture=-1;startAr();}
 private void stopCamera(){if(active){active=false;gl.onPause();Session s=session;if(s!=null){try{s.pause();}catch(RuntimeException e){android.util.Log.w("RoomAR","Pause",e);}}}}
 private void startAr(){if(!resumed||isFinishing()||active)return;try{
  if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED){
   if(!requestedPermission){requestedPermission=true;requestPermissions(new String[]{Manifest.permission.CAMERA},44);}
   else showProblem(tr("Camera permission is required. Retry or enable it in Android Settings.","Autorisez la caméra dans les paramètres Android, puis réessayez.","خاص السماح بالكاميرا من إعدادات أندرويد ثم إعادة المحاولة."));return;
  }
  if(session==null){
   ArCoreApk.Availability av=ArCoreApk.getInstance().checkAvailability(this);
   if(av.isTransient()&&availabilityAttempts++<10){if(!retryScheduled){retryScheduled=true;status.postDelayed(()->{retryScheduled=false;startAr();},600);}msg(tr("Checking AR compatibility…","Vérification AR…","جاري التحقق من دعم الواقع المعزز…"));return;}
   if(av==ArCoreApk.Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE){showProblem(tr("This device is not ARCore compatible. Photo and manual measurements still work.","Cet appareil ne prend pas en charge ARCore. Les mesures photo et manuelles restent disponibles.","هذا الهاتف لا يدعم ARCore. القياس بالصورة واليدوي متاحان."));return;}
   if(ArCoreApk.getInstance().requestInstall(this,!installRequested)==ArCoreApk.InstallStatus.INSTALL_REQUESTED){installRequested=true;showProblem(tr("Install or update Google Play Services for AR, then return.","Installez ou mettez à jour Google Play Services for AR, puis revenez.","ثبت أو حدث خدمات الواقع المعزز ثم عد للتطبيق."));return;}
   Session fresh=new Session(this);try{Config c=new Config(fresh);c.setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL);depth=fresh.isDepthModeSupported(Config.DepthMode.AUTOMATIC);if(depth)c.setDepthMode(Config.DepthMode.AUTOMATIC);try{fresh.configure(c);}catch(IllegalArgumentException ex){depth=false;c.setDepthMode(Config.DepthMode.DISABLED);fresh.configure(c);}session=fresh;}catch(Exception e){fresh.close();throw e;}
  }
  session.resume();boundTexture=-1;active=true;gl.onResume();clearProblem();msg(tr("Move slowly to detect the floor.","Balayez le sol lentement.","حرك الهاتف ببطء لاكتشاف الأرضية."));
 }catch(Exception e){android.util.Log.e("RoomAR","Session setup",e);showProblem(tr("AR camera could not start. Close other camera apps and retry. ","La caméra AR ne démarre pas. Fermez les autres apps caméra et réessayez. ","تعذر تشغيل كاميرا AR. أغلق التطبيقات الأخرى التي تستعمل الكاميرا وأعد المحاولة. ")+e.getClass().getSimpleName());}}
 @Override public void onRequestPermissionsResult(int req,String[] p,int[] g){super.onRequestPermissionsResult(req,p,g);if(req==44&&g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED)startAr();else if(req==44)showProblem(tr("Camera permission denied. Enable it in Android Settings or retry.","Caméra refusée. Autorisez-la dans les paramètres.","لم يتم السماح بالكاميرا. فعّلها في الإعدادات أو أعد المحاولة."));}
 @Override protected void onPause(){resumed=false;stopCamera();super.onPause();}
 @Override protected void onDestroy(){if(session!=null){session.close();session=null;}super.onDestroy();}
 @Override public void onSurfaceCreated(GL10 x,EGLConfig y){boundTexture=-1;int[] t=new int[1];GLES20.glGenTextures(1,t,0);tex=t[0];GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,tex);GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,GLES20.GL_TEXTURE_MIN_FILTER,GLES20.GL_LINEAR);GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,GLES20.GL_TEXTURE_MAG_FILTER,GLES20.GL_LINEAR);GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,GLES20.GL_TEXTURE_WRAP_S,GLES20.GL_CLAMP_TO_EDGE);GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,GLES20.GL_TEXTURE_WRAP_T,GLES20.GL_CLAMP_TO_EDGE);
  int v=shader(GLES20.GL_VERTEX_SHADER,"attribute vec2 p;attribute vec2 u;varying vec2 v;void main(){gl_Position=vec4(p,0.,1.);v=u;}");
  int f=shader(GLES20.GL_FRAGMENT_SHADER,"#extension GL_OES_EGL_image_external : require\nprecision mediump float;uniform samplerExternalOES s;varying vec2 v;void main(){gl_FragColor=texture2D(s,v);}");
  program=GLES20.glCreateProgram();GLES20.glAttachShader(program,v);GLES20.glAttachShader(program,f);GLES20.glLinkProgram(program);
 }
 private int shader(int type,String src){int s=GLES20.glCreateShader(type);GLES20.glShaderSource(s,src);GLES20.glCompileShader(s);return s;}
 @Override public void onSurfaceChanged(GL10 g,int w,int h){width=w;height=h;GLES20.glViewport(0,0,w,h);}
 @Override public void onDrawFrame(GL10 g){GLES20.glClearColor(0,0,0,1);GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);Session s=session;if(s==null||!active)return;
  try{if(tex<=0||program<=0||width<2||height<2)return;if(boundTexture!=tex){s.setCameraTextureName(tex);boundTexture=tex;}s.setDisplayGeometry(getWindowManager().getDefaultDisplay().getRotation(),width,height);Frame f=s.update();
   quad.position(0);uv.position(0);f.transformCoordinates2d(Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,quad,Coordinates2d.TEXTURE_NORMALIZED,uv);quad.position(0);uv.position(0);
   GLES20.glUseProgram(program);GLES20.glActiveTexture(GLES20.GL_TEXTURE0);GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,tex);GLES20.glUniform1i(GLES20.glGetUniformLocation(program,"s"),0);
   int p=GLES20.glGetAttribLocation(program,"p"),u=GLES20.glGetAttribLocation(program,"u");GLES20.glEnableVertexAttribArray(p);GLES20.glEnableVertexAttribArray(u);GLES20.glVertexAttribPointer(p,2,GLES20.GL_FLOAT,false,0,quad);GLES20.glVertexAttribPointer(u,2,GLES20.GL_FLOAT,false,0,uv);if(f.getTimestamp()!=0)GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP,0,4);GLES20.glDisableVertexAttribArray(p);GLES20.glDisableVertexAttribArray(u);
   if(reset){reset=false;tapeReset=true;manualFloor=Float.NaN;autoMode=false;autoAccept=false;autoConfirmed=false;confirmedHeight=Float.NaN;for(Anchor a:points)a.detach();points.clear();if(top!=null)top.detach();top=null;}
   if(undo&&!tapeMode){undo=false;autoMode=false;autoConfirmed=false;confirmedHeight=Float.NaN;if(top!=null){top.detach();top=null;}else if(!points.isEmpty())points.remove(points.size()-1).detach();}
   trackingReady=f.getCamera().getTrackingState()==TrackingState.TRACKING; if(tapeReset){tapeReset=false;if(tapeA!=null)tapeA.detach();if(tapeB!=null)tapeB.detach();tapeA=null;tapeB=null;} if(tapeMode&&undo){undo=false;tapeReset=true;} if(autoStart){autoStart=false;autoMode=true;autoAccept=false;autoOrigin=false;autoFloor=Float.NaN;autoHeight=Float.NaN;autoStable=0;autoPolygon=new float[0][];autoLast=0;floorVotes=0;floorCandidate=Float.NaN;scanDirections=0;depthEvidence.clear();}if(autoMode&&trackingReady&&!tapeMode)autoScan(f); updateLive(f);project(f); if(add){add=false;autoMode=false;if(!trackingReady){msg(tr("Tracking not ready. Move slowly.","Suivi non prêt.","حرك الهاتف ببطء."));}else place(f);}
   long now=android.os.SystemClock.uptimeMillis();if(now-lastUpdate>300){lastUpdate=now;refresh(f.getCamera().getTrackingState()==TrackingState.TRACKING);}
  }catch(com.google.ar.core.exceptions.CameraNotAvailableException e){trackingReady=false;android.util.Log.e("RoomAR","Camera disconnected",e);runOnUiThread(()->{stopCamera();showProblem(tr("Camera is busy or disconnected. Retry.","Caméra occupée ou déconnectée. Réessayez.","الكاميرا مشغولة أو متوقفة. أعد المحاولة."));});}
  catch(Exception e){trackingReady=false;long now=android.os.SystemClock.uptimeMillis();if(now-lastFrameError>2000){lastFrameError=now;android.util.Log.e("RoomAR","Frame update",e);msg(tr("Tracking interrupted: ","Suivi interrompu : ","توقف التتبع: ")+e.getClass().getSimpleName());}}
 }
 private HitResult surfaceHit(Frame f){
  if(!trackingReady)return null;
  HitResult feature=null;for(HitResult h:f.hitTest(width*.5f,height*.5f)){Trackable t=h.getTrackable();if(t.getTrackingState()!=TrackingState.TRACKING||!Float.isFinite(h.getDistance())||h.getDistance()<.12f||h.getDistance()>15f)continue;
   if(t instanceof DepthPoint)return h;
   if(t instanceof Plane&&((Plane)t).isPoseInPolygon(h.getHitPose()))return h;
   if(t instanceof Point&&((Point)t).getOrientationMode()==Point.OrientationMode.ESTIMATED_SURFACE_NORMAL&&feature==null)feature=h;
  }return feature;
 }
 private void updateLive(Frame f){
  long now=android.os.SystemClock.uptimeMillis();if(!tapeAdd&&now-lastLive<180)return;lastLive=now;
  HitResult hit=surfaceHit(f);targetReady=hit!=null;liveDistance=hit==null?Float.NaN:hit.getDistance();
  if(tapeAdd){tapeAdd=false;if(hit==null){msg(tr("No tracked surface. Move sideways slowly and aim at a textured edge.","Pas de surface suivie. Déplacez-vous lentement vers une zone texturée.","لا يوجد سطح متتبع. تحرك ببطء ووجه نحو حافة واضحة."));}
   else if(tapeA==null||tapeB!=null){if(tapeA!=null)tapeA.detach();if(tapeB!=null)tapeB.detach();tapeA=hit.createAnchor();tapeB=null;}
   else{tapeB=hit.createAnchor();}
  }
  final String label=Float.isFinite(liveDistance)?String.format(Locale.US,"%s %.2f m",tr("Camera → surface (estimate)","Caméra → surface (estimation)","الكاميرا ← السطح (تقدير)"),liveDistance):tr("No surface yet — move slowly","Surface non détectée — bougez lentement","لم يكتشف سطح بعد — تحرك ببطء");
  String state=label;
  if(!trackingReady)state=tr("Tracking: ","Suivi : ","التتبع: ")+f.getCamera().getTrackingFailureReason().name();
  if(tapeMode&&tapeA!=null&&tapeA.getTrackingState()==TrackingState.TRACKING){Pose a=tapeA.getPose(),b=tapeB!=null&&tapeB.getTrackingState()==TrackingState.TRACKING?tapeB.getPose():hit!=null?hit.getHitPose():null;
   if(b!=null){double d=Math.sqrt(Math.pow(a.tx()-b.tx(),2)+Math.pow(a.ty()-b.ty(),2)+Math.pow(a.tz()-b.tz(),2));state+="\n"+String.format(Locale.US,"%s %.2f m",tapeB!=null?tr("A–B","A–B","أ–ب"):tr("A → target (preview)","A → cible (aperçu)","أ ← الهدف (معاينة)"),d);}
  }
  final String value=state;runOnUiThread(()->{live.setText(value);if(tapeMode)mark.setText(tapeA==null||tapeB!=null?tr("Mark A","Point A","النقطة أ"):tr("Mark B","Point B","النقطة ب"));});
 }
 private void autoScan(Frame f){
  long now=android.os.SystemClock.uptimeMillis();if(!autoAccept&&now-autoLast<500)return;autoLast=now;
  Pose camera=f.getCamera().getPose();java.util.Collection<Plane> planes=session.getAllTrackables(Plane.class);
  if(!autoOrigin){autoX=camera.tx();autoZ=camera.tz();autoOrigin=true;}
  if(!Float.isFinite(autoFloor)){float candidate=Float.POSITIVE_INFINITY;for(Plane p:planes){if(p.getTrackingState()!=TrackingState.TRACKING||p.getSubsumedBy()!=null||p.getType()!=Plane.Type.HORIZONTAL_UPWARD_FACING)continue;float y=p.getCenterPose().ty(),dy=camera.ty()-y;double size=p.getExtentX()*p.getExtentZ();if(dy>.40&&dy<2.6&&size>.16)candidate=Math.min(candidate,y);}if(Float.isFinite(candidate)){if(Float.isFinite(floorCandidate)&&Math.abs(candidate-floorCandidate)<.08f)floorVotes++;else{floorCandidate=candidate;floorVotes=1;}if(floorVotes>=2)autoFloor=floorCandidate;}}
  if(!Float.isFinite(autoFloor)){msg(tr("AUTO · Aim at a clear patch of floor and move slowly.","AUTO · Balayez une zone dégagée du sol.","تلقائي · وجه الهاتف لأرضية واضحة وتحرك ببطء."));autoAccept=false;return;}
  if(depth)depthEvidence.add(f);
  for(HitResult hit:f.hitTest(width/2f,height/2f)){if(hit.getTrackable() instanceof Plane){Plane plane=(Plane)hit.getTrackable();if(plane.getType()==Plane.Type.VERTICAL&&plane.isPoseInPolygon(hit.getHitPose())){float[] dir=camera.getTransformedAxis(2,-1);int bin=(int)Math.floor((Math.atan2(dir[0],dir[2])+Math.PI)/(2*Math.PI)*12)%12;scanDirections|=1<<bin;break;}}}
  ArrayList<float[]> walls=new ArrayList<>();float ceil=Float.NaN;double ceilingSize=0;
  for(Plane p:planes){if(p.getTrackingState()!=TrackingState.TRACKING||p.getSubsumedBy()!=null)continue;Pose q=p.getCenterPose();float size=p.getExtentX()*p.getExtentZ();
   if(p.getType()==Plane.Type.HORIZONTAL_DOWNWARD_FACING&&q.ty()-autoFloor>1.7&&q.ty()-autoFloor<8&&size>.5&&size>ceilingSize){ceil=q.ty()-autoFloor;ceilingSize=size;}
   if(p.getType()!=Plane.Type.VERTICAL||size<.25||q.ty()-autoFloor<.20||q.ty()-autoFloor>4)continue;
   float[] n=q.getTransformedAxis(1,1f);float norm=(float)Math.hypot(n[0],n[2]);if(norm<.8f)continue;float nx=n[0]/norm,nz=n[2]/norm,d=nx*q.tx()+nz*q.tz();if(nx*autoX+nz*autoZ>d){nx=-nx;nz=-nz;d=-d;}float distance=d-nx*autoX-nz*autoZ;if(distance<.12f||distance>15)continue;
   java.nio.FloatBuffer polygon=p.getPolygon();float lo=Float.POSITIVE_INFINITY,hi=Float.NEGATIVE_INFINITY,ylo=Float.POSITIVE_INFINITY,yhi=Float.NEGATIVE_INFINITY;while(polygon.remaining()>=2){float[] a=q.transformPoint(new float[]{polygon.get(),0,polygon.get()});float tangent=-nz*a[0]+nx*a[2];lo=Math.min(lo,tangent);hi=Math.max(hi,tangent);ylo=Math.min(ylo,a[1]);yhi=Math.max(yhi,a[1]);}
   if(hi-lo<.45||yhi-ylo<.35)continue;walls.add(new float[]{nx,nz,d,lo,hi});
  }
  if(Float.isFinite(ceil))autoHeight=ceil;wallCount=walls.size();int observedDepthWalls=0;for(float[] wall:walls)if(depthEvidence.support(wall,autoFloor)>=8)observedDepthWalls++;
  float[][] next=WallLoop.solve(walls,autoX,autoZ); if(next.length==0)next=AutoRoomMath.solve(walls,autoX,autoZ);double old=RoomMath.area(autoPolygon),area=RoomMath.area(next);
  if(next.length>=3&&autoPolygon.length==next.length&&old>0&&Math.abs(area-old)/old<.035&&AutoRoomMath.near(autoPolygon,next,.20f))autoStable++;else autoStable=0;
  autoPolygon=next;
  if(autoAccept){autoAccept=false;if(autoStable<2||!RoomMath.valid(next)){msg(tr("Continue scanning until all walls form a stable outline.","Continuez jusqu'à un contour stable.","واصل المسح حتى يستقر مخطط جميع الجدران."));return;}
   ArrayList<Anchor> fresh=new ArrayList<>();try{for(float[] v:next)fresh.add(session.createAnchor(Pose.makeTranslation(v[0],autoFloor,v[1])));}catch(Exception e){for(Anchor a:fresh)a.detach();msg(tr("Unable to anchor automatic plan.","Ancrage du plan impossible.","تعذر تثبيت المخطط."));return;}for(Anchor a:points)a.detach();points.clear();points.addAll(fresh);if(top!=null){top.detach();top=null;}confirmedHeight=autoHeight;autoConfirmed=true;autoMode=false;msg(tr("Automatic outline captured. Check every wall and measure ceiling if missing.","Contour automatique validé. Vérifiez les murs et mesurez le plafond si nécessaire.","تم اعتماد المخطط التلقائي. تحقق من كل جدار وقس السقف إن لم يكتشف."));return;}
  msg(String.format(Locale.US,tr("AUTO · %d wall planes · %s","AUTO · %d plans de murs · %s","تلقائي · %d سطح جدار · %s"),wallCount,autoStable>=2?tr("Stable — review then Use plan","Stable — vérifiez puis validez","مستقر — راجع ثم اعتمد"):tr("Slowly scan all walls; avoid furniture","Balayez tous les murs, évitez les meubles","امسح كل الجدران ببطء وتجنب الأثاث"))+String.format(Locale.US,"\n%s %d/12 · %s %d · %s %d",tr("Directions","Directions","الاتجاهات"),Integer.bitCount(scanDirections),tr("Depth points","Points profondeur","نقاط العمق"),depthEvidence.size(),tr("Walls with depth support","Murs confirmés par profondeur","جدران مدعومة بالعمق"),observedDepthWalls));
 }
 private void openPlan(){float[][] a=outline;if(!RoomMath.valid(a)){msg(tr("A valid room outline is needed.","Un contour valide est requis.","خاص مخطط غرفة صالح."));return;}android.content.Intent i=new android.content.Intent(this,RoomPlanActivity.class);float[] flat=new float[a.length*2];for(int j=0;j<a.length;j++){flat[j*2]=a[j][0];flat[j*2+1]=a[j][1];}i.putExtra("outline",flat);i.putExtra("height",measuredHeight);i.putExtra("preview",autoMode);startActivity(i);}
 private void project(Frame f){
  float[] view=new float[16],proj=new float[16],vp=new float[16];f.getCamera().getViewMatrix(view,0);f.getCamera().getProjectionMatrix(proj,0,0.05f,100f);android.opengl.Matrix.multiplyMM(vp,0,proj,0,view,0);
  int count=tapeMode?(tapeA==null?0:tapeB==null?1:2):autoMode?autoPolygon.length:points.size();float[][] a=new float[count][4];
  for(int j=0;j<count;j++){Pose p=tapeMode?(j==0?tapeA:tapeB).getPose():autoMode?Pose.makeTranslation(autoPolygon[j][0],autoFloor,autoPolygon[j][1]):points.get(j).getPose();float[] z=new float[4];android.opengl.Matrix.multiplyMV(z,0,vp,0,new float[]{p.tx(),p.ty(),p.tz(),1},0);if(z[3]>0){a[j][0]=.5f+.5f*z[0]/z[3];a[j][1]=.5f-.5f*z[1]/z[3];a[j][2]=z[3];if(j>0){Pose prev=tapeMode?tapeA.getPose():autoMode?Pose.makeTranslation(autoPolygon[j-1][0],autoFloor,autoPolygon[j-1][1]):points.get(j-1).getPose();a[j][3]=(float)Math.sqrt(Math.pow(p.tx()-prev.tx(),2)+Math.pow(p.tz()-prev.tz(),2)+(tapeMode?Math.pow(p.ty()-prev.ty(),2):0));}}}
  projected=a;runOnUiThread(()->overlay.invalidate());
 }
 private Pose floorRay(Frame f,float y){float[] v=new float[16],p=new float[16],vp=new float[16],inv=new float[16],q=new float[4];f.getCamera().getViewMatrix(v,0);f.getCamera().getProjectionMatrix(p,0,0.05f,100f);android.opengl.Matrix.multiplyMM(vp,0,p,0,v,0);if(!android.opengl.Matrix.invertM(inv,0,vp,0))return null;android.opengl.Matrix.multiplyMV(q,0,inv,0,new float[]{0,0,1,1},0);if(Math.abs(q[3])<1e-6)return null;Pose c=f.getCamera().getPose();float dx=q[0]/q[3]-c.tx(),dy=q[1]/q[3]-c.ty(),dz=q[2]/q[3]-c.tz();if(Math.abs(dy)<1e-5)return null;float t=(y-c.ty())/dy;float distance=(float)(t*Math.sqrt(dx*dx+dy*dy+dz*dz));if(t<=0||distance<0.15||distance>15)return null;return Pose.makeTranslation(c.tx()+t*dx,y,c.tz()+t*dz);}
 private void place(Frame f){
  boolean wantTop=ceiling;
  if(wantTop&&points.size()<3){msg(tr("Mark the floor corners first.","Marquez les coins du sol d'abord.","حدد زوايا الأرضية أولاً."));return;}
  if(!wantTop&&(!points.isEmpty()||Float.isFinite(manualFloor)||Float.isFinite(autoFloor))){Pose pose=floorRay(f,!points.isEmpty()?points.get(0).getPose().ty():Float.isFinite(manualFloor)?manualFloor:autoFloor);if(pose!=null&&acceptCorner(pose)){points.add(session.createAnchor(pose));msg(tr("Corner added. Aim at the next corner.","Coin ajouté. Visez le suivant.","تمت إضافة الزاوية. وجه للزاوية التالية."));return;}}
  for(HitResult hit:f.hitTest(width/2f,height/2f)){Trackable t=hit.getTrackable();Pose pose=hit.getHitPose();boolean match=false;
   if(t instanceof Plane){Plane pl=(Plane)t;match=pl.isPoseInPolygon(pose)&&(wantTop?pl.getType()==Plane.Type.HORIZONTAL_DOWNWARD_FACING:pl.getType()==Plane.Type.HORIZONTAL_UPWARD_FACING);if(!wantTop&&points.isEmpty())match=match&&f.getCamera().getPose().ty()-pose.ty()>0.25;} if(!wantTop&&points.isEmpty()&&t instanceof DepthPoint){float drop=f.getCamera().getPose().ty()-pose.ty();match=drop>.45f&&drop<2.6f;}
   if(wantTop&&!points.isEmpty()&&t instanceof DepthPoint&&depth)match=pose.ty()-points.get(0).getPose().ty()>1.5;
   if(!match)continue;
   if(wantTop){if(pose.ty()-points.get(0).getPose().ty()<1.5)continue;if(top!=null)top.detach();top=hit.createAnchor();msg(tr("Height captured.","Hauteur mesurée.","تم قياس الارتفاع."));return;}
   if(acceptCorner(pose)){if(points.isEmpty())manualFloor=pose.ty();points.add(hit.createAnchor());msg(tr("Floor locked. Aim at each corner in order.","Sol verrouillé. Visez les coins dans l'ordre.","تم تثبيت الأرضية. حدد الزوايا بالترتيب."));return;}
  }
  msg(tr("Surface not ready. Move slowly and aim at the floor or ceiling.","Surface non prête. Balayez le sol ou plafond.","السطح غير جاهز. حرك الهاتف ببطء نحو الأرضية أو السقف."));
 }
 private boolean acceptCorner(Pose p){if(points.size()>=30)return false;if(points.isEmpty())return true;Pose last=points.get(points.size()-1).getPose();return Math.hypot(p.tx()-last.tx(),p.tz()-last.tz())>=.08;}
 private void refresh(boolean tracking){float[][] a=new float[points.size()][2];float floor=0;for(int i=0;i<points.size();i++){Pose p=points.get(i).getPose();a[i][0]=p.tx();a[i][1]=p.tz();floor+=p.ty();}
  double area=RoomMath.area(a),per=RoomMath.perimeter(a);boolean valid=RoomMath.valid(a);double h=top!=null&&a.length>0?top.getPose().ty()-floor/a.length:confirmedHeight; if(autoMode){a=autoPolygon;area=RoomMath.area(a);per=RoomMath.perimeter(a);valid=RoomMath.valid(a);h=autoHeight;}
  measuredArea=area;measuredPerimeter=per;measuredHeight=(float)h;
  String text=String.format(Locale.US,"%s: %d",tr("Corners","Coins","الزوايا"),a.length);
  if(a.length==2)text+=String.format(Locale.US,"  |  %.2f m",Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]));
  if(a.length>=3)text+=valid?String.format(Locale.US,"  |  %.2f m²  •  %.2f m",area,per):tr("  |  Crossed or invalid outline","  |  Contour invalide","  |  مخطط متقاطع أو غير صالح");
  if(valid&&Double.isFinite(h)&&h>0)text+=String.format(Locale.US,"\n%s %.2f m  •  %.2f m³",tr("Height","Hauteur","الارتفاع"),h,area*h);
  final String val=(autoMode?tr("AUTO PREVIEW · ","APERÇU AUTO · ","معاينة تلقائية · "):"")+text;StringBuilder edges=new StringBuilder(val);if(valid)for(int i=0;i<a.length;i++){float[] p=a[i],q=a[(i+1)%a.length];edges.append(String.format(Locale.US,"\n%d–%d: %.2f m",i+1,(i+1)%a.length+1,Math.hypot(p[0]-q[0],p[1]-q[1])));}detail=edges.toString();outline=a;
  runOnUiThread(()->{result.setText(val);sketch.invalidate();autoButton.setText(autoMode?tr("Use plan","Valider plan","اعتماد المخطط"):tr("Auto scan","Scan auto","مسح تلقائي"));if(!tapeMode)mark.setText(outline.length==0?tr("Lock floor","Fixer le sol","تثبيت الأرضية"):tr("Add corner","Coin suivant","زاوية جديدة"));if(!tracking)status.setText(tr("Move slowly to recover tracking.","Bougez lentement.","حرك الهاتف ببطء."));});
 }
 private final class Sketch extends View {final Paint p=new Paint(3);Sketch(){super(RoomArActivity.this);} @Override protected void onDraw(Canvas c){float[][] a=outline;if(a.length<2)return;float minX=a[0][0],maxX=minX,minY=a[0][1],maxY=minY;for(float[] x:a){minX=Math.min(minX,x[0]);maxX=Math.max(maxX,x[0]);minY=Math.min(minY,x[1]);maxY=Math.max(maxY,x[1]);}float scale=Math.min((getWidth()-40f)/Math.max(.1f,maxX-minX),(getHeight()-20f)/Math.max(.1f,maxY-minY));Path path=new Path();for(int i=0;i<a.length;i++){float x=20+(a[i][0]-minX)*scale,y=10+(a[i][1]-minY)*scale;if(i==0)path.moveTo(x,y);else path.lineTo(x,y);}if(a.length>=3)path.close();p.setColor(0xff21e0c2);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(3);c.drawPath(path,p);}}
}

