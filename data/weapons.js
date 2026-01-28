// Конфиги оружия, техник и особых сетов
import { RARITY, mkItem } from "./items.js";

// Базовые стили оружия (выбор при создании персонажа).
// Используются для базовых статов и привязки техник.
export const WEAPONS = [
  {
    id: "rapier",
    name: "Рапира",
    desc: "Точность и темп. Криты и “проколы” брони.",
    base: { atk: 7, def: 3, hp: 46 },
  },
  {
    id: "sword",
    name: "Одноручный меч",
    desc: "Сбалансированный стиль. Стабильный урон и защита.",
    base: { atk: 6, def: 4, hp: 50 },
  },
  {
    id: "katana",
    name: "Катана",
    desc: "Рывки и мощные разовые удары. Высокий риск — высокая награда.",
    base: { atk: 8, def: 2, hp: 48 },
  },
  {
    id: "axe",
    name: "Топор",
    desc: "Тяжёлые удары. Хорош против брони, но медленнее.",
    base: { atk: 9, def: 2, hp: 52 },
  },
  {
    id: "spear",
    name: "Копьё",
    desc: "Контроль дистанции. Шанс контратаки и “стоп-удар”.",
    base: { atk: 7, def: 3, hp: 50 },
  },
  {
    id: "dagger",
    name: "Парные кинжалы",
    desc: "Серия быстрых атак. Сильнее по ослабленным целям.",
    base: { atk: 6, def: 2, hp: 44 },
  },
];

/** @type {Record<string, any[]>} */
export const TECHNIQUES = {
  rapier: [
    {
      id: "thrust",
      name: "Линейный выпад",
      reqSkill: 0,
      staminaCost: 0,
      desc: "Точный удар. Небольшой шанс пробить защиту.",
      kind: "attack",
    },
    {
      id: "pierce_line",
      name: "Серия проколов",
      reqSkill: 18,
      staminaCost: 0,
      desc: "2–3 быстрых удара. Частично игнорирует защиту.",
      kind: "attack",
    },
    {
      id: "needle_zero",
      name: "Нулевая игла",
      reqSkill: 45,
      staminaCost: 0,
      desc: "Высокий крит. Если крит — даёт дополнительный Колл.",
      kind: "attack",
    },
  ],
  sword: [
    {
      id: "slash",
      name: "Косой удар",
      reqSkill: 0,
      staminaCost: 0,
      desc: "Стабильный урон. Малый шанс нанести кровотечение.",
      kind: "attack",
    },
    {
      id: "guard_break",
      name: "Срыв стойки",
      reqSkill: 22,
      staminaCost: 0,
      desc: "Снижает защиту врага на 1–2 хода.",
      kind: "debuff",
    },
    {
      id: "parry",
      name: "Парирование",
      reqSkill: 40,
      staminaCost: 0,
      desc: "С шансом блокирует удар и даёт бесплатную контратаку.",
      kind: "defense",
    },
  ],
  katana: [
    {
      id: "draw_cut",
      name: "Иай-удар",
      reqSkill: 0,
      staminaCost: 0,
      desc: "Высокий базовый множитель урона. Но шанс промаха выше.",
      kind: "attack",
    },
    {
      id: "dash_cut",
      name: "Рывок-рассечение",
      reqSkill: 20,
      staminaCost: 0,
      desc: "Сильный удар. Если убивает цель — даёт доп. опыт.",
      kind: "attack",
    },
    {
      id: "moon_arc",
      name: "Лунная дуга",
      reqSkill: 50,
      staminaCost: 0,
      desc: "Критический стиль. Может нанести двойной крит.",
      kind: "attack",
    },
  ],
  axe: [
    {
      id: "cleave",
      name: "Рубка",
      reqSkill: 0,
      staminaCost: 0,
      desc: "Тяжёлый удар. Частично игнорирует защиту.",
      kind: "attack",
    },
    {
      id: "overhead",
      name: "Верхняя казнь",
      reqSkill: 24,
      staminaCost: 0,
      desc: "Шанс оглушить врага на 1 ход.",
      kind: "attack",
    },
    {
      id: "split_earth",
      name: "Раскол земли",
      reqSkill: 55,
      staminaCost: 0,
      desc: "Редкий мощный удар. Сильно растёт от навыка.",
      kind: "attack",
    },
  ],
  spear: [
    {
      id: "stop_thrust",
      name: "Стоп-удар",
      reqSkill: 0,
      staminaCost: 0,
      desc: "Урон + шанс снизить атаку врага на 1–2 хода.",
      kind: "attack",
    },
    {
      id: "counter_line",
      name: "Контрлиния",
      reqSkill: 20,
      staminaCost: 0,
      desc: "Шанс контратаки в конце хода врага.",
      kind: "defense",
    },
    {
      id: "lance_storm",
      name: "Шторм копья",
      reqSkill: 52,
      staminaCost: 0,
      desc: "2 удара. Второй сильнее, если враг ослаблен.",
      kind: "attack",
    },
  ],
  dagger: [
    {
      id: "double_cut",
      name: "Двойной рез",
      reqSkill: 0,
      staminaCost: 0,
      desc: "2 быстрых удара. Шанс отравить.",
      kind: "attack",
    },
    {
      id: "shadow_step",
      name: "Шаг тени",
      reqSkill: 18,
      staminaCost: 0,
      desc: "Повышает уклонение на 2 хода, следующий удар сильнее.",
      kind: "buff",
    },
    {
      id: "heart_pin",
      name: "Укол в сердце",
      reqSkill: 48,
      staminaCost: 0,
      desc: "Очень высокий крит по отравленным/кровоточащим.",
      kind: "attack",
    },
  ],
};

