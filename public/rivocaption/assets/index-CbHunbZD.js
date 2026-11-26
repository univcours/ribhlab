(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const seconds = (text) => {
  const t = String(text).trim().replace(",", ".").split(":");
  if (t.length < 2 || t.length > 3) return null;
  const nums = t.map(Number);
  if (nums.some((x) => !Number.isFinite(x) || x < 0)) return null;
  return t.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
};
const stamp = (s) => {
  s = Math.max(0, Number(s) || 0);
  let ms = Math.round(s * 1e3);
  const h = Math.floor(ms / 36e5);
  ms %= 36e5;
  const m = Math.floor(ms / 6e4);
  ms %= 6e4;
  const sec = Math.floor(ms / 1e3);
  ms %= 1e3;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":") + "," + String(ms).padStart(3, "0");
};
const clock = (s) => {
  s = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(s / 3600);
  return (h ? h + ":" : "") + String(Math.floor(s % 3600 / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};
function clean(cues) {
  return cues.filter((c) => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start && String(c.text ?? "").trim()).map((c, i) => ({ id: String(c.id || i + 1), start: Math.max(0, c.start), end: c.end, text: String(c.text).trim() })).sort((a, b) => a.start - b.start);
}
function parseSubtitles(text) {
  text = String(text).replace(/^\uFEFF/, "").replace(/\r/g, "");
  if (text.startsWith("WEBVTT")) text = text.slice(text.indexOf("\n") + 1);
  const items = [];
  for (const block of text.trim().split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->").map((x) => x.trim().split(/\s+/)[0]);
    const start = seconds(a), end = seconds(b);
    const title = lines.slice(i + 1).join("\n").trim();
    if (start === null || end === null || end <= start || !title) continue;
    items.push({ start, end, text: title });
  }
  return clean(items);
}
function toSrt(cues) {
  return clean(cues).map((c, i) => String(i + 1) + "\n" + stamp(c.start) + " --> " + stamp(c.end) + "\n" + c.text).join("\n\n") + (cues.length ? "\n" : "");
}
function toVtt(cues) {
  return "WEBVTT\n\n" + clean(cues).map((c) => stamp(c.start).replace(",", ".") + " --> " + stamp(c.end).replace(",", ".") + "\n" + c.text).join("\n\n") + "\n";
}
function toTxt(cues) {
  return clean(cues).map((c) => c.text).join("\n") + "\n";
}
function activeCue(cues, time) {
  for (let i = cues.length - 1; i >= 0; i--) if (time >= cues[i].start && time < cues[i].end) return cues[i];
  return null;
}
function rgba(hex, opacity = 0.78) {
  hex = String(hex || "#000000").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "rgba(0,0,0,.7)";
  const rgb = [0, 2, 4].map((n) => parseInt(hex.slice(n, n + 2), 16));
  return "rgba(" + rgb.join(",") + "," + clamp(opacity, 0, 1) + ")";
}
var FFMessageType;
(function(FFMessageType2) {
  FFMessageType2["LOAD"] = "LOAD";
  FFMessageType2["EXEC"] = "EXEC";
  FFMessageType2["FFPROBE"] = "FFPROBE";
  FFMessageType2["WRITE_FILE"] = "WRITE_FILE";
  FFMessageType2["READ_FILE"] = "READ_FILE";
  FFMessageType2["DELETE_FILE"] = "DELETE_FILE";
  FFMessageType2["RENAME"] = "RENAME";
  FFMessageType2["CREATE_DIR"] = "CREATE_DIR";
  FFMessageType2["LIST_DIR"] = "LIST_DIR";
  FFMessageType2["DELETE_DIR"] = "DELETE_DIR";
  FFMessageType2["ERROR"] = "ERROR";
  FFMessageType2["DOWNLOAD"] = "DOWNLOAD";
  FFMessageType2["PROGRESS"] = "PROGRESS";
  FFMessageType2["LOG"] = "LOG";
  FFMessageType2["MOUNT"] = "MOUNT";
  FFMessageType2["UNMOUNT"] = "UNMOUNT";
})(FFMessageType || (FFMessageType = {}));
const getMessageID = /* @__PURE__ */ (() => {
  let messageID = 0;
  return () => messageID++;
})();
const ERROR_NOT_LOADED = new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
const ERROR_TERMINATED = new Error("called FFmpeg.terminate()");
class FFmpeg {
  #worker = null;
  /**
   * #resolves and #rejects tracks Promise resolves and rejects to
   * be called when we receive message from web worker.
   */
  #resolves = {};
  #rejects = {};
  #logEventCallbacks = [];
  #progressEventCallbacks = [];
  loaded = false;
  /**
   * register worker message event handlers.
   */
  #registerHandlers = () => {
    if (this.#worker) {
      this.#worker.onmessage = ({ data: { id, type, data } }) => {
        switch (type) {
          case FFMessageType.LOAD:
            this.loaded = true;
            this.#resolves[id](data);
            break;
          case FFMessageType.MOUNT:
          case FFMessageType.UNMOUNT:
          case FFMessageType.EXEC:
          case FFMessageType.FFPROBE:
          case FFMessageType.WRITE_FILE:
          case FFMessageType.READ_FILE:
          case FFMessageType.DELETE_FILE:
          case FFMessageType.RENAME:
          case FFMessageType.CREATE_DIR:
          case FFMessageType.LIST_DIR:
          case FFMessageType.DELETE_DIR:
            this.#resolves[id](data);
            break;
          case FFMessageType.LOG:
            this.#logEventCallbacks.forEach((f) => f(data));
            break;
          case FFMessageType.PROGRESS:
            this.#progressEventCallbacks.forEach((f) => f(data));
            break;
          case FFMessageType.ERROR:
            this.#rejects[id](data);
            break;
        }
        delete this.#resolves[id];
        delete this.#rejects[id];
      };
    }
  };
  /**
   * Generic function to send messages to web worker.
   */
  #send = ({ type, data }, trans = [], signal) => {
    if (!this.#worker) {
      return Promise.reject(ERROR_NOT_LOADED);
    }
    return new Promise((resolve, reject) => {
      const id = getMessageID();
      this.#worker && this.#worker.postMessage({ id, type, data }, trans);
      this.#resolves[id] = resolve;
      this.#rejects[id] = reject;
      signal?.addEventListener("abort", () => {
        reject(new DOMException(`Message # ${id} was aborted`, "AbortError"));
      }, { once: true });
    });
  };
  on(event, callback) {
    if (event === "log") {
      this.#logEventCallbacks.push(callback);
    } else if (event === "progress") {
      this.#progressEventCallbacks.push(callback);
    }
  }
  off(event, callback) {
    if (event === "log") {
      this.#logEventCallbacks = this.#logEventCallbacks.filter((f) => f !== callback);
    } else if (event === "progress") {
      this.#progressEventCallbacks = this.#progressEventCallbacks.filter((f) => f !== callback);
    }
  }
  /**
   * Loads ffmpeg-core inside web worker. It is required to call this method first
   * as it initializes WebAssembly and other essential variables.
   *
   * @category FFmpeg
   * @returns `true` if ffmpeg core is loaded for the first time.
   */
  load = ({ classWorkerURL, ...config } = {}, { signal } = {}) => {
    if (!this.#worker) {
      this.#worker = classWorkerURL ? new Worker(new URL(classWorkerURL, import.meta.url), {
        type: "module"
      }) : (
        // We need to duplicated the code here to enable webpack
        // to bundle worekr.js here.
        new Worker(new URL(
          /* @vite-ignore */
          "" + new URL("worker-BCxNW2BI.js", import.meta.url).href,
          import.meta.url
        ), {
          type: "module"
        })
      );
      this.#registerHandlers();
    }
    return this.#send({
      type: FFMessageType.LOAD,
      data: config
    }, void 0, signal);
  };
  /**
   * Execute ffmpeg command.
   *
   * @remarks
   * To avoid common I/O issues, ["-nostdin", "-y"] are prepended to the args
   * by default.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * await ffmpeg.writeFile("video.avi", ...);
   * // ffmpeg -i video.avi video.mp4
   * await ffmpeg.exec(["-i", "video.avi", "video.mp4"]);
   * const data = ffmpeg.readFile("video.mp4");
   * ```
   *
   * @returns `0` if no error, `!= 0` if timeout (1) or error.
   * @category FFmpeg
   */
  exec = (args, timeout = -1, { signal } = {}) => this.#send({
    type: FFMessageType.EXEC,
    data: { args, timeout }
  }, void 0, signal);
  /**
   * Execute ffprobe command.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * await ffmpeg.writeFile("video.avi", ...);
   * // Getting duration of a video in seconds: ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.avi -o output.txt
   * await ffmpeg.ffprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", "video.avi", "-o", "output.txt"]);
   * const data = ffmpeg.readFile("output.txt");
   * ```
   *
   * @returns `0` if no error, `!= 0` if timeout (1) or error.
   * @category FFmpeg
   */
  ffprobe = (args, timeout = -1, { signal } = {}) => this.#send({
    type: FFMessageType.FFPROBE,
    data: { args, timeout }
  }, void 0, signal);
  /**
   * Terminate all ongoing API calls and terminate web worker.
   * `FFmpeg.load()` must be called again before calling any other APIs.
   *
   * @category FFmpeg
   */
  terminate = () => {
    const ids = Object.keys(this.#rejects);
    for (const id of ids) {
      this.#rejects[id](ERROR_TERMINATED);
      delete this.#rejects[id];
      delete this.#resolves[id];
    }
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
      this.loaded = false;
    }
  };
  /**
   * Write data to ffmpeg.wasm.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * await ffmpeg.writeFile("video.avi", await fetchFile("../video.avi"));
   * await ffmpeg.writeFile("text.txt", "hello world");
   * ```
   *
   * @category File System
   */
  writeFile = (path, data, { signal } = {}) => {
    const trans = [];
    if (data instanceof Uint8Array) {
      trans.push(data.buffer);
    }
    return this.#send({
      type: FFMessageType.WRITE_FILE,
      data: { path, data }
    }, trans, signal);
  };
  mount = (fsType, options, mountPoint) => {
    const trans = [];
    return this.#send({
      type: FFMessageType.MOUNT,
      data: { fsType, options, mountPoint }
    }, trans);
  };
  unmount = (mountPoint) => {
    const trans = [];
    return this.#send({
      type: FFMessageType.UNMOUNT,
      data: { mountPoint }
    }, trans);
  };
  /**
   * Read data from ffmpeg.wasm.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * const data = await ffmpeg.readFile("video.mp4");
   * ```
   *
   * @category File System
   */
  readFile = (path, encoding = "binary", { signal } = {}) => this.#send({
    type: FFMessageType.READ_FILE,
    data: { path, encoding }
  }, void 0, signal);
  /**
   * Delete a file.
   *
   * @category File System
   */
  deleteFile = (path, { signal } = {}) => this.#send({
    type: FFMessageType.DELETE_FILE,
    data: { path }
  }, void 0, signal);
  /**
   * Rename a file or directory.
   *
   * @category File System
   */
  rename = (oldPath, newPath, { signal } = {}) => this.#send({
    type: FFMessageType.RENAME,
    data: { oldPath, newPath }
  }, void 0, signal);
  /**
   * Create a directory.
   *
   * @category File System
   */
  createDir = (path, { signal } = {}) => this.#send({
    type: FFMessageType.CREATE_DIR,
    data: { path }
  }, void 0, signal);
  /**
   * List directory contents.
   *
   * @category File System
   */
  listDir = (path, { signal } = {}) => this.#send({
    type: FFMessageType.LIST_DIR,
    data: { path }
  }, void 0, signal);
  /**
   * Delete an empty directory.
   *
   * @category File System
   */
  deleteDir = (path, { signal } = {}) => this.#send({
    type: FFMessageType.DELETE_DIR,
    data: { path }
  }, void 0, signal);
}
var FFFSType;
(function(FFFSType2) {
  FFFSType2["MEMFS"] = "MEMFS";
  FFFSType2["NODEFS"] = "NODEFS";
  FFFSType2["NODERAWFS"] = "NODERAWFS";
  FFFSType2["IDBFS"] = "IDBFS";
  FFFSType2["WORKERFS"] = "WORKERFS";
  FFFSType2["PROXYFS"] = "PROXYFS";
})(FFFSType || (FFFSType = {}));
const readFromBlobOrFile = (blob) => new Promise((resolve, reject) => {
  const fileReader = new FileReader();
  fileReader.onload = () => {
    const { result } = fileReader;
    if (result instanceof ArrayBuffer) {
      resolve(new Uint8Array(result));
    } else {
      resolve(new Uint8Array());
    }
  };
  fileReader.onerror = (event) => {
    reject(Error(`File could not be read! Code=${event?.target?.error?.code || -1}`));
  };
  fileReader.readAsArrayBuffer(blob);
});
const fetchFile = async (file) => {
  let data;
  if (typeof file === "string") {
    if (/data:_data\/([a-zA-Z]*);base64,([^"]*)/.test(file)) {
      data = atob(file.split(",")[1]).split("").map((c) => c.charCodeAt(0));
    } else {
      data = await (await fetch(file)).arrayBuffer();
    }
  } else if (file instanceof URL) {
    data = await (await fetch(file)).arrayBuffer();
  } else if (file instanceof File || file instanceof Blob) {
    data = await readFromBlobOrFile(file);
  } else {
    return new Uint8Array();
  }
  return new Uint8Array(data);
};
let engine = null;
let isLoaded = false;
const ext = (file) => ((file.name || "").match(/\.[a-z0-9]{2,5}$/i) || [".mp4"])[0].toLowerCase();
async function ensureFfmpeg(onMessage = () => {
}) {
  if (engine && isLoaded) return engine;
  engine = new FFmpeg();
  const loaded = engine;
  const coreURL = new URL("./ffmpeg-core/ffmpeg-core.js", document.baseURI).href;
  const wasmURL = new URL("./ffmpeg-core/ffmpeg-core.wasm", document.baseURI).href;
  onMessage("Loading the local FFmpeg audio engine…");
  await loaded.load({ coreURL, wasmURL });
  if (loaded !== engine) throw new Error("Media preparation cancelled");
  isLoaded = true;
  return loaded;
}
function cancelFfmpeg() {
  if (engine) {
    try {
      engine.terminate();
    } catch {
    }
    engine = null;
    isLoaded = false;
  }
}
async function videoToAudio(file, onMessage, signal) {
  if (!file) throw new Error("Choose a video before transcription");
  if (file.size > 15e8) throw new Error("This video is too large for in-browser audio extraction. Use a shorter file.");
  const ff = await ensureFfmpeg(onMessage);
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const input = "video_input" + ext(file);
  onMessage("Reading video into local memory…");
  try {
    await ff.writeFile(input, await fetchFile(file));
    onMessage("Extracting 16 kHz mono audio…");
    const progress = ({ progress: progress2 }) => onMessage("Extracting audio", Math.min(99, Math.floor((progress2 || 0) * 100)));
    ff.on("progress", progress);
    try {
      const exit = await ff.exec([
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        input,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        "audio.wav"
      ], -1);
      if (exit !== 0) throw new Error("FFmpeg could not decode the video soundtrack");
    } finally {
      ff.off("progress", progress);
    }
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const raw = await ff.readFile("audio.wav");
    const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16e3 });
    try {
      const buffer = await context.decodeAudioData(raw.buffer.slice(
        raw.byteOffset,
        raw.byteOffset + raw.byteLength
      ));
      const mono = buffer.getChannelData(0);
      if (!mono.length) throw new Error("No decoded audio samples");
      if (buffer.sampleRate !== 16e3) throw new Error("Decoded audio sample rate is not 16000 Hz");
      return new Float32Array(mono);
    } finally {
      await context.close();
    }
  } finally {
    await ff.deleteFile(input).catch(() => {
    });
    await ff.deleteFile("audio.wav").catch(() => {
    });
  }
}
let audioRoute = null;
function audioForVideo(video2) {
  if (audioRoute?.video === video2) return audioRoute;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const source = ctx.createMediaElementSource(video2);
  const speaker = ctx.createGain();
  source.connect(speaker);
  speaker.connect(ctx.destination);
  const destination = ctx.createMediaStreamDestination();
  source.connect(destination);
  audioRoute = { video: video2, ctx, speaker, destination };
  return audioRoute;
}
async function recordCaptions({
  video: video2,
  canvasDraw,
  maxDim = 720,
  preferMp4 = true,
  onProgress = () => {
  },
  signal
}) {
  if (!video2?.duration || !Number.isFinite(video2.duration)) throw new Error("Load a complete video before exporting");
  if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream)
    throw new Error("This browser cannot capture captioned video; export SRT instead");
  const canvas = document.createElement("canvas");
  const w = video2.videoWidth, h = video2.videoHeight;
  if (!w || !h) throw new Error("Video dimensions are unavailable");
  const scale = Math.min(1, maxDim / Math.max(w, h));
  canvas.width = Math.max(2, Math.round(w * scale / 2) * 2);
  canvas.height = Math.max(2, Math.round(h * scale / 2) * 2);
  const ctx = canvas.getContext("2d", { alpha: false });
  const capture = canvas.captureStream(30);
  const trackState = audioForVideo(video2);
  await trackState.ctx.resume();
  trackState.speaker.gain.value = 0;
  for (const track of trackState.destination.stream.getAudioTracks()) capture.addTrack(track);
  const types = preferMp4 ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"] : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const mime = types.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error("No MediaRecorder video format supported");
  const recorder = new MediaRecorder(capture, { mimeType: mime, videoBitsPerSecond: 35e5 });
  const parts = [];
  const initialTime = video2.currentTime;
  const initialRate = video2.playbackRate;
  let raf = 0, active = true;
  const ended = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  const paint = () => {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video2, 0, 0, canvas.width, canvas.height);
    canvasDraw(ctx, canvas.width, canvas.height, video2.currentTime);
    onProgress(
      Math.min(99, Math.floor(video2.currentTime / video2.duration * 100)),
      Math.max(0, video2.duration - video2.currentTime)
    );
    if (!video2.ended) raf = requestAnimationFrame(paint);
  };
  const cleanup = () => {
    active = false;
    cancelAnimationFrame(raf);
    video2.removeEventListener("ended", ended);
    capture.getVideoTracks().forEach((t) => t.stop());
    trackState.speaker.gain.value = 1;
    video2.pause();
    video2.playbackRate = initialRate;
    if (Number.isFinite(initialTime)) video2.currentTime = initialTime;
  };
  const promise = new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data?.size) parts.push(e.data);
    };
    recorder.onerror = (e) => reject(e.error || new Error("Recording error"));
    recorder.onstop = () => resolve(new Blob(parts, { type: mime.split(";")[0] }));
  });
  const abort = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  signal?.addEventListener("abort", abort, { once: true });
  video2.pause();
  video2.playbackRate = 1;
  video2.currentTime = 0;
  try {
    await new Promise((resolve) => {
      if (video2.readyState >= 2 && video2.currentTime < 0.05) return resolve();
      video2.addEventListener("seeked", resolve, { once: true });
    });
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    recorder.start(1e3);
    video2.addEventListener("ended", ended, { once: true });
    paint();
    await video2.play();
    const blob = await promise;
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (!blob.size) throw new Error("Recording contains no video frames");
    return { blob, format: mime.includes("mp4") ? "mp4" : "webm" };
  } finally {
    signal?.removeEventListener("abort", abort);
    cleanup();
  }
}
async function convertToMp4(blob, onProgress, signal) {
  if (blob.size > 3e8) throw new Error("Recorded video too large for browser MP4 conversion");
  const ff = await ensureFfmpeg((text) => onProgress(text, null));
  const progress = ({ progress: progress2 }) => onProgress(
    "Converting WebM to MP4",
    Math.min(99, Math.floor((progress2 || 0) * 100))
  );
  ff.on("progress", progress);
  try {
    await ff.writeFile("recorded.webm", await fetchFile(blob));
    const code = await ff.exec([
      "-i",
      "recorded.webm",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "26",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "ready.mp4"
    ], -1);
    if (code !== 0) throw new Error("MP4 codec not supported by this browser engine");
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const data = await ff.readFile("ready.mp4");
    return new Blob([data], { type: "video/mp4" });
  } finally {
    ff.off("progress", progress);
    await ff.deleteFile("recorded.webm").catch(() => {
    });
    await ff.deleteFile("ready.mp4").catch(() => {
    });
  }
}
const $ = (id) => document.getElementById(id);
const video = $("video");
const defaultSettings = { model: "small", language: "auto", quality: 720, preferMp4: true, translationSource: "ar", translationTarget: "fr" };
const defaults = { style: "classic", textColor: "#ffffff", bgColor: "#20182c", fontSize: 36, position: "bottom" };
function loadOptions() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem("rivocaption-site-options") || "{}") };
  } catch {
    return { ...defaultSettings };
  }
}
const state = {
  file: null,
  url: null,
  cues: [],
  originalCues: [],
  settings: loadOptions(),
  style: { ...defaults },
  tab: "ai",
  expanded: false,
  controller: null,
  worker: null,
  task: null,
  runId: 0
};
const status = (message, kind = "") => {
  $("message").textContent = message;
  $("message").className = "message" + (kind ? " " + kind : "");
};
const download = (name, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3e3);
};
function clockPretty(seconds2) {
  return clock(seconds2);
}
function syncSettings() {
  const p = state.settings;
  $("modelSelect").value = p.model;
  $("languageSelect").value = p.language;
  $("qualitySelect").value = String(p.quality);
  $("preferMp4").checked = !!p.preferMp4;
  $("translationSource").value = p.translationSource;
  $("translationTarget").value = p.translationTarget;
  $("settingsSummary").textContent = "Offline · " + { base: "Whisper Base", small: "Whisper Small", turbo: "Whisper Large v3 Turbo" }[p.model] + " · " + { auto: "Auto-detect / mixed", ar: "الدارجة / Arabic", fr: "Français", en: "English", es: "Español", de: "Deutsch" }[p.language];
  $("exportSummary").textContent = "Video: up to " + p.quality + "p · original aspect ratio · " + (p.preferMp4 ? "MP4 preferred" : "WebM preferred");
  localStorage.setItem("rivocaption-site-options", JSON.stringify(p));
}
function openSettings() {
  syncSettings();
  $("settingsDialog").showModal();
  $("settingsButton").classList.add("is-active");
}
function closeSettings() {
  $("settingsDialog").close();
  $("settingsButton").classList.remove("is-active");
  syncSettings();
}
$("settingsButton").onclick = openSettings;
document.querySelectorAll(".open-settings").forEach((b) => b.onclick = openSettings);
$("closeSettings").onclick = closeSettings;
$("doneSettings").onclick = closeSettings;
$("settingsDialog").addEventListener("close", () => {
  $("settingsButton").classList.remove("is-active");
  syncSettings();
});
for (const [id, key, convert] of [
  ["modelSelect", "model", String],
  ["languageSelect", "language", String],
  ["qualitySelect", "quality", Number],
  ["translationSource", "translationSource", String],
  ["translationTarget", "translationTarget", String]
]) {
  $(id).onchange = (e) => {
    state.settings[key] = convert(e.target.value);
    syncSettings();
  };
}
$("preferMp4").onchange = (e) => {
  state.settings.preferMp4 = e.target.checked;
  syncSettings();
};
$("resetSettings").onclick = () => {
  state.settings = { ...defaultSettings };
  syncSettings();
  status("Preferences reset to defaults.", "success");
};
syncSettings();
function setTab(name) {
  state.tab = name;
  document.querySelectorAll(".tab").forEach((tab) => {
    const yes = tab.dataset.tab === name;
    tab.classList.toggle("is-active", yes);
    tab.setAttribute("aria-selected", String(yes));
  });
  document.querySelectorAll(".tool-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== name);
  });
  if (name === "captions") renderCaptions();
}
document.querySelectorAll(".tab").forEach((el) => el.onclick = () => setTab(el.dataset.tab));
$("openButton").onclick = () => {
  $("videoInput").click();
};
$("chooseButton").onclick = () => {
  $("videoInput").click();
};
$("projectButton").onclick = saveProject;
$("videoInput").addEventListener("change", (e) => {
  if (e.target.files[0]) openVideo(e.target.files[0]);
  e.target.value = "";
});
function openVideo(file) {
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name)) {
    status("Please choose a valid video file", "error");
    return;
  }
  cancelTask(true);
  if (state.url) URL.revokeObjectURL(state.url);
  state.file = file;
  state.url = URL.createObjectURL(file);
  video.pause();
  video.src = state.url;
  video.load();
  state.cues = [];
  state.originalCues = [];
  renderCaptions();
  setTab("ai");
  $("videoStage").classList.add("has-video");
  $("emptyPreview").classList.add("hidden");
  $("videoInfo").textContent = file.name;
  status("Loaded " + file.name + ". Choose AI Speech, or import/edit subtitles.", "success");
}
$("videoStage").addEventListener("dragover", (e) => e.preventDefault());
$("videoStage").addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) openVideo(file);
});
video.addEventListener("loadedmetadata", () => {
  updatePlayback();
  drawOverlay();
});
video.addEventListener("timeupdate", () => {
  updatePlayback();
  drawOverlay();
  highlightCurrent();
});
video.addEventListener("play", () => {
  $("playIcon").textContent = "pause";
});
video.addEventListener("pause", () => {
  $("playIcon").textContent = "play_arrow";
});
function updatePlayback() {
  const t = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  $("currentTime").textContent = clockPretty(t) + " / " + clockPretty(duration);
  $("seek").value = duration ? String(Math.round(t / duration * 1e3)) : "0";
}
$("seek").addEventListener("input", (e) => {
  if (video.duration) video.currentTime = Number(e.target.value) / 1e3 * video.duration;
});
$("playButton").onclick = () => {
  if (!state.file) return status("Choose a video first.");
  if (video.paused) video.play().catch((e) => status(e.message, "error"));
  else video.pause();
};
$("backButton").onclick = () => {
  if (state.file) video.currentTime = Math.max(0, video.currentTime - 10);
};
$("forwardButton").onclick = () => {
  if (state.file) video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
};
$("speedButton").onclick = () => {
  const speeds = [1, 1.25, 1.5, 2, 0.75];
  video.playbackRate = speeds[(speeds.indexOf(video.playbackRate) + 1) % speeds.length];
  $("speedButton").textContent = video.playbackRate + "×";
};
$("muteButton").onclick = () => {
  video.muted = !video.muted;
  $("muteButton").firstElementChild.textContent = video.muted ? "volume_off" : "volume_up";
};
$("fullscreenButton").onclick = () => {
  (document.fullscreenElement ? document.exitFullscreen() : $("videoStage").requestFullscreen()).catch?.(() => {
  });
};
$("expandButton").onclick = () => {
  state.expanded = !state.expanded;
  $("videoStage").classList.toggle("expanded", state.expanded);
  $("expandButton").textContent = state.expanded ? "Compact" : "Enlarge";
};
function syncOverlayStyle() {
  const o = $("captionOverlay");
  o.style.color = state.style.textColor;
  o.style.background = state.style.style === "minimal" ? "transparent" : rgba(
    state.style.bgColor,
    state.style.style === "cinema" ? 0.76 : 0.86
  );
  o.style.fontSize = Math.round(state.style.fontSize * (window.innerWidth < 600 ? 0.57 : 1)) + "px";
  o.dataset.position = state.style.position;
}
function drawOverlay() {
  syncOverlayStyle();
  const cue = activeCue(state.cues, video.currentTime || 0);
  const el = $("captionOverlay");
  el.textContent = cue?.text || "";
  el.classList.toggle("visible", Boolean(cue));
}
function highlightCurrent() {
  const cue = activeCue(state.cues, video.currentTime || 0);
  for (const el of document.querySelectorAll("[data-cue]")) {
    el.classList.toggle("is-current", el.dataset.cue === cue?.id);
  }
}
function renderCaptions() {
  const list = $("captionList"), timeline = $("captionTimeline");
  list.replaceChildren();
  timeline.replaceChildren();
  $("captionCount").textContent = state.cues.length;
  if (!state.cues.length) {
    const empty = document.createElement("p");
    empty.className = "empty-caption";
    empty.textContent = "Transcribe audio, import SRT/VTT, or add a caption manually.";
    list.append(empty);
    drawOverlay();
    return;
  }
  state.cues = clean(state.cues);
  for (const cue of state.cues) {
    const pill = document.createElement("button");
    pill.className = "cue-pill";
    pill.dataset.cue = cue.id;
    pill.textContent = clock(cue.start) + " · " + cue.text.slice(0, 35);
    pill.title = "Seek to " + clock(cue.start);
    pill.onclick = () => {
      video.currentTime = cue.start;
      video.pause();
    };
    timeline.append(pill);
    const row = document.createElement("article");
    row.className = "cue-row";
    row.dataset.cue = cue.id;
    const start = document.createElement("label");
    start.textContent = "Start (sec)";
    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.min = "0";
    startInput.step = ".01";
    startInput.value = cue.start.toFixed(2);
    start.append(startInput);
    const end = document.createElement("label");
    end.textContent = "End (sec)";
    const endInput = document.createElement("input");
    endInput.type = "number";
    endInput.min = ".01";
    endInput.step = ".01";
    endInput.value = cue.end.toFixed(2);
    end.append(endInput);
    const text = document.createElement("label");
    text.textContent = "Caption";
    const area = document.createElement("textarea");
    area.value = cue.text;
    area.dir = "auto";
    area.rows = 2;
    text.append(area);
    const del = document.createElement("button");
    del.title = "Delete caption";
    del.setAttribute("aria-label", "Delete caption");
    del.textContent = "×";
    del.onclick = () => {
      state.cues = state.cues.filter((c) => c.id !== cue.id);
      renderCaptions();
      status("Caption deleted.");
    };
    const update = () => {
      const a = Number(startInput.value), b = Number(endInput.value);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b <= a) {
        status("Caption end time must be greater than start time.", "error");
        return;
      }
      cue.start = a;
      cue.end = b;
      cue.text = area.value;
      drawOverlay();
      state.cues = clean(state.cues);
      $("captionCount").textContent = state.cues.length;
    };
    for (const input of [startInput, endInput, area]) input.addEventListener("change", update);
    row.append(start, end, text, del);
    list.append(row);
  }
  drawOverlay();
  highlightCurrent();
}
$("addCaption").onclick = () => {
  const at = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  state.cues.push({ id: crypto.randomUUID(), start: at, end: at + 2.5, text: "New caption" });
  renderCaptions();
  setTab("captions");
  $("captionList").lastElementChild?.querySelector("textarea")?.focus();
};
$("importCaption").onclick = () => {
  $("captionInput").click();
};
$("captionInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    if (file.name.endsWith(".json")) {
      const saved = JSON.parse(await file.text());
      if (!Array.isArray(saved.cues)) throw new Error("Invalid RivoCaption project JSON");
      state.cues = clean(saved.cues);
      state.originalCues = [];
      if (saved.style) state.style = { ...defaults, ...saved.style };
      applyStyleUI();
    } else {
      const cues = parseSubtitles(await file.text());
      if (!cues.length) throw new Error("No valid subtitle timestamps found");
      state.cues = cues;
      state.originalCues = [];
    }
    renderCaptions();
    setTab("captions");
    status("Imported " + state.cues.length + " captions.", "success");
  } catch (error) {
    status("Import failed: " + error.message, "error");
  }
  e.target.value = "";
});
$("restoreCaptions").onclick = () => {
  if (!state.originalCues.length) return status("No original translation snapshot to restore.");
  state.cues = clean(state.originalCues);
  state.originalCues = [];
  renderCaptions();
  status("Restored original captions.", "success");
};
$("translateCaptions").onclick = async () => {
  if (!state.cues.length) return status("Add or import captions to translate.", "error");
  if (state.task) return status("Cancel the current operation first.", "error");
  if (!("Translator" in window)) {
    return status("This browser lacks the local Translator API. Use RivoCaption Android or a supported browser.", "error");
  }
  const { translationSource: sourceLanguage, translationTarget: targetLanguage } = state.settings;
  if (sourceLanguage === targetLanguage) return status("Choose two different languages in Settings.", "error");
  const runId = ++state.runId;
  const controller = new AbortController();
  state.controller = controller;
  state.task = "translate";
  const initial = state.cues.map((x) => ({ ...x }));
  try {
    startTask("TRANSLATING", null, "Checking local browser translator…");
    const available = await window.Translator.availability({ sourceLanguage, targetLanguage });
    if (available === "unavailable") throw new Error("This language pair is not available on this browser");
    const translator = await window.Translator.create({ sourceLanguage, targetLanguage });
    const translated = [];
    for (let i = 0; i < initial.length; i++) {
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const text = await translator.translate(initial[i].text);
      translated.push({ ...initial[i], text });
      if (runId === state.runId) startTask(
        "TRANSLATING",
        Math.min(99, Math.floor((i + 1) / initial.length * 100)),
        "Translated " + (i + 1) + " of " + initial.length + " caption lines"
      );
    }
    translator.destroy?.();
    if (runId !== state.runId) return;
    state.originalCues = initial;
    state.cues = clean(translated);
    renderCaptions();
    setTab("captions");
    status("Offline translation completed. Review terminology and timing.", "success");
  } catch (error) {
    if (runId === state.runId && error.name !== "AbortError")
      status("Offline translation unavailable: " + error.message, "error");
  } finally {
    if (runId === state.runId) {
      state.task = null;
      state.controller = null;
      hideTask();
    }
  }
};
function saveAs(type) {
  if (!state.cues.length) return status("No captions to export.", "error");
  const name = (state.file?.name || "RivoCaption").replace(/\.[^.]+$/, "");
  const content = { srt: toSrt, vtt: toVtt, txt: toTxt }[type](state.cues);
  const mime = { srt: "application/x-subrip", vtt: "text/vtt", txt: "text/plain" }[type];
  download(name + "." + type, new Blob([content], { type: mime + ";charset=utf-8" }));
  status("Saved " + type.toUpperCase() + " subtitles.", "success");
}
function saveProject() {
  const content = JSON.stringify({
    schema: "rivocaption-web-v1",
    cues: state.cues,
    style: state.style,
    settings: state.settings,
    videoName: state.file?.name || null
  }, null, 2);
  download("RivoCaption-project.json", new Blob([content], { type: "application/json" }));
  status("Project metadata saved. Re-select the video after reopening the project.", "success");
}
$("exportCaptionsQuick").onclick = () => saveAs("srt");
$("exportSrt").onclick = () => saveAs("srt");
$("exportVtt").onclick = () => saveAs("vtt");
$("exportTxt").onclick = () => saveAs("txt");
$("exportJson").onclick = saveProject;
function applyStyleUI() {
  const s = state.style;
  for (const [id, key] of [["textColor", "textColor"], ["bgColor", "bgColor"], ["fontSize", "fontSize"], ["captionPosition", "position"]]) $(id).value = s[key];
  $("fontSizeValue").textContent = s.fontSize;
  document.querySelectorAll(".preset").forEach((b) => b.classList.toggle("is-active", b.dataset.style === s.style));
  drawOverlay();
}
const presets = {
  classic: { textColor: "#ffffff", bgColor: "#20182c", fontSize: 36, position: "bottom" },
  cinema: { textColor: "#fff3d9", bgColor: "#0f1118", fontSize: 31, position: "bottom" },
  highlight: { textColor: "#141124", bgColor: "#ffca7b", fontSize: 39, position: "center" },
  minimal: { textColor: "#ffffff", bgColor: "#000000", fontSize: 29, position: "bottom" }
};
document.querySelectorAll(".preset").forEach((b) => b.onclick = () => {
  state.style = { ...state.style, style: b.dataset.style, ...presets[b.dataset.style] };
  applyStyleUI();
});
for (const [id, key] of [["textColor", "textColor"], ["bgColor", "bgColor"], ["fontSize", "fontSize"], ["captionPosition", "position"]]) {
  $(id).addEventListener("input", (e) => {
    state.style[key] = key === "fontSize" ? Number(e.target.value) : e.target.value;
    $("fontSizeValue").textContent = state.style.fontSize;
    drawOverlay();
  });
}
applyStyleUI();
function startTask(name, percent = null, detail = "", remainingMs = null) {
  $("progressStrip").classList.remove("hidden");
  $("progressTitle").textContent = name;
  $("progressDetail").textContent = detail;
  $("progressPercent").textContent = percent == null ? "Working" : Math.min(99, percent) + "%";
  const fill = $("progressFill");
  fill.classList.toggle("indeterminate", percent === null);
  fill.style.width = percent === null ? "30%" : Math.min(99, percent) + "%";
  $("progressTime").textContent = remainingMs == null ? "Time remaining: calculating…" : "≈" + clock(Math.ceil(remainingMs / 1e3)) + " remaining";
}
function hideTask() {
  $("progressStrip").classList.add("hidden");
  $("progressFill").classList.remove("indeterminate");
}
function cancelTask(silent = false) {
  if (!state.task) return;
  state.runId += 1;
  state.controller?.abort();
  state.worker?.terminate();
  state.worker = null;
  state.controller = null;
  state.task = null;
  cancelFfmpeg();
  video.pause();
  hideTask();
  if (!silent) status("Operation cancelled. The source video was not changed.", "success");
}
$("cancelButton").onclick = () => cancelTask();
$("transcribeButton").onclick = async () => {
  if (!state.file) return status("Choose a video before transcription.", "error");
  if (state.task) return status("Finish or cancel the active task first.");
  const runId = ++state.runId;
  const abort = new AbortController();
  state.controller = abort;
  state.task = "asr";
  performance.now();
  const set = (phase, pct = null, remaining = null) => {
    if (state.runId === runId) startTask(
      "AI SPEECH",
      pct,
      phase,
      remaining == null ? null : remaining
    );
  };
  $("transcribeButton").disabled = true;
  try {
    set("Loading local audio engine…");
    const audio = await videoToAudio(state.file, (phase, pct) => set(phase, pct), abort.signal);
    if (abort.signal.aborted) throw new DOMException("Cancelled", "AbortError");
    set("Preparing multilingual Whisper…");
    const worker = new Worker(new URL(
      /* @vite-ignore */
      "" + new URL("asr-worker-DujgQFHb.js", import.meta.url).href,
      import.meta.url
    ), { type: "module" });
    state.worker = worker;
    const cues = await new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (state.runId !== runId) return;
        const data = e.data;
        if (data.type === "download") set(data.phase, null);
        else if (data.type === "state") set(data.phase, null);
        else if (data.type === "progress") set(data.phase, data.percent, data.remaining);
        else if (data.type === "done") resolve(data.cues);
        else if (data.type === "error") reject(new Error(data.message));
      };
      worker.onerror = (e) => reject(new Error("Whisper worker failed: " + e.message));
      worker.postMessage({
        type: "transcribe",
        audio: audio.buffer,
        model: state.settings.model,
        language: state.settings.language,
        sampleRate: 16e3
      }, [audio.buffer]);
    });
    if (state.runId !== runId) return;
    state.cues = clean(cues);
    renderCaptions();
    setTab("captions");
    status(
      state.cues.length ? "Whisper created " + state.cues.length + " captions. Review Darija spelling and timestamps." : "No words detected. Try a different language or clearer audio.",
      state.cues.length ? "success" : ""
    );
  } catch (error) {
    if (state.runId === runId && error.name !== "AbortError")
      status("Transcription failed: " + error.message + ". Try Fast/Base and a shorter clip.", "error");
  } finally {
    if (state.runId === runId) {
      state.worker?.terminate();
      state.worker = null;
      state.controller = null;
      state.task = null;
      $("transcribeButton").disabled = false;
      hideTask();
    }
  }
};
function drawBurnedCaptions(ctx, width, height, time) {
  const cue = activeCue(state.cues, time);
  if (!cue) return;
  const { textColor, bgColor, fontSize, position, style } = state.style;
  const pixels = clamp(fontSize * (width / 720), 16, 86);
  ctx.save();
  ctx.font = "800 " + pixels + "px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const safeWidth = width * 0.84;
  const lines = [];
  let line = "";
  for (const word of cue.text.split(/\s+/)) {
    if (ctx.measureText(line ? line + " " + word : word).width > safeWidth && line) {
      lines.push(line);
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  const lineHeight = pixels * 1.27;
  const blockHeight = lines.length * lineHeight + 16;
  const y = position === "top" ? height * 0.1 : position === "center" ? height * 0.5 : height * 0.87;
  const top = clamp(y - blockHeight / 2, 7, height - blockHeight - 7);
  if (style !== "minimal") {
    ctx.fillStyle = rgba(bgColor, 0.82);
    const maxWidth = Math.min(
      width * 0.92,
      Math.max(...lines.map((l) => ctx.measureText(l).width), 60) + 24
    );
    ctx.beginPath();
    ctx.roundRect(width / 2 - maxWidth / 2, top, maxWidth, blockHeight, 11);
    ctx.fill();
  }
  ctx.fillStyle = textColor;
  ctx.strokeStyle = "rgba(0,0,0,.63)";
  ctx.lineWidth = Math.max(1, pixels / 11);
  lines.forEach((text, i) => {
    const ty = top + 12 + (i + 0.5) * lineHeight;
    ctx.strokeText(text, width / 2, ty);
    ctx.fillText(text, width / 2, ty);
  });
  ctx.restore();
}
$("exportVideo").onclick = async () => {
  if (!state.file) return status("Choose a video before exporting.", "error");
  if (!state.cues.length) return status("Add or import captions before exporting video.", "error");
  if (state.task) return status("Cancel the active task first.", "error");
  const runId = ++state.runId, abort = new AbortController();
  state.controller = abort;
  state.task = "export";
  $("exportVideo").disabled = true;
  performance.now();
  try {
    startTask("VIDEO EXPORT", 0, "Preparing frame capture…");
    let { blob, format } = await recordCaptions({
      video,
      maxDim: state.settings.quality,
      preferMp4: state.settings.preferMp4,
      signal: abort.signal,
      canvasDraw: drawBurnedCaptions,
      onProgress: (pct, secondsLeft) => {
        if (runId === state.runId) startTask(
          "VIDEO EXPORT",
          pct,
          "Recording captioned video in real time",
          Math.max(0, Math.ceil(secondsLeft * 1e3))
        );
      }
    });
    if (abort.signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (format === "webm" && state.settings.preferMp4) {
      try {
        startTask("MP4 CONVERSION", null, "Preparing local video encoder…");
        blob = await convertToMp4(blob, (text, pct) => {
          if (runId === state.runId) startTask("MP4 CONVERSION", pct, text);
        }, abort.signal);
        format = "mp4";
      } catch (err) {
        if (abort.signal.aborted) throw err;
        status("MP4 conversion unavailable; exporting supported WebM instead. " + err.message);
      }
    }
    if (runId === state.runId) {
      const name = (state.file.name || "RivoCaption").replace(/\.[^.]+$/, "");
      startTask("SAVING VIDEO", 99, "Preparing download…");
      download(name + "-captioned." + format, blob);
      status("Captioned " + format.toUpperCase() + " ready. Your browser may ask where to save it.", "success");
    }
  } catch (error) {
    if (runId === state.runId && error.name !== "AbortError")
      status("Video export failed: " + error.message, "error");
  } finally {
    if (runId === state.runId) {
      state.task = null;
      state.controller = null;
      hideTask();
      $("exportVideo").disabled = false;
    }
  }
};
window.addEventListener("beforeunload", () => {
  state.worker?.terminate();
  cancelFfmpeg();
  if (state.url) URL.revokeObjectURL(state.url);
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {
});
$("runtimeInfo").textContent = navigator.gpu ? "WebGPU available" : "WASM fallback available";
