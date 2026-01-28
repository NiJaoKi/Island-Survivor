// Описания NPC и диалогов. Логика отображения/выбора находится в game.js.
import { QUESTS } from "./quests.js";

export const NPCS = [
  {
    id: "npc_guild_receptionist",
    name: "Регистратор гильдии",
    location: { kind: "town", area: "guild" },
    role: "guild",
    dialog: {
      start: {
        text:
          "Перед тобой стойка регистрации гильдии. За ней сидит уставший, но внимательный к игрокам человек.\n\n«Гильдия не выпускает на боссов тех, кто даже кабана не может добить. Покажи, что ты не очередной самоубийца.»",
        options: [
          { id: "ask_quests", text: "«Есть работа для новичка?»", next: "quests" },
          {
            id: "about_boss",
            text: "«Что скажешь про босса первого этажа?»",
            next: "about_boss",
          },
          { id: "leave", text: "Отойти от стойки", action: { type: "exitToTown" } },
        ],
      },
      quests: {
        text:
          "«Для начала — простая вылазка. Кабаны, волки, без геройства. Вернёшься живым — тогда можно говорить про рейды.»",
        options: [
          {
            id: "accept_first_hunt",
            text: "«Беру задание. Вернусь с добычей.»",
            action: { type: "acceptQuest", questId: "q_first_hunt" },
          },
          {
            id: "back",
            text: "«Подумаю ещё.»",
            next: "start",
          },
        ],
      },
      about_boss: {
        text:
          "«Илфанг — фильтр. Те, кто идут без подготовки, остаются там навсегда. Совет? Уровень 5+, навыки оружия не на нуле и запас зелий. А ещё — товарищи, которые не убегут при первом крике.»",
        options: [{ id: "back", text: "Кивнуть и вернуться к теме квестов", next: "start" }],
      },
    },
  },
  {
    id: "npc_crafter_apprentice",
    name: "Подмастерье ремесленника",
    location: { kind: "town", area: "resourceShop" },
    role: "craft",
    dialog: {
      start: {
        text:
          "Молодой парень в кожаном фартуке перебирает шкуры и куски металла.\n\n«Эх, если бы кто‑то притащил нормальные волчьи шкуры, а не этот хлам...»",
        options: [
          {
            id: "offer_help",
            text: "«Хочешь, добуду тебе приличные шкуры?»",
            action: { type: "acceptQuest", questId: "q_collect_pelts" },
          },
          {
            id: "ask_progress",
            text: "«Как продвигается ремесло?»",
            next: "about_craft",
          },
          { id: "leave", text: "Отойти от прилавка", action: { type: "exitToTown" } },
        ],
      },
      about_craft: {
        text:
          "«Мастер говорит, что из местной зверюги можно собрать что‑то приличное. Но без нормальных материалов — всё в утиль.»",
        options: [
          {
            id: "ask_ore_job",
            text: "«Нужна ли вам руда для гильдии?»",
            action: { type: "acceptQuest", questId: "q_ore_for_guild" },
          },
          { id: "back", text: "Вернуться к разговору", next: "start" },
        ],
      },
    },
  },
  {
    id: "npc_potion_alchemist",
    name: "Алхимик зелий",
    location: { kind: "town", area: "potionShop" },
    role: "alchemy",
    dialog: {
      start: {
        text:
          "За стойкой пахнет травами, спиртом и чем‑то обжигающим ноздри.\n\n«Зелья сами себя не варят. Нужны руки, голова и те, кто готовы лезть туда, куда я не пойду.»",
        options: [
          {
            id: "ask_job",
            text: "«Хочешь, принесу тебе что‑нибудь с болота?»",
            action: { type: "acceptQuest", questId: "q_bog_herbs" },
          },
          {
            id: "ask_tips",
            text: "«Есть советы по выживанию?»",
            next: "tips",
          },
          { id: "leave", text: "Кивнуть и вернуться к прилавку", action: { type: "exitToTown" } },
        ],
      },
      tips: {
        text:
          "«Не жадничай. Если чувствуешь, что начинаешь ошибаться — отступи в город, залейся зельями и иди снова. Туманное болото особенно любит тех, кто стоит на месте.»",
        options: [{ id: "back", text: "Вернуться к разговору", next: "start" }],
      },
    },
  },
  {
    id: "npc_rare_hunter",
    name: "Странный охотник",
    location: { kind: "field", area: "forest_deep" },
    role: "rare",
    rare: {
      areas: ["forest_deep", "labyrinth_outer", "labyrinth_mid"],
      baseChance: 0.07,
      onceFlag: "rare_hunter_seen",
    },
    dialog: {
      start: {
        text:
          "У обломка поваленного дерева стоит высокий силуэт в тёмном плаще. На спине — изношенный меч без опознавательных знаков.\n\n«Ты шумно ходишь. Для этого поля — сойдёт. Для Лабиринта — нет.»",
        options: [
          {
            id: "who_are_you",
            text: "«Кто ты такой? Игрок? NPC? Легенда?»",
            next: "who",
          },
          {
            id: "guild_invite",
            text: "«У меня есть гильдия. Присоединишься к нам?»",
            action: { type: "inviteToGuildNpc", questId: "q_rare_hunter_guild" },
          },
          {
            id: "be_rude",
            text: "«Если мешаешь — с дороги. Или я сам уберу.»",
            action: { type: "angerNpcOnce" },
          },
          {
            id: "leave",
            text: "Молча кивнуть и уйти",
            action: { type: "exitAfterRare" },
          },
        ],
      },
      who: {
        text:
          "«Имя не важно. Когда‑то я шёл в рейде. Потом — в одиночку. Потом — перестал считать этажи. Сейчас просто смотрю, кто выживет здесь.»",
        options: [
          {
            id: "back",
            text: "«Тогда просто запомню силуэт.»",
            next: "start",
          },
        ],
      },
    },
  },
];

export function getNpcById(id) {
  return NPCS.find((n) => n.id === id) || null;
}

export function getRareNpcForArea(areaId) {
  return (
    NPCS.find(
      (n) =>
        n.rare &&
        Array.isArray(n.rare.areas) &&
        n.rare.areas.includes(areaId)
    ) || null
  );
}

export function getQuestsForNpc(npcId) {
  return QUESTS.filter((q) => q.giverNpcId === npcId);
}

