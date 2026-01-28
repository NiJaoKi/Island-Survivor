// Конфиги мобов и локаций 1-го этажа
import { RARITY, mkItem } from "./items.js";

// --- Базовая тренировочная охота (случайные мобы) ---
export function mobTableForLevel(level) {
  const base = [
    {
      id: "boar",
      name: "Дикий кабан",
      hp: Math.floor((18 + level * 4) * 1.35),
      atk: Math.floor((4 + Math.floor(level * 1.1)) * 1.3),
      def: Math.floor((1 + Math.floor(level * 0.6)) * 1.25),
      xp: 10 + level * 3,
      money: 8 + level * 4,
      drops: [
        {
          p: 0.22,
          item: () =>
            mkItem({
              id: "trophy_fang",
              name: "Клык кабана",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Материал. Торговцы любят такие вещи.",
            }),
        },
        {
          p: 0.1,
          item: () =>
            mkItem({
              id: "salve",
              name: "Травяная мазь",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 18 HP.",
              mods: { heal: 18 },
            }),
        },
        {
          p: 0.008,
          item: () =>
            mkItem({
              id: "boar_charm",
              name: "Талисман дикости",
              rarity: RARITY.rare,
              type: "trinket",
              desc: "+2 АТК.",
              mods: { atk: 2 },
            }),
        },
        {
          p: 0.00008,
          item: () =>
            mkItem({
              id: "crimson_fang",
              name: "Багровый клык",
              rarity: RARITY.mythic,
              type: "trinket",
              desc: "+4 АТК, +2 ЗАЩ.",
              mods: { atk: 4, def: 2 },
            }),
        },
      ],
    },
    {
      id: "wolf",
      name: "Серый волк",
      hp: Math.floor((16 + level * 3) * 1.35),
      atk: Math.floor((5 + Math.floor(level * 1.2)) * 1.3),
      def: Math.floor((1 + Math.floor(level * 0.5)) * 1.25),
      xp: 9 + level * 3,
      money: 9 + level * 4,
      drops: [
        {
          p: 0.24,
          item: () =>
            mkItem({
              id: "pelt",
              name: "Волчья шкура",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Тёплый материал. Можно продать.",
            }),
        },
        {
          p: 0.09,
          item: () =>
            mkItem({
              id: "bandage",
              name: "Чистые бинты",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 14 HP.",
              mods: { heal: 14 },
            }),
        },
        {
          p: 0.007,
          item: () =>
            mkItem({
              id: "wolf_eye",
              name: "Глаз охотника",
              rarity: RARITY.rare,
              type: "trinket",
              desc: "+2 к крит-ударам (скрыто).",
              mods: { crit: 0.02 },
            }),
        },
        {
          p: 0.00006,
          item: () =>
            mkItem({
              id: "moon_pelt",
              name: "Лунная шкура",
              rarity: RARITY.legendary,
              type: "trinket",
              desc: "+45 HP.",
              mods: { hp: 45 },
            }),
        },
      ],
    },
    {
      id: "mimic_crab",
      name: "Краб-имитатор",
      hp: Math.floor((22 + level * 5) * 1.4),
      atk: Math.floor((3 + Math.floor(level * 1.0)) * 1.3),
      def: Math.floor((3 + Math.floor(level * 0.9)) * 1.3),
      xp: 11 + level * 3,
      money: 12 + level * 5,
      drops: [
        {
          p: 0.2,
          item: () =>
            mkItem({
              id: "shell",
              name: "Прочная клешня",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Материал. Иногда берут кузнецы.",
            }),
        },
        {
          p: 0.08,
          item: () =>
            mkItem({
              id: "guard_tonic",
              name: "Тоник стойкости",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 10 HP и даёт +1 ЗАЩ на следующий бой.",
              mods: { heal: 10, tempDefNextFight: 1 },
            }),
        },
        {
          p: 0.006,
          item: () =>
            mkItem({
              id: "shell_ring",
              name: "Кольцо панциря",
              rarity: RARITY.rare,
              type: "trinket",
              desc: "+2 ЗАЩ.",
              mods: { def: 2 },
            }),
        },
        {
          p: 0.00005,
          item: () =>
            mkItem({
              id: "mirror_pearl",
              name: "Зеркальная жемчужина",
              rarity: RARITY.mythic,
              type: "trinket",
              desc: "+3 ЗАЩ, +0,03 крит.",
              mods: { def: 3, crit: 0.03 },
            }),
        },
      ],
    },
  ];

  if (level >= 6) {
    base.push({
      id: "bandit",
      name: "Охотник-бродяга",
      hp: Math.floor((26 + level * 5) * 1.4),
      atk: Math.floor((6 + Math.floor(level * 1.4)) * 1.35),
      def: Math.floor((2 + Math.floor(level * 0.8)) * 1.3),
      xp: 16 + level * 4,
      money: 18 + level * 8,
      drops: [
        {
          p: 0.18,
          item: () =>
            mkItem({
              id: "coin_pouch",
              name: "Кошель с Коллами",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Трофей. Внутри немного денег.",
              mods: { money: 40 + level * 10 },
            }),
        },
        {
          p: 0.08,
          item: () =>
            mkItem({
              id: "strong_salve",
              name: "Усиленная мазь",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 26 HP.",
              mods: { heal: 26 },
            }),
        },
        {
          p: 0.005,
          item: () =>
            mkItem({
              id: "bandit_charm",
              name: "Талисман добычи",
              rarity: RARITY.rare,
              type: "trinket",
              desc: "+5% к Коллам с мобов.",
              mods: { moneyMult: 0.05 },
            }),
        },
        {
          p: 0.00004,
          item: () =>
            mkItem({
              id: "black_contract",
              name: "Чёрный контракт",
              rarity: RARITY.legendary,
              type: "trinket",
              desc: "+0,05 крит, но -10 HP.",
              mods: { crit: 0.05, hp: -10 },
            }),
        },
      ],
    });
  }

  return base;
}

