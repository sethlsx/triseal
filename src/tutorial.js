export const TUTORIAL_TEXT = {
  en: {
    tutorialTitle: "Your first Wake",
    tutorialKicker: "FIELD LESSON",
    tutorialProgress: "Lesson {step} / {total}",
    tutorialNext: "Let's begin",
    tutorialExit: "Leave lesson",
    tutorialIntroTitle: "Read the battlefield",
    tutorialIntroBody: "Health keeps you alive. The foe's intent shows an attack for 5. The glowing orb holds 3 Energy to spend this turn. Let's stop that attack.",
    tutorialBlockTitle: "First, protect yourself",
    tutorialBlockBody: "Play Fold the Current. The 1 in its corner costs 1 Energy. You gain 5 Block, which absorbs damage until your next turn. Its seal is Tide.",
    tutorialAttackTitle: "Two seals make a reaction",
    tutorialAttackBody: "Play Thread Needle for 6 damage. Its Ember seal joins Tide to make Steam: the foe's attack falls from 5 to 3 this turn.",
    tutorialWakeTitle: "Add the third seal",
    tutorialWakeBody: "Play Undertow, your Glass card. All three seals trigger Wake: 4 damage to every foe, 4 Block and draw 1. The first two seals choose the reaction.",
    tutorialEndTurnTitle: "Let the current turn",
    tutorialEndTurnBody: "Energy spent. End Turn discards your hand. The foe attacks for 3 and your Block absorbs it. Then draw 5 new cards.",
    tutorialFinishTitle: "The next move is yours",
    tutorialFinishBody: "A fresh hand: 3 Energy, 0 Block. Played cards enter Discard; an empty Draw pile reshuffles it. Defeat the Driftling to finish the lesson.",
    tutorialVictoryTitle: "You have woven a Wake",
    tutorialVictoryBody: "Read the intent, spend your Energy, and weave your seals. You're ready for the observatory.",
    tutorialBlocked: "Follow the highlighted step first.",
  },
  zh: {
    tutorialTitle: "第一次唤潮",
    tutorialKicker: "实战入门",
    tutorialProgress: "入门 {step} / {total}",
    tutorialNext: "开始练习",
    tutorialExit: "退出练习",
    tutorialIntroTitle: "先读懂战场",
    tutorialIntroBody: "生命归零就会失败。敌人头顶的意图表示它将攻击5点；发光圆球里是本回合可用的3点能量。先挡住这次攻击。",
    tutorialBlockTitle: "先保护自己",
    tutorialBlockBody: "打出「折叠潮流」。牌角的1表示消耗1点能量，获得5点格挡，吸收伤害直到下个回合。这张牌带有潮汐印记。",
    tutorialAttackTitle: "两种印记，产生共鸣",
    tutorialAttackBody: "打出「引线针」，造成6点伤害。它的余烬印记与潮汐形成「蒸雾」：敌人本回合的攻击由5降至3。",
    tutorialWakeTitle: "补上第三种印记",
    tutorialWakeBody: "打出带琉璃印记的「暗流」。三印齐聚触发唤潮：全体敌人受到4点伤害，获得4点格挡，再抽1张牌。前两印决定共鸣类型。",
    tutorialEndTurnTitle: "交给潮流回应",
    tutorialEndTurnBody: "能量已用完。点击结束回合：剩余手牌进入弃牌堆，敌人的3点攻击被格挡吸收，然后抽取5张新牌。",
    tutorialFinishTitle: "接下来，由你决定",
    tutorialFinishBody: "新回合恢复3点能量，格挡归零。打出的牌进入弃牌堆；抽牌堆用空后会重新洗入。现在击败漂流灵，完成练习。",
    tutorialVictoryTitle: "你已唤起第一道浪",
    tutorialVictoryBody: "读懂意图，分配能量，编织三印。现在可以走进观测站了。",
    tutorialBlocked: "请先完成高亮提示的操作。",
  },
};

const STEPS = [
  { id: "intro", keytitle: "tutorialIntroTitle", keybody: "tutorialIntroBody", focus: "intent", canAdvance: true },
  { id: "block", keytitle: "tutorialBlockTitle", keybody: "tutorialBlockBody", cardId: "brace", focus: "card" },
  { id: "attack", keytitle: "tutorialAttackTitle", keybody: "tutorialAttackBody", cardId: "needle", focus: "card" },
  { id: "wake", keytitle: "tutorialWakeTitle", keybody: "tutorialWakeBody", cardId: "undertow", focus: "sigils" },
  { id: "end-turn", keytitle: "tutorialEndTurnTitle", keybody: "tutorialEndTurnBody", focus: "end-turn" },
  { id: "finish", keytitle: "tutorialFinishTitle", keybody: "tutorialFinishBody", focus: "hand" },
  { id: "victory", keytitle: "tutorialVictoryTitle", keybody: "tutorialVictoryBody" },
];

export function createTutorialRun() {
  const hand = ["brace", "needle", "undertow", "needle", "brace"];
  // The engine draws from the end. Wake draws Glass; the next hand gets two
  // Needles before any reshuffle, enough to finish the remaining 12 health.
  const drawPile = ["brace", "needle", "needle", "glassline", "glassline"];
  return {
    seed: "FIRST-WAKE",
    randomState: 0x54524953,
    hp: 44,
    maxHp: 44,
    stage: 1,
    route: "",
    deck: [...hand, ...drawPile],
    totalTurns: 1,
    cardsAdded: 0,
    fightsWon: 0,
    reweaveAvailable: true,
    log: [{ key: "logTurn", args: { n: 1 } }],
    result: null,
    returnScreen: "battle",
    encounterId: "shoal",
    tutorial: { version: 1, step: "intro", completed: false },
    fight: {
      turn: 1,
      energy: 3,
      guard: 0,
      sigils: [],
      resonance: null,
      attackReduction: 0,
      prismReady: false,
      wakeUsed: false,
      hand,
      discardPile: [],
      drawPile,
      enemies: [{ id: "driftling", hp: 26, maxHp: 26, guard: 0, intentIndex: 0, power: 0 }],
    },
  };
}

export function tutorialStep(run) {
  if (!run?.tutorial) return null;
  const index = STEPS.findIndex((step) => step.id === run.tutorial.step);
  // An unknown persisted step remains unguided instead of trapping the player.
  const safeIndex = index >= 0 ? index : STEPS.findIndex((step) => step.id === "finish");
  return { ...STEPS[safeIndex], index: safeIndex, total: STEPS.length };
}

export function tutorialAllows(run, action, cardId = null) {
  const step = tutorialStep(run);
  if (!step) return true;
  if (action === "tutorial-next") return Boolean(step.canAdvance);
  if (!["play-card", "end-turn", "reweave"].includes(action)) return true;
  if (step.id === "finish") return true;
  if (action === "play-card") return Boolean(step.cardId && step.cardId === cardId);
  return action === "end-turn" && step.id === "end-turn";
}

// The caller advances only after the real action and its animations resolve.
// Merely inspecting a card or choosing a target must never advance the lesson.
export function advanceTutorial(run, event, cardId = null) {
  const step = tutorialStep(run);
  if (!step || step.id === "victory") return false;
  let next = null;
  if (event === "victory") next = "victory";
  else if (step.id === "intro" && event === "next") next = "block";
  else if (step.cardId && event === "card-resolved" && cardId === step.cardId) {
    next = STEPS[step.index + 1].id;
  } else if (step.id === "end-turn" && event === "turn-resolved") next = "finish";
  if (!next) return false;
  run.tutorial.step = next;
  run.tutorial.completed = next === "victory";
  return true;
}
