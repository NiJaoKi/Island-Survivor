// Профессии: одна на персонажа, до 100 уровня.
// Логика прокачки (XP-кривая) и справочная информация.

export const PROFESSIONS = [
  {
    id: "blacksmith",
    name: "Кузнец",
    desc: "Перерабатывает руду и детали в снаряжение. Получает проф. опыт в бою и при работе с ресурсами.",
  },
  {
    id: "alchemy",
    name: "Алхимик",
    desc: "Занимается зельями и реагентами. Растёт от использования и создания расходников.",
  },
  {
    id: "hunting",
    name: "Охотник",
    desc: "Живёт боем и трофеями. Получает больше проф. опыта за победы над монстрами.",
  },
  {
    id: "mining",
    name: "Шахтёр",
    desc: "Добывает руду и минералы. Растёт за счёт ресурсов и походов в опасные локации.",
  },
  {
    id: "cooking",
    name: "Повар",
    desc: "Готовит еду и бафы. Получает проф. опыт за работу с провизией и зельями.",
  },
];

export function getProfessionById(id) {
  return PROFESSIONS.find((p) => p.id === id) || null;
}

// XP-кривая профессий:
// - до 50 — относительно мягкая;
// - 50–80 — ощутимый рост требований;
// - 80–99 — резко возрастающая цена уровня;
// - 100 — особый случай: уровень 100 доступен только при выполненном спец-условии,
//   сама функция тут просто возвращает очень большое значение.
export function professionXpToNext(level) {
  if (level >= 100) return Number.POSITIVE_INFINITY;
  const safeLevel = Math.max(1, level || 1);

  const base = 35 + safeLevel * 10 + Math.pow(safeLevel, 1.4) * 8;
  const midPenalty = safeLevel > 50 ? Math.pow(safeLevel - 50, 1.25) * 10 : 0;
  const latePenalty = safeLevel > 80 ? Math.pow(safeLevel - 80, 2) * 14 : 0;

  return Math.floor(base + midPenalty + latePenalty);
}