// --- Локации 1-го этажа: справочник зон ---

/**
 * group: "field" | "labyrinth" — базовый тип местности.
 * danger: 1..5 — относительная опасность.
 */
export const FLOOR1_LOCATIONS = [
  {
    id: "field_edge",
    group: "field",
    name: "Окраина полей",
    danger: 1,
    levelOffset: -1,
    xpMult: 0.9,
    moneyMult: 0.9,
    eliteChance: 0.015,
    theme: "field",
    desc: "Самое безопасное место рядом с Городом Начала. Кабаны и волки-одиночки.",
  },
  {
    id: "field_road",
    group: "field",
    name: "Дорога караванов",
    danger: 1,
    levelOffset: 0,
    xpMult: 1.0,
    moneyMult: 1.0,
    eliteChance: 0.02,
    theme: "field",
    desc: "Пыльная дорога, по которой ходят караваны. На запах еды слетаются хищники.",
  },
  {
    id: "field_river",
    group: "field",
    name: "Речная отмель",
    danger: 2,
    levelOffset: 0,
    xpMult: 1.05,
    moneyMult: 1.05,
    eliteChance: 0.03,
    theme: "river",
    desc: "Мелкая речка. Здесь любят охотиться крабы-имитаторы.",
  },
  {
    id: "field_farm",
    group: "field",
    name: "Заброшенная ферма",
    danger: 2,
    levelOffset: 1,
    xpMult: 1.1,
    moneyMult: 1.1,
    eliteChance: 0.035,
    theme: "farm",
    desc: "Старые загончики, сваленные заборы и твари, привыкшие к людям.",
  },
  {
    id: "forest_edge",
    group: "field",
    name: "Кромка леса",
    danger: 2,
    levelOffset: 1,
    xpMult: 1.1,
    moneyMult: 1.0,
    eliteChance: 0.035,
    theme: "forest",
    desc: "Полутёмные тропы, где волки охотятся стаями, а кабаны роют землю.",
  },
  {
    id: "forest_deep",
    group: "field",
    name: "Глубокий лес",
    danger: 3,
    levelOffset: 2,
    xpMult: 1.2,
    moneyMult: 1.1,
    eliteChance: 0.05,
    theme: "forest",
    desc: "Тёмные чащи, где монстры сильнее, а травы ценнее.",
  },
  {
    id: "bog",
    group: "field",
    name: "Туманное болото",
    danger: 3,
    levelOffset: 2,
    xpMult: 1.25,
    moneyMult: 1.15,
    eliteChance: 0.055,
    theme: "bog",
    desc: "Ядовитые испарения и вязкая грязь. Местные твари живучи и злопамятны.",
  },
  {
    id: "rocky_hills",
    group: "field",
    name: "Каменистые холмы",
    danger: 3,
    levelOffset: 2,
    xpMult: 1.25,
    moneyMult: 1.2,
    eliteChance: 0.055,
    theme: "ore",
    desc: "Выветренные скалы, в которых попадаются жилы руды и панцирные твари.",
  },
  {
    id: "labyrinth_outer",
    group: "labyrinth",
    name: "Внешние коридоры Лабиринта",
    danger: 3,
    levelOffset: 2,
    xpMult: 1.35,
    moneyMult: 1.3,
    eliteChance: 0.06,
    theme: "labyrinth",
    desc: "Первые залы подземелья. Много добычи, но и враги опаснее.",
  },
  {
    id: "labyrinth_mid",
    group: "labyrinth",
    name: "Изломанные галереи",
    danger: 4,
    levelOffset: 3,
    xpMult: 1.5,
    moneyMult: 1.45,
    eliteChance: 0.075,
    theme: "labyrinth",
    desc: "Сломанные мостики и узкие проходы. Идеальное место для засад.",
  },
  {
    id: "labyrinth_deep",
    group: "labyrinth",
    name: "Глубины Лабиринта",
    danger: 5,
    levelOffset: 4,
    xpMult: 1.7,
    moneyMult: 1.6,
    eliteChance: 0.1,
    theme: "labyrinth",
    desc: "Самые опасные залы перед боссом. Сюда ходят только уверенные в себе.",
  },
];

