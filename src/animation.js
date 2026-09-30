// Original motion for the illustrated combat stage. Effects never change game state.
const reducedMotion = (reduced) => reduced || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

async function motion(element, frames, duration) {
  if (!element?.animate) return;
  const animation = element.animate(frames, { duration, easing: "cubic-bezier(.22,.7,.3,1)", fill: "none" });
  try { await animation.finished; } catch { /* A replaced scene cancels safely. */ }
}

function center(element) {
  const rect = element?.getBoundingClientRect();
  return rect && rect.width ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * .46 } : null;
}

async function projectile(from, to, color, duration = 350) {
  if (!from || !to) return;
  const effect = document.createElement("span");
  effect.className = "combat-projectile";
  effect.setAttribute("aria-hidden", "true");
  Object.assign(effect.style, {
    position: "fixed", left: `${from.x}px`, top: `${from.y}px`, width: "24px", height: "10px",
    borderRadius: "50%", background: "#fff7df", color, zIndex: "1100", pointerEvents: "none",
    boxShadow: `0 0 10px 5px ${color}, 0 0 35px 10px ${color}`,
  });
  document.body.append(effect);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  try {
    await motion(effect, [
      { opacity: 0, transform: `translate(0,0) rotate(${angle}deg) scale(.2)` },
      { offset: .2, opacity: 1, transform: `translate(${dx * .1}px,${dy * .1 - 15}px) rotate(${angle}deg) scale(1.3)` },
      { offset: .88, opacity: 1, transform: `translate(${dx * .93}px,${dy * .93}px) rotate(${angle}deg) scale(1.1)` },
      { opacity: 0, transform: `translate(${dx}px,${dy}px) rotate(${angle}deg) scale(2)` },
    ], duration);
  } finally { effect.remove(); }
}

async function pulse(element, color) {
  if (!element) return;
  await motion(element, [
    { filter: "brightness(1) drop-shadow(0 0 0 transparent)" },
    { offset: .45, filter: `brightness(1.6) drop-shadow(0 0 22px ${color})` },
    { filter: "brightness(1) drop-shadow(0 0 0 transparent)" },
  ], 420);
}

export async function animateCardCast({ app, index, targetIndex, card, reduced }) {
  if (reducedMotion(reduced)) return;
  const handCard = app.querySelector(`.hand-card[data-card-index="${index}"]`);
  const hero = app.querySelector(".hero-actor .actor-sprite");
  const targets = card.target
    ? [app.querySelector(`.foe-card[data-enemy-index="${targetIndex}"] .actor-sprite`)]
    : card.type.startsWith("all")
      ? [...app.querySelectorAll(".foe-card:not(.defeated) .actor-sprite")]
      : [];
  const color = { ember: "#ffb46c", tide: "#63e0d0", glass: "#c7a4ff" }[card.sigil];
  handCard?.classList.add("card-launching");
  const effects = [motion(handCard, [
    { transform: "translateY(0) scale(1)", opacity: 1 },
    { offset: .5, transform: "translateY(-50px) scale(1.06)", opacity: 1 },
    { transform: "translateY(-105px) scale(.7)", opacity: 0 },
  ], 410)];
  if (targets.length) {
    effects.push(motion(hero, [
      { transform: "translateX(-50%) rotate(0deg)" },
      { offset: .3, transform: "translateX(calc(-50% - 12px)) rotate(-4deg)" },
      { offset: .6, transform: "translateX(calc(-50% + 42px)) rotate(7deg)" },
      { transform: "translateX(-50%) rotate(0deg)" },
    ], 470));
    effects.push(...targets.map((target) => projectile(center(hero), center(target), color, 430)));
  } else effects.push(pulse(hero, color));
  try { await Promise.all(effects); } finally { handCard?.classList.remove("card-launching"); }
}

export async function animateEnemyAction({ app, index, intent, reduced }) {
  if (reducedMotion(reduced)) return;
  const enemy = app.querySelector(`.foe-card[data-enemy-index="${index}"] .actor-sprite`);
  const hero = app.querySelector(".hero-actor .actor-sprite");
  if (intent.type !== "attack") { await pulse(enemy, intent.type === "brace" ? "#80d6ed" : "#ffb265"); return; }
  await Promise.all([
    motion(enemy, [
      { transform: "translateX(-50%) rotate(0deg)" },
      { offset: .25, transform: "translateX(calc(-50% + 15px)) rotate(4deg)" },
      { offset: .6, transform: "translateX(calc(-50% - 65px)) rotate(-9deg)" },
      { transform: "translateX(-50%) rotate(0deg)" },
    ], 430),
    projectile(center(enemy), center(hero), "#f29a78", 400),
  ]);
}

export async function settleImpact(reduced) {
  if (!reducedMotion(reduced)) await new Promise((resolve) => setTimeout(resolve, 300));
}
