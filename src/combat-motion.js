// Original procedural combat effects. Each sequence owns and removes its overlay.
// These helpers only animate DOM nodes; the caller owns combat state and timing.
const COLORS = {
  ember: { main: "#ffaf72", light: "#fff2cb", shadow: "#de614b" },
  tide: { main: "#80e9d0", light: "#e5fff0", shadow: "#268f9f" },
  glass: { main: "#c8b2ff", light: "#f9eeff", shadow: "#7f68d8" },
  enemy: { main: "#ff9585", light: "#ffe1b7", shadow: "#c44d6a" },
};
const activeAnimations = new Set();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  for (const animation of activeAnimations) {
    try { animation.finish(); } catch { animation.cancel(); }
  }
});

function palette(tone) {
  return COLORS[tone] || COLORS.ember;
}

function bounds(element) {
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { ...rect.toJSON(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function layer() {
  const node = document.createElement("div");
  node.className = "combat-fx-layer";
  node.setAttribute("aria-hidden", "true");
  Object.assign(node.style, {
    position: "fixed", inset: "0", zIndex: "90", pointerEvents: "none",
    overflow: "hidden", contain: "strict",
  });
  document.body.append(node);
  return node;
}

function svg(parent, x, y, width, height, markup, viewBox = `0 0 ${width} ${height}`) {
  const node = document.createElement("div");
  Object.assign(node.style, {
    position: "absolute", left: `${x - width / 2}px`, top: `${y - height / 2}px`,
    width: `${width}px`, height: `${height}px`, transformOrigin: "50% 50%",
    willChange: "transform, opacity",
  });
  node.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="${viewBox}" fill="none" overflow="visible">${markup}</svg>`;
  parent.append(node);
  return node;
}

async function motion(element, frames, options) {
  if (!element?.isConnected || typeof element.animate !== "function") return;
  let animation;
  const { retain, ...timing } = options;
  try {
    animation = element.animate(frames, { easing: "cubic-bezier(.18,.7,.24,1)", fill: "both", ...timing });
    activeAnimations.add(animation);
    if (document.hidden) animation.finish();
    await animation.finished;
  } catch {
    // Rerendering or cancelling a sequence must never strand the combat lock.
  } finally {
    activeAnimations.delete(animation);
    if (animation && retain) retain.push(() => animation.cancel());
    else animation?.cancel();
  }
}

function transformOf(element) {
  const transform = getComputedStyle(element).transform;
  return transform === "none" ? "" : transform;
}

function ring(parent, point, color, size = 118) {
  return svg(parent, point.x, point.y, size, size,
    `<circle cx="60" cy="60" r="40" stroke="${color}" stroke-width="2"/><circle cx="60" cy="60" r="49" stroke="${color}" stroke-width="1" stroke-dasharray="17 8 3 8"/><path d="M60 4V17M60 103V116M4 60H17M103 60H116" stroke="${color}" stroke-width="2"/>`, "0 0 120 120");
}

function particles(parent, point, color, count = 8, distance = 70) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + .23;
    const reach = distance * (.68 + (index % 3) * .16);
    const dot = svg(parent, point.x, point.y, 12, 12,
      `<path d="M6 0L9 5L12 6L7 9L6 12L3 7L0 6L5 3Z" fill="${color}"/>`);
    return motion(dot, [
      { opacity: 0, transform: "translate(0,0) scale(.3)" },
      { opacity: .95, transform: `translate(${Math.cos(angle) * reach * .25}px,${Math.sin(angle) * reach * .25}px) scale(1)`, offset: .16 },
      { opacity: 0, transform: `translate(${Math.cos(angle) * reach}px,${Math.sin(angle) * reach + 16}px) rotate(${index * 47}deg) scale(.1)` },
    ], { duration: 400 + (index % 2) * 40 });
  });
}

function number(parent, point, text, color, { reduced = false, offset = 0, strong = false } = {}) {
  const node = document.createElement("div");
  node.textContent = text;
  Object.assign(node.style, {
    position: "absolute", left: `${point.x}px`, top: `${point.y - 38 + offset}px`,
    color, whiteSpace: "nowrap", font: `${strong ? 800 : 700} ${strong ? 34 : 24}px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace`,
    letterSpacing: "-.06em", textShadow: `0 3px 0 #081b25, 0 0 18px ${color}88`,
    WebkitTextStroke: ".35px #13212a", transform: "translate(-50%,-50%)",
  });
  parent.append(node);
  return motion(node, reduced ? [
    { opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .82 }, { opacity: 0 },
  ] : [
    { opacity: 0, transform: "translate(-50%,0) scale(.55)" },
    { opacity: 1, transform: "translate(-50%,-20px) scale(1.25)", offset: .18 },
    { opacity: 1, transform: "translate(-50%,-28px) scale(1)", offset: .5 },
    { opacity: 0, transform: "translate(-50%,-52px) scale(.95)" },
  ], { duration: reduced ? 220 : 480 });
}

/** Resolve exactly when the spell reaches its target, before damage is applied. */
export async function animateAttack(sourceElement, targetElement, { tone = "ember", enemy = false, reduced = false } = {}) {
  const source = bounds(sourceElement);
  const target = bounds(targetElement);
  if (!source || !target) return;
  const color = palette(enemy ? "enemy" : tone);
  const overlay = layer();
  try {
    const charge = ring(overlay, source, color.main, 90);
    if (reduced) {
      await motion(charge, [{ opacity: 0 }, { opacity: .7, offset: .5 }, { opacity: 0 }], { duration: 100 });
      return;
    }
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const direction = dx >= 0 ? 1 : -1;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const base = transformOf(sourceElement);
    const projectile = svg(overlay, source.x, source.y, 100, 42,
      `<path d="M5 21H77" stroke="${color.shadow}" stroke-width="16" stroke-linecap="round" opacity=".2"/><path d="M10 21H82" stroke="${color.main}" stroke-width="6" stroke-linecap="round"/><path d="M42 21H90" stroke="${color.light}" stroke-width="2"/><path d="M70 8L96 21L70 34L79 21Z" fill="${color.light}"/><path d="M18 10H48M7 31H39" stroke="${color.main}" stroke-width="2" opacity=".65"/>`, "0 0 100 42");
    projectile.style.filter = `drop-shadow(0 0 8px ${color.main})`;
    await Promise.all([
      motion(sourceElement, [
        { transform: `${base} translate(0,0) scale(1)` },
        { transform: `${base} translate(${-direction * 9}px,3px) rotate(${-direction * 3}deg) scale(.96)`, offset: .32 },
        { transform: `${base} translate(${dx / length * (enemy ? 35 : 20)}px,${dy / length * 16}px) rotate(${direction * 3}deg) scale(1.05)`, offset: .63 },
        { transform: `${base} translate(0,0) scale(1)` },
      ], { duration: 350 }),
      motion(charge, [
        { opacity: 0, transform: "scale(.3) rotate(-30deg)" },
        { opacity: .8, transform: "scale(.72) rotate(0deg)", offset: .45 },
        { opacity: 0, transform: "scale(1.1) rotate(35deg)" },
      ], { duration: 230 }),
      motion(projectile, [
        { opacity: 0, transform: `translate(0,0) rotate(${angle}deg) scale(.45)` },
        { opacity: 1, transform: `translate(${dx * .08}px,${dy * .08}px) rotate(${angle}deg) scale(.85)`, offset: .14 },
        { opacity: 1, transform: `translate(${dx * .52}px,${dy * .52 - 12}px) rotate(${angle}deg) scale(1.15)`, offset: .62 },
        { opacity: 0, transform: `translate(${dx}px,${dy}px) rotate(${angle}deg) scale(.8)` },
      ], { delay: 110, duration: 240, easing: "cubic-bezier(.45,0,.82,.6)" }),
    ]);
  } finally {
    overlay.remove();
  }
}

/** Use a freshly queried target after rendering damage, block, or charge changes. */
export async function animateImpact(targetElement, {
  damage = 0, blocked = 0, healing = 0, guard = 0, power = 0,
  defeated = false, tone = "ember", reduced = false,
} = {}) {
  const target = bounds(targetElement);
  if (!target) return;
  const color = palette(tone);
  const defensive = guard > 0 || blocked > 0;
  const overlay = layer();
  const tasks = [];
  const cleanup = [];
  try {
    let numberOffset = 0;
    const addNumber = (text, tint, strong = false) => {
      tasks.push(number(overlay, target, text, tint, { reduced, offset: numberOffset, strong }));
      numberOffset += 30;
    };
    if (damage > 0) addNumber(`−${damage}`, COLORS.ember.light, true);
    if (blocked > 0) addNumber(`◒ ${blocked}`, COLORS.tide.main);
    if (guard > 0) addNumber(`◒ +${guard}`, COLORS.tide.light);
    if (healing > 0) addNumber(`♥ +${healing}`, COLORS.tide.light);
    if (power > 0) addNumber(`↑ +${power}`, COLORS.enemy.main);
    if (!reduced) {
      const base = transformOf(targetElement);
      if (damage > 0) {
        tasks.push(motion(targetElement, [
          { transform: `${base} translate(0,0)`, filter: "brightness(1)" },
          { transform: `${base} translate(10px,-3px) rotate(4deg)`, filter: "brightness(1.8)", offset: .1 },
          { transform: `${base} translate(-7px,2px) rotate(-3deg)`, filter: "brightness(1.2)", offset: .26 },
          { transform: `${base} translate(4px,0) rotate(1deg)`, filter: "brightness(1)", offset: .43 },
          { transform: `${base} translate(0,0)`, filter: "brightness(1)" },
        ], { duration: 340 }));
        const slash = svg(overlay, target.x, target.y, 150, 150,
          `<path d="M22 128L78 51L132 17L83 68Z" fill="${color.main}" opacity=".7"/><path d="M31 118L83 60L132 17" stroke="${color.light}" stroke-width="4"/><path d="M20 56L121 96" stroke="${color.light}" stroke-width="2" opacity=".7"/>`, "0 0 150 150");
        tasks.push(motion(slash, [
          { opacity: 0, transform: "scale(.4) rotate(-18deg)" },
          { opacity: 1, transform: "scale(1) rotate(0deg)", offset: .18 },
          { opacity: 0, transform: "scale(1.18) rotate(9deg)" },
        ], { duration: 330 }));
        tasks.push(...particles(overlay, target, color.main));
      }
      if (defensive || healing > 0 || power > 0) {
        const tint = defensive || healing > 0 ? COLORS.tide : COLORS.enemy;
        const shield = svg(overlay, target.x, target.y, 126, 138,
          defensive
            ? `<path d="M63 10L109 31V72Q101 106 63 127Q25 106 17 72V31Z" fill="${tint.shadow}" fill-opacity=".2" stroke="${tint.main}" stroke-width="3"/><path d="M63 23L96 39V72Q87 96 63 113Q39 96 30 72V39Z" stroke="${tint.light}" stroke-opacity=".65"/><path d="M41 68L57 84L88 48" stroke="${tint.light}" stroke-width="3"/>`
            : `<circle cx="63" cy="69" r="43" stroke="${tint.main}" stroke-width="2"/><path d="M43 76L63 50L83 76M63 50V95M43 49L63 23L83 49" stroke="${tint.light}" stroke-width="4"/>`, "0 0 126 138");
        tasks.push(motion(shield, [
          { opacity: 0, transform: "scale(.6)" },
          { opacity: .92, transform: "scale(1.05)", offset: .26 },
          { opacity: .65, transform: "scale(1)", offset: .65 },
          { opacity: 0, transform: "scale(1.16)" },
        ], { duration: 440 }));
      }
      if (defeated) {
        tasks.push(...particles(overlay, target, COLORS.glass.main, 10, 94));
        tasks.push(motion(targetElement, [
          { opacity: 1, filter: "brightness(1.6)", transform: `${base} scale(1)` },
          { opacity: .8, filter: "brightness(1)", transform: `${base} scale(1.06)`, offset: .22 },
          { opacity: 0, filter: "brightness(.4)", transform: `${base} translateY(15px) scale(.72)` },
        ], { duration: 480, retain: cleanup }));
      }
    }
    await Promise.all(tasks);
  } finally {
    overlay.remove();
    cleanup.forEach((release) => release());
  }
}

export async function animateWake(stage, { reduced = false } = {}) {
  const target = bounds(stage);
  if (!target) return;
  const overlay = layer();
  try {
    const size = Math.min(420, Math.max(target.width, target.height));
    const seals = ["tide", "ember", "glass"].map((tone, index) => {
      const seal = ring(overlay, target, palette(tone).main, size);
      return motion(seal, reduced ? [
        { opacity: 0 }, { opacity: .4, offset: .5 }, { opacity: 0 },
      ] : [
        { opacity: 0, transform: `scale(.15) rotate(${index * 60}deg)` },
        { opacity: .72, transform: `scale(${.65 + index * .12}) rotate(${index * 60 + 30}deg)`, offset: .38 },
        { opacity: 0, transform: `scale(${1.65 + index * .15}) rotate(${index * 60 + 70}deg)` },
      ], { delay: reduced ? 0 : index * 35, duration: reduced ? 180 : 480 });
    });
    if (!reduced) seals.push(...particles(overlay, target, COLORS.tide.light, 14, size * .6));
    await Promise.all(seals);
  } finally {
    overlay.remove();
  }
}

function cards(elements) {
  return Array.from(elements || []).filter((element) => bounds(element));
}

export async function animateDiscard(elements, { reduced = false } = {}) {
  const hand = cards(elements);
  if (reduced || !hand.length) return;
  const overlay = layer();
  const sources = hand.map((element) => ({ element, visibility: element.style.visibility }));
  try {
    await Promise.all(hand.map((element, index) => {
      const rect = element.getBoundingClientRect();
      const ghost = element.cloneNode(true);
      ghost.removeAttribute("id");
      ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      ghost.setAttribute("tabindex", "-1");
      ghost.inert = true;
      Object.assign(ghost.style, {
        position: "absolute", left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`, minWidth: "0", maxWidth: "none",
        margin: "0", transform: "none", animation: "none", transition: "none",
        boxSizing: "border-box", pointerEvents: "none",
      });
      overlay.append(ghost);
      element.style.visibility = "hidden";
      return motion(ghost, [
        { opacity: 1, transform: "translate(0,0) scale(1)" },
        { opacity: .75, transform: "translate(12px,-8px) rotate(5deg) scale(.95)", offset: .3 },
        { opacity: 0, transform: "translate(70px,90px) rotate(19deg) scale(.65)" },
      ], { delay: Math.min(index, 7) * 18, duration: 220 }).finally(() => ghost.remove());
    }));
  } finally {
    overlay.remove();
    sources.forEach(({ element, visibility }) => { element.style.visibility = visibility; });
  }
}

export async function animateDeal(elements, { reduced = false } = {}) {
  const hand = cards(elements);
  if (reduced || !hand.length) return;
  await Promise.all(hand.map((element, index) => {
    const base = transformOf(element);
    return motion(element, [
      { opacity: 0, transform: `${base} translate(-45px,70px) rotate(-12deg) scale(.7)` },
      { opacity: 1, transform: `${base} translate(0,-7px) rotate(1deg) scale(1.02)`, offset: .72 },
      { opacity: 1, transform: `${base} translate(0,0) rotate(0deg) scale(1)` },
    ], { delay: Math.min(index, 7) * 38, duration: 300 });
  }));
}