// Каталог оружия для магазина.
// Магазин продаёт оружие всех стилей, но экипировать его можно
// только при выполнении требований по характеристикам.
export function shopCatalogWeapon() {
  /** @type {{ id: string; name: string; price: number; item: () => any; }[]} */
  const catalog = [];

  for (const w of WEAPONS) {
    const wid = w.id;
    const nm = w.name;

    // Базовый вариант (I): доступен довольно рано.
    catalog.push({
      id: `w_${wid}_i`,
      name: `Оружие: ${nm} (I)`,
      price: 2_500,
      item: () =>
        mkItem({
          id: `weapon_${wid}_I`,
          name: `${nm} (I)`,
          rarity: RARITY.uncommon,
          type: "weapon",
          weaponId: wid,
          desc: `${nm}. +2 АТК. Требует базовые характеристики для стиля.`,
          mods: { atk: 2 },
          reqStats:
            wid === "rapier"
              ? { str: 6, agi: 7 }
              : wid === "sword"
              ? { str: 7, vit: 6 }
              : wid === "katana"
              ? { str: 8, agi: 7 }
              : wid === "axe"
              ? { str: 9, end: 6 }
              : wid === "spear"
              ? { str: 7, end: 7 }
              : /* dagger */ { agi: 7, luck: 6 },
        }),
    });

    // Улучшенный вариант (II): требует больше характеристик.
    catalog.push({
      id: `w_${wid}_ii`,
      name: `Оружие: ${nm} (II)`,
      price: 12_000,
      item: () =>
        mkItem({
          id: `weapon_${wid}_II`,
          name: `${nm} (II)`,
          rarity: RARITY.rare,
          type: "weapon",
          weaponId: wid,
          desc: `${nm}. +4 АТК, +0,01 крит. Требует повышенных характеристик.`,
          mods: { atk: 4, crit: 0.01 },
          reqStats:
            wid === "rapier"
              ? { str: 9, agi: 11 }
              : wid === "sword"
              ? { str: 10, vit: 9 }
              : wid === "katana"
              ? { str: 11, agi: 11 }
              : wid === "axe"
              ? { str: 13, end: 9 }
              : wid === "spear"
              ? { str: 10, end: 11 }
              : /* dagger */ { agi: 11, luck: 9 },
        }),
    });

    // Мастерский вариант (III): серьёзные требования.
    catalog.push({
      id: `w_${wid}_iii`,
      name: `Оружие: ${nm} (III)`,
      price: 60_000,
      item: () =>
        mkItem({
          id: `weapon_${wid}_III`,
          name: `${nm} (III)`,
          rarity: RARITY.legendary,
          type: "weapon",
          weaponId: wid,
          desc: `${nm}. +7 АТК, +0,02 крит. Требует высоких характеристик.`,
          mods: { atk: 7, crit: 0.02 },
          reqStats:
            wid === "rapier"
              ? { str: 13, agi: 16 }
              : wid === "sword"
              ? { str: 15, vit: 14 }
              : wid === "katana"
              ? { str: 16, agi: 16 }
              : wid === "axe"
              ? { str: 18, end: 14 }
              : wid === "spear"
              ? { str: 15, end: 16 }
              : /* dagger */ { agi: 16, luck: 14 },
        }),
    });
  }

  return catalog;
}

