// Система квестов: базовые описания целей и наград.
// Логика выполнения/прогресса реализована в game.js.
import { RARITY, mkItem } from "./items.js";

/**
 * Типы целей:
 * - kill: убить указанных мобов нужное количество раз
 * - collect: собрать предметы в инвентаре
 * - talk: поговорить с NPC (через диалог)
 * - visit: посетить зону/локацию
 *
 * Награды:
 * - xp: опыт
 * - money: коллы
 * - items: () => mkItem[] — предметы, которые выдаются при завершении.
 */

export const QUESTS = [
  {
    id: "q_first_hunt",
    kind: "main",
    name: "Первая вылазка гильдии",
    giverNpcId: "npc_guild_receptionist",
    description:
      "Регистратор гильдии хочет убедиться, что ты не погибнешь на первой же вылазке. Убей несколько кабанов и волков на первом этаже.",
    hint: "Охоться на кабанов и волков на первом этаже (поля и лес).",
    goals: [
      { type: "kill", mobId: "boar", count: 3 },
      { type: "kill", mobId: "wolf", count: 3 },
    ],
    rewards: {
      xp: 80,
      money: 600,
      items: () => [
        mkItem({
          id: "bandage",
          name: "Чистые бинты",
          rarity: RARITY.uncommon,
          type: "consumable",
          desc: "Запас бинтов от гильдии. Лечит 14 HP.",
          mods: { heal: 14 },
          qty: 3,
        }),
      ],
    },
  },
  {
    id: "q_collect_pelts",
    kind: "side",
    name: "Шкуры для ремесленника",
    giverNpcId: "npc_crafter_apprentice",
    description:
      "Подмастерье ремесленника собирает волчьи шкуры для будущих курток. Ему нужны целые, свежие шкуры.",
    hint: "Собери волчьи шкуры, охотясь на волков поблизости от Города Начала.",
    goals: [{ type: "collect", itemId: "pelt", count: 5 }],
    rewards: {
      xp: 55,
      money: 750,
      items: () => [
        mkItem({
          id: "parts",
          name: "Кузнечные детали",
          rarity: RARITY.uncommon,
          type: "resource",
          desc: "Набор деталей, который можно пустить на ремесло.",
          mods: { resourceTag: "parts" },
          qty: 3,
        }),
      ],
    },
  },
  {
    id: "q_rare_hunter_guild",
    kind: "main",
    name: "Странный охотник",
    giverNpcId: "npc_rare_hunter",
    description:
      "В лесу иногда появляется молчаливый охотник. Говорят, он когда‑то в одиночку дошёл до Лабиринта. Попробуй убедить его вступить в твою гильдию.",
    hint: "Встреть охотника в глубоком лесу или коридорах Лабиринта и поговори с ним.",
    goals: [
      { type: "visit", areaId: "forest_deep", count: 1 },
      { type: "talk", npcId: "npc_rare_hunter", count: 1 },
    ],
    rewards: {
      xp: 120,
      money: 1200,
      items: () => [
        mkItem({
          id: "hunter_token",
          name: "Жетон охотника",
          rarity: RARITY.rare,
          type: "trophy",
          desc: "Знак доверия странного охотника. В Городе Начала на него смотрят с уважением.",
        }),
      ],
    },
  },
  {
    id: "q_labyrinth_scout",
    kind: "main",
    name: "Разведка Лабиринта",
    giverNpcId: "npc_guild_receptionist",
    description:
      "Гильдии нужны свежие отчёты по Лабиринту. Тебе нужно дойти до внешних коридоров, выжить и вернуться с опытом.",
    hint:
      "Доберись до внешних коридоров Лабиринта, сразись с местными монстрами и вернись живым.",
    goals: [
      { type: "visit", areaId: "labyrinth_outer", count: 1 },
      { type: "kill", mobId: "wolf", count: 3 },
      { type: "kill", mobId: "mimic_crab", count: 2 },
    ],
    rewards: {
      xp: 140,
      money: 1500,
      items: () => [
        mkItem({
          id: "guard_tonic",
          name: "Тоник стойкости",
          rarity: RARITY.uncommon,
          type: "consumable",
          desc: "Лечит 10 HP и даёт +1 ЗАЩ на следующий бой.",
          mods: { heal: 10, tempDefNextFight: 1 },
          qty: 3,
        }),
      ],
    },
  },
  {
    id: "q_bog_herbs",
    kind: "side",
    name: "Трава из туманного болота",
    giverNpcId: "npc_potion_alchemist",
    description:
      "Алхимик из лавки зелий хочет проверить, выживешь ли ты в ядовитом болоте. Ему нужны образцы болотной травы.",
    hint:
      "Отправься в локацию «Туманное болото» и собирай ресурсы с пометкой болотной травы.",
    goals: [{ type: "collect", itemId: "swamp_herb", count: 4 }],
    rewards: {
      xp: 90,
      money: 1100,
      items: () => [
        mkItem({
          id: "strong_salve",
          name: "Усиленная мазь",
          rarity: RARITY.uncommon,
          type: "consumable",
          desc: "Лечит 26 HP.",
          mods: { heal: 26 },
          qty: 2,
        }),
      ],
    },
  },
  {
    id: "q_ore_for_guild",
    kind: "side",
    name: "Руда для гильдии",
    giverNpcId: "npc_crafter_apprentice",
    description:
      "Гильдийские ремесленники собирают руду для будущего вооружения рейдов. Подмастерье готов заплатить за партию сырья.",
    hint:
      "Ищи руду в каменистых холмах и в Лабиринте. Любая низкосортная руда подойдёт.",
    goals: [{ type: "collect", itemId: "ore_low", count: 6 }],
    rewards: {
      xp: 100,
      money: 1600,
      items: () => [
        mkItem({
          id: "ingot_iron",
          name: "Железный слиток",
          rarity: RARITY.uncommon,
          type: "resource",
          desc: "Хороший базовый материал для оружия и брони.",
          mods: { resourceTag: "ingot" },
          qty: 2,
        }),
      ],
    },
  },
];

export function getQuestById(id) {
  return QUESTS.find((q) => q.id === id) || null;
}

