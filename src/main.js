import { TEXT, SIGILS, SIGIL_NAME, SIGIL_GLYPH, CARDS, ENEMIES, ENCOUNTERS, REWARD_POOLS } from "./data.js";
import { activateAudio, playSound, setSoundEnabled, setMusicEnabled, setVolume, suspendAudio, resumeAudio } from "./audio.js";

const SAVE_KEY = "spindlewake.save.v1";
const MAX_HAND = 10;
const STARTING_DECK = ["needle", "needle", "needle", "needle", "brace", "brace", "brace", "glassline", "glassline", "undertow"];
const app = document.querySelector("#app");

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
const ui = { modal: null, pendingCard: null, selectedEnemy: 0, notice: "", returnFocus: null, focusAfterRender: null };
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
    turn: 0, energy: 0, guard: 0, sigils: [], wakeUsed: false,
    hand: [], discardPile: [], drawPile: shuffle(run, run.deck),
    enemies: encounter.enemies.map((id) => ({ id, hp: ENEMIES[id].hp, maxHp: ENEMIES[id].hp, guard: 0, intentIndex: 0, power: 0 })),
  };
  beginTurn(run, true);
  state.screen = "battle";
  ui.pendingCard = null;
  ui.selectedEnemy = 0;
}

function drawCards(run, amount) {
  const fight = run.fight;
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
  if (drawn > 0) { event("logDraw", { n: drawn }); playSound("draw"); }
  return drawn;
}

function addGuard(run, amount) {
  run.fight.guard += amount;
  event("logGuard", { n: amount });
  playSound("guard");
}

function currentIntent(enemy) {
  const pattern = ENEMIES[enemy.id].pattern;
  const base = pattern[enemy.intentIndex % pattern.length];
  if (base.type === "attack") return { ...base, value: base.value + enemy.power };
  return base;
}

function damageEnemy(run, index, amount) {
  const enemy = run.fight.enemies[index];
  if (!enemy || enemy.hp <= 0) return 0;
  let remainder = amount;
  if (enemy.guard > 0) {
    const absorbed = Math.min(enemy.guard, remainder);
    enemy.guard -= absorbed;
    remainder -= absorbed;
  }
  const dealt = Math.min(enemy.hp, remainder);
  enemy.hp -= dealt;
  if (dealt > 0) event("logDamage", { name: enemyName(enemy), n: dealt });
  playSound("hit");
  if (enemy.hp <= 0) event("logEnemyDown", { name: enemyName(enemy) });
  return dealt;
}

function triggerWake(run) {
  const fight = run.fight;
  if (fight.wakeUsed || fight.sigils.length < 3) return;
  fight.wakeUsed = true;
  event("logWake");
  fight.enemies.forEach((enemy, index) => { if (enemy.hp > 0) damageEnemy(run, index, 4); });
  addGuard(run, 4);
  drawCards(run, 1);
  playSound("wake");
}

function noteSigil(run, sigil) {
  if (!run.fight.sigils.includes(sigil)) run.fight.sigils.push(sigil);
  if (run.fight.sigils.length === 3) triggerWake(run);
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
  switch (card.type) {
    case "damage":
      damageEnemy(run, targetIndex, card.value);
      break;
    case "block":
      addGuard(run, card.value);
      break;
    case "draw":
      drawCards(run, card.value);
      break;
    case "damageBlock":
      damageEnemy(run, targetIndex, card.damage);
      addGuard(run, card.block);
      break;
    case "blockDraw":
      addGuard(run, card.block);
      drawCards(run, card.draw);
      break;
    case "allDamage":
      fight.enemies.forEach((enemy, index) => { if (enemy.hp > 0) damageEnemy(run, index, card.value); });
      break;
    case "damageDraw":
      damageEnemy(run, targetIndex, card.damage);
      drawCards(run, card.draw);
      break;
    case "allDamageBlock":
      fight.enemies.forEach((enemy, index) => { if (enemy.hp > 0) damageEnemy(run, index, card.damage); });
      addGuard(run, card.block);
      break;
    default:
      break;
  }
  noteSigil(run, card.sigil);
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
  if (run.stage >= 3) finishRun(true);
  else beginReward();
  return true;
}

