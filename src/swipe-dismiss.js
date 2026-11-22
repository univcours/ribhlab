/**
 * Gesture recognition only. UI state is closed through the existing unified
 * navigateRivoBack handler, never by removing a modal (which could leave a
 * live camera stream or OCR worker running).
 *
 * Horizontal edge gestures are handled separately by Android/main.js.
 */
export function isDismissSwipe({dx=0,dy=0,elapsedMs=0}={}){
 return Number.isFinite(dx)&&Number.isFinite(dy)&&dy>=92&&
  dy>=Math.abs(dx)*1.35&&elapsedMs>=50&&elapsedMs<=1600;
}
export function canStartModalSwipe(target){
 if(!target||typeof target.closest!=='function')return false;
 // A drag on a form, button, camera, results list or scroll area MUST
 // remain its own gesture, not dismiss the dialog.
 if(target.closest('button,a,input,select,textarea,[contenteditable="true"],video,canvas,.rivo-live-results-pane,.rivo-code-results,.rivo-plate-results-history,[data-no-swipe]'))return false;
 const header=target.closest('.rivo-live-head,[role="dialog"] header,.rivo-swipe-handle,.rivo-id-dialog header,.rivo-code-dialog header,.rivo-release-dialog header');
 if(!header)return false;
 return !!header.closest('[role="dialog"],.rivo-live-overlay,[data-rivo-managed-modal="true"],.rivo-release-overlay,.doc-detail-overlay,.rivo-editor-overlay,.rivo-perfectscan-overlay,.rivo-shield-overlay');
}
