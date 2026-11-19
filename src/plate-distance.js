/**
 * Auto-distance plate search for actual camera frames.
 * Camera zoom depends on device support. Cropping re-examines existing pixels;
 * it cannot reconstruct details absent from the camera sensor.
 */
const MAX_CAMERA_ZOOM=6;
export function readPlateZoomRange(capabilities={},settings={}){
 const zoom=capabilities?.zoom;
 if(!zoom||!Number.isFinite(zoom.min)||!Number.isFinite(zoom.max)||zoom.max<=zoom.min)return null;
 const min=Math.max(1,zoom.min),max=Math.min(MAX_CAMERA_ZOOM,zoom.max);
 if(max-min<0.15)return null;
 const step=Number.isFinite(zoom.step)&&zoom.step>0?zoom.step:0.05;
 const current=Number.isFinite(settings?.zoom)?settings.zoom:min;
 return {min,max,step,current:Math.min(max,Math.max(min,current))};
}
export function boundPlateZoom(value,range){
 if(!range||!Number.isFinite(value))return null;
 const bounded=Math.max(range.min,Math.min(range.max,value));
 const steps=Math.round((bounded-range.min)/range.step);
 return Number(Math.max(range.min,Math.min(range.max,range.min+steps*range.step)).toFixed(3));
}
/** Let autofocus settle, search at escalating zoom, then reset for wide discovery. */
export function planPlateAutoZoom({range,current,misses=0,elapsedMs=0}={}){
 if(!range||!Number.isFinite(current)||misses<4||elapsedMs<1800)return null;
 if(current>=range.max-Math.max(range.step,.08))
  return misses>=12?range.min:null;
 const target=boundPlateZoom(Math.max(current*1.55,current+0.35),range);
 return target!=null&&target>current+0.05?target:null;
}
/** Wide view plus overlapping ROIs: centre/left/right search. */
export function plateSearchRoi(width,height,pass=0){
 if(![width,height,pass].every(Number.isFinite)||width<=0||height<=0)throw Error('Invalid camera frame');
 const regions=[
  [0.02,0.12,0.96,0.76],
  [0.03,0.27,0.62,0.51],
  [0.35,0.27,0.62,0.51],
  [0.08,0.27,0.84,0.45]
 ];
 const [rx,ry,rw,rh]=regions[Math.abs(Math.floor(pass))%regions.length];
 const x=Math.round(width*rx),y=Math.round(height*ry);
 return {x,y,w:Math.max(1,Math.min(width-x,Math.round(width*rw))),
  h:Math.max(1,Math.min(height-y,Math.round(height*rh)))};
}
/** Check the actual zoom setting rather than only trusting the request. */
export async function applyPlateZoom(track,range,requested){
 if(!range||typeof track?.applyConstraints!=='function')throw Error('Camera zoom unavailable');
 const zoom=boundPlateZoom(requested,range);
 if(zoom==null)throw Error('Invalid requested zoom');
 await track.applyConstraints({advanced:[{zoom}]});
 const applied=Number(track.getSettings?.()?.zoom);
 if(!Number.isFinite(applied)||Math.abs(applied-zoom)>Math.max(0.12,range.step*1.5))
  throw Error('Camera did not apply the requested zoom');
 return applied;
}