// --- НЕИЗВЕСТНЫЕ наборы оружия 1/5 и редкий лут ---

/**
 * Описание уникальных наборов, собираемых из частей "НЕИЗВЕСТНОЕ N/5".
 * По MVP: по одному набору на каждый стиль оружия.
 */
export const UNKNOWN_WEAPON_SETS = [
  {
    id: "unk_rapier_proto",
    weaponId: "rapier",
    name: "Прототип рапиры",
    parts: 5,
    reward: () =>
      mkItem({
        id: "unk_rapier_proto",
        name: "Прототип рапиры",
        rarity: RARITY.legendary,
        type: "weapon",
        weaponId: "rapier",
        desc: "Особая рапира, собранная из неизвестных деталей. +5 АТК, +0,02 крит.",
        mods: { atk: 5, crit: 0.02 },
        reqStats: { str: 12, agi: 14 },
      }),
  },
  {
    id: "unk_sword_relic",
    weaponId: "sword",
    name: "Реликтовый меч",
    parts: 5,
    reward: () =>
      mkItem({
        id: "unk_sword_relic",
        name: "Реликтовый меч",
        rarity: RARITY.legendary,
        type: "weapon",
        weaponId: "sword",
        desc: "Старый, но идеально сбалансированный меч. +4 АТК, +2 ЗАЩ.",
        mods: { atk: 4, def: 2 },
        reqStats: { str: 14, vit: 13 },
      }),
  },
  {
    id: "unk_katana_shadow",
    weaponId: "katana",
    name: "Теневая катана",
    parts: 5,
    reward: () =>
      mkItem({
        id: "unk_katana_shadow",
        name: "Теневая катана",
        rarity: RARITY.mythic,
        type: "weapon",
        weaponId: "katana",
        desc: "Катана, будто вышедшая из чужой системы. +6 АТК, +0,03 крит.",
        mods: { atk: 6, crit: 0.03 },
        reqStats: { str: 16, agi: 16 },
      }),
  },
  {
    id: "unk_axe_fragmented",
    weaponId: "axe",
    name: "Фрагментированный топор",
    parts: 5,
    reward: () =>
      mkItem({
        id: "unk_axe_fragmented",
        name: "Фрагментированный топор",
        rarity: RARITY.legendary,
        type: "weapon",
        weaponId: "axe",
        desc: "Топор с аномальной массой. +7 АТК, -1 ЗАЩ.",
        mods: { atk: 7, def: -1 },
        reqStats: { str: 18, end: 15 },
      }),
  },
  {
    id: "unk_spear_ceremonial",
    weaponId: "spear",
    name: "Церемониальное копьё",
    parts: 5,
    reward: () =>
      mkItem({
        id: "unk_spear_ceremonial",
        name: "Церемониальное копьё",
        rarity: RARITY.legendary,
        type: "weapon",
        weaponId: "spear",
        desc: "Копьё с идеально выверенным балансом. +4 АТК, +1 ЗАЩ, +0,01 крит.",
        mods: { atk: 4, def: 1, crit: 0.01 },
        reqStats: { str: 14, end: 14 },
      }),
  },
  {
    id: "unk_dagger_glitch",
    weaponId: "dagger",
    name: "Глитч-кинжалы",
    parts: 5,
    reward: () =>
      mkItem({
        id: "unk_dagger_glitch",
        name: "Глитч-кинжалы",
        rarity: RARITY.mythic,
        type: "weapon",
        weaponId: "dagger",
        desc: "Парные кинжалы с рваной анимацией. +4 АТК, +0,04 крит.",
        mods: { atk: 4, crit: 0.04 },
        reqStats: { agi: 17, luck: 15 },
      }),
  },
];

/**
 * Выбор случайного стиля оружия под мирный дроп.
 */
function pickWorldDropWeaponId() {
  const pool = WEAPONS;
  const w = pool[Math.floor(Math.random() * pool.length)];
  return w.id;
}

