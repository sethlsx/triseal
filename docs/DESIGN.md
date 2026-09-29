# Threadwake — design brief

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
3. Play cards in any order, aim their effects, and watch the current's three-sigil braid fill.
4. Playing three distinct sigils in one turn triggers a Wake: a modest area strike, a guard pulse, and one extra draw. The UI previews each card and explains the trigger before it resolves.
5. End the turn; surviving foes resolve their visible intents and reveal their next move.
6. After a win, choose one of three cards or skip the reward. Continue through a compact route to the final encounter.

Sigils are **Tide**, **Ember**, and **Glass**. They describe the rhythm of a card, not a rigid class: a deck can use a Tide attack or an Ember defense. A repeated sigil does not erase progress already made in the current turn; it simply does not fill a new socket. This keeps the combo exciting without making one bad draw invalidate the turn.

## First playable slice

- One starter chartkeeper and one ten-card starting deck.
- Three distinct sigils and the Wake rule.
- A short expedition with two ordinary fights and a final foe.
- Enemy intent previews, health and guard, draw/discard piles, and a card reward after a win.
- A seeded run option for repeatable comparisons.
- A one-use **Reweave** per expedition: replace the hand once before ending a turn. This is an agency tool, not a guarantee of a win.
- Local autosave at safe route points and a manual pause menu.
- English and Simplified Chinese, keyboard and pointer input, adjustable sound, and reduced motion.

## Feedback translated into choices

- **Players value simple rules with depth.** Keep the Wake rule visible and explain its payoff at the moment it becomes available.
- **Runs can feel samey when high difficulty narrows viable builds.** Give each sigil several action types and make card rewards useful across multiple combinations.
- **Unavoidable damage and early randomness feel unfair.** Telegraph enemy actions, let players see likely incoming damage, and provide one limited hand correction.
- **Dense systems make a new deckbuilder look like homework.** Introduce mechanics in play, use plain card text, and keep the first screen focused on the current turn.
- **Long sessions are hard to fit into real life.** Target 15–20 minutes for the first complete route and save at each safe choice.
- **A new game needs a visible reason to exist.** Show the three-sigil braid during the first fight and explain its payoff in the opening tutorial.

## What this prototype is not trying to prove

The prototype does not establish final balance, the commercial name, long-term content volume, controller certification, native mobile packaging, or rights clearance for any future external asset. Those require later playtests and review.

## 简体中文概述

Threadwake（暂定名）是一款短局制卡牌肉鸽。玩家每回合先看见敌人的意图，再按任意顺序打出卡牌。牌面带有「潮汐、余烬、琉璃」三种印记；同一回合连齐三种印记会触发「唤潮」，造成范围伤害、获得格挡并补一张牌。重复印记不会抹掉已有进度。

首个可玩版本聚焦四点：核心规则一分钟内讲明白，随机事件不直接剥夺玩家操作空间，单局控制在约 15–20 分钟，并支持英语和简体中文。美术与音频从零制作，来源记录见 [素材来源](../assets/PROVENANCE.md)。
