// Навыки оружия: активные и пассивные.
// Здесь лежит “пакет” из ~100 навыков, распределённых по стилям оружия.
// Логика эффектов для большинства активных навыков наследуется от базовых техник
// через поле `variantOf`, чтобы не раздувать боевую формулу.

/** @typedef {"rapier" | "sword" | "katana" | "axe" | "spear" | "dagger"} WeaponId */

/**
 * @typedef {Object} ActiveSkill
 * @property {string} id               - уникальный id навыка
 * @property {string} name             - название
 * @property {WeaponId} weaponId       - стиль оружия
 * @property {number} reqWeaponSkill   - требуемый навык оружия
 * @property {number} cooldown         - КД (в ходах)
 * @property {string} desc             - описание
 * @property {string} kind             - "attack" | "buff" | "debuff" | "defense"
 * @property {string} [variantOf]      - id базовой техники, чью формулу переиспользуем
 */

/**
 * @typedef {Object} PassiveSkill
 * @property {string} id
 * @property {string} name
 * @property {WeaponId} weaponId
 * @property {number} reqWeaponSkill
 * @property {string} desc
 * @property {{ hp?: number; atk?: number; def?: number; crit?: number; hit?: number; evade?: number; moneyMult?: number }} mods
 */

/** @type {ActiveSkill[]} */
export const ACTIVE_SKILLS = [
  // --- Рапира: базовые техники (ядро) ---
  {
    id: "thrust",
    name: "Линейный выпад",
    weaponId: "rapier",
    reqWeaponSkill: 0,
    cooldown: 1,
    desc: "Точный удар. Небольшой шанс пробить защиту.",
    kind: "attack",
  },
  {
    id: "pierce_line",
    name: "Серия проколов",
    weaponId: "rapier",
    reqWeaponSkill: 18,
    cooldown: 2,
    desc: "2–3 быстрых удара. Частично игнорирует защиту.",
    kind: "attack",
  },
  {
    id: "needle_zero",
    name: "Нулевая игла",
    weaponId: "rapier",
    reqWeaponSkill: 45,
    cooldown: 3,
    desc: "Высокий крит. Если крит — даёт дополнительный Колл.",
    kind: "attack",
  },

  // --- Рапира: дополнительные ветки (варианты базовых техник) ---
  {
    id: "thrust_precise",
    name: "Точный выпад",
    weaponId: "rapier",
    reqWeaponSkill: 10,
    cooldown: 1,
    desc: "Чуть сильнее обычного выпада. Наследует поведение «Линейного выпада».",
    kind: "attack",
    variantOf: "thrust",
  },
  {
    id: "thrust_flurry",
    name: "Выпад шквалом",
    weaponId: "rapier",
    reqWeaponSkill: 26,
    cooldown: 2,
    desc: "Агрессивная серия выпадов. Поведение как «Серия проколов».",
    kind: "attack",
    variantOf: "pierce_line",
  },
  {
    id: "needle_chain",
    name: "Цепочка игл",
    weaponId: "rapier",
    reqWeaponSkill: 60,
    cooldown: 3,
    desc: "Усиленный критический выпад. Ведёт себя как «Нулевая игла».",
    kind: "attack",
    variantOf: "needle_zero",
  },
  {
    id: "thrust_finisher",
    name: "Финишный выпад",
    weaponId: "rapier",
    reqWeaponSkill: 32,
    cooldown: 2,
    desc: "Заканчивает ослабленных врагов. Ведёт себя как «Линейный выпад».",
    kind: "attack",
    variantOf: "thrust",
  },
  {
    id: "line_stab",
    name: "Линейный прокол",
    weaponId: "rapier",
    reqWeaponSkill: 38,
    cooldown: 2,
    desc: "Глубокий прокол брони. Поведение как «Серия проколов».",
    kind: "attack",
    variantOf: "pierce_line",
  },

  // --- Меч: базовые техники ---
  {
    id: "slash",
    name: "Косой удар",
    weaponId: "sword",
    reqWeaponSkill: 0,
    cooldown: 1,
    desc: "Стабильный урон. Малый шанс нанести кровотечение.",
    kind: "attack",
  },
  {
    id: "guard_break",
    name: "Срыв стойки",
    weaponId: "sword",
    reqWeaponSkill: 22,
    cooldown: 2,
    desc: "Снижает защиту врага на 1–2 хода.",
    kind: "debuff",
  },
  {
    id: "parry",
    name: "Парирование",
    weaponId: "sword",
    reqWeaponSkill: 40,
    cooldown: 3,
    desc: "С шансом блокирует удар и даёт контратаку.",
    kind: "defense",
  },

  // Меч: дополнительные активки (варианты)
  {
    id: "double_slash",
    name: "Двойной разрез",
    weaponId: "sword",
    reqWeaponSkill: 12,
    cooldown: 1,
    desc: "Два быстрых удара. Как «Косой удар», но агрессивнее.",
    kind: "attack",
    variantOf: "slash",
  },
  {
    id: "heavy_guard_break",
    name: "Тяжёлый срыв стойки",
    weaponId: "sword",
    reqWeaponSkill: 32,
    cooldown: 3,
    desc: "Усиленный дебафф защиты. Поведение как «Срыв стойки».",
    kind: "debuff",
    variantOf: "guard_break",
  },
  {
    id: "perfect_parry",
    name: "Идеальное парирование",
    weaponId: "sword",
    reqWeaponSkill: 52,
    cooldown: 3,
    desc: "Продвинутое парирование. Поведение как «Парирование».",
    kind: "defense",
    variantOf: "parry",
  },

  // --- Катана: базовые техники ---
  {
    id: "draw_cut",
    name: "Иай-удар",
    weaponId: "katana",
    reqWeaponSkill: 0,
    cooldown: 1,
    desc: "Высокий множитель урона. Шанс промаха выше.",
    kind: "attack",
  },
  {
    id: "dash_cut",
    name: "Рывок-рассечение",
    weaponId: "katana",
    reqWeaponSkill: 20,
    cooldown: 2,
    desc: "Сильный удар. Если убивает цель — даёт доп. опыт.",
    kind: "attack",
  },
  {
    id: "moon_arc",
    name: "Лунная дуга",
    weaponId: "katana",
    reqWeaponSkill: 50,
    cooldown: 3,
    desc: "Критический стиль. Может нанести двойной крит.",
    kind: "attack",
  },

  // Катана: варианты
  {
    id: "draw_cut_fast",
    name: "Быстрый иай",
    weaponId: "katana",
    reqWeaponSkill: 10,
    cooldown: 1,
    desc: "Облегчённый иай-удар. Наследует поведение «Иай-удар».",
    kind: "attack",
    variantOf: "draw_cut",
  },
  {
    id: "dash_finisher",
    name: "Финишный рывок",
    weaponId: "katana",
    reqWeaponSkill: 34,
    cooldown: 2,
    desc: "Атакует ослабленных врагов. Как «Рывок-рассечение».",
    kind: "attack",
    variantOf: "dash_cut",
  },
  {
    id: "moon_crescent",
    name: "Полумесяц",
    weaponId: "katana",
    reqWeaponSkill: 62,
    cooldown: 3,
    desc: "Усиленная версия «Лунной дуги».",
    kind: "attack",
    variantOf: "moon_arc",
  },

  // --- Топор: базовые техники ---
  {
    id: "cleave",
    name: "Рубка",
    weaponId: "axe",
    reqWeaponSkill: 0,
    cooldown: 1,
    desc: "Тяжёлый удар. Частично игнорирует защиту.",
    kind: "attack",
  },
  {
    id: "overhead",
    name: "Верхняя казнь",
    weaponId: "axe",
    reqWeaponSkill: 24,
    cooldown: 2,
    desc: "Шанс оглушить врага на 1 ход.",
    kind: "attack",
  },
  {
    id: "split_earth",
    name: "Раскол земли",
    weaponId: "axe",
    reqWeaponSkill: 55,
    cooldown: 3,
    desc: "Редкий мощный удар. Сильно растёт от навыка.",
    kind: "attack",
  },

  // Топор: варианты
  {
    id: "wide_cleave",
    name: "Широкая рубка",
    weaponId: "axe",
    reqWeaponSkill: 14,
    cooldown: 1,
    desc: "Более широкий замах. Поведение как «Рубка».",
    kind: "attack",
    variantOf: "cleave",
  },
  {
    id: "skull_crush",
    name: "Дробитель черепов",
    weaponId: "axe",
    reqWeaponSkill: 34,
    cooldown: 2,
    desc: "Усиленная версия «Верхней казни».",
    kind: "attack",
    variantOf: "overhead",
  },
  {
    id: "earth_shatter",
    name: "Сломанный плацдарм",
    weaponId: "axe",
    reqWeaponSkill: 68,
    cooldown: 3,
    desc: "Ещё более тяжёлый удар. Поведение как «Раскол земли».",
    kind: "attack",
    variantOf: "split_earth",
  },

  // --- Копьё: базовые техники ---
  {
    id: "stop_thrust",
    name: "Стоп-удар",
    weaponId: "spear",
    reqWeaponSkill: 0,
    cooldown: 1,
    desc: "Урон + шанс снизить атаку врага на 1–2 хода.",
    kind: "attack",
  },
  {
    id: "counter_line",
    name: "Контрлиния",
    weaponId: "spear",
    reqWeaponSkill: 20,
    cooldown: 2,
    desc: "Шанс контратаки в конце хода врага.",
    kind: "defense",
  },
  {
    id: "lance_storm",
    name: "Шторм копья",
    weaponId: "spear",
    reqWeaponSkill: 52,
    cooldown: 3,
    desc: "2 удара. Второй сильнее, если враг ослаблен.",
    kind: "attack",
  },

  // Копьё: варианты
  {
    id: "stop_wall",
    name: "Стена копья",
    weaponId: "spear",
    reqWeaponSkill: 14,
    cooldown: 1,
    desc: "Усиленный «Стоп-удар».",
    kind: "attack",
    variantOf: "stop_thrust",
  },
  {
    id: "counter_drive",
    name: "Ответный выпад",
    weaponId: "spear",
    reqWeaponSkill: 32,
    cooldown: 2,
    desc: "Продвинутая «Контрлиния».",
    kind: "defense",
    variantOf: "counter_line",
  },
  {
    id: "storm_spear_rush",
    name: "Штормовой рывок",
    weaponId: "spear",
    reqWeaponSkill: 64,
    cooldown: 3,
    desc: "Мощная серия, как «Шторм копья».",
    kind: "attack",
    variantOf: "lance_storm",
  },

  // --- Кинжалы: базовые техники ---
  {
    id: "double_cut",
    name: "Двойной рез",
    weaponId: "dagger",
    reqWeaponSkill: 0,
    cooldown: 1,
    desc: "2 быстрых удара. Шанс отравить.",
    kind: "attack",
  },
  {
    id: "shadow_step",
    name: "Шаг тени",
    weaponId: "dagger",
    reqWeaponSkill: 18,
    cooldown: 2,
    desc: "Повышает уклонение на 2 хода, следующий удар сильнее.",
    kind: "buff",
  },
  {
    id: "heart_pin",
    name: "Укол в сердце",
    weaponId: "dagger",
    reqWeaponSkill: 48,
    cooldown: 3,
    desc: "Очень высокий крит по отравленным/кровоточащим врагам.",
    kind: "attack",
  },

  // Кинжалы: варианты
  {
    id: "triple_cut",
    name: "Тройной рез",
    weaponId: "dagger",
    reqWeaponSkill: 14,
    cooldown: 2,
    desc: "Серия ударов, как «Двойной рез».",
    kind: "attack",
    variantOf: "double_cut",
  },
  {
    id: "shadow_dance",
    name: "Танец тени",
    weaponId: "dagger",
    reqWeaponSkill: 30,
    cooldown: 2,
    desc: "Усиленная мобильность. Поведение как «Шаг тени».",
    kind: "buff",
    variantOf: "shadow_step",
  },
  {
    id: "heart_breaker",
    name: "Разбиватель сердца",
    weaponId: "dagger",
    reqWeaponSkill: 62,
    cooldown: 3,
    desc: "Финишер по ослабленным целям. Поведение как «Укол в сердце».",
    kind: "attack",
    variantOf: "heart_pin",
  },
];

