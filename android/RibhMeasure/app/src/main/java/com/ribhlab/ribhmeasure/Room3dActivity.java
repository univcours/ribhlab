package com.ribhlab.ribhmeasure;
import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.view.*;
import android.widget.*;
import java.nio.*;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Real depth-tested metric room geometry. No placeholder height or fabricated objects. */
public final class Room3dActivity extends Activity {
 private GLSurfaceView surface;
 private Renderer renderer;
 private LinearLayout walkControls;
 private RoomMesh mesh;
 private String tr(String en,String fr,String ar){String l=getResources().getConfiguration().getLocales().get(0).getLanguage();return l.equals("ar")?ar:l.equals("fr")?fr:en;}
 @Override protected void attachBaseContext(Context base){super.attachBaseContext(Prefs.locale(base));}
 private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
 @Override protected void onCreate(Bundle b){super.onCreate(b);try{mesh=RoomMesh.create(RoomMath.fromFlat(getIntent().getFloatArrayExtra("outline")),getIntent().getFloatExtra("height",Float.NaN));}catch(IllegalArgumentException e){Toast.makeText(this,tr("Valid room and height required","Pièce et hauteur valides requises","خاص مخطط وارتفاع صالحين"),Toast.LENGTH_LONG).show();finish();return;}
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff07111e);root.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});
  LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);root.addView(header);button(header,tr("Back","Retour","رجوع"),()->finish());TextView title=new TextView(this);title.setText(tr("3D room","Pièce 3D","غرفة ثلاثية الأبعاد"));title.setTextSize(22);title.setTextColor(0xffe5f4f4);header.addView(title,new LinearLayout.LayoutParams(0,-2,2));
  TextView instructions=new TextView(this);instructions.setText(tr("Drag to orbit · Pinch to zoom","Glissez pour tourner · Pincez pour zoomer","اسحب للتدوير · قرّب بإصبعين"));instructions.setTextColor(0xffa6d7d5);instructions.setPadding(dp(16),dp(8),dp(16),dp(8));root.addView(instructions);
  surface=new GLSurfaceView(this);surface.setEGLContextClientVersion(2);renderer=new Renderer(mesh);surface.setRenderer(renderer);surface.setRenderMode(GLSurfaceView.RENDERMODE_WHEN_DIRTY);root.addView(surface,new LinearLayout.LayoutParams(-1,0,1));surface.setContentDescription(tr("Interactive 3D model","Modèle 3D interactif","مجسم ثلاثي الأبعاد تفاعلي"));
  final ScaleGestureDetector scale=new ScaleGestureDetector(this,new ScaleGestureDetector.SimpleOnScaleGestureListener(){@Override public boolean onScale(ScaleGestureDetector detector){if(!renderer.walk){renderer.zoom=Math.max(.55f,Math.min(3.2f,renderer.zoom/detector.getScaleFactor()));surface.requestRender();}return true;}});
  surface.setOnTouchListener(new View.OnTouchListener(){float x,y;@Override public boolean onTouch(View v,MotionEvent e){scale.onTouchEvent(e);switch(e.getActionMasked()){case MotionEvent.ACTION_DOWN:x=e.getX();y=e.getY();return true;case MotionEvent.ACTION_MOVE:if(!scale.isInProgress()&&e.getPointerCount()==1){renderer.yaw+=(e.getX()-x)*.008f;renderer.pitch=Math.max(-.85f,Math.min(1.48f,renderer.pitch+(e.getY()-y)*.006f));surface.requestRender();}x=e.getX();y=e.getY();return true;case MotionEvent.ACTION_POINTER_UP:if(e.getPointerCount()>1){int j=e.getActionIndex()==0?1:0;x=e.getX(j);y=e.getY(j);}return true;case MotionEvent.ACTION_UP:v.performClick();return true;default:return true;}}});
  LinearLayout tools=new LinearLayout(this);root.addView(tools);button(tools,tr("Orbit","Orbite","دوران"),()->{renderer.walk=false;renderer.pitch=.70f;renderer.ceiling=false;walkControls.setVisibility(View.GONE);surface.requestRender();});
  button(tools,tr("Top","Dessus","علوي"),()->{renderer.walk=false;renderer.pitch=1.48f;renderer.ceiling=false;walkControls.setVisibility(View.GONE);surface.requestRender();});
  button(tools,tr("Walk","Visite","جولة"),()->{renderer.walk=true;renderer.pitch=0;renderer.ceiling=true;walkControls.setVisibility(View.VISIBLE);surface.requestRender();});
  LinearLayout more=new LinearLayout(this);root.addView(more);button(more,tr("Ceiling","Plafond","السقف"),()->{renderer.ceiling=!renderer.ceiling;surface.requestRender();});button(more,tr("Wall color","Couleur","لون الجدران"),()->{renderer.palette=(renderer.palette+1)%3;surface.requestRender();});button(more,tr("Reset","Réinitialiser","إعادة"),()->{renderer.reset();walkControls.setVisibility(View.GONE);surface.requestRender();});
  walkControls=new LinearLayout(this);root.addView(walkControls);button(walkControls,"↑",()->step(0));button(walkControls,"↓",()->step((float)Math.PI));button(walkControls,"←",()->step(-(float)Math.PI/2));button(walkControls,"→",()->step((float)Math.PI/2));walkControls.setVisibility(View.GONE);
  setContentView(root);
 }
 private void button(LinearLayout p,String text,Runnable action){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextSize(12);b.setOnClickListener(v->action.run());p.addView(b,new LinearLayout.LayoutParams(0,dp(48),1));}
 private void step(float offset){float yaw=renderer.yaw+offset;float x=renderer.eyeX+(float)Math.sin(yaw)*.30f,z=renderer.eyeZ+(float)Math.cos(yaw)*.30f;float midX=(renderer.eyeX+x)/2,midZ=(renderer.eyeZ+z)/2;if(WallLoop.contains(mesh.outline,x,z)&&WallLoop.contains(mesh.outline,midX,midZ)){renderer.eyeX=x;renderer.eyeZ=z;surface.requestRender();}else Toast.makeText(this,tr("Room boundary","Limite de la pièce","حدود الغرفة"),Toast.LENGTH_SHORT).show();}
 @Override protected void onResume(){super.onResume();if(surface!=null)surface.onResume();}
 @Override protected void onPause(){if(surface!=null)surface.onPause();super.onPause();}
 private static final class Renderer implements GLSurfaceView.Renderer{
  final RoomMesh mesh;final FloatBuffer vertices,normals;volatile float yaw=.65f,pitch=.70f,zoom=1,eyeX,eyeZ;volatile boolean walk=false,ceiling=false;volatile int palette=0;
  private int program,pLoc,nLoc,mLoc,cLoc;private int width=1,height=1;private final float[] vp=new float[16],view=new float[16],proj=new float[16];
  private static final float[][] COLORS={{.68f,.78f,.76f},{.83f,.76f,.64f},{.66f,.73f,.86f}};
  Renderer(RoomMesh m){mesh=m;vertices=buffer(m.positions);normals=buffer(m.normals);eyeX=m.eyeX;eyeZ=m.eyeZ;}
  void reset(){yaw=.65f;pitch=.70f;zoom=1;eyeX=mesh.eyeX;eyeZ=mesh.eyeZ;walk=false;ceiling=false;palette=0;}
  static FloatBuffer buffer(float[] a){FloatBuffer b=ByteBuffer.allocateDirect(a.length*4).order(ByteOrder.nativeOrder()).asFloatBuffer();b.put(a).position(0);return b;}
  @Override public void onSurfaceCreated(GL10 g,EGLConfig c){GLES20.glClearColor(.045f,.075f,.095f,1);GLES20.glEnable(GLES20.GL_DEPTH_TEST);GLES20.glDisable(GLES20.GL_CULL_FACE);int vs=compile(GLES20.GL_VERTEX_SHADER,"attribute vec3 p;attribute vec3 n;uniform mat4 vp;varying float l;void main(){gl_Position=vp*vec4(p,1.0);l=0.48+0.52*abs(dot(normalize(n),normalize(vec3(0.45,0.82,0.35))));}");int fs=compile(GLES20.GL_FRAGMENT_SHADER,"precision mediump float;uniform vec3 color;varying float l;void main(){gl_FragColor=vec4(color*l,1.0);}");program=GLES20.glCreateProgram();GLES20.glAttachShader(program,vs);GLES20.glAttachShader(program,fs);GLES20.glLinkProgram(program);int[] ok=new int[1];GLES20.glGetProgramiv(program,GLES20.GL_LINK_STATUS,ok,0);if(ok[0]==0)throw new IllegalStateException(GLES20.glGetProgramInfoLog(program));GLES20.glDeleteShader(vs);GLES20.glDeleteShader(fs);pLoc=GLES20.glGetAttribLocation(program,"p");nLoc=GLES20.glGetAttribLocation(program,"n");mLoc=GLES20.glGetUniformLocation(program,"vp");cLoc=GLES20.glGetUniformLocation(program,"color");}
  static int compile(int type,String s){int sh=GLES20.glCreateShader(type);GLES20.glShaderSource(sh,s);GLES20.glCompileShader(sh);int[] ok=new int[1];GLES20.glGetShaderiv(sh,GLES20.GL_COMPILE_STATUS,ok,0);if(ok[0]==0)throw new IllegalStateException(GLES20.glGetShaderInfoLog(sh));return sh;}
  @Override public void onSurfaceChanged(GL10 g,int w,int h){width=Math.max(1,w);height=Math.max(1,h);GLES20.glViewport(0,0,width,height);}
  @Override public void onDrawFrame(GL10 g){GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT|GLES20.GL_DEPTH_BUFFER_BIT);float a=yaw,b=pitch;
   Matrix.perspectiveM(proj,0,walk?70:45,(float)width/height,.025f,Math.max(100,mesh.radius*12));
   if(walk){float y=Math.min(1.65f,mesh.height*.75f);Matrix.setLookAtM(view,0,eyeX,y,eyeZ,eyeX+(float)Math.sin(a),y+(float)Math.tan(b),eyeZ+(float)Math.cos(a),0,1,0);}
   else{float distance=Math.max(2,mesh.radius*3.3f)*zoom,cy=mesh.height*.35f;Matrix.setLookAtM(view,0,(float)(Math.sin(a)*Math.cos(b)*distance),cy+(float)Math.sin(b)*distance,(float)(Math.cos(a)*Math.cos(b)*distance),0,cy,0,0,1,0);}
   Matrix.multiplyMM(vp,0,proj,0,view,0);GLES20.glUseProgram(program);GLES20.glUniformMatrix4fv(mLoc,1,false,vp,0);vertices.position(0);normals.position(0);GLES20.glEnableVertexAttribArray(pLoc);GLES20.glEnableVertexAttribArray(nLoc);GLES20.glVertexAttribPointer(pLoc,3,GLES20.GL_FLOAT,false,0,vertices);GLES20.glVertexAttribPointer(nLoc,3,GLES20.GL_FLOAT,false,0,normals);
   draw(0,mesh.floorVertices,new float[]{.19f,.50f,.48f});draw(mesh.floorVertices,mesh.wallVertices,COLORS[palette]);if(ceiling)draw(mesh.floorVertices+mesh.wallVertices,mesh.ceilingVertices,new float[]{.84f,.87f,.87f});GLES20.glDisableVertexAttribArray(pLoc);GLES20.glDisableVertexAttribArray(nLoc);
  }
  void draw(int first,int count,float[] col){GLES20.glUniform3fv(cLoc,1,col,0);GLES20.glDrawArrays(GLES20.GL_TRIANGLES,first,count);}
 }
}