export function getFloor1Location(areaId) {
  if (areaId === "field") {
    return FLOOR1_LOCATIONS.find((x) => x.id === "field_edge") || FLOOR1_LOCATIONS[0];
  }
  if (areaId === "labyrinth") {
    return FLOOR1_LOCATIONS.find((x) => x.group === "labyrinth") || FLOOR1_LOCATIONS[FLOOR1_LOCATIONS.length - 1];
  }
  const found = FLOOR1_LOCATIONS.find((x) => x.id === areaId);
  if (found) return found;
  return FLOOR1_LOCATIONS[0];
}

// --- Локации 1-го этажа: генератор мобов под конкретную зону ---
export function floor1MobTable(areaId, level) {
  const loc = getFloor1Location(areaId);
  const isLabyrinth = loc.group === "labyrinth";

  const effLevel = Math.max(1, Math.min(99, level + (loc.levelOffset ?? 0)));
  const danger = loc.danger ?? 1;

  const statMult = 0.95 + danger * 0.16;
  const baseXpMult = isLabyrinth ? 0.8 : 0.55;
  const baseMoneyMult = isLabyrinth ? 1.35 : 1.0;
  const xpMult = baseXpMult * (loc.xpMult ?? 1.0);
  const moneyMult = baseMoneyMult * (loc.moneyMult ?? 1.0);

  const table = [
    {
      id: "wolf",
      name: isLabyrinth ? "Лабиринтный волк" : "Серый волк",
      hp: Math.floor((16 + effLevel * 3) * statMult),
      atk: Math.floor((5 + Math.floor(effLevel * 1.2)) * statMult),
      def: Math.floor((1 + Math.floor(effLevel * 0.5)) * statMult),
      xp: Math.floor((14 + effLevel * 4) * xpMult),
      money: Math.floor((9 + effLevel * 4) * moneyMult),
      drops: [
        {
          p: 0.26,
          item: () =>
            mkItem({
              id: "pelt",
              name: "Волчья шкура",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Трофей. Можно продать или пустить на ремесло.",
            }),
        },
        {
          p: 0.1,
          item: () =>
            mkItem({
              id: "bandage",
              name: "Чистые бинты",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 14 HP.",
              mods: { heal: 14 },
            }),
        },
      ],
    },
    {
      id: "boar",
      name: isLabyrinth ? "Лабиринтный кабан" : "Дикий кабан",
      hp: Math.floor((18 + effLevel * 4) * statMult),
      atk: Math.floor((4 + Math.floor(effLevel * 1.1)) * statMult),
      def: Math.floor((1 + Math.floor(effLevel * 0.6)) * statMult),
      xp: Math.floor((15 + effLevel * 4) * xpMult),
      money: Math.floor((8 + effLevel * 4) * moneyMult),
      drops: [
        {
          p: 0.22,
          item: () =>
            mkItem({
              id: "trophy_fang",
              name: "Клык кабана",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Трофей. Можно продать.",
            }),
        },
        {
          p: 0.1,
          item: () =>
            mkItem({
              id: "salve",
              name: "Травяная мазь",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 18 HP.",
              mods: { heal: 18 },
            }),
        },
      ],
    },
    {
      id: "mimic_crab",
      name: isLabyrinth ? "Краб-охранник" : "Краб-имитатор",
      hp: Math.floor((22 + effLevel * 5) * statMult),
      atk: Math.floor((3 + Math.floor(effLevel * 1.0)) * statMult),
      def: Math.floor((3 + Math.floor(effLevel * 0.9)) * statMult),
      xp: Math.floor((18 + effLevel * 4) * xpMult),
      money: Math.floor((12 + effLevel * 5) * moneyMult),
      drops: [
        {
          p: 0.2,
          item: () =>
            mkItem({
              id: "shell",
              name: "Прочная клешня",
              rarity: RARITY.common,
              type: "trophy",
              desc: "Материал. Можно продать или пустить на ремесло.",
            }),
        },
        {
          p: 0.08,
          item: () =>
            mkItem({
              id: "guard_tonic",
              name: "Тоник стойкости",
              rarity: RARITY.uncommon,
              type: "consumable",
              desc: "Лечит 10 HP и даёт +1 ЗАЩ на следующий бой.",
              mods: { heal: 10, tempDefNextFight: 1 },
            }),
        },
      ],
    },
  ];

  // Тематические ресурсы по типу локации.
  for (const m of table) {
    if (loc.theme === "forest") {
      m.drops.push({
        p: 0.18,
        item: () =>
          mkItem({
            id: "herb_green",
            name: "Лесные травы",
            rarity: RARITY.common,
            type: "resource",
            desc: "Ресурс. Сырьё для зелий.",
            mods: { resourceTag: "herb" },
          }),
      });
    } else if (loc.theme === "bog") {
      m.drops.push({
        p: 0.18,
        item: () =>
          mkItem({
            id: "swamp_herb",
            name: "Ядовитая болотная трава",
            rarity: RARITY.uncommon,
            type: "resource",
            desc: "Ресурс. Сильные, но опасные реагенты.",
            mods: { resourceTag: "herb_poison" },
          }),
      });
    } else if (loc.theme === "ore") {
      m.drops.push({
        p: 0.2,
        item: () =>
          mkItem({
            id: "ore_low",
            name: "Низкосортная руда",
            rarity: RARITY.common,
            type: "resource",
            desc: "Ресурс. Используется в кузнечном ремесле.",
            mods: { resourceTag: "ore" },
          }),
      });
    } else if (loc.theme === "river") {
      m.drops.push({
        p: 0.16,
        item: () =>
          mkItem({
            id: "fish_oil",
            name: "Флакон рыбьего жира",
            rarity: RARITY.uncommon,
            type: "resource",
            desc: "Ресурс. Маслянистый компонент для зелий.",
            mods: { resourceTag: "oil" },
          }),
      });
    }
  }

  // Лабиринт всегда даёт базовую руду/детали поверх темы.
  if (isLabyrinth) {
    for (const m of table) {
      m.drops.push({
        p: 0.14,
        item: () =>
          mkItem({
            id: "ore_low",
            name: "Низкосортная руда",
            rarity: RARITY.common,
            type: "resource",
            desc: "Ресурс. Используется в кузнечном ремесле.",
            mods: { resourceTag: "ore" },
          }),
      });
      m.drops.push({
        p: 0.08,
        item: () =>
          mkItem({
            id: "parts",
            name: "Кузнечные детали",
            rarity: RARITY.uncommon,
            type: "resource",
            desc: "Ресурс. Шестерни/заклёпки/пружины.",
            mods: { resourceTag: "parts" },
          }),
      });
    }
  }

  return table;
}
