let audioContext = null;
let master = null;
let ambience = [];
let enabled = true;
let musicEnabled = true;
let volume = 0.55;

function ensureAudio() {
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    audioContext = new Context();
    master = audioContext.createGain();
    master.gain.value = enabled ? volume : 0;
    master.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function envelope(gain, at, peak, length, decay = 0.12) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + decay);
}

function pluck(frequency, start, duration, peak, wave = "triangle", slide = null) {
  const ctx = ensureAudio();
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slide), start + duration);
  envelope(gain, start, peak, duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.16);
}

export function activateAudio() {
  const ctx = ensureAudio();
  if (ctx && musicEnabled && enabled && ambience.length === 0) startAmbience();
}

function startAmbience() {
  const ctx = ensureAudio();
  if (!ctx || !master || ambience.length || !enabled || !musicEnabled) return;
  const chord = [73.42, 110, 146.83, 220];
  chord.forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = 640 + index * 120;
    gain.gain.value = index === 0 ? 0.018 : 0.009;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    ambience.push(osc, filter, gain);
  });
}

function stopAmbience() {
  ambience.forEach((node) => {
    try {
      if (typeof node.stop === "function") node.stop();
      node.disconnect();
    } catch { /* Already stopped. */ }
  });
  ambience = [];
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  const ctx = audioContext;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.05);
  if (!enabled) stopAmbience();
  else if (musicEnabled) startAmbience();
}

export function setMusicEnabled(value) {
  musicEnabled = Boolean(value);
  if (!audioContext) return;
  if (!musicEnabled) stopAmbience();
  else if (enabled) startAmbience();
}

export function setVolume(value) {
  volume = Math.max(0, Math.min(1, Number(value)));
  const ctx = audioContext;
  if (ctx && master) master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.04);
}

export function playSound(name) {
  if (!enabled) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime + 0.005;
  const sounds = {
    select: [[620, 0, 0.055, 0.035, "sine"]],
    play: [[420, 0, 0.11, 0.07, "triangle", 700]],
    hit: [[170, 0, 0.10, 0.09, "triangle", 72], [510, 0.012, 0.04, 0.025, "sine", 260]],
    guard: [[330, 0, 0.08, 0.055, "sine"], [490, 0.045, 0.12, 0.04, "triangle"]],
    draw: [[660, 0, 0.045, 0.025, "sine"], [880, 0.055, 0.06, 0.025, "sine"]],
    wake: [[392, 0, 0.10, 0.08, "triangle"], [587.33, 0.09, 0.11, 0.075, "triangle"], [783.99, 0.18, 0.22, 0.07, "sine"]],
    win: [[392, 0, 0.20, 0.055, "sine"], [523.25, 0.16, 0.22, 0.05, "triangle"], [659.25, 0.34, 0.28, 0.045, "sine"]],
    lose: [[293.66, 0, 0.18, 0.05, "triangle", 220], [196, 0.15, 0.35, 0.04, "sine", 146.83]],
  };
  (sounds[name] || sounds.select).forEach(([frequency, delay, duration, peak, wave, slide]) => {
    pluck(frequency, now + delay, duration, peak, wave, slide);
  });
}

export function suspendAudio() {
  if (audioContext && audioContext.state === "running") audioContext.suspend().catch(() => {});
}

export function resumeAudio() {
  const ctx = audioContext;
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  if (ctx && enabled && musicEnabled && ambience.length === 0) startAmbience();
}