function playCard(index, targetIndex = null) {
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

  fight.energy -= card.cost;
  fight.hand.splice(index, 1);
  applyCard(run, cardId, targetIndex);
  fight.discardPile.push(cardId);
  ui.pendingCard = null;
  ui.notice = "";
  if (!checkVictory()) {
    saveState();
    render();
  }
}

function enemyTurn() {
  const run = state.run;
  const fight = run.fight;
  fight.discardPile.push(...fight.hand);
  fight.hand = [];
  for (const enemy of fight.enemies) {
    if (enemy.hp <= 0) continue;
    const intent = currentIntent(enemy);
    enemy.guard = 0;
    if (intent.type === "attack") {
      const blocked = Math.min(fight.guard, intent.value);
      fight.guard -= blocked;
      const dealt = intent.value - blocked;
      run.hp = Math.max(0, run.hp - dealt);
      event("logEnemyAttack", { name: enemyName(enemy), n: dealt });
      if (dealt > 0) playSound("hit");
    } else if (intent.type === "brace") {
      enemy.guard = intent.value;
      event("logEnemyBrace", { name: enemyName(enemy), n: intent.value });
      playSound("guard");
    } else if (intent.type === "charge") {
      enemy.power += intent.value;
      event("logEnemyCharge", { name: enemyName(enemy), n: intent.value });
      playSound("select");
    }
    enemy.intentIndex = (enemy.intentIndex + 1) % ENEMIES[enemy.id].pattern.length;
    if (run.hp <= 0) break;
  }
  fight.guard = 0;
  if (run.hp <= 0) {
    finishRun(false);
    render();
    return;
  }
  beginTurn(run);
  saveState();
  render();
}

function endTurn() {
  if (!state.run || state.screen !== "battle" || ui.modal) return;
  ui.pendingCard = null;
  ui.notice = "";
  enemyTurn();
}

function reweave() {
  const run = state.run;
  if (!run || state.screen !== "battle" || ui.modal) return;
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
  const count = run.fight.hand.length;
  run.fight.discardPile.push(...run.fight.hand);
  run.fight.hand = [];
  run.reweaveAvailable = false;
  drawCards(run, count);
  event("logReweave");
  ui.pendingCard = null;
  ui.notice = "";
  playSound("wake");
  saveState();
  render();
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
    makeEncounter(run, "boss");
  }
  saveState();
  render();
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
}

