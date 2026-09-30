import { ENEMIES, SIGILS, SIGIL_GLYPH, SIGIL_NAME } from "./data.js";

const SPRITE_POSITIONS = {
  hero: [0, 0], driftling: [1, 0], brineback: [2, 0], mirrorfin: [3, 0],
  inkling: [0, 1], bellwether: [1, 1], horizon: [2, 1], waypoint: [3, 1],
};

export function spriteMarkup(id, extraClass = "") {
  const [column, row] = SPRITE_POSITIONS[id] || SPRITE_POSITIONS.waypoint;
  const x = ["0%", "33.333%", "66.667%", "100%"][column];
  const y = row ? "100%" : "0%";
  return `<span class="actor-sprite sprite-${id} ${extraClass}" style="--sprite-x:${x};--sprite-y:${y}" aria-hidden="true"></span>`;
}

function intentMarkup(enemy, tr, currentIntent) {
  const intent = currentIntent(enemy);
  const key = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
  const icon = intent.type === "attack" ? "⚔" : intent.type === "brace" ? "◒" : "↑";
  return `<span class="intent intent-${intent.type}"><span aria-hidden="true">${icon}</span>${tr(key, { n: intent.value })}</span>`;
}

function enemyMarkup(enemy, index, context) {
  const { ui, tr, enemyName, currentIntent, escapeHtml } = context;
  const hit = ui.cardFx?.hits?.find((entry) => entry.index === index);
  if (enemy.hp <= 0) {
    return `<div class="foe-card defeated ${hit ? "foe-defeated-hit" : ""}" data-enemy-index="${index}" aria-hidden="true">
      ${spriteMarkup(enemy.id, "fallen-sprite")}<span class="defeated-mark">×</span>${hit ? `<span class="impact-number">−${hit.amount}</span>` : ""}
    </div>`;
  }
  const intent = currentIntent(enemy);
  const intentKey = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
  const selected = ui.selectedEnemy === index;
  const targeting = ui.pendingCard !== null;
  const acting = ui.enemyTurn && ui.actingEnemy === index;
  const label = `${enemyName(enemy)}, ${enemy.hp} / ${enemy.maxHp}. ${tr("currentFoe")}: ${tr(intentKey, { n: intent.value })}`;
  return `<button type="button" class="foe-card ${targeting ? "targetable" : ""} ${selected ? "foe-selected" : ""} ${acting ? "foe-acting" : ""} ${enemy.id === "horizon" ? "foe-boss" : ""} ${hit ? "foe-hit" : ""}" data-action="select-foe" data-enemy-index="${index}" data-focus="foe-${index}" aria-label="${escapeHtml(label)}" ${ui.animating ? "disabled" : ""}>
    <span class="intent-perch">${intentMarkup(enemy, tr, currentIntent)}</span>
    ${spriteMarkup(enemy.id)}
    <span class="actor-shadow" aria-hidden="true"></span>
    <span class="actor-vitals">
      <span class="foe-name-row"><strong>${escapeHtml(enemyName(enemy))}</strong>${enemy.guard > 0 ? `<span class="foe-guard">◒ ${enemy.guard}</span>` : ""}</span>
      <span class="foe-health"><i style="width:${Math.max(0, enemy.hp / enemy.maxHp * 100)}%"></i></span>
      <span class="foe-stats"><span>${enemy.hp} <small>/ ${enemy.maxHp} HP</small></span></span>
    </span>
    ${targeting ? `<span class="target-label">${selected ? tr("targetSelected") : tr("targetFoe")}</span>` : ""}
    ${hit ? `<span class="impact-number" aria-hidden="true">−${hit.amount}</span>` : ""}
  </button>`;
}

function cardMarkup(cardId, index, context) {
  const { renderCard, ui } = context;
  let markup = renderCard(cardId, {
    index,
    playable: true,
    selected: ui.pendingCard !== null && ui.pendingCard === index,
  });
  markup = markup.replace('class="playing-card', `data-card-art="${cardId}" class="playing-card`);
  if (ui.animating) markup = markup.replace("<button ", '<button disabled aria-disabled="true" ');
  return markup;
}

function compactRules(context) {
  const { state, tr } = context;
  const fight = state.run.fight;
  const resonanceStem = fight.resonance ? `resonance${fight.resonance[0].toUpperCase()}${fight.resonance.slice(1)}` : "";
  const reaction = fight.resonance ? tr(`${resonanceStem}Title`) : tr("ruleReaction");
  const reactionEffect = fight.resonance
    ? tr(fight.resonance === "prism" && !fight.prismReady ? "resonancePrismSpent" : `${resonanceStem}Effect`)
    : tr("ruleHint");
  return `<section class="sigil-rule" aria-label="${tr("wakeTitle")}">
    <span class="rule-caption">${tr("ruleCaption")}</span>
    <span class="rule-sigils">${SIGILS.map((sigil) => `<span class="rule-sigil ${fight.sigils.includes(sigil) ? `filled ${sigil}` : ""}" title="${tr(SIGIL_NAME[sigil][state.locale])}">${SIGIL_GLYPH[sigil]}</span>`).join("")}</span>
    <span class="rule-arrow" aria-hidden="true">→</span>
    <span class="rule-result ${fight.wakeUsed ? "ready" : ""}"><strong>${fight.wakeUsed ? tr("wakeReady") : reaction}</strong><small>${fight.wakeUsed ? tr("wakeEffect") : reactionEffect}</small></span>
    <button class="rule-help" type="button" data-action="help" aria-label="${tr("howTo")}">?</button>
  </section>`;
}

