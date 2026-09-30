import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataSource = await readFile(new URL("src/data.js", root), "utf8");
const mainSource = await readFile(new URL("src/main.js", root), "utf8");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function makeHarness(savedValue = null) {
  const writes = [];
  const listeners = new Map();
  const app = {
    innerHTML: "",
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector() { return null; },
  };
  const classList = { toggle() {}, add() {}, remove() {} };
  const document = {
    activeElement: null,
    hidden: false,
    documentElement: { lang: "en" },
    body: { classList, dataset: {}, append() {} },
    querySelector(selector) { return selector === "#app" ? app : null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  const window = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    confirm() { return true; },
    matchMedia() { return { matches: true }; },
  };
  const hooks = {
    card: () => Promise.resolve(),
    enemy: () => Promise.resolve(),
    settle: () => Promise.resolve(),
  };
  const sandbox = {
    console,
    document,
    window,
    CSS: { escape: String },
    HTMLInputElement: class {},
    HTMLTextAreaElement: class {},
    localStorage: {
      getItem() { return savedValue; },
      setItem(key, value) { writes.push({ key, value }); },
    },
    Math,
    JSON,
    Set,
    Promise,
    setTimeout,
    clearTimeout,
    activateAudio() {},
    playSound() {},
    setSoundEnabled() {},
    setMusicEnabled() {},
    setVolume() {},
    suspendAudio() {},
    resumeAudio() {},
    renderBattleScene() { return "<main></main>"; },
    renderRouteScene() { return "<main></main>"; },
    spriteMarkup() { return ""; },
    animateCardCast(...args) { return hooks.card(...args); },
    animateEnemyAction(...args) { return hooks.enemy(...args); },
    settleImpact(...args) { return hooks.settle(...args); },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const data = dataSource.replace(/^export\s+/gm, "") + ";globalThis.__text = TEXT;";
  vm.runInContext(data, sandbox, { filename: "src/data.js" });
  const main = mainSource.replace(/^import .*;\r?\n/gm, "") + `
globalThis.__game = {
  startRun, chooseRoute, chooseReward, playCard, endTurn, enemyTurn,
  checkVictory, getIncomingDamage, currentIntent, state, ui, render
};`;
  vm.runInContext(main, sandbox, { filename: "src/main.js" });
  return { game: sandbox.__game, hooks, text: sandbox.__text, writes };
}

function enterShoal(game, seed = "CHECKS") {
  game.startRun(seed);
  assert.equal(game.state.screen, "route", "a run starts on the route map");
  assert.equal(game.state.run.encounterId, "shoal", "the deterministic opening fight is prebuilt");
  game.chooseRoute("shoal");
  assert.equal(game.state.screen, "battle");
  return game.state.run;
}

function makeDurableEnemies(fight) {
  for (const enemy of fight.enemies) {
    enemy.hp = 100;
    enemy.maxHp = 100;
    enemy.guard = 0;
    enemy.intentIndex = 0;
    enemy.power = 0;
  }
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("three distinct sigils trigger one Wake per turn", async () => {
  const { game } = makeHarness();
  const run = enterShoal(game, "WAKE");
  const fight = run.fight;
  makeDurableEnemies(fight);
  fight.hand = ["needle", "brace", "glassline", "brace"];
  fight.drawPile = [];
  fight.discardPile = [];
  fight.energy = 10;
  run.log = [];

  await game.playCard(0, 0);
  await game.playCard(0);
  await game.playCard(0);
  await game.playCard(0);

  assert.equal(fight.wakeUsed, true);
  assert.equal(run.log.filter((entry) => entry.key === "logWake").length, 1);
  assert.deepEqual([...fight.sigils].sort(), ["ember", "glass", "tide"]);
});

test("Steam changes both visible and resolved incoming damage", async () => {
  const { game } = makeHarness();
  const run = enterShoal(game, "STEAM");
  const fight = run.fight;
  fight.enemies = [fight.enemies[0]];
  fight.enemies[0].hp = 100;
  fight.enemies[0].maxHp = 100;
  fight.enemies[0].intentIndex = 0;
  fight.enemies[0].power = 0;
  fight.hand = ["needle", "brace"];
  fight.drawPile = [];
  fight.discardPile = [];
  fight.energy = 10;

  assert.equal(game.getIncomingDamage(), 5);
  await game.playCard(0);
  await game.playCard(0);
  assert.equal(fight.resonance, "steam");
  assert.equal(game.getIncomingDamage(), 3);
  fight.guard = 0;
  const hpBefore = run.hp;
  await game.endTurn();
  assert.equal(run.hp, hpBefore - 3);
});

test("Prism applies to every foe hit by one attack card, then expires", async () => {
  const { game } = makeHarness();
  const run = enterShoal(game, "PRISM");
  const fight = run.fight;
  makeDurableEnemies(fight);
  fight.hand = ["glassline", "needle", "crosscut", "crosscut"];
  fight.drawPile = [];
  fight.discardPile = [];
  fight.energy = 10;
  run.log = [];

  await game.playCard(0);
  await game.playCard(0, 0);
  assert.equal(fight.prismReady, true);
  await game.playCard(0);
  assert.equal(fight.prismReady, false);
  await game.playCard(0);

  assert.equal(fight.enemies[0].hp, 83, "target takes 6, then Prism 7, then normal 4");
  assert.equal(fight.enemies[1].hp, 89, "other foe takes Prism 7, then normal 4");
  assert.equal(run.log.filter((entry) => entry.key === "logPrismStrike").length, 1);
});

test("guard absorbs incoming attack damage before hull", async () => {
  const { game } = makeHarness();
  const run = enterShoal(game, "GUARD");
  const fight = run.fight;
  fight.enemies = [fight.enemies[0]];
  fight.enemies[0].intentIndex = 0;
  fight.enemies[0].power = 0;
  fight.guard = 4;
  const hpBefore = run.hp;

  await game.endTurn();

  assert.equal(run.hp, hpBefore - 1);
  assert.equal(fight.guard, 0);
});

test("card animation lock prevents a second card action", async () => {
  const { game, hooks } = makeHarness();
  const run = enterShoal(game, "CARD-LOCK");
  const fight = run.fight;
  makeDurableEnemies(fight);
  fight.hand = ["needle", "needle"];
  fight.energy = 3;
  const cast = deferred();
  hooks.card = () => cast.promise;

  const first = game.playCard(0, 0);
  const second = game.playCard(1, 0);
  assert.equal(game.ui.animating, true);
  assert.equal(fight.hand.length, 2, "card state waits for its animation");
  cast.resolve();
  await Promise.all([first, second]);

  assert.equal(fight.hand.length, 1);
  assert.equal(fight.energy, 2);
  assert.equal(fight.enemies[0].hp, 94);
});

test("enemy animation lock prevents double end-turn and saves only the settled turn", async () => {
  const { game, hooks, writes } = makeHarness();
  const run = enterShoal(game, "TURN-LOCK");
  const fight = run.fight;
  fight.enemies = [fight.enemies[0]];
  fight.enemies[0].intentIndex = 0;
  fight.enemies[0].power = 0;
  const action = deferred();
  hooks.enemy = () => action.promise;
  writes.length = 0;
  const hpBefore = run.hp;
  const turnBefore = fight.turn;

  const first = game.endTurn();
  const second = game.endTurn();
  assert.equal(game.ui.animating, true);
  assert.equal(writes.length, 0, "no mid-sequence state is persisted");
  action.resolve();
  await Promise.all([first, second]);

  assert.equal(run.hp, hpBefore - 5, "one enemy action resolves");
  assert.equal(fight.turn, turnBefore + 1, "only one new player turn begins");
  assert.equal(writes.length, 1, "the completed enemy sequence is saved once");
  assert.equal(game.ui.animating, false);
});

test("route progression rejects future routes and reaches the stage-three boss", () => {
  const { game } = makeHarness();
  game.startRun("ROUTE");
  const run = game.state.run;

  const opening = JSON.stringify(run);
  game.chooseRoute("boss");
  game.chooseRoute("quiet");
  game.chooseRoute("unknown");
  assert.equal(JSON.stringify(run), opening, "future and unknown opening routes are inert");
  game.chooseRoute("shoal");
  assert.equal(run.stage, 1);
  run.fight.enemies.forEach((enemy) => { enemy.hp = 0; });
  assert.equal(game.checkVictory(), true);
  assert.equal(game.state.screen, "reward");
  game.chooseReward(null);
  assert.equal(game.state.screen, "route");

  const afterShoal = JSON.stringify(run);
  game.chooseRoute("boss");
  game.chooseRoute("shoal");
  assert.equal(JSON.stringify(run), afterShoal, "only the quiet/rift choice is open after the shoal");
  game.chooseRoute("rift");
  assert.equal(run.stage, 2);
  assert.equal(run.encounterId, "rift");
  run.fight.enemies.forEach((enemy) => { enemy.hp = 0; });
  assert.equal(game.checkVictory(), true);
  game.chooseReward(null);

  const beforeBoss = JSON.stringify(run);
  game.chooseRoute("quiet");
  game.chooseRoute("rift");
  assert.equal(JSON.stringify(run), beforeBoss, "completed side routes cannot be replayed");
  game.chooseRoute("boss");
  assert.equal(run.stage, 3);
  assert.equal(run.encounterId, "boss");
  run.fight.enemies.forEach((enemy) => { enemy.hp = 0; });
  assert.equal(game.checkVictory(), true);
  assert.equal(game.state.screen, "summary");
  assert.equal(run.result, "won");
  assert.equal(run.fightsWon, 3);
});

test("both middle route choices are valid after the shoal", () => {
  for (const route of ["quiet", "rift"]) {
    const { game } = makeHarness();
    const run = enterShoal(game, `CHOICE-${route}`);
    run.fight.enemies.forEach((enemy) => { enemy.hp = 0; });
    game.checkVictory();
    game.chooseReward(null);
    game.chooseRoute(route);
    assert.equal(game.state.screen, "battle");
    assert.equal(run.encounterId, route);
    assert.equal(run.stage, 2);
  }
});

test("old stage-two boss saves normalize to stage three", () => {
  const saved = JSON.stringify({
    locale: "en", sound: true, music: true, motion: false, volume: 0.55,
    screen: "title", run: { encounterId: "boss", stage: 2 },
  });
  const { game } = makeHarness(saved);
  assert.equal(game.state.run.stage, 3);
});

test("completed legacy boss saves normalize to the won summary", () => {
  const saved = JSON.stringify({
    locale: "en", sound: true, music: true, motion: false, volume: 0.55,
    screen: "reward",
    run: {
      seed: "LEGACY-BOSS", randomState: 1, hp: 7, maxHp: 44,
      stage: 2, route: "quiet", deck: [], totalTurns: 8, cardsAdded: 2,
      fightsWon: 3, reweaveAvailable: false, log: [], result: null,
      returnScreen: "reward", encounterId: "boss", rewardOptions: [],
      fight: { enemies: [{ id: "horizon", hp: 0, maxHp: 62, guard: 0, intentIndex: 0, power: 0 }] },
    },
  });
  const { game } = makeHarness(saved);
  assert.equal(game.state.run.stage, 3);
  assert.equal(game.state.run.result, "won");
  assert.equal(game.state.screen, "summary");
});

test("English and Chinese localization dictionaries have identical keys", () => {
  const { text } = makeHarness();
  const english = Object.keys(text.en).sort();
  const chinese = Object.keys(text.zh).sort();
  assert.deepEqual(chinese, english);
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error?.stack || error);
  }
}

if (failures) {
  console.error(`\n${failures} of ${tests.length} gameplay checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} gameplay checks passed.`);
}
