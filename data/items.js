// Общие данные предметов и редкостей
export const RARITY = {
  common: { id: "common", name: "Обычный", color: "common" },
  uncommon: { id: "uncommon", name: "Необычный", color: "uncommon" },
  rare: { id: "rare", name: "Редкий", color: "rare" },
  legendary: { id: "legendary", name: "Легендарный", color: "legendary" },
  mythic: { id: "mythic", name: "Мифический", color: "mythic" },
};

// Какие типы предметов можно стакать.
function isStackableType(type) {
  return type === "trophy" || type === "resource" || type === "consumable";
}

export function mkItem({ id, name, rarity, type, desc, mods, reqStats, weaponId, condition, qty }) {
  const stackable = isStackableType(type);
  const safeQty = typeof qty === "number" && qty > 0 ? Math.floor(qty) : 1;
  return {
    id,
    name,
    rarity,
    type, // "consumable" | "trinket" | "trophy" | "resource" | "weapon"
    desc,
    mods: mods ?? {},
    // требования по характеристикам для экипировки (оружие и, возможно, другие предметы)
    reqStats: reqStats ?? null,
    // стиль / тип оружия, к которому относится предмет-оружие
    weaponId: weaponId ?? null,
    // состояние оружия (на будущее: normal/broken и т.д.)
    condition: condition ?? "normal",
    acquiredAt: Date.now(),
    // количество в стаке (для стакуемых типов)
    qty: stackable ? safeQty : 1,
  };
}

// Утилита, чтобы снаружи можно было проверить, можно ли предмет стакать.
export function isStackableItem(itOrType) {
  const type = typeof itOrType === "string" ? itOrType : itOrType?.type;
  if (!type) return false;
  return isStackableType(type);
}

// Магазин зелий (расходников)
export const SHOP_POTIONS = [
  {
    id: "p_bandage",
    name: "Чистые бинты",
    price: 120,
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
    id: "p_salve",
    name: "Травяная мазь",
    price: 160,
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
    id: "p_guard",
    name: "Тоник стойкости",
    price: 220,
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
];

// Магазин ресурсов
export const SHOP_RESOURCES = [
  {
    id: "r_ore",
    name: "Низкосортная руда",
    price: 90,
    item: () =>
      mkItem({
        id: "ore_low",
        name: "Низкосортная руда",
        rarity: RARITY.common,
        type: "resource",
        desc: "Ресурс. Используется в кузнечном ремесле.",
        mods: { resourceTag: "ore" },
      }),
  },
  {
    id: "r_ingot",
    name: "Железный слиток",
    price: 280,
    item: () =>
      mkItem({
        id: "ingot_iron",
        name: "Железный слиток",
        rarity: RARITY.uncommon,
        type: "resource",
        desc: "Ресурс. Слиток для ремесла.",
        mods: { resourceTag: "ingot" },
      }),
  },
  {
    id: "r_parts",
    name: "Кузнечные детали",
    price: 180,
    item: () =>
      mkItem({
        id: "parts",
        name: "Кузнечные детали",
        rarity: RARITY.uncommon,
        type: "resource",
        desc: "Ресурс. Шестерни/заклёпки/пружины.",
        mods: { resourceTag: "parts" },
      }),
  },
];