export function renderBattleScene(context) {
  const { state, ui, tr, renderWake, renderLog, getIncomingDamage, getEncounterTitle, escapeHtml } = context;
  const run = state.run;
  const fight = run.fight;
  const incoming = getIncomingDamage();
  const expectedDamage = Math.max(0, incoming - fight.guard);
  const notice = ui.notice || (ui.pendingCard !== null ? tr("targetHint") : tr("clickCardHint"));
  const hpPercent = Math.max(0, run.hp / run.maxHp * 100);
  const disabled = ui.animating || ui.enemyTurn ? "disabled" : "";
  const encounterClass = `encounter-${escapeHtml(run.encounterId || "shoal")}`;
  return `<main class="game-scene battle-scene illustrated-battle ${encounterClass}">
    <section class="battle-heading scene-heading"><div><span class="section-eyebrow">${tr("chapter")} · ${tr("step", { n: run.stage })}</span><h1>${getEncounterTitle()}</h1></div>
      <div class="scene-tools"><span class="turn-pill"><span class="live-dot"></span>${tr("turn", { turn: fight.turn })}</span><button type="button" class="map-button" data-action="map" data-focus="map">⌖ ${tr("map")}</button></div>
    </section>
    <section class="arena ${run.encounterId === "boss" ? "arena-boss" : ""} ${ui.cardFx?.wake ? "wake-burst" : ""} ${ui.cardFx?.resonance ? `resonance-burst resonance-${ui.cardFx.resonance}` : ""}" aria-label="${getEncounterTitle()}">
      <div class="scene-backdrop" aria-hidden="true"><i></i><b></b><em></em></div>
      ${ui.enemyTurn ? `<div class="enemy-turn-banner"><span>${tr("enemyTurn")}</span></div>` : ""}
      <div class="combat-stage">
        <article class="hero-actor ${ui.cardFx?.heroHit ? "hero-hit" : ""} ${ui.cardFx?.blocked ? "hero-blocked" : ""}">
          <span class="hero-intent-summary"><small>${incoming ? tr("expectedDamage") : tr("turnTitle")}</small><strong>${expectedDamage ? tr("damage", { n: expectedDamage }) : tr("noIncoming")}</strong></span>
          ${spriteMarkup("hero")}<span class="actor-shadow" aria-hidden="true"></span>
          <span class="actor-vitals hero-vitals"><span class="hero-name-row"><strong>${tr("heroName")}</strong><span class="metric-guard ${ui.cardFx?.guard || ui.cardFx?.blocked ? "guard-burst" : ""}">◒ ${fight.guard}</span></span><span class="hero-health"><i style="width:${hpPercent}%"></i></span><span class="hero-hp">${run.hp} <small>/ ${run.maxHp} HP</small></span></span>
          ${ui.cardFx?.heroHit ? `<span class="hero-impact impact-number">−${ui.cardFx.heroHit}</span>` : ""}${ui.cardFx?.blocked ? `<span class="block-number">${tr("blockLabel")} ${ui.cardFx.blocked}</span>` : ""}
        </article>
        <div class="battle-divider" aria-hidden="true"><span>✦</span></div>
        <div class="foe-row">${fight.enemies.map((enemy, index) => enemyMarkup(enemy, index, context)).join("")}</div>
      </div>
      <div class="arena-floor" aria-hidden="true"></div>
    </section>
    <div class="battle-lower">
      <div class="rules-and-log">${compactRules(context)}<details class="battle-log"><summary>${tr("battleLog")}</summary>${renderLog()}</details></div>
      <section class="hand-zone illustrated-hand">
        <div class="energy-wheel" aria-label="${tr("energy")}: ${fight.energy} / 3"><span>${fight.energy}</span><small>${tr("energy")}</small><i>${[0, 1, 2].map((n) => `<b class="${n < fight.energy ? "filled" : ""}"></b>`).join("")}</i></div>
        <div class="hand-center"><div class="hand-cards">${fight.hand.map((id, index) => cardMarkup(id, index, context)).join("") || `<div class="empty-hand">${tr("clickCardHint")}</div>`}</div><div class="hand-footer"><span class="keyboard-hint">${notice}</span><span class="hand-piles"><button type="button" data-action="deck" ${disabled}>${tr("deckPeek")} ${run.deck.length}</button><span>${tr("drawPile")} <b>${fight.drawPile.length}</b></span><span>${tr("discardPile")} <b>${fight.discardPile.length}</b></span></span></div></div>
        <div class="turn-actions"><button type="button" class="button button-primary end-turn" data-action="end-turn" data-focus="end-turn" ${disabled}>${tr("endTurn")} <span aria-hidden="true">→</span></button><button type="button" class="reweave-button" data-action="reweave" data-focus="reweave" ${disabled || !run.reweaveAvailable || fight.hand.length === 0 ? "disabled" : ""}>⤨ ${run.reweaveAvailable ? tr("reweave") : tr("reweaveUsed")}</button></div>
      </section>
    </div>
    <div class="sr-only wake-compat">${renderWake()}</div>
  </main>`;
}