// Пассивы: всегда активны, если навык оружия для данного стиля >= reqWeaponSkill.
/** @type {PassiveSkill[]} */
export const PASSIVE_SKILLS = [
  // Рапира
  {
    id: "rapier_accuracy_i",
    name: "Тренировка точности I",
    weaponId: "rapier",
    reqWeaponSkill: 8,
    desc: "+1 к АТК, +1% к точности.",
    mods: { atk: 1, hit: 0.01 },
  },
  {
    id: "rapier_accuracy_ii",
    name: "Тренировка точности II",
    weaponId: "rapier",
    reqWeaponSkill: 24,
    desc: "+2 к АТК, +1% к криту.",
    mods: { atk: 2, crit: 0.01 },
  },
  {
    id: "rapier_duelist",
    name: "Дуэлянт",
    weaponId: "rapier",
    reqWeaponSkill: 42,
    desc: "+2 к АТК, +1 к ЗАЩ.",
    mods: { atk: 2, def: 1 },
  },
  {
    id: "rapier_finisher",
    name: "Финишер",
    weaponId: "rapier",
    reqWeaponSkill: 60,
    desc: "+2% к криту.",
    mods: { crit: 0.02 },
  },

  // Меч
  {
    id: "sword_guard_i",
    name: "Базовая стойка I",
    weaponId: "sword",
    reqWeaponSkill: 8,
    desc: "+1 к ЗАЩ.",
    mods: { def: 1 },
  },
  {
    id: "sword_guard_ii",
    name: "Базовая стойка II",
    weaponId: "sword",
    reqWeaponSkill: 24,
    desc: "+2 к ЗАЩ.",
    mods: { def: 2 },
  },
  {
    id: "sword_veteran",
    name: "Ветеран меча",
    weaponId: "sword",
    reqWeaponSkill: 40,
    desc: "+2 к АТК, +1 к ЗАЩ.",
    mods: { atk: 2, def: 1 },
  },
  {
    id: "sword_leader",
    name: "Лидер группы",
    weaponId: "sword",
    reqWeaponSkill: 58,
    desc: "+1 к АТК, +1 к ЗАЩ, +3% к Коллам.",
    mods: { atk: 1, def: 1, moneyMult: 0.03 },
  },

  // Катана
  {
    id: "katana_focus_i",
    name: "Фокусировка I",
    weaponId: "katana",
    reqWeaponSkill: 8,
    desc: "+1 к АТК.",
    mods: { atk: 1 },
  },
  {
    id: "katana_focus_ii",
    name: "Фокусировка II",
    weaponId: "katana",
    reqWeaponSkill: 26,
    desc: "+1 к АТК, +1% к криту.",
    mods: { atk: 1, crit: 0.01 },
  },
  {
    id: "katana_moon_style",
    name: "Лунный стиль",
    weaponId: "katana",
    reqWeaponSkill: 44,
    desc: "+2% к криту.",
    mods: { crit: 0.02 },
  },
  {
    id: "katana_blood_edge",
    name: "Кровавый клинок",
    weaponId: "katana",
    reqWeaponSkill: 62,
    desc: "+2 к АТК, -1 к ЗАЩ.",
    mods: { atk: 2, def: -1 },
  },

  // Топор
  {
    id: "axe_training_i",
    name: "Тяжёлый замах I",
    weaponId: "axe",
    reqWeaponSkill: 8,
    desc: "+2 к АТК, -1 к уклонению.",
    mods: { atk: 2, evade: -0.01 },
  },
  {
    id: "axe_training_ii",
    name: "Тяжёлый замах II",
    weaponId: "axe",
    reqWeaponSkill: 24,
    desc: "+3 к АТК.",
    mods: { atk: 3 },
  },
  {
    id: "axe_breaker",
    name: "Крушитель брони",
    weaponId: "axe",
    reqWeaponSkill: 44,
    desc: "+1 к АТК, +1 к ЗАЩ.",
    mods: { atk: 1, def: 1 },
  },
  {
    id: "axe_berserker",
    name: "Берсерк",
    weaponId: "axe",
    reqWeaponSkill: 64,
    desc: "+3 к АТК, -1 к ЗАЩ.",
    mods: { atk: 3, def: -1 },
  },

  // Копьё
  {
    id: "spear_wall_i",
    name: "Стена копий I",
    weaponId: "spear",
    reqWeaponSkill: 8,
    desc: "+1 к ЗАЩ.",
    mods: { def: 1 },
  },
  {
    id: "spear_wall_ii",
    name: "Стена копий II",
    weaponId: "spear",
    reqWeaponSkill: 22,
    desc: "+1 к ЗАЩ, +1% к уклонению.",
    mods: { def: 1, evade: 0.01 },
  },
  {
    id: "spear_sentinel",
    name: "Часовой",
    weaponId: "spear",
    reqWeaponSkill: 40,
    desc: "+1 к АТК, +1 к ЗАЩ.",
    mods: { atk: 1, def: 1 },
  },
  {
    id: "spear_lancer",
    name: "Лансер",
    weaponId: "spear",
    reqWeaponSkill: 60,
    desc: "+2 к АТК.",
    mods: { atk: 2 },
  },

  // Кинжалы
  {
    id: "dagger_tricks_i",
    name: "Грязные трюки I",
    weaponId: "dagger",
    reqWeaponSkill: 8,
    desc: "+1% к уклонению.",
    mods: { evade: 0.01 },
  },
  {
    id: "dagger_tricks_ii",
    name: "Грязные трюки II",
    weaponId: "dagger",
    reqWeaponSkill: 24,
    desc: "+1 к АТК, +1% к уклонению.",
    mods: { atk: 1, evade: 0.01 },
  },
  {
    id: "dagger_assassin",
    name: "Ассасин",
    weaponId: "dagger",
    reqWeaponSkill: 42,
    desc: "+2% к криту.",
    mods: { crit: 0.02 },
  },
  {
    id: "dagger_shadow_master",
    name: "Повелитель теней",
    weaponId: "dagger",
    reqWeaponSkill: 60,
    desc: "+1 к АТК, +2% к уклонению.",
    mods: { atk: 1, evade: 0.02 },
  },
];

// --- Утилиты ---

/** @param {WeaponId} weaponId */
export function getActiveSkillsForWeapon(weaponId) {
  return ACTIVE_SKILLS.filter((s) => s.weaponId === weaponId);
}

/** @param {WeaponId} weaponId */
export function getPassiveSkillsForWeapon(weaponId) {
  return PASSIVE_SKILLS.filter((s) => s.weaponId === weaponId);
}

