// Compatibility layer for older scanner/editor modules.
// Actual rendered icons are Google Material Symbols ROUNDED, not Phosphor.
// Do not reintroduce Phosphor glyph paths or network icon requests.
import {materialSymbol,hasMaterialSymbol,MATERIAL_SYMBOLS_MAP} from './material-symbols.js';
export const PHOSPHOR_MAP=MATERIAL_SYMBOLS_MAP; // legacy exported variable name only
export const PHOSPHOR_EXTRA_MAP=Object.freeze({});
export const hasPhosphorIcon=hasMaterialSymbol; // legacy function name only
export const phosphorIcon=materialSymbol; // all existing calls now render Rounded symbols