/**
 * Генерация найденного в мире оружия (нормального или поломанного).
 * Возвращает готовый mkItem-предмет.
 *
 * context: { level: number; isElite?: boolean; isBoss?: boolean; floor?: number }
 */
export function randomWorldWeaponDrop(context) {
  const wid = pickWorldDropWeaponId();
  const base = WEAPONS.find((w) => w.id === wid);
  const lvl = Math.max(1, Math.floor(context?.level ?? 1));
  const isElite = !!context?.isElite;

  // Примерная "ступень" силы по уровню.
  const tier = lvl >= 10 ? 3 : lvl >= 5 ? 2 : 1;

  // Поломанное оружие встречается часто среди таких находок.
  const brokenChanceBase = tier === 1 ? 0.45 : tier === 2 ? 0.35 : 0.3;
  const brokenChance = isElite ? brokenChanceBase - 0.1 : brokenChanceBase;
  const isBroken = Math.random() < brokenChance;

  const rarity =
    tier === 1 ? RARITY.uncommon : tier === 2 ? RARITY.rare : RARITY.legendary;

  const nameSuffix = isBroken ? "(поломанное)" : "(найденное)";
  const idTier = tier === 1 ? "I" : tier === 2 ? "II" : "III";

  // Мягкие модификаторы по сравнению с магазином, но с акцентом на "лотерейность".
  const baseAtk =
    (base?.base.atk ?? 6) +
    (tier === 1 ? 2 : tier === 2 ? 4 : 6) +
    (isElite ? 1 : 0);
  const baseDef = (base?.base.def ?? 2) + (tier >= 2 ? 1 : 0);
  const critBonus = tier >= 2 ? (tier === 2 ? 0.01 : 0.02) : 0;

  const normalDesc =
    `${base?.name ?? "Оружие"} из редкого дропа. Усилено под реальные бои.`;
  const brokenDesc =
    `${base?.name ?? "Оружие"} в тяжёлом состоянии. Сейчас пригодно только для продажи или будущего ремонта.`;

  return mkItem({
    id: `world_${wid}_${idTier}`,
    name: `${base?.name ?? "Оружие"} ${nameSuffix}`,
    rarity,
    type: "weapon",
    weaponId: wid,
    desc: isBroken ? brokenDesc : normalDesc,
    mods: isBroken
      ? { atk: Math.max(1, Math.floor(baseAtk * 0.4)), def: 0 }
      : { atk: baseAtk, def: baseDef, crit: critBonus },
    reqStats:
      wid === "rapier"
        ? { str: 6 + tier * 3, agi: 7 + tier * 4 }
        : wid === "sword"
        ? { str: 7 + tier * 3, vit: 6 + tier * 3 }
        : wid === "katana"
        ? { str: 8 + tier * 3, agi: 7 + tier * 4 }
        : wid === "axe"
        ? { str: 9 + tier * 4, end: 6 + tier * 3 }
        : wid === "spear"
        ? { str: 7 + tier * 3, end: 7 + tier * 3 }
        : /* dagger */ { agi: 7 + tier * 4, luck: 6 + tier * 3 },
    condition: isBroken ? "broken" : "normal",
  });
}

/**
 * Случайная часть неизвестного набора под контекст боя.
 * Возвращает mkItem с type: "unknown_part" (нестакуемый).
 */
export function randomUnknownPart(context) {
  const sets = UNKNOWN_WEAPON_SETS;
  if (!sets.length) return null;
  const set = sets[Math.floor(Math.random() * sets.length)];
  const total = set.parts || 5;
  const partIndex = 1 + Math.floor(Math.random() * total);

  const label = `НЕИЗВЕСТНОЕ ${partIndex}/${total}`;

  return mkItem({
    id: `unk_${set.id}_p${partIndex}`,
    name: label,
    rarity: total >= 5 ? RARITY.legendary : RARITY.rare,
    type: "unknown_part",
    desc: `Таинственная деталь какого-то оружия (${partIndex}/${total}). Если собрать все части, можно получить особое оружие.`,
    mods: {
      unknownSetId: set.id,
      partIndex,
      partTotal: total,
      relatedWeaponId: set.weaponId,
    },
  });
}

/**
 * Награда за полный набор неизвестных частей.
 */
export function makeUnknownSetReward(setId) {
  const set = UNKNOWN_WEAPON_SETS.find((s) => s.id === setId);
  if (!set) return null;
  return set.reward();
}