function getIncomingDamage() {
  if (!state.run?.fight) return 0;
  return state.run.fight.enemies.reduce((total, enemy) => {
    if (enemy.hp <= 0) return total;
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

function renderCard(cardId, options = {}) {
  const card = CARDS[cardId];
  const lang = card[state.locale] || card.en;
  const sigilKey = SIGIL_NAME[card.sigil][state.locale];
  const index = options.index;
  const disabled = options.playable && card.cost > state.run.fight.energy;
  const selected = options.selected ? "selected" : "";
  const buttonAction = options.reward ? "choose-reward" : "play-card";
  const dataIndex = options.reward ? "" : `data-card-index="${index}"`;
  const dataId = options.reward ? `data-card-id="${cardId}"` : "";
  const focusId = options.reward ? `reward-${cardId}` : `hand-${index}`;
  const aria = `${lang.name}, ${tr("cardCost")} ${card.cost}, ${tr(sigilKey)}. ${lang.text}`;
  return `<button class="playing-card tone-${card.tone} ${selected} ${options.reward ? "reward-card" : "hand-card"} ${disabled ? "unavailable" : ""}" type="button" data-action="${buttonAction}" ${dataIndex} ${dataId} data-focus="${focusId}" aria-label="${escapeHtml(aria)}" ${disabled ? "aria-disabled=true" : ""}>
    <span class="card-topline"><span class="card-cost ${card.cost === 0 ? "free" : ""}">${card.cost}</span><span class="sigil-chip" title="${tr(sigilKey)}">${SIGIL_GLYPH[card.sigil]}</span></span>
    <span class="card-illustration" aria-hidden="true"><span>${card.glyph}</span><i></i></span>
    <span class="card-title">${escapeHtml(lang.name)}</span>
    <span class="card-description">${escapeHtml(lang.text)}</span>
    <span class="card-bottomline"><span class="card-sigil-name">${tr(sigilKey)}</span><span class="card-cost-label">${tr("cardCost")}</span></span>
  </button>`;
}

function renderHeader() {
  return `<header class="topbar">
    <button class="brand-button" type="button" data-action="home" data-focus="brand-home" aria-label="${tr("appTitle")} — ${tr("home")}">
      <span class="brand-mark" aria-hidden="true"><i></i><b></b><em></em></span>
      <span><strong>SPINDLEWAKE</strong><small>${tr("chapter")}</small></span>
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

function renderMetrics() {
  const run = state.run;
  const fight = run.fight;
  const incoming = getIncomingDamage();
  return `<section class="metrics-row" aria-label="${tr("turnTitle")}">
    <div class="metric metric-hull"><span class="metric-icon">♥</span><div><small>${tr("health")}</small><strong>${run.hp}<i> / ${run.maxHp}</i></strong><span class="meter"><i style="width:${Math.max(0, run.hp / run.maxHp * 100)}%"></i></span></div></div>
    <div class="metric"><span class="metric-icon">◒</span><div><small>${tr("guard")}</small><strong>${fight.guard}</strong></div></div>
    <div class="metric"><span class="metric-icon">✦</span><div><small>${tr("energy")}</small><strong>${fight.energy}<i> / 3</i></strong><span class="energy-pips">${[0,1,2].map((n) => `<i class="${n < fight.energy ? "filled" : ""}"></i>`).join("")}</span></div></div>
    <div class="incoming ${incoming >= 12 ? "danger" : ""}"><small>${incoming > 0 ? tr("incoming") : tr("turnTitle")}</small><strong>${incoming > 0 ? tr("damage", { n: incoming }) : "—"}</strong>${incoming >= 12 ? `<em>${tr("danger")}</em>` : ""}</div>
  </section>`;
}

function renderWake() {
  const fight = state.run.fight;
  const ready = fight.wakeUsed;
  return `<section class="wake-panel ${ready ? "wake-complete" : ""}" aria-label="${tr("wakeTitle")}">
    <div class="wake-heading"><div><span class="section-eyebrow">${tr("wakeProgress")}</span><h2>${tr("wakeTitle")}</h2></div><span class="wake-effect">${tr("wakeEffect")}</span></div>
    <div class="wake-rail" role="img" aria-label="${tr("wakeTitle")}: ${tr("wakeCounter", { n: fight.sigils.length })}">
      ${SIGILS.map((sigil) => `<div class="wake-socket ${fight.sigils.includes(sigil) ? `filled ${sigil}` : ""}"><span>${fight.sigils.includes(sigil) ? SIGIL_GLYPH[sigil] : "·"}</span><small>${tr(SIGIL_NAME[sigil][state.locale])}</small></div>`).join("")}
      <div class="wake-line" aria-hidden="true"><i style="--progress:${Math.min(fight.sigils.length, 3) / 3 * 100}%"></i></div>
    </div>
    <p class="wake-hint">${ready ? tr("wakeReady") : tr("wakeHint")}</p>
  </section>`;
}

function intentMarkup(enemy) {
  const intent = currentIntent(enemy);
  const key = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
  const icon = intent.type === "attack" ? "↗" : intent.type === "brace" ? "◒" : "↑";
  return `<span class="intent intent-${intent.type}"><span aria-hidden="true">${icon}</span>${tr(key, { n: intent.value })}</span>`;
}

function renderEnemy(enemy, index) {
  if (enemy.hp <= 0) return `<div class="foe-card defeated" aria-hidden="true"><span class="defeated-mark">×</span></div>`;
  const pending = ui.pendingCard !== null;
  const selected = ui.selectedEnemy === index;
  const intent = currentIntent(enemy);
  const guarding = enemy.guard > 0;
  const portrait = enemy.id === "horizon" ? "◎" : enemy.id === "brineback" ? "◒" : enemy.id === "mirrorfin" ? "◁" : enemy.id === "bellwether" ? "♢" : enemy.id === "inkling" ? "∿" : "◌";
  const intentKey = intent.type === "attack" ? "intentAttack" : intent.type === "brace" ? "intentBrace" : "intentCharge";
  const label = `${enemyName(enemy)}, ${enemy.hp} / ${enemy.maxHp}. ${tr("currentFoe")}: ${tr(intentKey, { n: intent.value })}`;
  return `<button type="button" class="foe-card ${pending ? "targetable" : ""} ${selected ? "foe-selected" : ""} ${enemy.id === "horizon" ? "foe-boss" : ""}" data-action="select-foe" data-enemy-index="${index}" data-focus="foe-${index}" aria-label="${escapeHtml(label)}">
    <span class="foe-art kind-${ENEMIES[enemy.id].kind}" aria-hidden="true"><i></i><b></b><em></em><strong>${portrait}</strong></span>
    <span class="foe-name-row"><strong>${escapeHtml(enemyName(enemy))}</strong><small>${tr("enemyKind")}</small></span>
    <span class="foe-health"><i style="width:${Math.max(0, enemy.hp / enemy.maxHp * 100)}%"></i></span>
    <span class="foe-stats"><span>${enemy.hp} <small>/ ${enemy.maxHp}</small></span>${guarding ? `<span class="foe-guard">◒ ${enemy.guard}</span>` : ""}</span>
    ${intentMarkup(enemy)}
    ${pending ? `<span class="target-label">${selected ? tr("targetSelected") : tr("targetFoe")}</span>` : ""}
  </button>`;
}

function renderLog() {
  const entries = [...(state.run.log || [])].slice(-5).reverse();
  return `<section class="log-panel"><div class="log-heading"><span class="section-eyebrow">${tr("battleLog")}</span><span class="live-dot"></span></div><ol>${entries.map((entry) => `<li>${tr(entry.key, entry.args)}</li>`).join("")}</ol></section>`;
}

function renderBattle() {
  const run = state.run;
  const fight = run.fight;
  const stepTitle = getEncounterTitle();
  const targeting = ui.pendingCard !== null;
  const handCards = fight.hand.map((id, index) => renderCard(id, {
    index, playable: true, selected: targeting && ui.pendingCard === index,
  })).join("");
  const living = fight.enemies.filter((enemy) => enemy.hp > 0).length;
  const notice = ui.notice || (targeting ? tr("targetHint") : tr("clickCardHint"));
  return `<main class="game-scene battle-scene">
    <section class="battle-heading"><div><span class="section-eyebrow">${tr("chapter")} · ${tr("step", { n: run.stage })}</span><h1>${stepTitle}</h1></div><div class="turn-pill"><span class="live-dot"></span>${tr("turn", { turn: fight.turn })}</div></section>
    ${renderMetrics()}
    <div class="battle-grid">
      <section class="battle-main">
        <div class="arena-heading"><div><span class="section-eyebrow">${tr("enemyKind")}</span><span class="foe-count">${living} <small>${tr("currentFoe")}</small></span></div><span class="scene-coordinate">${String(run.stage).padStart(2, "0")} / 03</span></div>
        <div class="arena ${run.encounterId === "boss" ? "arena-boss" : ""}"><div class="arena-glow" aria-hidden="true"></div><div class="arena-orbit" aria-hidden="true"><i></i><b></b></div><div class="foe-row">${fight.enemies.map(renderEnemy).join("")}</div><div class="arena-floor" aria-hidden="true"></div></div>
        ${renderWake()}
      </section>
      <aside class="battle-side">
        <div class="side-title"><span class="section-eyebrow">${tr("turnTitle")}</span><h2>${tr("turnHint")}</h2></div>
        <div class="side-actions"><button type="button" class="button button-primary end-turn" data-action="end-turn" data-focus="end-turn">${tr("endTurn")} <span aria-hidden="true">↵</span></button>
          <button type="button" class="button button-quiet reweave-button" data-action="reweave" data-focus="reweave" ${run.reweaveAvailable && fight.hand.length > 0 ? "" : "disabled"}><span aria-hidden="true">⤨</span>${run.reweaveAvailable ? tr("reweave") : tr("reweaveUsed")}</button>
          <button type="button" class="deck-button" data-action="deck" data-focus="deck">▤ ${tr("deckPeek")} <span>${run.deck.length}</span></button>
        </div>
        ${renderLog()}
      </aside>
    </div>
    <section class="hand-zone"><div class="hand-header"><div><span class="section-eyebrow">${tr("turnTitle")}</span><h2>${tr("clickCardHint")}</h2></div><div class="hand-piles"><span>${tr("drawPile")} <b>${fight.drawPile.length}</b></span><span>${tr("discardPile")} <b>${fight.discardPile.length}</b></span></div></div>
      <div class="hand-cards">${handCards || `<div class="empty-hand">${tr("clickCardHint")}</div>`}</div>
      <div class="hand-footer"><span class="keyboard-hint">${notice}</span><span class="hand-limit">${fight.hand.length} / ${MAX_HAND}</span></div>
    </section>
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
  if (modal === "help") {
    const sections = [
      ["01", "Wake"], ["02", "Turn"], ["03", "Reweave"], ["04", "Route"], ["05", "Keys"],
    ];
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card help-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">SPINDLEWAKE</span><h2 id="modal-title">${tr("helpTitle")}</h2>
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
  if (modal === "deck") {
    const counts = state.run.deck.reduce((result, id) => { result[id] = (result[id] || 0) + 1; return result; }, {});
    const cards = Object.entries(counts).map(([id, amount]) => `<article class="deck-entry tone-${CARDS[id].tone}"><span class="sigil-chip">${SIGIL_GLYPH[CARDS[id].sigil]}</span><div><strong>${escapeHtml(cardName(id))}</strong><small>${escapeHtml(CARDS[id][state.locale].text)}</small></div><b>×${amount}</b></article>`).join("");
    return `<div class="modal-scrim" data-action="close-outside"><section class="modal-card deck-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" data-focus="modal-close" aria-label="${tr("close")}">×</button><span class="section-eyebrow">${tr("chapter")}</span><h2 id="modal-title">${tr("deckTitle")}</h2><p>${tr("deckSummary", { draw: state.run.fight.drawPile.length, discard: state.run.fight.discardPile.length, hand: state.run.fight.hand.length })}</p><div class="deck-list">${cards || `<p>${tr("noCards")}</p>`}</div></section></div>`;
  }
  return "";
}

function render() {
  const activeFocus = document.activeElement?.dataset?.focus;
  document.documentElement.lang = state.locale === "zh" ? "zh-Hans" : "en";
  document.body.classList.toggle("reduce-motion", state.motion);
  const screen = state.screen === "battle" && state.run ? renderBattle()
    : state.screen === "reward" && state.run ? renderReward()
      : state.screen === "route" && state.run ? renderRoute()
        : state.screen === "summary" && state.run ? renderSummary()
          : renderHome();
  app.innerHTML = `${renderHeader()}${screen}${renderModal()}<div class="toast" role="status" aria-live="polite">${ui.notice}</div>`;
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
      showModal("help");
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
    case "play-card":
      playCard(Number(actionButton.dataset.cardIndex));
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
  const button = clickEvent.target.closest("[data-action]");
  if (button) handleAction(button, clickEvent);
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
  if (keyboardEvent.key === "Escape") {
    keyboardEvent.preventDefault();
    if (ui.modal) closeModal();
    else if (state.run && !state.run.result) showModal("pause");
    return;
  }
  if (ui.modal || state.screen !== "battle" || !state.run) return;
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
  if (document.hidden) suspendAudio();
  else resumeAudio();
});

setSoundEnabled(state.sound);
setMusicEnabled(state.music);
setVolume(state.volume);
render();
