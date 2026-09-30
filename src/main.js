import { TEXT, SIGILS, SIGIL_NAME, SIGIL_GLYPH, CARDS, ENEMIES, ENCOUNTERS, REWARD_POOLS } from "./data.js";
import { activateAudio, playSound, setSoundEnabled, setMusicEnabled, setVolume, suspendAudio, resumeAudio } from "./audio.js";
import { COMBATANT_IDS, renderCombatant } from "./combat-art.js?v=portraits-1";
import { renderBattleScenery } from "./battle-scenery.js";
import { animateAttack, animateImpact, animateWake, animateDiscard, animateDeal } from "./combat-motion.js";

const SAVE_KEY = "spindlewake.save.v1";
const MAX_HAND = 10;
const STARTING_DECK = ["needle", "needle", "needle", "needle", "brace", "brace", "brace", "glassline", "glassline", "undertow"];
const RESONANCE_BY_PAIR = { "ember+glass": "prism", "glass+tide": "mirror", "ember+tide": "steam" };
const DAMAGE_CARD_TYPES = new Set(["damage", "damageBlock", "allDamage", "damageDraw", "allDamageBlock"]);
const app = document.querySelector("#app");
const portraitLayout = window.matchMedia("(max-width: 700px) and (orientation: portrait)");

function loadState() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (save) return {
      locale: save.locale === "zh" ? "zh" : "en",
      sound: save.sound !== false,
      music: save.music !== false,
      motion: save.motion === true,
      volume: Number.isFinite(save.volume) ? save.volume : 0.55,
      run: save.run || null,
      screen: save.screen || "title",
    };
  } catch { /* Start a clean chart if a save is damaged. */ }
  return { locale: "en", sound: true, music: true, motion: false, volume: 0.55, run: null, screen: "title" };
}

const state = loadState();
const ui = { modal: null, pendingCard: null, previewCard: null, selectedEnemy: 0, notice: "", returnFocus: null, focusAfterRender: null, animating: false, cardFx: null, phase: null, enemyTurn: false, activeEnemy: null, resolvedEnemies: [] };
setSoundEnabled(state.sound);
setMusicEnabled(state.music);
setVolume(state.volume);

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      locale: state.locale, sound: state.sound, music: state.music,
      motion: state.motion, volume: state.volume, run: state.run, screen: state.screen,
    }));
  } catch { /* The game remains playable if browser storage is unavailable. */ }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[char]);
}

