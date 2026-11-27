#!/usr/bin/env python3
"""Record *real* RivoTalk alpha08 UI screens from exact original-key APK.

No mock-ups, generated gameplay, edited screenshots or screenshots from old v4.
The APK is downloaded from the SHA-verified alpha08 release by the workflow.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.ribhlab.rivotalk"
ACTIVITY = "com.ribhlab.rivotalk.MainActivity"


def adb(*args: str, check: bool = True, binary: bool = False):
    result = subprocess.run(
        ["adb", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        timeout=95, check=False,
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            "ADB command failed: " + " ".join(args)
            + "\n" + result.stderr.decode(errors="replace")[-700:]
        )
    return result.stdout if binary else result.stdout.decode(errors="replace")


def ui(out: Path, tag: str) -> list[ET.Element]:
    for retry in range(8):
        response = adb("shell", "uiautomator", "dump", "/sdcard/rivotalk-ui.xml", check=False)
        if "dumped to" in response or adb(
            "shell", "test", "-s", "/sdcard/rivotalk-ui.xml", check=False
        ) is not None:
            raw = adb("exec-out", "cat", "/sdcard/rivotalk-ui.xml", check=False, binary=True)
            if b"<?xml" in raw[:200]:
                try:
                    root = ET.fromstring(raw)
                    (out / f"{tag}.xml").write_bytes(raw)
                    return list(root.iter("node"))
                except ET.ParseError:
                    pass
        if retry == 3:
            adb("shell", "input", "keyevent", "82", check=False)
            adb("shell", "am", "start", "-W", "-n", PACKAGE + "/" + ACTIVITY, check=False)
        time.sleep(3)
    raise RuntimeError("Android UI hierarchy could not be captured from the running RivoTalk app")


def content(node: ET.Element) -> str:
    return " ".join((node.attrib.get("text", ""), node.attrib.get("content-desc", "")))


def tap(nodes: list[ET.Element], label: str) -> bool:
    for node in nodes:
        if label.casefold() not in content(node).casefold():
            continue
        bounds = list(map(int, re.findall(r"\d+", node.attrib.get("bounds", ""))))
        if len(bounds) != 4 or bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            continue
        adb("shell", "input", "tap",
            str((bounds[0] + bounds[2]) // 2),
            str((bounds[1] + bounds[3]) // 2))
        time.sleep(3)
        return True
    return False


def capture(path: Path, nodes: list[ET.Element]) -> str:
    assert nodes, "Cannot take unverifiable screenshot without UI hierarchy"
    raw = adb("exec-out", "screencap", "-p", binary=True)
    assert raw[:8] == b"\x89PNG\r\n\x1a\n" and len(raw) > 18000
    width = int.from_bytes(raw[16:20], "big")
    height = int.from_bytes(raw[20:24], "big")
    assert (width, height) == (1080, 1920), (width, height)
    path.write_bytes(raw)
    return hashlib.sha256(raw).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)

    adb("wait-for-device")
    adb("shell", "wm", "size", "1080x1920")
    adb("shell", "wm", "density", "420")
    adb("install", "-r", str(args.apk.resolve()))
    for permission in (
        "android.permission.RECORD_AUDIO",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.POST_NOTIFICATIONS",
    ):
        adb("shell", "pm", "grant", PACKAGE, permission, check=False)
    adb("shell", "am", "force-stop", PACKAGE, check=False)
    adb("shell", "am", "start", "-W", "-n", PACKAGE + "/" + ACTIVITY)
    time.sleep(12)

    visible = ui(out, "01-home")
    home = " ".join(content(node) for node in visible)
    assert any(s in home.casefold() for s in ("rivotalk", "create group", "ready to connect")), (
        "The running screen does not identify the RivoTalk application"
    )
    hashes = {capture(out / "01-home.png", visible)}
    print("RIVOTALK_ALPHA08_REAL_HOME=PASS", flush=True)

    # Navigate using only buttons that are ACTUALLY present in this exact APK.
    for label, filename in (
        ("Diagnostics", "02-diagnostics"),
        ("Privacy", "03-privacy"),
        ("Settings", "04-settings"),
    ):
        nodes = ui(out, "current")
        if tap(nodes, label):
            after = ui(out, filename)
            digest = capture(out / f"{filename}.png", after)
            if digest in hashes:
                (out / f"{filename}.png").unlink()
                (out / f"{filename}.xml").unlink(missing_ok=True)
            else:
                hashes.add(digest)
            adb("shell", "input", "keyevent", "4", check=False)
            time.sleep(2)

    images = sorted(out.glob("[0-9][0-9]-*.png"))
    if len(images) < 2:
        raise RuntimeError(
            "Only one verified real alpha08 screen available; refusing to fabricate "
            "or upload incompatible Play images"
        )
    adb("shell", "pidof", PACKAGE)
    print("RIVOTALK_ALPHA08_REAL_SCREENSHOTS=" + str(len(images)))
    for image in images:
        print(image.name + " sha256=" + hashlib.sha256(image.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
