#!/usr/bin/env bash
# Extended actual Android emulator UI audit. These are screenshots, not mockups.
set -uo pipefail
OUT="/tmp/rivoscan-play-screenshots"
mkdir -p "$OUT"
LOG="$OUT/qa-audit-report.txt"
: > "$LOG"
note(){ echo "$*" | tee -a "$LOG"; }
shot(){ local name="$1"; adb exec-out screencap -p > "$OUT/$name.png"; test -s "$OUT/$name.png" && note "CAPTURED $name" || note "FAILED $name"; }
tap(){ adb shell input tap "$1" "$2"; sleep "${3:-3}"; }
scroll(){ adb shell input swipe 565 1470 565 480 480; sleep 2; }
# Tools: top and all its long sections in actual UI.
tap 360 1780 4
shot "06-tools-top"
for n in 1 2 3 4 5 6 7; do scroll; shot "tools-scroll-$n"; done
# Me and preferences (top and scrolled).
tap 975 1780 4
shot "14-me-top"
for n in 1 2 3 4; do scroll; shot "me-scroll-$n"; done
# Header coordinates verified from an actual 1080x1920 emulator screenshot:
# language spans ~673-845; mute spans ~860-945; folder ~965-1063.
# Native language selector dialog and sound mute state.
tap 725 125 2
shot "19-language-picker"
adb shell input keyevent 4; sleep 2
tap 905 125 2
shot "20-all-sounds-muted"
tap 905 125 1
# Native camera and more controls.
tap 535 1780 7
shot "21-native-camera"
tap 1020 208 3
shot "22-native-camera-options"
adb shell input keyevent 4; sleep 2
shot "23-native-camera-return"
adb shell input keyevent 4; sleep 3
# Temporary fixture: two valid PDFs only in the isolated CI emulator.
python3 - <<'PY'
from pathlib import Path
for name in ("Alpha","Beta"):
 label=f"RivoScan Visual QA {name}"
 stream=f"BT /F1 24 Tf 60 700 Td ({label}) Tj ET".encode()
 objs=[b"<< /Type /Catalog /Pages 2 0 R >>",b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",b"<< /Length "+str(len(stream)).encode()+b" >>\nstream\n"+stream+b"\nendstream"]
 pdf=b"%PDF-1.4\n"; offsets=[0]
 for i,body in enumerate(objs,1):
  offsets.append(len(pdf)); pdf+=str(i).encode()+b" 0 obj\n"+body+b"\nendobj\n"
 xref=len(pdf); pdf+=b"xref\n0 6\n0000000000 65535 f \n"
 for pos in offsets[1:]: pdf+=f"{pos:010d} 00000 n \n".encode()
 pdf+=b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+str(xref).encode()+b"\n%%EOF\n"
 Path(f"/tmp/RivoScan_QA_{name}.pdf").write_bytes(pdf)
PY
adb shell mkdir -p /sdcard/Documents/RivoScan || true
for n in Alpha Beta; do
 adb push "/tmp/RivoScan_QA_$n.pdf" "/sdcard/Documents/RivoScan/RivoScan_QA_$n.pdf" >/dev/null
 adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///storage/emulated/0/Documents/RivoScan/RivoScan_QA_$n.pdf" >/dev/null || true
done
sleep 4
adb shell am force-stop com.ribhlab.rivoscan.debug || true
adb shell am start -W -n com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.MainActivity >/dev/null
sleep 7
tap 765 1780 4
shot "24-documents-with-qa-files"
scroll
shot "25-document-file-list"
adb shell uiautomator dump --compressed /sdcard/rivoscan-qa-hierarchy.xml >/dev/null 2>&1 || true
adb pull /sdcard/rivoscan-qa-hierarchy.xml "$OUT/qa-ui-hierarchy.xml" >/dev/null 2>&1 || true
python3 - <<'PY' > /tmp/rivoscan_qa_xy.txt
from pathlib import Path
import re,xml.etree.ElementTree as ET
p=Path("/tmp/rivoscan-play-screenshots/qa-ui-hierarchy.xml")
if p.exists():
 try:
  for el in ET.parse(p).iter("node"):
   txt=(el.attrib.get("text") or "")+" "+(el.attrib.get("content-desc") or "")
   if "RivoScan_QA_Alpha" in txt:
    xy=list(map(int,re.findall(r"\d+",el.attrib.get("bounds") or "")))
    if len(xy)==4: print(80,(xy[1]+xy[3])//2); break
 except Exception: pass
PY
if read -r x y < /tmp/rivoscan_qa_xy.txt;then
 note "QA_PDF_ROW_FOUND $x $y"
 tap "$x" "$y" 3
 shot "26-selected-file-six-actions-single-row"
else
 note "QA_PDF_ROW_NOT_ACCESSIBLE: selected-file screenshot NOT VERIFIED."
fi
note "Audit captured real screens; optional PDF selection status above."
node apps/rivoscan/scripts/capture-webview-interactions.mjs 2>&1 | tee -a "$LOG" || true