function tr(key, args = {}) {
  const template = TEXT[state.locale]?.[key] ?? TEXT.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => escapeHtml(args[name] ?? ""));
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function random(run) {
  let value = run.randomState += 0x6D2B79F5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function shuffle(run, items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random(run) * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function event(key, args = {}) {
  if (!state.run) return;
  state.run.log = [...(state.run.log || []), { key, args }].slice(-8);
}

function cardName(id) {
  return CARDS[id]?.[state.locale]?.name || CARDS[id]?.en?.name || id;
}

function enemyName(enemy) {
  const keys = {
    driftling: "enemyDriftling", brineback: "enemyBrineback", mirrorfin: "enemyMirrorfin",
    inkling: "enemyInkling", bellwether: "enemyBellwether", horizon: "enemyHorizon",
  };
  return tr(keys[enemy.id] || "enemyDriftling");
}

function beginTurn(run, ensureOpeningBraid = false) {
  const fight = run.fight;
  fight.turn += 1;
  run.totalTurns += 1;
  fight.energy = 3;
  fight.guard = 0;
  fight.sigils = [];
  fight.resonance = null;
  fight.attackReduction = 0;
  fight.prismReady = false;
  fight.wakeUsed = false;
  if (ensureOpeningBraid) {
    for (const sigil of SIGILS) {
      const index = fight.drawPile.findIndex((cardId) => CARDS[cardId].sigil === sigil);
      if (index >= 0 && fight.hand.length < MAX_HAND) fight.hand.push(fight.drawPile.splice(index, 1)[0]);
    }
    drawCards(run, Math.max(0, 5 - fight.hand.length));
  } else drawCards(run, 5);
  event("logTurn", { n: fight.turn });
}

function makeEncounter(run, encounterId) {
  const encounter = ENCOUNTERS[encounterId];
  run.encounterId = encounterId;
  run.fight = {
    turn: 0, energy: 0, guard: 0, sigils: [], resonance: null,
    attackReduction: 0, prismReady: false, wakeUsed: false,
    hand: [], discardPile: [], drawPile: shuffle(run, run.deck),
    enemies: encounter.enemies.map((id) => ({ id, hp: ENEMIES[id].hp, maxHp: ENEMIES[id].hp, guard: 0, intentIndex: 0, power: 0 })),
  };
  beginTurn(run, true);
  state.screen = "battle";
  ui.pendingCard = null;
  ui.previewCard = null;
  ui.selectedEnemy = 0;
}

function drawCards(run, amount) {
  const fight = run.fight;
  const handStart = fight.hand.length;
  let drawn = 0;
  for (let count = 0; count < amount && fight.hand.length < MAX_HAND; count += 1) {
    if (fight.drawPile.length === 0) {
      if (fight.discardPile.length === 0) break;
      fight.drawPile = shuffle(run, fight.discardPile);
      fight.discardPile = [];
    }
    const card = fight.drawPile.pop();
    if (card) { fight.hand.push(card); drawn += 1; }
  }
  if (drawn > 0) {
    event("logDraw", { n: drawn });
    playSound("draw");
    if (ui.cardFx) ui.cardFx.drawnIndices.push(...Array.from({ length: drawn }, (_, offset) => handStart + offset));
  }
  return drawn;
}

function addGuard(run, amount) {
  run.fight.guard += amount;
  if (ui.cardFx) ui.cardFx.guard += amount;
  event("logGuard", { n: amount });
  playSound("guard");
}

function currentIntent(enemy) {
  const pattern = ENEMIES[enemy.id].pattern;
  const base = pattern[enemy.intentIndex % pattern.length];
  if (base.type === "attack") {
    const reduction = state.run?.fight?.attackReduction || 0;
    return { ...base, value: Math.max(0, base.value + enemy.power - reduction) };
  }
  return base;
}

function damageEnemy(run, index, amount) {
  const enemy = run.fight.enemies[index];
  if (!enemy || enemy.hp <= 0) return 0;
  let remainder = amount;
  let absorbed = 0;
  if (enemy.guard > 0) {
    absorbed = Math.min(enemy.guard, remainder);
    enemy.guard -= absorbed;
    remainder -= absorbed;
  }
  const dealt = Math.min(enemy.hp, remainder);
  enemy.hp -= dealt;
  if ((dealt > 0 || absorbed > 0) && ui.cardFx) {
    const hit = ui.cardFx.hits.find((entry) => entry.index === index);
    if (hit) { hit.amount += dealt; hit.blocked += absorbed; }
    else ui.cardFx.hits.push({ index, amount: dealt, blocked: absorbed });
  }
  if (absorbed > 0) event("logBlocked", { name: enemyName(enemy), n: absorbed });
  if (dealt > 0) event("logDamage", { name: enemyName(enemy), n: dealt });
  playSound("hit");
  if (enemy.hp <= 0) event("logEnemyDown", { name: enemyName(enemy) });
  return dealt;
}

function triggerWake(run) {
  const fight = run.fight;
  if (fight.wakeUsed || fight.sigils.length < 3) return;
  fight.wakeUsed = true;
  if (ui.cardFx) ui.cardFx.wake = true;
  event("logWake");
  fight.enemies.forEach((enemy, index) => { if (enemy.hp > 0) damageEnemy(run, index, 4); });
  addGuard(run, 4);
  drawCards(run, 1);
  playSound("wake");
}

function triggerResonance(run, sigils) {
  const fight = run.fight;
  if (fight.resonance || sigils.length < 2) return;
  const pair = [...sigils].sort().join("+");
  const resonance = RESONANCE_BY_PAIR[pair];
  if (!resonance) return;
  fight.resonance = resonance;
  if (ui.cardFx) ui.cardFx.resonance = resonance;

  if (resonance === "steam") {
    fight.attackReduction = 2;
    event("logSteam");
  } else if (resonance === "prism") {
    fight.prismReady = true;
    event("logPrism");
  } else {
    addGuard(run, 5);
    event("logMirror");
  }
  playSound("wake");
}

function noteSigil(run, sigil) {
  const fight = run.fight;
  if (!fight.sigils.includes(sigil)) fight.sigils.push(sigil);
  // The first two distinct sigils set the turn's reaction. This also repairs
  // a mid-fight save created before Resonance existed.
  if (!fight.wakeUsed && !fight.resonance && fight.sigils.length >= 2) {
    triggerResonance(run, fight.sigils.slice(0, 2));
  }
}

function startRun(seedValue) {
  const clean = String(seedValue || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
  const seed = clean || `TIDE-${Math.floor(Math.random() * 900000 + 100000)}`;
  state.run = {
    seed, randomState: hashSeed(seed), hp: 44, maxHp: 44,
    stage: 1, route: "", deck: [...STARTING_DECK], totalTurns: 0,
    cardsAdded: 0, fightsWon: 0, reweaveAvailable: true,
    log: [], result: null, returnScreen: "battle",
  };
  ui.modal = null;
  ui.notice = "";
  makeEncounter(state.run, "shoal");
  saveState();
  playSound("play");
  render();
  introduceEncounter();
}

function makeSeedFromForm() {
  return document.querySelector("[name=seed]")?.value || "";
}

function newRunFromHome() {
  if (state.run && !state.run.result && !window.confirm(tr("overwriteConfirm"))) return;
  activateAudio();
  startRun(makeSeedFromForm());
}

function applyCard(run, cardId, targetIndex) {
  const fight = run.fight;
  const card = CARDS[cardId];
  const prismBonus = fight.prismReady && DAMAGE_CARD_TYPES.has(card.type) ? 3 : 0;
  if (prismBonus > 0) {
    fight.prismReady = false;
    event("logPrismStrike", { n: prismBonus });
  }
  switch (card.type) {
    case "damage":
      damageEnemy(run, targetIndex, card.value + prismBonus);
      break;
    case "block":
      addGuard(run, card.value);
      break;
    case "draw":
      drawCards(run, card.value);
      break;
    case "damageBlock":
      damageEnemy(run, targetIndex, card.damage + prismBonus);
      addGuard(run, card.block);
      break;
    case "blockDraw":
      addGuard(run, card.block);
      drawCards(run, card.draw);
      break;
    case "allDamage":
      fight.enemies.forEach((enemy, index) => { if (enemy.hp > 0) damageEnemy(run, index, card.value + prismBonus); });
      break;
    case "damageDraw":
      damageEnemy(run, targetIndex, card.damage + prismBonus);
      drawCards(run, card.draw);
      break;
    case "allDamageBlock":
      fight.enemies.forEach((enemy, index) => { if (enemy.hp > 0) damageEnemy(run, index, card.damage + prismBonus); });
      addGuard(run, card.block);
      break;
    default:
      break;
  }
  if (fight.enemies[targetIndex]?.hp <= 0) {
    ui.selectedEnemy = Math.max(0, fight.enemies.findIndex((foe) => foe.hp > 0));
  }
}

function beginReward() {
  const run = state.run;
  const pool = run.route === "rift" ? REWARD_POOLS.deep : REWARD_POOLS.standard;
  run.rewardOptions = shuffle(run, pool).slice(0, 3);
  state.screen = "reward";
  ui.pendingCard = null;
  playSound("win");
  saveState();
}

function finishRun(won) {
  state.run.result = won ? "won" : "lost";
  state.screen = "summary";
  ui.modal = null;
  playSound(won ? "win" : "lose");
  saveState();
}

function checkVictory() {
  const run = state.run;
  if (!run.fight.enemies.every((enemy) => enemy.hp <= 0)) return false;
  run.fightsWon += 1;
  if (run.stage >= 3 || run.encounterId === "boss") finishRun(true);
  else beginReward();
  return true;
}

function motionOptions() {
  return { reduced: state.motion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.hidden };
}

function freshEffects() {
  return { hits: [], drawnIndices: [], wake: false, guard: 0 };
}

function heroFigure() {
  return app.querySelector('[data-combatant="hero"]');
}

function enemyFigure(index) {
  return app.querySelector(`[data-enemy-index="${index}"] [data-combatant="enemy"]`);
}

function combatBeat(duration) {
  return new Promise((resolve) => setTimeout(resolve, motionOptions().reduced ? Math.min(duration, 100) : duration));
}

function introduceEncounter() {
  if (state.screen !== "battle") return;
  resolveBattleAction(async () => {
    showCombatPhase(tr("turnTitle"), getEncounterTitle());
    await animateDeal([...app.querySelectorAll(".hand-card")], motionOptions());
    await combatBeat(180);
  });
}

function showCombatPhase(title, detail = "", tone = "tide") {
  ui.phase = { title, detail, tone };
  render();
}

// Save only at action boundaries. Reloading during a sequence restores the last
// complete action, so no enemy can attack twice or leave a half-resolved turn.
async function resolveBattleAction(action) {
  if (ui.animating) return;
  const before = JSON.stringify(state.run);
  const beforeScreen = state.screen;
  const focus = document.activeElement?.dataset?.focus;
  ui.previewCard = null;
  ui.animating = true;
  try {
    await action();
  } catch (error) {
    state.run = JSON.parse(before);
    state.screen = beforeScreen;
    ui.notice = tr("actionInterrupted");
    console.error("Combat sequence interrupted", error);
  } finally {
    ui.animating = false;
    ui.cardFx = null;
    ui.phase = null;
    ui.enemyTurn = false;
    ui.activeEnemy = null;
    ui.resolvedEnemies = [];
    ui.focusAfterRender = focus;
    saveState();
    render();
  }
}

async function presentCardEffects(tone) {
  const fx = ui.cardFx;
  render();
  const effects = fx.hits.map((hit) => animateImpact(enemyFigure(hit.index), {
    damage: hit.amount, blocked: hit.blocked, tone,
    defeated: state.run.fight.enemies[hit.index].hp <= 0, ...motionOptions(),
  }));
  if (fx.guard > 0) effects.push(animateImpact(heroFigure(), { guard: fx.guard, tone: "tide", ...motionOptions() }));
  if (fx.drawnIndices.length) effects.push(animateDeal(fx.drawnIndices.map((index) => app.querySelector(`[data-card-index="${index}"]`)), motionOptions()));
  await Promise.all(effects);
  ui.cardFx = null;
}

function animatePlayedCard(index) {
  if (motionOptions().reduced) return Promise.resolve();

  const source = app.querySelector(`.hand-card[data-card-index="${index}"]`);
  const arena = app.querySelector(".arena");
  const target = heroFigure() || arena;
  if (!source || !target || typeof source.animate !== "function") return Promise.resolve();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !from.height || !to.width || !to.height) return Promise.resolve();
  const dx = to.left + to.width / 2 - from.left - from.width / 2;
  const dy = to.top + to.height / 2 - from.top - from.height / 2;
  const tilt = index % 2 === 0 ? 8 : -8;
  const width = source.offsetWidth;
  const height = source.offsetHeight;
  const transform = getComputedStyle(source).transform;
  const matrix = transform === "none" ? null : new DOMMatrixReadOnly(transform);
  const angle = matrix ? `${Math.atan2(matrix.b, matrix.a) * 180 / Math.PI}deg` : "0deg";
  const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
  const ghost = source.cloneNode(true);
  ghost.classList.remove("selected");
  ghost.classList.add("flight-card");
  ghost.removeAttribute("data-action");
  ghost.removeAttribute("data-card-index");
  ghost.removeAttribute("data-focus");
  ghost.setAttribute("aria-hidden", "true");
  ghost.tabIndex = -1;
  Object.assign(ghost.style, {
    position: "fixed", left: `${from.left + (from.width - width) / 2}px`, top: `${from.top + (from.height - height) / 2}px`,
    width: `${width}px`, height: `${height}px`, margin: "0",
    zIndex: "1000", pointerEvents: "none", transformOrigin: "center center",
  });
  document.body.append(ghost);
  source.classList.add("card-launching");

  const flight = ghost.animate([
    { offset: 0, opacity: 1, transform: `translate3d(0, 0, 0) rotate(${angle}) scale(${scale})` },
    { offset: 0.48, opacity: 1, transform: `translate3d(${dx * 0.48}px, ${dy * 0.48 - 62}px, 0) rotateY(12deg) rotate(${tilt}deg) scale(1.12)`, easing: "cubic-bezier(.2,.7,.25,1)" },
    { offset: 0.76, opacity: 1, transform: `translate3d(${dx * 0.82}px, ${dy * 0.82}px, 0) rotateY(-7deg) rotate(${-tilt * 0.5}deg) scale(1.04)` },
    { offset: 1, opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) rotate(0deg) scale(.28)` },
  ], { duration: 300, easing: "cubic-bezier(.22,.72,.25,1)", fill: "both" });
  return flight.finished.catch(() => {}).finally(() => {
    source.classList.remove("card-launching");
    ghost.remove();
  });
}

async function playCard(index, targetIndex = null) {
  if (ui.animating) return;
  const run = state.run;
  if (!run || state.screen !== "battle") return;
  const fight = run.fight;
  const cardId = fight.hand[index];
  const card = CARDS[cardId];
  if (!card) return;
  if (card.cost > fight.energy) {
    ui.notice = tr("cardNotReady");
    playSound("select");
    render();
    return;
  }
  const alive = fight.enemies.map((enemy, enemyIndex) => ({ enemy, enemyIndex })).filter(({ enemy }) => enemy.hp > 0);
  if (card.target && alive.length > 1 && targetIndex === null) {
    ui.pendingCard = index;
    ui.notice = tr("logTarget", { card: cardName(cardId) });
    playSound("select");
    render();
    return;
  }
  if (card.target) {
    targetIndex = alive.length === 1 ? alive[0].enemyIndex : targetIndex;
    if (targetIndex === null || !fight.enemies[targetIndex] || fight.enemies[targetIndex].hp <= 0) {
      ui.notice = tr("targetHint");
      render();
      return;
    }
  } else targetIndex = alive[0]?.enemyIndex ?? 0;

  ui.pendingCard = null;
  ui.notice = "";
  await resolveBattleAction(async () => {
    showCombatPhase(cardName(cardId), tr(SIGIL_NAME[card.sigil][state.locale]), card.sigil);
    playSound("play");
    await animatePlayedCard(index);
    if (DAMAGE_CARD_TYPES.has(card.type)) {
      const targets = card.target ? [targetIndex] : alive.map(({ enemyIndex }) => enemyIndex);
      await Promise.all(targets.map((index) => animateAttack(heroFigure(), enemyFigure(index), { tone: card.sigil, ...motionOptions() })));
    }
    ui.cardFx = freshEffects();
    fight.energy -= card.cost;
    fight.hand.splice(index, 1);
    applyCard(run, cardId, targetIndex);
    fight.discardPile.push(cardId);
    await presentCardEffects(card.sigil);

    ui.cardFx = freshEffects();
    noteSigil(run, card.sigil);
    if (fight.sigils.length === 3 && !fight.wakeUsed) {
      showCombatPhase(tr("wakeTitle"), tr("wakeEffect"), "glass");
      await animateWake(app.querySelector(".combat-stage"), motionOptions());
      triggerWake(run);
      await presentCardEffects("glass");
    } else if (ui.cardFx.resonance) {
      const key = ui.cardFx.resonance;
      showCombatPhase(tr(`resonance${key[0].toUpperCase()}${key.slice(1)}Title`), tr(`resonance${key[0].toUpperCase()}${key.slice(1)}Effect`), card.sigil);
      await presentCardEffects(card.sigil);
      await combatBeat(240);
    }
    checkVictory();
  });
}

async function enemyTurn() {
  const run = state.run;
  const fight = run.fight;
  ui.enemyTurn = true;
  showCombatPhase(tr("enemyTurn"), tr("enemiesActing"), "ember");
  await animateDiscard([...app.querySelectorAll(".hand-card")], motionOptions());
  fight.discardPile.push(...fight.hand);
  fight.hand = [];
  render();
  await combatBeat(200);
  for (const [index, enemy] of fight.enemies.entries()) {
    if (enemy.hp <= 0) continue;
    const intent = currentIntent(enemy);
    const key = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
    ui.activeEnemy = index;
    showCombatPhase(enemyName(enemy), tr(key, { n: intent.value }), intent.type === "attack" ? "ember" : "tide");
    await combatBeat(180);
    enemy.guard = 0;
    if (intent.type === "attack") {
      await animateAttack(enemyFigure(index), heroFigure(), { enemy: true, tone: "ember", ...motionOptions() });
      const blocked = Math.min(fight.guard, intent.value);
      fight.guard -= blocked;
      const dealt = intent.value - blocked;
      const hpLost = Math.min(run.hp, dealt);
      run.hp = Math.max(0, run.hp - dealt);
      event("logEnemyAttack", { name: enemyName(enemy), n: dealt });
      if (blocked > 0) event("logBlocked", { name: tr("chartkeeper"), n: blocked });
      playSound(dealt > 0 ? "hit" : "guard");
      ui.resolvedEnemies.push(index);
      render();
      await animateImpact(heroFigure(), { damage: hpLost, blocked, defeated: run.hp <= 0, ...motionOptions() });
    } else if (intent.type === "brace") {
      enemy.guard = intent.value;
      event("logEnemyBrace", { name: enemyName(enemy), n: intent.value });
      playSound("guard");
      ui.resolvedEnemies.push(index);
      render();
      await animateImpact(enemyFigure(index), { guard: intent.value, tone: "tide", ...motionOptions() });
    } else if (intent.type === "charge") {
      enemy.power += intent.value;
      event("logEnemyCharge", { name: enemyName(enemy), n: intent.value });
      playSound("select");
      ui.resolvedEnemies.push(index);
      render();
      await animateImpact(enemyFigure(index), { power: intent.value, tone: "glass", ...motionOptions() });
    }
    enemy.intentIndex = (enemy.intentIndex + 1) % ENEMIES[enemy.id].pattern.length;
    ui.activeEnemy = null;
    if (run.hp <= 0) break;
  }
  fight.guard = 0;
  if (run.hp <= 0) {
    finishRun(false);
    return;
  }
  ui.resolvedEnemies = [];
  ui.enemyTurn = false;
  ui.cardFx = freshEffects();
  beginTurn(run);
  showCombatPhase(tr("turnTitle"), tr("turn", { turn: fight.turn }), "tide");
  await animateDeal([...app.querySelectorAll(".hand-card")], motionOptions());
  await combatBeat(240);
}

function endTurn() {
  if (!state.run || state.screen !== "battle" || ui.modal || ui.animating) return;
  ui.pendingCard = null;
  ui.notice = "";
  resolveBattleAction(enemyTurn);
}

async function reweave() {
  const run = state.run;
  if (!run || state.screen !== "battle" || ui.modal || ui.animating) return;
  if (!run.reweaveAvailable) {
    ui.notice = tr("reweaveUsed");
    render();
    return;
  }
  if (run.fight.hand.length === 0) {
    ui.notice = tr("reweaveEmpty");
    render();
    return;
  }
  await resolveBattleAction(async () => {
    showCombatPhase(tr("reweave"));
    await animateDiscard([...app.querySelectorAll(".hand-card")], motionOptions());
    const count = run.fight.hand.length;
    run.fight.discardPile.push(...run.fight.hand);
    run.fight.hand = [];
    run.reweaveAvailable = false;
    ui.cardFx = freshEffects();
    drawCards(run, count);
    event("logReweave");
    ui.pendingCard = null;
    ui.notice = "";
    playSound("wake");
    await presentCardEffects("glass");
  });
}

function chooseReward(cardId) {
  const run = state.run;
  if (!run || state.screen !== "reward") return;
  if (cardId) {
    run.deck.push(cardId);
    run.cardsAdded += 1;
  }
  run.rewardOptions = [];
  if (run.stage === 1) state.screen = "route";
  else {
    run.hp = Math.min(run.maxHp, run.hp + 4);
    run.stage = 3;
    makeEncounter(run, "boss");
  }
  saveState();
  render();
  introduceEncounter();
}

function chooseRoute(routeId) {
  const run = state.run;
  if (!run || state.screen !== "route") return;
  const recovery = routeId === "quiet" ? 8 : 2;
  run.hp = Math.min(run.maxHp, run.hp + recovery);
  run.route = routeId;
  run.stage = 2;
  event("logTide", { n: recovery });
  makeEncounter(run, routeId);
  saveState();
  render();
  introduceEncounter();
}

function getIncomingDamage() {
  if (!state.run?.fight) return 0;
  return state.run.fight.enemies.reduce((total, enemy, index) => {
    if (enemy.hp <= 0 || ui.resolvedEnemies.includes(index)) return total;
    const intent = currentIntent(enemy);
    return total + (intent.type === "attack" ? intent.value : 0);
  }, 0);
}

function getEncounterTitle() {
  const encounter = ENCOUNTERS[state.run?.encounterId || "shoal"];
  return tr(encounter.title);
}

function sendHome() {
  if (state.run && !state.run.result) state.run.returnScreen = state.screen;
  state.screen = "title";
  ui.modal = null;
  ui.returnFocus = null;
  ui.focusAfterRender = null;
  saveState();
  render();
}

function continueRun() {
  state.screen = state.run?.result ? "summary" : state.run?.returnScreen || "battle";
  activateAudio();
  saveState();
  render();
}

function renderCardImage(cardId, className = "card-art-image", lazy = false) {
  return `<img class="${className}" src="./assets/cards/${cardId}.webp" width="768" height="512" alt="" draggable="false" decoding="async"${lazy ? ' loading="lazy"' : ""} />`;
}

function renderCard(cardId, options = {}) {
  const card = CARDS[cardId];
  const lang = card[state.locale] || card.en;
  const sigilKey = SIGIL_NAME[card.sigil][state.locale];
  const index = options.index;
  const disabled = options.playable && card.cost > state.run.fight.energy;
  const selected = options.selected ? `selected ${ui.previewCard === index ? "inspected" : ""}` : "";
  const buttonAction = options.reward ? "choose-reward" : "play-card";
  const dataIndex = options.reward ? "" : `data-card-index="${index}"`;
  const dataId = options.reward ? `data-card-id="${cardId}"` : "";
  const focusId = options.reward ? `reward-${cardId}` : `hand-${index}`;
  const prismBonus = !options.reward && state.run?.fight?.prismReady && DAMAGE_CARD_TYPES.has(card.type);
  const previewText = prismBonus ? tr("prismCardPreview", { n: 3 }) : "";
  const aria = `${lang.name}, ${tr("cardCost")} ${card.cost}, ${tr(sigilKey)}. ${lang.text}${previewText ? ` ${previewText}` : ""}`;
  const handOffset = options.reward ? 0 : index - (state.run.fight.hand.length - 1) / 2;
  const fanStyle = options.reward ? "" : `style="--hand-index:${handOffset};--hand-lift:${Math.abs(handOffset) * 3}px;--hand-angle:${handOffset * 3}deg;--card-order:${index}"`;
  return `<button class="playing-card illustrated-card tone-${card.tone} ${selected} ${options.reward ? "reward-card" : "hand-card"} ${disabled ? "unavailable" : ""}" ${fanStyle} type="button" data-action="${buttonAction}" ${dataIndex} ${dataId} data-focus="${focusId}" aria-label="${escapeHtml(aria)}" ${disabled ? "aria-disabled=true" : ""}>
    <span class="card-topline"><span class="card-cost ${card.cost === 0 ? "free" : ""}">${card.cost}</span><span class="sigil-chip" title="${tr(sigilKey)}">${SIGIL_GLYPH[card.sigil]}</span></span>
    <span class="card-illustration" aria-hidden="true">${renderCardImage(cardId)}${prismBonus ? `<b class="prism-card-bonus">+3</b>` : ""}</span>
    <span class="card-title">${escapeHtml(lang.name)}</span>
    <span class="card-description">${escapeHtml(lang.text)}</span>
    <span class="card-bottomline"><span class="card-sigil-name">${tr(sigilKey)}</span><span class="card-cost-label">${tr("cardCost")}</span></span>
  </button>`;
}

function renderHeader() {
  return `<header class="topbar">
    <button class="brand-button" type="button" data-action="home" data-focus="brand-home" aria-label="${tr("appTitle")} — ${tr("home")}">
      <span class="brand-mark" aria-hidden="true"><i></i><b></b><em></em></span>
      <span><strong>TRISEAL</strong><small>${tr("chapter")}</small></span>
    </button>
    <div class="top-controls">
      ${state.run && !state.run.result && state.screen !== "title" ? `<span class="seed-pill">${tr("seed", { seed: state.run.seed })}</span>` : ""}
      <button class="quiet-control" type="button" data-action="help" data-focus="help">?<span>${tr("howTo")}</span></button>
      <button class="quiet-control language-control" type="button" data-action="language" data-focus="language" aria-label="${tr("language")}">${tr("language")}</button>
      <button class="quiet-control sound-control" type="button" data-action="settings" data-focus="settings" aria-label="${tr("settings")}"><span aria-hidden="true">${state.sound ? "◖" : "◗"}</span></button>
    </div>
  </header>`;
}

function renderHome() {
  const active = state.run && !state.run.result;
  return `<main class="home-scene">
    <div class="sea-stars" aria-hidden="true">${Array.from({ length: 24 }, (_, index) => `<i style="--x:${(index * 37 + 8) % 100}%;--y:${(index * 53 + 11) % 100}%;--delay:${index * -0.31}s;--opacity:${0.15 + (index % 5) * 0.08}"></i>`).join("")}</div>
    <div class="home-glow home-glow-one" aria-hidden="true"></div><div class="home-glow home-glow-two" aria-hidden="true"></div>
    <div class="home-orbit" aria-hidden="true"><span></span><i></i><b></b><em></em></div>
    <section class="home-copy">
      <p class="eyebrow">${tr("homeEyebrow")}</p>
      <h1>${tr("appTitle")}<span class="title-dot">.</span></h1>
      <p class="home-subtitle">${tr("subtitle")}</p>
      <p class="home-description">${tr("homeDescription")}</p>
      <div class="welcome-note"><span class="note-glyph">⌁</span><div><strong>${tr("welcome")}</strong><p>${tr("welcomeDescription")}</p></div></div>
      <form class="start-form" id="start-form">
        <label for="seed-input">${tr("seedLabel")}</label>
        <input id="seed-input" name="seed" maxlength="20" autocomplete="off" placeholder="${tr("seedPlaceholder")}" />
        <small>${tr("seedHint")}</small>
        <div class="home-actions">
          ${active ? `<button class="button button-primary" type="button" data-action="continue" data-focus="continue">${tr("continueRun")} <span aria-hidden="true">→</span></button>` : ""}
          <button class="button ${active ? "button-secondary" : "button-primary"}" type="submit" data-focus="begin">${tr("begin")} <span aria-hidden="true">↗</span></button>
        </div>
      </form>
      <p class="start-hint"><span aria-hidden="true">✦</span>${tr("startHint")}</p>
    </section>
    <div class="home-rune" aria-hidden="true"><span>◒</span><span>✳</span><span>◇</span><i></i></div>
    <footer class="home-footer"><span>${tr("footer")}</span><button type="button" data-action="help" data-focus="help-footer">${tr("howTo")}</button></footer>
  </main>`;
}

function renderWake() {
  const fight = state.run.fight;
  const ready = fight.wakeUsed;
  const resonanceKeys = {
    steam: ["resonanceSteamTitle", "resonanceSteamEffect"],
    prism: ["resonancePrismTitle", "resonancePrismEffect"],
    mirror: ["resonanceMirrorTitle", "resonanceMirrorEffect"],
  };
  const resonanceText = resonanceKeys[fight.resonance];
  const resonanceEffectKey = fight.resonance === "prism" && !fight.prismReady
    ? "resonancePrismSpent"
    : resonanceText?.[1];
  const options = [
    { id: "steam", pair: ["tide", "ember"], label: "resonanceSteamOption" },
    { id: "prism", pair: ["ember", "glass"], label: "resonancePrismOption" },
    { id: "mirror", pair: ["glass", "tide"], label: "resonanceMirrorOption" },
  ];
  const optionsMarkup = options.map(({ id, pair, label }) => {
    const unavailable = fight.sigils.length === 1 && !pair.includes(fight.sigils[0]);
    const pairName = pair.map((sigil) => tr(SIGIL_NAME[sigil][state.locale])).join(" + ");
    return `<span class="resonance-option resonance-${id} ${unavailable ? "unavailable-option" : ""}"><small>${pairName}</small><strong>${tr(label)}</strong></span>`;
  }).join("");
  return `<section class="wake-panel ${ready ? "wake-complete" : ""} ${ui.cardFx?.wake ? "wake-burst" : ""} ${ui.cardFx?.resonance ? `resonance-burst resonance-${ui.cardFx.resonance}` : ""}" aria-label="${tr("wakeTitle")}">
    <div class="wake-heading"><div><span class="section-eyebrow">${tr("wakeProgress")}</span><h2>${tr("wakeTitle")}</h2></div><span class="wake-effect">${tr("wakeEffect")}</span></div>
    <div class="wake-rail" role="img" aria-label="${tr("wakeTitle")}: ${tr("wakeCounter", { n: fight.sigils.length })}">
      ${SIGILS.map((sigil) => `<div class="wake-socket ${fight.sigils.includes(sigil) ? `filled ${sigil}` : ""}"><span>${fight.sigils.includes(sigil) ? SIGIL_GLYPH[sigil] : "·"}</span><small>${tr(SIGIL_NAME[sigil][state.locale])}</small></div>`).join("")}
      <div class="wake-line" aria-hidden="true"><i style="--progress:${Math.min(fight.sigils.length, 3) / 3 * 100}%"></i></div>
    </div>
    ${resonanceText ? `<div class="resonance-note resonance-${fight.resonance}"><strong>${tr(resonanceText[0])}</strong><span>${tr(resonanceEffectKey)}</span></div><p class="wake-hint">${ready ? tr("wakeReady") : tr("resonanceWakeHint")}</p>` : `<div class="resonance-options">${optionsMarkup}</div><p class="wake-hint">${tr("wakeHint")}</p>`}
  </section>`;
}

function intentMarkup(enemy) {
  const intent = currentIntent(enemy);
  const key = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
  const icon = intent.type === "attack" ? "↗" : intent.type === "brace" ? "◒" : "↑";
  return `<span class="intent intent-${intent.type}"><span aria-hidden="true">${icon}</span>${tr(key, { n: intent.value })}</span>`;
}

function renderEnemy(enemy, index) {
  const hit = ui.cardFx?.hits.find((entry) => entry.index === index);
  if (enemy.hp <= 0 && !hit) return `<div class="foe-card defeated" aria-hidden="true"><span class="defeated-mark">◇</span></div>`;
  const pending = ui.pendingCard !== null;
  const selected = ui.selectedEnemy === index;
  const intent = currentIntent(enemy);
  const guarding = enemy.guard > 0;
  const intentKey = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
  const label = `${enemyName(enemy)}, ${enemy.hp} / ${enemy.maxHp}. ${tr("currentFoe")}: ${tr(intentKey, { n: intent.value })}`;
  return `<button type="button" class="foe-card ${pending ? "targetable" : ""} ${selected ? "foe-selected" : ""} ${enemy.id === "horizon" ? "foe-boss" : ""} ${ui.activeEnemy === index ? "foe-acting" : ""} ${ui.resolvedEnemies.includes(index) ? "foe-acted" : ""}" data-action="select-foe" data-enemy-index="${index}" data-focus="foe-${index}" aria-label="${escapeHtml(label)}">
    <span class="foe-art kind-${ENEMIES[enemy.id].kind}" data-combatant="enemy" aria-hidden="true">${renderCombatant(enemy.id)}</span>
    <span class="foe-name-row"><strong>${escapeHtml(enemyName(enemy))}</strong><small>${tr("enemyKind")}</small></span>
    <span class="foe-health"><i style="width:${Math.max(0, enemy.hp / enemy.maxHp * 100)}%"></i></span>
    <span class="foe-stats"><span>${enemy.hp} <small>/ ${enemy.maxHp}</small></span>${guarding ? `<span class="foe-guard">◒ ${enemy.guard}</span>` : ""}</span>
    ${intentMarkup(enemy)}
    ${pending ? `<span class="target-label">${selected ? tr("targetSelected") : tr("targetFoe")}</span>` : ""}
  </button>`;
}

function renderHero() {
  const run = state.run;
  return `<div class="hero-slot ${run.fight.guard > 0 ? "hero-guarded" : ""}">
    <div class="hero-figure" data-combatant="hero" aria-hidden="true">${renderCombatant("hero")}<span class="hero-shield"></span></div>
    <div class="hero-caption">${tr("chartkeeper")}</div>
    <div class="hero-health" aria-label="${tr("hullFull", { current: run.hp, max: run.maxHp })}"><i style="width:${run.hp / run.maxHp * 100}%"></i></div>
    <div class="hero-stats"><span>♥ ${run.hp} <small>/ ${run.maxHp}</small></span>${run.fight.guard > 0 ? `<span class="hero-guard">◒ ${run.fight.guard}</span>` : ""}</div>
  </div>`;
}

function renderLog() {
  const entries = [...(state.run.log || [])].slice(-5).reverse();
  return `<section class="log-panel"><div class="log-heading"><span class="section-eyebrow">${tr("battleLog")}</span><span class="live-dot"></span></div><ol>${entries.map((entry) => `<li>${tr(entry.key, entry.args)}</li>`).join("")}</ol></section>`;
}

function renderSigilCompass() {
  const fight = state.run.fight;
  const resonanceKey = fight.resonance ? `resonance${fight.resonance[0].toUpperCase()}${fight.resonance.slice(1)}Title` : "shapeResonance";
  const caption = fight.wakeUsed ? tr("wakeReady") : tr(resonanceKey);
  return `<button type="button" class="sigil-compass ${fight.wakeUsed ? "compass-complete" : ""} ${ui.cardFx?.resonance ? "resonance-burst" : ""}" data-action="sigils" data-focus="sigils" aria-label="${tr("sigilDetails")}: ${tr("wakeCounter", { n: fight.sigils.length })}" title="${tr("sigilDetails")}">
    <span class="sigil-orbit" aria-hidden="true">${SIGILS.map((sigil) => `<span class="sigil-node tone-${sigil} ${fight.sigils.includes(sigil) ? "filled" : ""}">${SIGIL_GLYPH[sigil]}</span>`).join("")}</span>
    <span class="compass-caption">${caption}<i aria-hidden="true"> ⓘ</i></span>
  </button>`;
}

function renderBattle() {
  const run = state.run;
  const fight = run.fight;
  const targeting = ui.pendingCard !== null;
  const incoming = getIncomingDamage();
  const handCards = fight.hand.map((id, index) => renderCard(id, {
    index, playable: true, selected: ui.previewCard === index || (targeting && ui.pendingCard === index),
  })).join("");
  const notice = ui.notice || (ui.animating ? tr("resolving") : targeting ? tr("targetHint") : tr(window.matchMedia("(pointer: coarse)").matches ? "touchCardHint" : "clickCardHint"));
  const latest = run.log.at(-1);
  const inspectedId = ui.previewCard !== null ? fight.hand[ui.previewCard] : null;
  const inspected = inspectedId ? CARDS[inspectedId] : null;
  return `<main class="game-scene battle-scene landscape-battle ${ui.animating ? "combat-resolving" : ""}">
    ${renderBattleScenery(run.encounterId)}
    <div class="battle-location"><small>${tr("step", { n: run.stage })}</small><h1>${getEncounterTitle()}</h1></div>
    <div class="battle-turn"><strong>${tr("turn", { turn: fight.turn })}</strong><span class="${incoming >= 12 ? "danger" : ""}">${incoming ? `${tr("incoming")} · ${incoming}` : tr(ui.enemyTurn ? "enemyTurn" : "turnTitle")}</span></div>
    ${renderSigilCompass()}
    <section class="arena combat-stage ${run.encounterId === "boss" ? "arena-boss" : ""}" aria-label="${tr("battlefield")}">
      ${ui.phase ? `<div class="combat-banner tone-${ui.phase.tone}" role="status"><strong>${ui.phase.title}</strong><small>${ui.phase.detail}</small></div>` : ""}
      ${renderHero()}<div class="foe-row">${fight.enemies.map(renderEnemy).join("")}</div>
    </section>
    <div class="energy-orb" aria-label="${tr("energy")}: ${fight.energy} / 3"><strong>${fight.energy}<small>/3</small></strong><span>${tr("energy")}</span></div>
    <button class="pile-button draw-pile" type="button" data-action="draw-pile" data-focus="draw-pile" aria-label="${tr("drawPile")}: ${fight.drawPile.length}"><span class="pile-symbol" aria-hidden="true">▱</span><b>${fight.drawPile.length}</b><small>${tr("drawPile")}</small></button>
    <section class="hand-zone ${fight.hand.length > 7 ? "hand-overflow" : ""} ${fight.hand.length > 5 ? "hand-many" : ""}" aria-label="${tr("hand")}" style="--hand-count:${fight.hand.length}">
      <div class="hand-cards">${handCards || `<div class="empty-hand">${tr(ui.enemyTurn ? "enemiesActing" : "noCards")}</div>`}</div>
      <div class="hand-footer"><span>${notice}</span></div>
    </section>
    ${inspected ? `<aside class="card-readout illustrated-readout tone-${inspected.sigil}" aria-live="polite">${renderCardImage(inspectedId, "readout-art")}<div class="readout-copy"><strong>${escapeHtml(inspected[state.locale].name)}</strong><span>${escapeHtml(inspected[state.locale].text)}</span><small>${tr(inspected.target ? "touchTargetHint" : "touchConfirmHint")}</small></div></aside>` : ""}
    <button class="pile-button discard-pile" type="button" data-action="discard-pile" data-focus="discard-pile" aria-label="${tr("discardPile")}: ${fight.discardPile.length}"><span class="pile-symbol" aria-hidden="true">▱</span><b>${fight.discardPile.length}</b><small>${tr("discardPile")}</small></button>
    <div class="battle-actions"><button type="button" class="end-turn" data-action="end-turn" data-focus="end-turn"><span>${tr(ui.animating ? "resolving" : "endTurn")}</span><i aria-hidden="true">${ui.animating ? "···" : "↠"}</i></button>
      <button type="button" class="reweave-button" data-action="reweave" data-focus="reweave" aria-label="${tr("reweaveAvailable")}" ${run.reweaveAvailable && fight.hand.length > 0 ? "" : "disabled"}><span aria-hidden="true">⤨</span>${run.reweaveAvailable ? tr("reweave") : tr("reweaveUsed")}</button>
    </div>
    <button class="battle-journal" type="button" data-action="battle-log" data-focus="battle-log" aria-label="${tr("battleLog")}"><span aria-hidden="true">≋</span>${latest ? tr(latest.key, latest.args) : tr("battleLog")}</button>
    <aside class="orientation-hint" role="note"><span class="rotate-device" aria-hidden="true">↻</span><h2>${tr("rotateTitle")}</h2><p>${tr("rotateDescription")}</p><button type="button" data-action="home" class="button button-quiet">${tr("home")}</button></aside>
  </main>`;
}

function renderReward() {
  const options = (state.run.rewardOptions || []).map((id) => renderCard(id, { reward: true })).join("");
  return `<main class="intermission-scene"><div class="intermission-glow" aria-hidden="true"></div><section class="intermission-card">
    <span class="section-eyebrow">${tr("chapter")} · ${tr("step", { n: state.run.stage })}</span><h1>${tr("rewardTitle")}</h1><p>${tr("rewardDescription")}</p>
    <div class="reward-cards">${options}</div>
    <button type="button" class="button button-quiet skip-reward" data-action="skip-reward" data-focus="skip-reward">${tr("skipReward")} <span aria-hidden="true">→</span></button>
  </section></main>`;
}

function renderRoute() {
  return `<main class="intermission-scene route-scene"><div class="intermission-glow" aria-hidden="true"></div><section class="intermission-card">
    <span class="section-eyebrow">${tr("route")} · ${tr("step", { n: 2 })}</span><h1>${tr("routeTitle")}</h1><p>${tr("routeDescription")}</p>
    <div class="route-cards">
      <article class="route-card route-quiet"><div class="route-symbol">≈</div><span class="route-tag">${tr("routeRest")} · +8</span><h2>${tr("quietTitle")}</h2><p>${tr("quietDescription")}</p><button type="button" class="button button-secondary" data-action="choose-route" data-route="quiet" data-focus="route-quiet">${tr("choosePassage")} <span>→</span></button></article>
      <article class="route-card route-rift"><div class="route-symbol">◇</div><span class="route-tag">${tr("routeRisk")} · ${tr("routeRest")} +2</span><h2>${tr("riftTitle")}</h2><p>${tr("riftDescription")}</p><button type="button" class="button button-primary" data-action="choose-route" data-route="rift" data-focus="route-rift">${tr("choosePassage")} <span>→</span></button></article>
    </div>
    <div class="route-hull">♥ ${tr("hullFull", { current: state.run.hp, max: state.run.maxHp })}</div>
  </section></main>`;
}

function renderSummary() {
  const run = state.run;
  const won = run.result === "won";
  return `<main class="summary-scene ${won ? "summary-win" : "summary-loss"}"><div class="summary-orbit" aria-hidden="true"><i></i><b></b><em></em></div>
    <section class="summary-card"><span class="section-eyebrow">${tr("chapter")}</span><div class="summary-sigil">${won ? "◉" : "×"}</div><h1>${tr(won ? "runWon" : "runLost")}</h1><p>${tr(won ? "runWonBody" : "runLostBody")}</p>
      <div class="summary-stats"><span><small>${tr("turnsTaken")}</small><b>${run.totalTurns}</b></span><span><small>${tr("cardsInDeck")}</small><b>${run.cardsAdded}</b></span><span><small>${tr("bestSeed")}</small><b>${escapeHtml(run.seed)}</b></span></div>
      <div class="summary-actions"><button type="button" class="button button-primary" data-action="new-run" data-focus="new-run">${tr("newRun")} <span>↗</span></button><button type="button" class="button button-quiet" data-action="home" data-focus="summary-home">${tr("home")}</button></div>
    </section></main>`;
}

function renderModal() {
  if (!ui.modal) return "";
  const modal = ui.modal;
  if (modal === "field-guide") {
    const figures = COMBATANT_IDS.map((id) => {
      const name = id === "hero" ? tr("chartkeeper") : enemyName({ id });
      return `<button class="field-guide-entry" type="button" data-action="character-detail" data-character="${id}" data-focus="guide-${id}">
        ${renderCombatant(id, { idle: false, eager: false })}
        <small>${id === "hero" ? "TRISEAL" : tr("enemyKind")}</small><strong>${escapeHtml(name)}</strong>
        ${ENEMIES[id] ? `<span>${tr("portraitHealth")} · ${ENEMIES[id].hp}</span>` : ""}
      </button>`;
    }).join("");
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card field-guide-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">TRISEAL</span><h2 id="modal-title">${tr("fieldGuide")}</h2><p class="gallery-intro">${tr("fieldGuideDescription")}</p><div class="field-guide-grid">${figures}</div><button class="button button-quiet gallery-back" type="button" data-action="help" data-focus="guide-help">← ${tr("howTo")}</button></section></div>`;
  }
  if (modal.startsWith("character-") && COMBATANT_IDS.includes(modal.slice(10))) {
    const id = modal.slice(10);
    const name = id === "hero" ? tr("chartkeeper") : enemyName({ id });
    const enemy = ENEMIES[id];
    const details = enemy ? `<p>${tr("portraitHealth")} · ${enemy.hp}</p><span class="section-eyebrow">${tr("portraitMoveCycle")}</span><ol class="character-intents">${enemy.pattern.map((intent) => {
      const key = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
      return `<li>${tr(key, { n: intent.value })}</li>`;
    }).join("")}</ol>` : `<p>${tr("portraitKeeperDescription")}</p>`;
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card character-detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><div class="character-detail">${renderCombatant(id, { idle: false })}<div class="character-detail-copy"><span class="section-eyebrow">${id === "hero" ? "TRISEAL" : tr("enemyKind")}</span><h2 id="modal-title">${escapeHtml(name)}</h2>${details}<button class="button button-quiet gallery-back" type="button" data-action="field-guide" data-focus="character-guide">← ${tr("fieldGuide")}</button></div></div></section></div>`;
  }
  if (modal === "sigils" || modal === "battle-log") {
    const title = tr(modal === "sigils" ? "sigilDetails" : "battleLog");
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card battle-detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><h2 id="modal-title">${title}</h2>
      ${modal === "sigils" ? `${renderWake()}<p class="sigil-explanation">${tr("helpWakeBody")}</p>` : renderLog()}
    </section></div>`;
  }
  if (modal === "card-gallery") {
    const gallery = Object.entries(CARDS).map(([id, card]) => {
      const lang = card[state.locale] || card.en;
      return `<article class="gallery-card tone-${card.tone}">
        <div class="gallery-art">${renderCardImage(id, "card-art-image", true)}<span class="card-cost ${card.cost === 0 ? "free" : ""}" role="img" aria-label="${tr("cardCost")} ${card.cost}">${card.cost}</span><span class="sigil-chip" aria-hidden="true">${SIGIL_GLYPH[card.sigil]}</span></div>
        <div class="gallery-copy"><small>${tr(SIGIL_NAME[card.sigil][state.locale])}</small><h3>${escapeHtml(lang.name)}</h3><p>${escapeHtml(lang.text)}</p></div>
      </article>`;
    }).join("");
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card gallery-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">TRISEAL</span><h2 id="modal-title">${tr("cardGallery")}</h2><p class="gallery-intro">${tr("cardGalleryDescription")}</p><div class="card-gallery-grid">${gallery}</div><button class="button button-quiet gallery-back" type="button" data-action="help" data-focus="gallery-help">← ${tr("howTo")}</button></section></div>`;
  }
  if (modal === "help") {
    const sections = [
      ["01", "Wake"], ["02", "Turn"], ["03", "Reweave"], ["04", "Route"], ["05", "Keys"],
    ];
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card help-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">TRISEAL</span><h2 id="modal-title">${tr("helpTitle")}</h2>
      <button type="button" class="gallery-link" data-action="card-gallery" data-focus="card-gallery"><span class="gallery-link-art" aria-hidden="true">${["needle", "brace", "glassline"].map((id) => renderCardImage(id)).join("")}</span><span><strong>${tr("cardGallery")}</strong><small>${tr("cardGalleryDescription")}</small></span><b aria-hidden="true">→</b></button>
      <button type="button" class="gallery-link" data-action="field-guide" data-focus="field-guide"><span class="field-guide-link-art" aria-hidden="true">${["hero", "driftling"].map((id) => renderCombatant(id, { idle: false, eager: false })).join("")}</span><span><strong>${tr("fieldGuide")}</strong><small>${tr("fieldGuideDescription")}</small></span><b aria-hidden="true">→</b></button>
      <div class="help-grid">${sections.map(([number, id]) => `<article><span class="help-number">${number}</span><h3>${tr(`help${id}Title`)}</h3><p>${tr(`help${id}Body`)}</p></article>`).join("")}</div>
    </section></div>`;
  }
  if (modal === "settings" || modal === "pause") {
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card settings-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">${tr("chapter")}</span><h2 id="modal-title">${tr(modal === "pause" ? "pausedTitle" : "settingsTitle")}</h2>
      <div class="setting-row"><span><strong>${tr("soundToggle")}</strong><small>${tr("sound")}</small></span><button type="button" class="switch ${state.sound ? "active" : ""}" data-action="toggle-sound" data-focus="toggle-sound" aria-pressed="${state.sound}"><i></i><b>${tr(state.sound ? "on" : "off")}</b></button></div>
      <div class="setting-row"><span><strong>${tr("musicToggle")}</strong><small>${tr("sound")}</small></span><button type="button" class="switch ${state.music ? "active" : ""}" data-action="toggle-music" data-focus="toggle-music" aria-pressed="${state.music}"><i></i><b>${tr(state.music ? "on" : "off")}</b></button></div>
      <label class="volume-row"><span>${tr("volume")}</span><input type="range" min="0" max="1" step="0.01" value="${state.volume}" data-setting="volume" aria-label="${tr("volume")}" /></label>
      <div class="setting-row"><span><strong>${tr("reducedMotion")}</strong><small>${tr("settings")}</small></span><button type="button" class="switch ${state.motion ? "active" : ""}" data-action="toggle-motion" data-focus="toggle-motion" aria-pressed="${state.motion}"><i></i><b>${tr(state.motion ? "on" : "off")}</b></button></div>
      ${modal === "pause" ? `<button type="button" class="button button-primary modal-resume" data-action="close-modal" data-focus="resume">${tr("resume")} <span>→</span></button>` : ""}
      ${state.run && !state.run.result ? `<button type="button" class="button button-secondary modal-leave" data-action="leave-title" data-focus="leave-title">${tr("saveAndLeave")} <span>→</span></button>` : ""}
    </section></div>`;
  }
  if (["deck", "draw-pile", "discard-pile"].includes(modal)) {
    const pile = modal === "draw-pile" ? state.run.fight.drawPile : modal === "discard-pile" ? state.run.fight.discardPile : state.run.deck;
    const title = tr(modal === "draw-pile" ? "drawPile" : modal === "discard-pile" ? "discardPile" : "deckTitle");
    const counts = pile.reduce((result, id) => { result[id] = (result[id] || 0) + 1; return result; }, {});
    const cards = Object.entries(counts).map(([id, amount]) => `<article class="deck-entry tone-${CARDS[id].tone}">${renderCardImage(id, "deck-art", true)}<div><strong>${escapeHtml(cardName(id))} <span class="deck-sigil">· ${tr(SIGIL_NAME[CARDS[id].sigil][state.locale])}</span></strong><small>${escapeHtml(CARDS[id][state.locale].text)}</small></div><b>×${amount}</b></article>`).join("");
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card deck-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">${tr("chapter")}</span><h2 id="modal-title">${title}</h2><p>${tr("deckSummary", { draw: state.run.fight.drawPile.length, discard: state.run.fight.discardPile.length, hand: state.run.fight.hand.length })}</p><div class="deck-list">${cards || `<p>${tr("noCards")}</p>`}</div>${modal !== "deck" ? `<button type="button" class="button button-quiet modal-resume" data-action="deck" data-focus="all-deck">${tr("deckPeek")} →</button>` : ""}</section></div>`;
  }
  return "";
}

function updateOrientationAccess() {
  const blocked = state.screen === "battle" && portraitLayout.matches;
  app.querySelectorAll(".landscape-battle > :not(.orientation-hint):not(.world-scenery)").forEach((element) => {
    element.inert = blocked;
  });
}

portraitLayout.addEventListener("change", updateOrientationAccess);

function render() {
  const activeFocus = document.activeElement?.dataset?.focus;
  const handScroll = app.querySelector(".hand-cards")?.scrollLeft || 0;
  document.documentElement.lang = state.locale === "zh" ? "zh-Hans" : "en";
  document.body.classList.toggle("reduce-motion", state.motion);
  document.body.classList.toggle("battle-mode", state.screen === "battle" && Boolean(state.run));
  const screen = state.screen === "battle" && state.run ? renderBattle()
    : state.screen === "reward" && state.run ? renderReward()
      : state.screen === "route" && state.run ? renderRoute()
        : state.screen === "summary" && state.run ? renderSummary()
          : renderHome();
  app.innerHTML = `${renderHeader()}${screen}${renderModal()}<div class="toast" role="status" aria-live="polite">${ui.notice}</div>`;
  const hand = app.querySelector(".hand-cards");
  if (hand) hand.scrollLeft = handScroll;
  updateOrientationAccess();
  app.querySelectorAll(":scope > .topbar, :scope > main").forEach((element) => {
    element.inert = Boolean(ui.modal);
  });
  if (ui.animating) app.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  const focusTarget = ui.focusAfterRender || activeFocus;
  const focusElement = focusTarget ? app.querySelector(`[data-focus="${CSS.escape(focusTarget)}"]`) : null;
  if (focusElement) focusElement.focus({ preventScroll: true });
  else if (ui.modal) app.querySelector('[role="dialog"] [data-focus]')?.focus({ preventScroll: true });
  ui.focusAfterRender = null;
}

function showModal(name) {
  activateAudio();
  if (!ui.modal) ui.returnFocus = document.activeElement?.dataset?.focus || null;
  ui.modal = name;
  ui.focusAfterRender = "modal-close";
  render();
}

function closeModal() {
  ui.modal = null;
  ui.focusAfterRender = ui.returnFocus;
  ui.returnFocus = null;
  render();
}

function handleAction(actionButton, clickEvent) {
  if (ui.animating) return;
  const action = actionButton.dataset.action;
  if (action !== "toggle-sound" && action !== "toggle-music" && action !== "language") activateAudio();
  switch (action) {
    case "continue":
      continueRun();
      break;
    case "new-run":
      state.run = null;
      state.screen = "title";
      newRunFromHome();
      break;
    case "home":
      sendHome();
      break;
    case "language":
      state.locale = state.locale === "en" ? "zh" : "en";
      saveState();
      render();
      break;
    case "help":
    case "card-gallery":
    case "field-guide":
      showModal(action);
      break;
    case "character-detail":
      if (COMBATANT_IDS.includes(actionButton.dataset.character)) showModal(`character-${actionButton.dataset.character}`);
      break;
    case "settings":
      showModal("settings");
      break;
    case "close-modal":
      closeModal();
      break;
    case "close-outside":
      if (clickEvent.target === actionButton) closeModal();
      break;
    case "toggle-sound":
      state.sound = !state.sound;
      setSoundEnabled(state.sound);
      if (state.sound) playSound("select");
      saveState();
      render();
      break;
    case "toggle-music":
      state.music = !state.music;
      setMusicEnabled(state.music);
      if (state.sound) playSound("select");
      saveState();
      render();
      break;
    case "toggle-motion":
      state.motion = !state.motion;
      saveState();
      render();
      break;
    case "end-turn":
      endTurn();
      break;
    case "reweave":
      reweave();
      break;
    case "deck":
      showModal("deck");
      break;
    case "draw-pile":
    case "discard-pile":
    case "sigils":
    case "battle-log":
      showModal(action);
      break;
    case "play-card":
      { const index = Number(actionButton.dataset.cardIndex);
        const card = CARDS[state.run?.fight.hand[index]];
        const touch = clickEvent.pointerType === "touch" || (clickEvent.detail > 0 && window.matchMedia("(pointer: coarse)").matches);
        if (touch && card && card.cost <= state.run.fight.energy) {
          if (ui.previewCard !== index) {
            ui.previewCard = index;
            ui.pendingCard = card.target ? index : null;
            ui.notice = tr(card.target ? "touchTargetHint" : "touchConfirmHint");
            playSound("select");
            render();
          } else playCard(index, card.target ? ui.selectedEnemy : null);
        } else playCard(index);
      }
      break;
    case "select-foe": {
      const index = Number(actionButton.dataset.enemyIndex);
      ui.selectedEnemy = index;
      if (ui.pendingCard !== null) playCard(ui.pendingCard, index);
      else { playSound("select"); render(); }
      break;
    }
    case "choose-reward":
      chooseReward(actionButton.dataset.cardId);
      break;
    case "skip-reward":
      chooseReward(null);
      break;
    case "choose-route":
      chooseRoute(actionButton.dataset.route);
      break;
    case "leave-title":
      ui.modal = null;
      sendHome();
      break;
    default:
      break;
  }
}

app.addEventListener("click", (clickEvent) => {
  if (ui.animating) { clickEvent.preventDefault(); return; }
  const button = clickEvent.target.closest("[data-action]");
  if (button) handleAction(button, clickEvent);
  else if (ui.previewCard !== null && !ui.modal) {
    ui.previewCard = null;
    ui.pendingCard = null;
    ui.notice = "";
    render();
  }
});

app.addEventListener("submit", (submitEvent) => {
  if (submitEvent.target.id !== "start-form") return;
  submitEvent.preventDefault();
  newRunFromHome();
});

app.addEventListener("input", (inputEvent) => {
  if (inputEvent.target.dataset.setting === "volume") {
    state.volume = Number(inputEvent.target.value);
    setVolume(state.volume);
    saveState();
  }
});

window.addEventListener("keydown", (keyboardEvent) => {
  if (keyboardEvent.metaKey || keyboardEvent.ctrlKey || keyboardEvent.altKey) return;
  if (ui.animating) {
    if (/^[1-5er]$/i.test(keyboardEvent.key) || ["Enter", " ", "Escape", "ArrowLeft", "ArrowRight"].includes(keyboardEvent.key)) keyboardEvent.preventDefault();
    return;
  }
  if (keyboardEvent.key === "Escape") {
    keyboardEvent.preventDefault();
    if (ui.modal) closeModal();
    else if (state.run && !state.run.result) showModal("pause");
    return;
  }
  if (ui.modal) {
    if (keyboardEvent.key === "Tab") {
      const dialog = app.querySelector('[role="dialog"]');
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      const active = document.activeElement;
      if (!first) keyboardEvent.preventDefault();
      else if (keyboardEvent.shiftKey && (active === first || !dialog.contains(active))) {
        keyboardEvent.preventDefault();
        last.focus();
      } else if (!keyboardEvent.shiftKey && (active === last || !dialog.contains(active))) {
        keyboardEvent.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (state.screen !== "battle" || !state.run) return;
  if (portraitLayout.matches) return;
  const target = keyboardEvent.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  const key = keyboardEvent.key.toLowerCase();
  if (/^[1-5]$/.test(key)) {
    keyboardEvent.preventDefault();
    playCard(Number(key) - 1);
  } else if (key === "e") {
    keyboardEvent.preventDefault();
    endTurn();
  } else if (key === "r") {
    keyboardEvent.preventDefault();
    reweave();
  } else if ((keyboardEvent.key === "ArrowRight" || keyboardEvent.key === "ArrowLeft") && ui.pendingCard !== null) {
    const living = state.run.fight.enemies.map((enemy, index) => ({ enemy, index })).filter(({ enemy }) => enemy.hp > 0);
    if (living.length) {
      keyboardEvent.preventDefault();
      const current = living.findIndex(({ index }) => index === ui.selectedEnemy);
      const offset = keyboardEvent.key === "ArrowRight" ? 1 : -1;
      ui.selectedEnemy = living[(current + offset + living.length) % living.length].index;
      playSound("select");
      render();
    }
  } else if (keyboardEvent.key === "Enter" && ui.pendingCard !== null) {
    keyboardEvent.preventDefault();
    playCard(ui.pendingCard, ui.selectedEnemy);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    suspendAudio();
    document.querySelectorAll(".flight-card").forEach((card) => card.getAnimations().forEach((animation) => {
      try { animation.finish(); } catch { /* An idle animation has no end. */ }
    }));
  }
  else resumeAudio();
});

setSoundEnabled(state.sound);
setMusicEnabled(state.music);
setVolume(state.volume);
render();
