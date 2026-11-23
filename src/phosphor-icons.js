// Official Phosphor Icons DUOTONE SVG data from phosphor-icons/core.
 // MIT license: see PHOSPHOR-LICENSE. Bundled offline; no remote icon font/CDN.
import {pA} from './phosphor-icons-part-a.js';
import {pB} from './phosphor-icons-part-b.js';
import {pC} from './phosphor-icons-part-c.js';
import {pD} from './phosphor-icons-part-d.js';
import {pE} from './phosphor-icons-part-e.js';
import {pF} from './phosphor-icons-part-f.js';
import {pExtra} from './phosphor-icons-extra.js';
const PATHS=Object.freeze({...pA,...pB,...pC,...pD,...pE,...pF,...pExtra});
export const PHOSPHOR_MAP=Object.freeze({"crown":"crown","book":"book-open-text","play":"play-circle","home":"house","edges":"crop","scan":"scan","merge":"files","split":"split-horizontal","rotate":"arrow-clockwise","delete":"file-x","reorder":"list","numbers":"list-numbers","watermark":"drop","text":"text-t","sign":"signature","image":"image","convert":"arrows-left-right","ocr":"text-align-left","compress":"arrows-in","info":"info","shield":"shield-check","upload":"upload-simple","download":"download-simple","back":"caret-left","file":"file","camera":"camera","clock":"clock","check":"check","sparkle":"sparkle","search":"magnifying-glass","lock":"lock","folder":"folder","grid":"squares-four","qr":"qr-code","plate":"identification-card","translate":"translate","math":"function","volume":"speaker-high","muted":"speaker-slash","globe":"globe","idcard":"identification-card","eye":"eye","share":"share-network","pencil":"pencil-simple","trash":"trash","sheet":"file-xls","filelines":"file-text","barcode":"barcode","archive":"archive","user":"user-circle","more":"dots-three","external":"arrow-square-out","printer":"printer","plus":"plus","minus":"minus","maximize":"arrows-out","pdf":"file-pdf","close":"x","next":"caret-right","previous":"caret-left","settings":"gear-six","move":"folder-open","all":"check-square","refresh":"arrows-clockwise","save":"floppy-disk"});
// Every control uses the same official Phosphor Duotone set. These aliases
// preserve old action identifiers while eliminating hand-drawn glyphs.
export const PHOSPHOR_EXTRA_MAP=Object.freeze({
 "flash":"flashlight","torch":"flashlight","lightning":"lightning",
 "undo":"arrow-counter-clockwise","redo":"arrow-clockwise","restore":"arrow-counter-clockwise","reset":"arrow-counter-clockwise",
 "rotate-left":"arrow-arc-left","rotate-right":"arrow-arc-right",
 "left":"arrow-left","right":"arrow-right","up":"arrow-up","down":"arrow-down",
 "expand":"arrows-out","collapse":"arrows-in","chevron-down":"caret-down","chevron-up":"caret-up",
 "gear":"gear-six","settings-gear":"gear-six","filter":"sliders-horizontal",
 "filters":"sliders-horizontal","adjust":"sliders-horizontal","tools":"squares-four",
 "eraser":"eraser","edit":"pencil-simple","date":"calendar","calendar":"calendar","brightness":"sun","sun":"sun",
 "gallery":"images","photos":"images","photo":"camera","source":"image","flatten":"book-open-text",
 "background":"paint-brush","magic":"magic-wand","process":"magic-wand","check-circle":"check-circle",
 "select":"check-square","done":"check-circle","tabs":"columns","compare":"arrows-left-right"
});
export const hasPhosphorIcon=name=>Boolean(PATHS[PHOSPHOR_EXTRA_MAP[name]||PHOSPHOR_MAP[name]||name]);
export function phosphorIcon(name,size=20){
 const key=PHOSPHOR_EXTRA_MAP[name]||PHOSPHOR_MAP[name]||name;
 const path=PATHS[key]||PATHS.file;
 const number=Number(size);
 const dimension=Number.isFinite(number)?Math.max(12,Math.min(96,number)):20;
 return '<svg data-phosphor-icon="'+key+'" aria-hidden="true" focusable="false" width="'+dimension+'" height="'+dimension+'" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'+path+'</svg>';
}
