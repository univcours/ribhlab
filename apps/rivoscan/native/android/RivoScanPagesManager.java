package com.ribhlab.rivoscan;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.net.Uri;
import android.view.DragEvent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Manage the pages of a CURRENT scan, before the PDF is assembled.
 * Selecting, reordering, removing and rotating a session never modifies or
 * deletes the originals published in Documents/RivoScan/Originals.
 */
public final class RivoScanPagesManager {
    private final Activity host;
    private final ArrayList<Page> pages=new ArrayList<>();
    private final Consumer<ArrayList<String>> onCommit;
    private final Map<String,Bitmap> thumbs=new HashMap<>();
    private final String[] labels;
    private LinearLayout panel;
    private GridLayout grid;
    private TextView count;
    private AlertDialog dialog;
    private boolean saving=false;
    private int dragged=-1;

    private static final class Page {
        final String uri;
        boolean selected=false;
        int rotation=0;
        Page(String uri){this.uri=uri;}
    }
    private static final String[][] STRINGS={
      {"Manage Pages","selected","Select all","Deselect","Left","Right","Delete","✓ Save","Cancel","Drag to reorder, or use ↑ ↓","Page","No pages selected","Could not edit pages: "},
      {"إدارة الصفحات","محددة","تحديد الكل","إلغاء التحديد","يسار","يمين","حذف","✓ حفظ","إلغاء","جرّ لترتيب الصفحات أو استعمل ↑ ↓","صفحة","ما تحددت حتى صفحة","تعذر تعديل الصفحات: "},
      {"Gérer les pages","sélectionnées","Tout sélectionner","Tout désélectionner","Gauche","Droite","Supprimer","✓ Enregistrer","Annuler","Glissez ou utilisez ↑ ↓","Page","Aucune sélection","Impossible de modifier : "},
      {"Gestionar páginas","seleccionadas","Seleccionar todo","Deseleccionar","Izquierda","Derecha","Eliminar","✓ Guardar","Cancelar","Arrastra o usa ↑ ↓","Página","Sin selección","Error al editar: "},
      {"Seiten verwalten","gewählt","Alle wählen","Auswahl aufheben","Links","Rechts","Entfernen","✓ Speichern","Abbrechen","Ziehen oder ↑ ↓ benutzen","Seite","Keine Auswahl","Seitenfehler: "},
      {"Gerir páginas","selecionadas","Selecionar tudo","Desmarcar","Esquerda","Direita","Eliminar","✓ Guardar","Cancelar","Arraste ou use ↑ ↓","Página","Sem seleção","Erro nas páginas: "},
      {"Gestisci pagine","selezionate","Seleziona tutto","Deseleziona","Sinistra","Destra","Rimuovi","✓ Salva","Annulla","Trascina o usa ↑ ↓","Pagina","Nessuna selezione","Errore pagine: "}
    };
    private static int index(String language){
        if("ar".equals(language))return 1;
        if("fr".equals(language))return 2;
        if("es".equals(language))return 3;
        if("de".equals(language))return 4;
        if("pt".equals(language))return 5;
        if("it".equals(language))return 6;
        return 0;
    }
    private int dp(float size){return Math.max(1,Math.round(size*host.getResources().getDisplayMetrics().density));}
    private RivoScanPagesManager(Activity owner,List<String> scans,String language,Consumer<ArrayList<String>> save){
        host=owner;onCommit=save;labels=STRINGS[index(language)];
        for(String uri:scans)pages.add(new Page(uri));
    }
    public static void show(Activity owner,List<String> scans,String language,Consumer<ArrayList<String>> onCommit){
        if(scans==null||scans.isEmpty())return;
        new RivoScanPagesManager(owner,scans,language,onCommit).open();
    }
    private TextView text(String value,int size){
        TextView t=new TextView(host);t.setText(value);t.setTextSize(size);
        t.setTextColor(Color.WHITE);t.setGravity(Gravity.CENTER);return t;
    }
    private Button button(String label,Runnable click){
        Button b=new Button(host);b.setText(label);b.setAllCaps(false);
        b.setTextSize(12);b.setTextColor(Color.WHITE);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(25,79,150)));
        b.setOnClickListener(v->{if(!saving)click.run();});return b;
    }
    private void open(){
        panel=new LinearLayout(host);panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(8),dp(12),dp(8),dp(10));panel.setBackgroundColor(Color.rgb(18,24,45));
        panel.addView(text(labels[0],19),new LinearLayout.LayoutParams(-1,dp(42)));
        count=text("",13);panel.addView(count,new LinearLayout.LayoutParams(-1,dp(30)));
        LinearLayout top=new LinearLayout(host);
        top.addView(button(labels[2],()->{for(Page p:pages)p.selected=true;draw();}),new LinearLayout.LayoutParams(0,dp(46),1));
        top.addView(button(labels[3],()->{for(Page p:pages)p.selected=false;draw();}),new LinearLayout.LayoutParams(0,dp(46),1));
        panel.addView(top);
        TextView instruction=text(labels[9],12);instruction.setTextColor(Color.rgb(191,208,235));
        panel.addView(instruction,new LinearLayout.LayoutParams(-1,dp(35)));
        ScrollView scroller=new ScrollView(host);scroller.setFillViewport(true);
        grid=new GridLayout(host);grid.setColumnCount(2);
        scroller.addView(grid);
        panel.addView(scroller,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout edit=new LinearLayout(host);
        edit.addView(button("↶ "+labels[4],()->rotate(-90)),new LinearLayout.LayoutParams(0,dp(48),1));
        edit.addView(button("↷ "+labels[5],()->rotate(90)),new LinearLayout.LayoutParams(0,dp(48),1));
        edit.addView(button("⌫ "+labels[6],this::remove),new LinearLayout.LayoutParams(0,dp(48),1));
        panel.addView(edit);
        LinearLayout actions=new LinearLayout(host);
        actions.addView(button("× "+labels[8],()->dialog.dismiss()),new LinearLayout.LayoutParams(0,dp(52),1));
        actions.addView(button(labels[7],this::commit),new LinearLayout.LayoutParams(0,dp(52),1));
        panel.addView(actions);
        dialog=new AlertDialog.Builder(host).setView(panel).create();
        dialog.setOnDismissListener(d->{
            for(Bitmap image:thumbs.values())if(image!=null&&!image.isRecycled())image.recycle();
            thumbs.clear();
        });
        dialog.show();
        if(dialog.getWindow()!=null){
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT);
        }
        draw();
    }
    private Bitmap thumbnail(Page page){
        Bitmap old=thumbs.get(page.uri);if(old!=null&&!old.isRecycled())return old;
        try{
            File file=new File(Uri.parse(page.uri).getPath());
            BitmapFactory.Options size=new BitmapFactory.Options();size.inJustDecodeBounds=true;
            BitmapFactory.decodeFile(file.getAbsolutePath(),size);
            if(size.outWidth<1||size.outHeight<1)return null;
            BitmapFactory.Options opts=new BitmapFactory.Options();
            int sample=1;while(Math.max(size.outWidth,size.outHeight)/sample>320)sample*=2;
            opts.inSampleSize=sample;
            Bitmap bitmap=BitmapFactory.decodeFile(file.getAbsolutePath(),opts);
            if(bitmap!=null)thumbs.put(page.uri,bitmap);
            return bitmap;
        }catch(Exception ignored){return null;}
    }
    private void draw(){
        if(saving)return;
        grid.removeAllViews();
        int selected=0;for(Page page:pages)if(page.selected)selected++;
        count.setText(selected+" "+labels[1]+" • "+pages.size()+" "+labels[10]);
        final int cardWidth=Math.max(dp(140),
            (host.getResources().getDisplayMetrics().widthPixels-dp(44))/2);
        for(int index=0;index<pages.size();index++){
            final Page p=pages.get(index);
            final int position=index;
            LinearLayout card=new LinearLayout(host);
            card.setOrientation(LinearLayout.VERTICAL);card.setGravity(Gravity.CENTER);
            card.setPadding(dp(5),dp(7),dp(5),dp(7));
            card.setBackgroundColor(p.selected?Color.rgb(7,104,155):Color.rgb(28,39,69));
            GridLayout.LayoutParams glp=new GridLayout.LayoutParams();
            glp.width=cardWidth;glp.height=dp(205);glp.setMargins(dp(3),dp(4),dp(3),dp(4));
            ImageView image=new ImageView(host);image.setScaleType(ImageView.ScaleType.FIT_CENTER);
            image.setBackgroundColor(Color.rgb(210,218,227));
            Bitmap bitmap=thumbnail(p);if(bitmap!=null)image.setImageBitmap(bitmap);
            image.setRotation(p.rotation);
            card.addView(image,new LinearLayout.LayoutParams(-1,0,1));
            card.addView(text((p.selected?"☑ ":"□ ")+labels[10]+" "+(index+1),12),
                new LinearLayout.LayoutParams(-1,dp(30)));
            LinearLayout move=new LinearLayout(host);
            move.addView(button("↑",()->shift(p,-1)),new LinearLayout.LayoutParams(0,dp(39),1));
            move.addView(button("↓",()->shift(p,1)),new LinearLayout.LayoutParams(0,dp(39),1));
            card.addView(move);
            image.setOnClickListener(v->{p.selected=!p.selected;draw();});
            image.setOnLongClickListener(v->{
                dragged=pages.indexOf(p);
                ClipData data=ClipData.newPlainText("rivoscan-page",String.valueOf(dragged));
                return v.startDragAndDrop(data,new View.DragShadowBuilder(card),null,0);
            });
            card.setOnDragListener((v,event)->{
                if(saving)return false;
                if(event.getAction()==DragEvent.ACTION_DRAG_STARTED)return true;
                if(event.getAction()==DragEvent.ACTION_DRAG_ENTERED){card.setAlpha(.65f);return true;}
                if(event.getAction()==DragEvent.ACTION_DRAG_EXITED){card.setAlpha(1f);return true;}
                if(event.getAction()==DragEvent.ACTION_DROP){
                    card.setAlpha(1f);
                    if(dragged>=0&&dragged<pages.size()){
                        Page moving=pages.remove(dragged);
                        int destination=pages.indexOf(p);
                        if(destination<0)destination=pages.size();
                        pages.add(destination,moving);dragged=-1;draw();
                    }
                    return true;
                }
                if(event.getAction()==DragEvent.ACTION_DRAG_ENDED){card.setAlpha(1f);dragged=-1;return true;}
                return true;
            });
            grid.addView(card,glp);
        }
    }
    private void shift(Page p,int distance){
        int from=pages.indexOf(p),to=from+distance;
        if(to<0||to>=pages.size())return;
        pages.remove(from);pages.add(to,p);draw();
    }
    private void rotate(int direction){
        boolean changed=false;
        for(Page p:pages)if(p.selected){p.rotation=(p.rotation+direction+360)%360;changed=true;}
        if(!changed){Toast.makeText(host,labels[11],Toast.LENGTH_SHORT).show();return;}
        draw();
    }
    private void remove(){
        boolean has=false;
        for(Page p:pages)if(p.selected){has=true;break;}
        if(!has){Toast.makeText(host,labels[11],Toast.LENGTH_SHORT).show();return;}
        // This removes pages only from the current PDF session, NEVER Documents.
        pages.removeIf(p->p.selected);draw();
    }
    private void commit(){
        if(saving)return;saving=true;dialog.setCancelable(false);
        count.setText(labels[7]+" …");
        new Thread(()->{
            ArrayList<String> results=new ArrayList<>();
            ArrayList<File> created=new ArrayList<>();
            try{
                for(Page page:pages){
                    if(page.rotation==0){results.add(page.uri);continue;}
                    String source=Uri.parse(page.uri).getPath();
                    if(source==null)throw new IllegalStateException("Missing page");
                    Bitmap original=BitmapFactory.decodeFile(source);
                    if(original==null)throw new IllegalStateException("Cannot decode page");
                    Bitmap rotated=null;
                    try{
                        Matrix matrix=new Matrix();matrix.postRotate(page.rotation);
                        rotated=Bitmap.createBitmap(original,0,0,
                            original.getWidth(),original.getHeight(),matrix,true);
                        File output=new File(host.getCacheDir(),"rivo_page_rotated_"+System.nanoTime()+".jpg");
                        created.add(output);
                        try(FileOutputStream stream=new FileOutputStream(output)){
                            if(!rotated.compress(Bitmap.CompressFormat.JPEG,94,stream))
                                throw new IllegalStateException("JPEG export failed");
                        }
                        results.add(Uri.fromFile(output).toString());
                    }finally{
                        if(rotated!=null&&rotated!=original&&!rotated.isRecycled())rotated.recycle();
                        if(!original.isRecycled())original.recycle();
                    }
                }
                host.runOnUiThread(()->{
                    if(host.isFinishing()||host.isDestroyed())return;
                    dialog.dismiss();
                    onCommit.accept(results);
                });
            }catch(Throwable error){
                for(File f:created)f.delete();
                host.runOnUiThread(()->{
                    saving=false;dialog.setCancelable(true);
                    Toast.makeText(host,labels[12]+error.getMessage(),Toast.LENGTH_LONG).show();
                    draw();
                });
            }
        },"RivoScan-pages").start();
    }
}
