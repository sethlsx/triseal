// Original painted cutouts generated for Triseal. See assets/characters/README.md.
// Combat movement belongs to the outer combatant; only the inner body idles.
export const COMBATANT_IDS = ["hero", "driftling", "brineback", "mirrorfin", "inkling", "bellwether", "horizon"];

export function renderCombatant(kind, { idle = true, eager = true } = {}) {
  const name = COMBATANT_IDS.includes(kind) ? kind : "driftling";
  const motion = name === "hero" ? "portrait-breathe" : name === "brineback" ? "portrait-heavy" : "portrait-float";
  return `<span class="combat-portrait painted-portrait art-${name}${idle ? " portrait-idle" : ""}" aria-hidden="true"><span class="portrait-ground"></span><span class="portrait-body ${motion}"><img class="character-image" src="./assets/characters/${name}.webp" alt="" draggable="false" loading="${eager ? "eager" : "lazy"}" decoding="async" /></span></span>`;
}
