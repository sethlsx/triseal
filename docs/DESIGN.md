# Triseal — design brief

**Status:** working concept, first playable slice  
**Audience:** international PC and mobile-browser players; English by default, Simplified Chinese included  
**Format:** single-player, turn-based deck roguelite

## Player promise

Read the danger, shape your hand, then connect three different currents for a Wake that can rescue a tight turn. A run should be short enough to finish over a break and deep enough to make the next draft feel different.

## Setting

The charts of the Drowned Observatory were woven from strands that remember the sea. You are a new chartkeeper, following those strands through a flooded archive to recover the Observatory's missing horizon. The visual language is ink, glass, copper, dark water, and three luminous thread colors. No characters, factions, card frames, layouts, or sound motifs are copied from reference games.

## Core combat loop

1. The player sees each foe's next intent before choosing a card.
2. Draw five cards and receive three energy.
3. Play cards in any order, aim their effects, and watch the current's three-sigil braid fill. Each card arcs from the hand into its target before its effect resolves.
4. The first two distinct sigils played in a turn choose one of three Resonances: Tide + Ember weakens foe attacks, Ember + Glass charges the next attack card, and Glass + Tide grants guard. This makes card order a tactical choice: choose control, offense, or defense against the visible intents.
5. Playing the third distinct sigil triggers a Wake: a modest area strike, a guard pulse, and one extra draw. The impact, guard, and drawn card each get a clear motion cue; the Wake gets a larger burst. The UI previews each card and explains the trigger before it resolves.
6. End the turn; surviving foes resolve their visible intents and reveal their next move.
7. After a win, choose one of three cards or skip the reward. Continue through a compact route to the final encounter.

Sigils are **Tide**, **Ember**, and **Glass**. They describe the rhythm of a card, not a rigid class: a deck can use a Tide attack or an Ember defense. A repeated sigil does not erase progress already made in the current turn; it simply does not fill a new socket. The first pair is selected by which different sigil the player chooses second, so the visible enemy intent can guide the choice. This keeps the combo exciting without making one bad draw invalidate the turn.

## First playable slice

- One starter chartkeeper and one ten-card starting deck.
- Three distinct sigils and the Wake rule.
- A short expedition with two ordinary fights and a final foe.
- Enemy intent previews, health and guard, draw/discard piles, and a card reward after a win.
- A seeded run option for repeatable comparisons.
- A one-use **Reweave** per expedition: replace the hand once before ending a turn. This is an agency tool, not a guarantee of a win.
- Local autosave at safe route points and a manual pause menu.
- English and Simplified Chinese, keyboard and pointer input, adjustable sound, and reduced motion.
- An original SVG chartkeeper faces six distinct animated sea creatures on a shared battlefield. Intent markers remain above the figures; health and guard remain below.
- Combat resolves in visible beats: card flight, casting anticipation, projectile contact, damage or absorption, then Resonance and Wake. Each surviving enemy performs its action separately before the new hand is dealt.
- CSS and Web Animations API motion includes idle poses, lunges, spell trails, hit recoil, shield pulses, floating numbers, defeat dispersal, discard, and deal. Reduced motion preserves short numeric feedback without travel or shaking.
- Inputs are locked only during resolution. Saves occur at complete action boundaries so a refresh during combat restores the previous complete state.

## Feedback translated into choices

### Landscape play space

Phone landscape is the primary composition. The drowned observatory fills the viewport, with the chartkeeper and enemies placed directly into its depth. Health and guard stay beside their owners; enemy intentions remain overhead. A compact three-sigil constellation opens the full Resonance explanation on demand. Energy, draw/discard piles, the fanned hand, and the end-turn seal sit around the lower edge. Battle history opens separately instead of occupying a permanent panel. Portrait phones show a rotation prompt, and short landscape screens use compact route, reward, and title layouts.

- **Players value simple rules with depth.** Keep the two-step braid visible: the first pair picks one understandable tactical reaction, and the third sigil triggers the Wake. Explain both payoffs in the tutorial and on the board.
- **Runs can feel samey when high difficulty narrows viable builds.** Give each sigil several action types and make card rewards useful across multiple combinations.
- **Unavoidable damage and early randomness feel unfair.** Telegraph enemy actions, let players see likely incoming damage, and provide one limited hand correction.
- **Dense systems make a new deckbuilder look like homework.** Introduce mechanics in play, use plain card text, and keep the first screen focused on the current turn.
- **Long sessions are hard to fit into real life.** Target 15–20 minutes for the first complete route and save at each safe choice.
- **A new game needs a visible reason to exist.** Show the three-sigil braid during the first fight and explain its payoff in the opening tutorial.

## What this prototype is not trying to prove

The prototype does not establish final balance, the commercial name, long-term content volume, controller certification, native mobile packaging, or rights clearance for any future external asset. Those require later playtests and review.

## 简体中文概述

《三印唤潮》（暂定名）是一款短局制卡牌肉鸽。玩家每回合先看见敌人的意图，再按任意顺序打出卡牌。前两种不同印记会组合成「蒸雾、棱光、映盾」之一，让玩家根据当前威胁选择削弱、强化攻击或获得格挡；再打出第三种印记触发「唤潮」，造成范围伤害、获得格挡并补一张牌。重复印记不会抹掉已有进度。

首个可玩版本聚焦四点：核心规则一分钟内讲明白，随机事件不直接剥夺玩家操作空间，单局控制在约 15–20 分钟，并支持英语和简体中文。美术与音频从零制作，来源记录见 [素材来源](../assets/PROVENANCE.md)。