const ROUTE_NODES = [
  { id: "shoal", title: "titleShoal", subtitle: "routeShoalDescription", x: 12, y: 50 },
  { id: "quiet", title: "quietTitle", subtitle: "quietDescription", x: 46, y: 27 },
  { id: "rift", title: "riftTitle", subtitle: "riftDescription", x: 46, y: 73 },
  { id: "boss", title: "bossTitle", subtitle: "bossDescription", x: 82, y: 50 },
];

export function renderRouteScene(context) {
  const { state, tr, readOnly = false } = context;
  const run = state.run;
  const won = run.fightsWon || 0;
  const available = won === 0 ? new Set(["shoal"]) : won === 1 ? new Set(["quiet", "rift"]) : won === 2 ? new Set(["boss"]) : new Set();
  const completed = new Set();
  if (won >= 1) completed.add("shoal");
  if (won >= 2 && run.route) completed.add(run.route);
  if (won >= 3) completed.add("boss");
  const selectedPath = run.route || "";
  const routeHint = readOnly ? "mapDescription" : won === 0 ? "mapStartHint" : won === 2 ? "mapBossHint" : "routeDescription";
  const nodes = ROUTE_NODES.map((node) => {
    const isAvailable = available.has(node.id);
    const isCompleted = completed.has(node.id);
    const isChosen = node.id === selectedPath;
    const isLockedBranch = won >= 2 && (node.id === "quiet" || node.id === "rift") && !isChosen;
    const className = ["route-node", `node-${node.id}`, isAvailable ? "available" : "", isCompleted ? "completed" : "", isChosen ? "chosen" : "", isLockedBranch ? "bypassed" : ""].filter(Boolean).join(" ");
    const label = `${tr(node.title)}. ${tr(node.subtitle)}`;
    const inner = `${spriteMarkup(node.id === "boss" ? "horizon" : "waypoint", "route-sprite")}<span class="node-copy"><small>${readOnly && node.id === run.encounterId ? tr("routeCurrent") : isCompleted ? tr("routeCleared") : isAvailable ? tr("routeAvailable") : tr("routeLocked")}</small><strong>${tr(node.title)}</strong><span>${tr(node.subtitle)}</span></span>`;
    return isAvailable && !readOnly
      ? `<button type="button" class="${className}" style="--x:${node.x}%;--y:${node.y}%" data-action="choose-route" data-route="${node.id}" data-focus="route-${node.id}" aria-label="${label}">${inner}<em>${tr("choosePassage")} →</em></button>`
      : `<div class="${className}" style="--x:${node.x}%;--y:${node.y}%" aria-label="${label}" ${isAvailable ? "aria-current=step" : ""}>${inner}</div>`;
  }).join("");
  const pathClass = selectedPath ? `path-${selectedPath}` : "";
  const body = `<section class="route-map-card ${pathClass}">
    <div class="route-map-heading"><div><span class="section-eyebrow">${tr("route")} · ${tr("routeProgress", { n: Math.min(won + 1, 3) })}</span><h1 id="route-map-title">${tr("routeTitle")}</h1><p>${tr(routeHint)}</p></div><div class="route-hp">♥ <strong>${run.hp}</strong><small>/ ${run.maxHp} HP</small></div></div>
    <div class="route-graph"><svg viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true"><path class="route-link link-shoal-quiet" d="M170 210 C300 210 300 112 430 112"/><path class="route-link link-shoal-rift" d="M170 210 C300 210 300 308 430 308"/><path class="route-link link-quiet-boss" d="M570 112 C700 112 700 210 820 210"/><path class="route-link link-rift-boss" d="M570 308 C700 308 700 210 820 210"/></svg><svg class="mobile-route-links" viewBox="0 0 400 464" preserveAspectRatio="none" aria-hidden="true"><path class="route-link link-shoal-quiet" d="M200 70 L95 232"/><path class="route-link link-shoal-rift" d="M200 70 L305 232"/><path class="route-link link-quiet-boss" d="M95 232 L200 394"/><path class="route-link link-rift-boss" d="M305 232 L200 394"/></svg>${nodes}</div>
    <div class="route-legend"><span><i class="available"></i>${tr("routeAvailable")}</span><span><i class="completed"></i>${tr("routeCleared")}</span><span><i></i>${tr("routeLocked")}</span></div>
  </section>`;
  if (readOnly) return body;
  return `<main class="intermission-scene route-scene illustrated-route"><div class="intermission-glow" aria-hidden="true"></div>${body}</main>`;
}
