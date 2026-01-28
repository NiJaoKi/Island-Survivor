import {
  WEAPONS,
  TECHNIQUES,
  shopCatalogWeapon,
  randomWorldWeaponDrop,
  randomUnknownPart,
  makeUnknownSetReward,
} from "./data/weapons.js";
import {
  RARITY,
  mkItem,
  SHOP_POTIONS,
  SHOP_RESOURCES,
  isStackableItem,
} from "./data/items.js";
import {
  mobTableForLevel,
  floor1MobTable,
  FLOOR1_LOCATIONS,
  getFloor1Location,
} from "./data/locations.js";
import {
  ACTIVE_SKILLS,
  PASSIVE_SKILLS,
  getActiveSkillsForWeapon,
  getPassiveSkillsForWeapon,
} from "./data/skills.js";
import { QUESTS, getQuestById } from "./data/quests.js";
import { NPCS, getNpcById, getRareNpcForArea, getQuestsForNpc } from "./data/npcs.js";
import { PROFESSIONS, getProfessionById, professionXpToNext } from "./data/professions.js";

/* Island Survivor — текстовая браузерная RPG
   - Выбор оружия (без классов/магии)
   - Прокачка навыка оружия + техники
   - Бои с мобами, опыт, Коллы, лут
   - Редкие предметы с микрошансом
   - Перманентная смерть: персонаж удаляется полностью
*/

(() => {
  "use strict";

  const SAVE_VERSION = 2;
  const STORAGE_KEYS = ["islandSurvivor.save.v2", "islandSurvivor.save.v1"];
  const PRIMARY_STORAGE_KEY = STORAGE_KEYS[0];

  /** @type {HTMLElement} */
  const $scene = document.getElementById("scene");
  /** @type {HTMLElement} */
  const $actions = document.getElementById("actions");

  const $ui = {
    saveBadge: document.getElementById("saveBadge"),
    name: document.getElementById("uiName"),
    gender: document.getElementById("uiGender"),
    weapon: document.getElementById("uiWeapon"),
    level: document.getElementById("uiLevel"),
    xp: document.getElementById("uiXp"),
    hp: document.getElementById("uiHp"),
    atk: document.getElementById("uiAtk"),
    def: document.getElementById("uiDef"),
    money: document.getElementById("uiMoney"),
    info: document.getElementById("uiInfo"),
    sxFree: document.getElementById("uiSxFree"),
    profession: document.getElementById("uiProfession"),
    professionLevel: document.getElementById("uiProfessionLevel"),
    weaponSkill: document.getElementById("uiWeaponSkill"),
    techs: document.getElementById("uiTechs"),
    invCount: document.getElementById("uiInvCount"),
    inventory: document.getElementById("uiInventory"),
    onlineCount: document.getElementById("uiOnlineCount"),
    onlineList: document.getElementById("uiOnlineList"),
    chatLog: document.getElementById("uiChatLog"),
    chatInput: document.getElementById("uiChatInput"),
    chatSend: document.getElementById("uiChatSend"),
  };

  // --- Простейший сетевой слой (WebSocket) ---
  const net = {
    socket: null,
    connected: false,
    playerId: null,
    online: [],
    social: {
      guild: null,
      friends: [],
      party: null,
      spouse: null,
    },
    chat: {
      messages: [],
    },
  };

  function updateOnlineUI() {
    if (!$ui.onlineCount || !$ui.onlineList) return;
    if (!net.connected) {
      $ui.onlineCount.textContent = "0";
      $ui.onlineList.textContent = "Оффлайн режим. Запусти сервер.";
      return;
    }
    const players = net.online || [];
    $ui.onlineCount.textContent = String(players.length);
    if (!players.length) {
      $ui.onlineList.textContent = "Никого нет в сети.";
      return;
    }
    const me = net.playerId;
    $ui.onlineList.innerHTML = players
      .map((p) => {
        const self = p.id === me;
        const gender = p.gender === "male" ? "М" : p.gender === "female" ? "Ж" : "?";
        return `<span class="mono">${p.id}</span>: ${p.name} (${gender})${self ? " — это ты" : ""}`;
      })
      .join("<br>");
  }

  function updateChatConnectionState() {
    if (!$ui.chatLog) return;
    if (!net.connected) {
      $ui.chatLog.innerHTML =
        "Оффлайн режим. Запусти сервер, чтобы общаться с другими игроками.";
      return;
    }
    if (!net.chat.messages.length) {
      $ui.chatLog.innerHTML = "Онлайн-чат подключен. Напиши первое сообщение.";
    }
  }

  function appendChatMessage(entry) {
    if (!$ui.chatLog) return;
    net.chat.messages.push(entry);
    if (net.chat.messages.length > 80) {
      net.chat.messages = net.chat.messages.slice(-80);
    }
    const lines = net.chat.messages.map((m) => {
      const id = m.fromId ? escapeHtml(m.fromId) : "?";
      const name = m.fromName ? escapeHtml(m.fromName) : "Игрок";
      const text = escapeHtml(m.text);
      const lvl = typeof m.level === "number" ? ` [${m.level}]` : "";
      return `<span class="mono">${id}${lvl}</span> ${name}: ${text}`;
    });
    $ui.chatLog.innerHTML = lines.join("<br>");
    $ui.chatLog.scrollTop = $ui.chatLog.scrollHeight;
  }

  function handleIncomingChat(msg) {
    if (!msg || typeof msg.text !== "string") return;
    const from = msg.from || {};
    appendChatMessage({
      fromId: from.id || null,
      fromName: from.name || null,
      level: typeof from.level === "number" ? from.level : null,
      text: msg.text,
      ts: typeof msg.ts === "number" ? msg.ts : Date.now(),
    });
  }

  function sendChatMessage() {
    if (!$ui.chatInput) return;
    const raw = $ui.chatInput.value;
    const text = raw.trim();
    if (!text) return;
    if (!net.connected) {
      appendChatMessage({
        fromId: null,
        fromName: "Система",
        level: null,
        text: "Нет подключения к серверу. Чат недоступен.",
        ts: Date.now(),
      });
      return;
    }
    const payload = {
      type: "chat_send",
      text: text.slice(0, 240),
    };
    sendNet(payload);
    $ui.chatInput.value = "";
  }

  function sendNet(msg) {
    try {
      if (net.socket && net.socket.readyState === WebSocket.OPEN) {
        net.socket.send(JSON.stringify(msg));
      }
    } catch {
      // ignore
    }
  }

  function syncPlayerToServer() {
    const p = state.player;
    if (!p || !net.connected) return;
    sendNet({
      type: "set_player",
      name: p.name,
      gender: p.gender || "unknown",
      level: p.level,
    });
  }

  const DEFAULT_WS_URL =
    window.IS_ONLINE_ENDPOINT ||
    ((location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "ws://localhost:3000"
      : "wss://island-survivor-production.up.railway.app");

  function initNetworkOnce() {
    if (net.socket) return;
    if (typeof WebSocket === "undefined") return;
    const url = DEFAULT_WS_URL;
    try {
      const ws = new WebSocket(url);
      net.socket = ws;
      ws.addEventListener("open", () => {
        net.connected = true;
        sendNet({ type: "hello", client: "island-survivor", version: 1 });
        syncPlayerToServer();
        updateOnlineUI();
        updateChatConnectionState();
      });
      ws.addEventListener("message", (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "online_state") {
          net.playerId = msg.playerId || net.playerId;
          net.online = Array.isArray(msg.players) ? msg.players : [];
          updateOnlineUI();
        } else if (msg.type === "social_state") {
          net.social.guild = msg.guild || null;
          net.social.friends = msg.friends || [];
          net.social.party = msg.party || null;
          net.social.spouse = msg.spouse || null;
        } else if (msg.type === "system_message") {
          if (msg.text) {
            pushLog(String(msg.text), "muted");
            render();
          }
        } else if (msg.type === "chat_message") {
          handleIncomingChat(msg);
        } else if (msg.type === "party_start_battle") {
          if (msg.mode === "mob") {
            beginHunt();
          } else if (msg.mode === "boss1") {
            beginFloor1Boss();
          }
        } else if (msg.type === "battle_update") {
          const b = state.inBattle;
          if (!b || !b.mob) return;
          if (typeof msg.maxHp === "number") {
            b.mob.maxHp = Math.max(1, Math.floor(msg.maxHp));
          }
          if (typeof msg.hp === "number") {
            b.mob.hp = Math.max(0, Math.floor(msg.hp));
          }
          renderBattle();
        }
      });
      ws.addEventListener("close", () => {
        net.connected = false;
        net.socket = null;
        updateOnlineUI();
        updateChatConnectionState();
      });
      ws.addEventListener("error", () => {
        net.connected = false;
        updateOnlineUI();
        updateChatConnectionState();
      });
    } catch {
      // offline
    }
  }

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const roll = (p01) => Math.random() < p01;

  const formatStatInt = (v) => {
    const n = Math.round(Number(v) || 0);
    return n.toString();
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatColl(amount) {
    const n = Math.floor(Math.max(0, amount));
    // 1..9999: "N колл"
    // >= 1_000_000: "X.XX МКолл"
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      const s = m >= 10 ? m.toFixed(1) : m.toFixed(2);
      return `${s.replace(".", ",")} МКолл`;
    }
    return `${n.toLocaleString("ru-RU")} колл`;
  }

  function formatCollShort(amount) {
    const n = Math.floor(Math.max(0, amount));
    if (n >= 1_000_000) return formatColl(n);
    if (n >= 10_000) return `${Math.round(n / 1000)}к колл`;
    return formatColl(n);
  }

  function xpToNext(level) {
    // Ещё более жёсткая кривая: уровни заметно дольше.
    const safeLevel = Math.max(1, level || 1);
    const base = 40 + safeLevel * 14 + Math.pow(safeLevel, 1.3) * 7;
    const mid = safeLevel > 10 ? Math.pow(safeLevel - 10, 1.35) * 6 : 0;
    return Math.floor((base + mid) * 5);
  }

  function weaponSkillCap(level) {
    // Жёсткий верхний предел мастерства.
    return 100;
  }

  function defaultStats() {
    return {
      str: 5,
      agi: 5,
      end: 5,
      vit: 5,
      luck: 5,
    };
  }

  function ensurePlayerModel(p) {
    if (!p) return;
    if (!p.stats) {
      p.stats = defaultStats();
    }
    if (typeof p.sxFree !== "number") {
      p.sxFree = 0;
    }
    // миграция инвентаря под модель с qty (стакуемые предметы)
    if (Array.isArray(p.inventory)) {
      for (const it of p.inventory) {
        if (typeof it.qty !== "number" || it.qty <= 0) {
          it.qty = 1;
        } else {
          it.qty = Math.floor(it.qty);
        }
      }
    }
    // карта навыка оружия по стилям (для будущих билдов)
    if (!p.weaponSkillByType) {
      /** @type {Record<string, number>} */
      const map = {};
      for (const w of WEAPONS) {
        map[w.id] = 0;
      }
      // старые сейвы: переносим общий weaponSkill в текущий стиль
      if (typeof p.weaponSkill === "number" && p.weaponId && p.weaponId in map) {
        map[p.weaponId] = p.weaponSkill;
      }
      p.weaponSkillByType = map;
    }
    if (!Array.isArray(p.activeLoadout)) {
      p.activeLoadout = [];
    }
    if (!p.cooldowns) {
      p.cooldowns = {};
    }
    if (!p.temp) {
      p.temp = { nextFightDef: 0 };
    } else if (typeof p.temp.nextFightDef !== "number") {
      p.temp.nextFightDef = 0;
    }
    if (!p.gender) {
      p.gender = "unknown";
    }
    if (!("professionId" in p)) {
      p.professionId = null;
    }
    if (typeof p.professionLevel !== "number") {
      p.professionLevel = p.professionId ? 1 : 0;
    }
    if (typeof p.professionXp !== "number") {
      p.professionXp = 0;
    }
    if (typeof p.professionGateComplete !== "boolean") {
      p.professionGateComplete = false;
    }
  }

  function currentWeaponSkill(p) {
    const map = p.weaponSkillByType || {};
    let v = typeof map[p.weaponId] === "number" ? map[p.weaponId] : 0;
    const capSkill = weaponSkillCap(p.level);
    if (v > capSkill) v = capSkill;
    // поддерживаем старое поле weaponSkill синхронизированным для формул и UI
    p.weaponSkill = v;
    map[p.weaponId] = v;
    p.weaponSkillByType = map;
    return v;
  }

  function computeDerived(p) {
    ensurePlayerModel(p);
    const w = WEAPONS.find((x) => x.id === p.weaponId);
    const baseHp = (w?.base.hp ?? 45) + (p.level - 1) * 6;
    const baseAtk = (w?.base.atk ?? 6) + (p.level - 1) * 1.6;
    const baseDef = (w?.base.def ?? 3) + (p.level - 1) * 0.9;

    const s = p.stats ?? defaultStats();

    let bonusHp = 0, bonusAtk = 0, bonusDef = 0, crit = 0.03, moneyMult = 0;
    for (const it of p.inventory) {
      if (it.equipped && (it.type === "trinket" || it.type === "weapon")) {
        bonusHp += it.mods.hp ?? 0;
        bonusAtk += it.mods.atk ?? 0;
        bonusDef += it.mods.def ?? 0;
        crit += it.mods.crit ?? 0;
        moneyMult += it.mods.moneyMult ?? 0;
      }
    }
    // жильё (город): небольшие, “реалистичные” бонусы
    if (p.home?.tier) {
      const t = p.home.tier;
      const hpBonus = [0, 10, 20, 35, 55][t] ?? 0;
      bonusHp += hpBonus;
      if (t >= 4) crit += 0.01;
    }
    // Небольшая отдача от навыка оружия и характеристик.
    const skill = currentWeaponSkill(p);
    const skillAtk = Math.floor(skill / 12);
    const skillCrit = clamp(skill / 2500, 0, 0.05); // до +5%
    const statHp = s.end * 4 + s.vit * 6;
    const statAtk = Math.floor(s.str * 1.4 + s.agi * 0.5);
    const statDef = Math.floor(s.vit * 0.7 + s.end * 0.4);
    const statCrit = clamp(s.agi * 0.002 + s.luck * 0.003, 0, 0.12);

    let hitChance = clamp(0.88 + s.agi * 0.003 + s.luck * 0.002, 0.6, 0.99);
    let evadeChance = clamp(0.04 + s.agi * 0.003 + s.luck * 0.0015, 0.01, 0.35);

    // пассивные навыки текущего оружия
    const passives = getPassiveSkillsForWeapon(p.weaponId || "rapier");
    const learned = passives.filter((ps) => skill >= ps.reqWeaponSkill);
    for (const ps of learned) {
      const m = ps.mods || {};
      bonusHp += m.hp ?? 0;
      bonusAtk += m.atk ?? 0;
      bonusDef += m.def ?? 0;
      crit += m.crit ?? 0;
      moneyMult += m.moneyMult ?? 0;
      if (typeof m.hit === "number") hitChance += m.hit;
      if (typeof m.evade === "number") evadeChance += m.evade;
    }

    return {
      maxHp: Math.max(1, baseHp + bonusHp + statHp),
      atk: Math.max(1, baseAtk + bonusAtk + skillAtk + statAtk),
      def: Math.max(0, baseDef + bonusDef + statDef),
      crit: clamp(crit + skillCrit + statCrit, 0, 0.35),
      hitChance,
      evadeChance,
      moneyMult,
    };
  }

  function ensureMetaModel(s) {
    if (!s.quests) {
      s.quests = {
        available: [],
        active: [],
        completed: [],
      };
    } else {
      if (!Array.isArray(s.quests.available)) s.quests.available = [];
      if (!Array.isArray(s.quests.active)) s.quests.active = [];
      if (!Array.isArray(s.quests.completed)) s.quests.completed = [];
    }
    if (!s.questProgress) {
      s.questProgress = {};
    }
    if (!s.npcFlags) {
      s.npcFlags = {};
    }
  }

  function newSave() {
    const save = {
      version: SAVE_VERSION,
      createdAt: Date.now(),
      player: null,
      inBattle: null,
      floor: { id: 1, cleared: false, bossDefeated: false },
      log: [],
      quests: {
        available: [],
        active: [],
        completed: [],
      },
      questProgress: {},
      npcFlags: {},
    };
    return save;
  }

  function newPlayer(name, weaponId, gender) {
    const level = 1;
    const p = {
      name: name.trim().slice(0, 18) || "Безымянный",
      weaponId,
      gender: gender === "male" || gender === "female" ? gender : "unknown",
      level,
      xp: 0,
      money: 0,
      weaponSkill: 0,
      weaponSkillByType: WEAPONS.reduce((acc, w) => ((acc[w.id] = 0), acc), {}),
      activeLoadout: [],
      cooldowns: {},
      stats: defaultStats(),
      sxFree: 0,
      professionId: null,
      professionLevel: 0,
      professionXp: 0,
      professionGateComplete: false,
      inventory: [],
      home: { tier: 0, name: "Без жилья" },
      temp: {
        // эффекты следующего боя
        nextFightDef: 0,
      },
    };
    const d = computeDerived(p);
    p.hp = d.maxHp;
    return p;
  }

  function saveGame(state) {
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(state));
      $ui.saveBadge.textContent = "сохранено";
    } catch {
      $ui.saveBadge.textContent = "не сохранено";
    }
  }

  function migrateSave(s) {
    if (!s || typeof s !== "object") return newSave();

    if (typeof s.version !== "number") {
      s.version = 1;
    }

    if (s.version === 1) {
      if (s.player) ensurePlayerModel(s.player);
      if (!s.floor) {
        s.floor = { id: 1, cleared: false, bossDefeated: false };
      }
      s.version = 2;
    }

    if (s.player) ensurePlayerModel(s.player);
    ensureMetaModel(s);
    return s;
  }

  function loadGame() {
    try {
      let raw = null;
      for (const key of STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
      if (!raw) {
        const fresh = newSave();
        ensureMetaModel(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      const s = migrateSave(parsed);

      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(s));
      for (const key of STORAGE_KEYS.slice(1)) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }

      return s;
    } catch {
      const fresh = newSave();
      ensureMetaModel(fresh);
      return fresh;
    }
  }

  function hardReset() {
    try {
      for (const key of STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {}
    state = newSave();
    render();
  }

  document.getElementById("btnHardReset").addEventListener("click", () => {
    if (confirm("Сбросить прогресс? Персонаж будет удалён.")) hardReset();
  });

  /** @type {ReturnType<newSave>} */
  let state = loadGame();

  function pushLog(html, tone = "normal") {
    state.log.push({ t: Date.now(), html, tone });
    state.log = state.log.slice(-120);
  }

  function clearActions() {
    $actions.innerHTML = "";
  }

  function addAction(label, onClick, opts = {}) {
    const btn = document.createElement("button");
    btn.className = `btn ${opts.primary ? "btn-primary" : ""} ${opts.danger ? "btn-danger" : ""}`.trim();
    btn.type = "button";
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener("click", onClick);
    $actions.appendChild(btn);
  }

  function renderScene(lines) {
    $scene.innerHTML = "";
    for (const l of lines) {
      const p = document.createElement("p");
      p.className = `logline ${l.tone === "muted" ? "muted" : ""}`;
      p.innerHTML = l.html;
      $scene.appendChild(p);
    }
  }

  function renderInfo(lines) {
    if (!$ui.info) return;
    $ui.info.innerHTML = "";
    for (const l of lines) {
      const p = document.createElement("p");
      p.className = `small ${l.tone === "muted" ? "muted" : ""}`;
      p.innerHTML = l.html;
      $ui.info.appendChild(p);
    }
  }

  /**
   * Рендерит левое SAO-окно с силуэтом и горизонтальным меню.
   * activeTab: "stats" | "skills" | "equipment"
   */
  function renderSaoInfo(activeTab, extraLines) {
    const makeItem = (tab, label) => {
      const isActive = activeTab === tab;
      const cls = `info-sao-menu-item${isActive ? " info-sao-menu-item--active" : ""}`;
      const arrow = isActive ? "<span>▶</span>" : "";
      return `<div class="${cls}" data-tab="${tab}"><span>${label}</span>${arrow}</div>`;
    };

    /** @type {{html:string; tone:"normal"|"muted"}[]} */
    const head = [
      {
        html: `<div class="info-sao-frame">
          <div class="info-sao-avatar">
            <div class="info-sao-avatar-figure"></div>
            <div class="info-sao-node-ring">
              <div class="info-sao-node info-sao-node--head"></div>
              <div class="info-sao-node info-sao-node--chest"></div>
              <div class="info-sao-node info-sao-node--left-arm"></div>
              <div class="info-sao-node info-sao-node--right-arm"></div>
              <div class="info-sao-node info-sao-node--left-hand"></div>
              <div class="info-sao-node info-sao-node--right-hand"></div>
              <div class="info-sao-node info-sao-node--waist"></div>
              <div class="info-sao-node info-sao-node--left-leg"></div>
              <div class="info-sao-node info-sao-node--right-leg"></div>
            </div>
          </div>
          <div class="info-sao-menu">
            ${makeItem("stats", "Stats")}
            ${makeItem("skills", "Skills")}
            ${makeItem("equipment", "Equipment")}
          </div>
        </div>`,
        tone: "normal",
      },
    ];

    renderInfo(head.concat(extraLines));

    if (!$ui.info) return;
    const items = $ui.info.querySelectorAll(".info-sao-menu-item");
    items.forEach((el) => {
      const tab = el.getAttribute("data-tab");
      if (!tab) return;
      el.addEventListener("click", () => {
        if (tab === "stats") openStatsMenu();
        else if (tab === "skills") openSkillsMenu();
        else if (tab === "equipment") openEquipmentMenu();
      });
    });
  }

  function setSceneTownMode(isTown) {
    if (!$scene) return;
    if (isTown) {
      $scene.classList.add("scene-town");
    } else {
      $scene.classList.remove("scene-town");
    }
  }

  function renderPlayerPanel() {
    const p = state.player;
    if (!p) {
      $ui.name.textContent = "—";
      if ($ui.gender) $ui.gender.textContent = "—";
      $ui.weapon.textContent = "—";
      $ui.level.textContent = "—";
      $ui.xp.textContent = "—";
      $ui.hp.textContent = "—";
      $ui.atk.textContent = "—";
      $ui.def.textContent = "—";
      $ui.money.textContent = "—";
      if ($ui.profession) $ui.profession.textContent = "—";
      if ($ui.professionLevel) $ui.professionLevel.textContent = "—";
      $ui.weaponSkill.textContent = "—";
       $ui.sxFree.textContent = "—";
      $ui.techs.innerHTML = "";
      $ui.invCount.textContent = "0";
      $ui.inventory.innerHTML = `<div class="small">Инвентарь пуст.</div>`;
      return;
    }

    const w = WEAPONS.find((x) => x.id === p.weaponId);
    const d = computeDerived(p);
    const cap = weaponSkillCap(p.level);
    $ui.name.textContent = p.name;
    if ($ui.gender) {
      $ui.gender.textContent =
        p.gender === "male" ? "Мужской" : p.gender === "female" ? "Женский" : "—";
    }
    $ui.weapon.textContent = w ? w.name : p.weaponId;
    $ui.level.textContent = String(p.level);
    $ui.xp.textContent = `${p.xp} / ${xpToNext(p.level)}`;
    $ui.hp.textContent = `${p.hp} / ${Math.round(d.maxHp)}`;
    $ui.atk.textContent = `${formatStatInt(d.atk)} (крит ${(d.crit * 100).toFixed(1).replace(".", ",")}%)`;
    $ui.def.textContent = `${formatStatInt(d.def)}`;
    $ui.money.textContent = formatColl(p.money);
    const prof = p.professionId ? getProfessionById(p.professionId) : null;
    const profLevel = p.professionLevel ?? 0;
    const profXp = p.professionXp ?? 0;
    const profNeed = professionXpToNext(profLevel);
    if ($ui.profession) {
      $ui.profession.textContent = prof ? prof.name : "—";
    }
    if ($ui.professionLevel) {
      if (!prof || profLevel <= 0) {
        $ui.professionLevel.textContent = "—";
      } else if (profLevel >= 100) {
        $ui.professionLevel.textContent = "100 (макс.)";
      } else {
        $ui.professionLevel.textContent = `${profLevel} (${profXp} / ${profNeed})`;
      }
    }
    $ui.weaponSkill.textContent = `${p.weaponSkill} / ${cap}`;
    $ui.sxFree.textContent = String(p.sxFree ?? 0);

    const techs = (TECHNIQUES[p.weaponId] ?? []).slice().sort((a, b) => a.reqSkill - b.reqSkill);
    $ui.techs.innerHTML = "";
    for (const t of techs) {
      const unlocked = p.weaponSkill >= t.reqSkill;
      const card = document.createElement("div");
      card.className = "tech";
      card.innerHTML = `
        <div class="t">${t.name}</div>
        <div class="d">${t.desc}</div>
        <div class="r">
          <span class="tag ${unlocked ? "ok" : "warn"}">${unlocked ? "Открыто" : "Закрыто"}</span>
          <span class="tag info">Треб. навык: ${t.reqSkill}</span>
        </div>
      `;
      $ui.techs.appendChild(card);
    }

    const inv = p.inventory.slice().sort(
      (a, b) =>
        (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0) ||
        (a.type ?? "").localeCompare(b.type ?? "") ||
        (a.rarity?.name ?? "").localeCompare(b.rarity?.name ?? "")
    );
    $ui.invCount.textContent = String(inv.length);
    if (inv.length === 0) {
      $ui.inventory.innerHTML = `<div class="small">Инвентарь пуст.</div>`;
      return;
    }
    $ui.inventory.innerHTML = "";

    // Предрасчёт статуса наборов "НЕИЗВЕСТНОЕ 1/5" для инвентаря.
    /** @type {Record<string, { partTotal: number; indices: Set<number>; hasFull: boolean }>} */
    const unknownStatus = {};
    for (const it of inv) {
      if (it.type !== "unknown_part" || !it.mods?.unknownSetId) continue;
      const setId = it.mods.unknownSetId;
      const total = typeof it.mods.partTotal === "number" ? it.mods.partTotal : 5;
      const partIndex = typeof it.mods.partIndex === "number" ? it.mods.partIndex : 0;
      if (!unknownStatus[setId]) {
        unknownStatus[setId] = { partTotal: total, indices: new Set(), hasFull: false };
      }
      if (partIndex > 0) unknownStatus[setId].indices.add(partIndex);
    }
    for (const setId of Object.keys(unknownStatus)) {
      const st = unknownStatus[setId];
      let full = true;
      for (let i = 1; i <= st.partTotal; i++) {
        if (!st.indices.has(i)) {
          full = false;
          break;
        }
      }
      st.hasFull = full;
    }

    for (const it of inv) {
      const row = document.createElement("div");
      row.className = "item";
      const rarityClass = it.rarity?.color ?? "common";
      const eq = !!it.equipped;
      const qty = typeof it.qty === "number" && it.qty > 1 ? ` ×${it.qty}` : "";
      const isUnknownPart = it.type === "unknown_part";
      const setId = isUnknownPart ? it.mods?.unknownSetId : null;
      const canCombine =
        isUnknownPart && setId && unknownStatus[setId]?.hasFull ? true : false;

      row.innerHTML = `
        <div>
          <div class="name">${eq ? "★ " : ""}${it.name}${qty}</div>
          <div class="meta">${it.desc}</div>
        </div>
        <div class="right">
          <div class="rarity ${rarityClass}">${it.rarity?.name ?? "Обычный"}</div>
          <div class="actions" style="gap:8px">
            ${it.type === "consumable" ? `<button class="btn btn-primary" type="button">Использовать</button>` : ""}
            ${it.type === "trinket" ? `<button class="btn" type="button">${eq ? "Снять" : "Надеть"}</button>` : ""}
            ${it.type === "weapon" ? `<button class="btn" type="button">${eq ? "Снять" : "Экипировать"}</button>` : ""}
            ${canCombine ? `<button class="btn btn-primary" type="button">Собрать</button>` : ""}
            <button class="btn btn-ghost" type="button">Выбросить</button>
          </div>
        </div>
      `;
      const btns = row.querySelectorAll("button");
      let idx = 0;
      if (it.type === "consumable") {
        const bUse = btns[idx++];
        bUse.addEventListener("click", () => {
          useConsumable(it.id);
        });
      }
      if (it.type === "trinket") {
        const bEq = btns[idx++];
        bEq.addEventListener("click", () => {
          toggleEquip(it.id);
        });
      }
      if (it.type === "weapon") {
        const bEq = btns[idx++];
        bEq.addEventListener("click", () => {
          equipWeaponItem(it.id);
        });
      }
      if (canCombine) {
        const bCombine = btns[idx++];
        bCombine.addEventListener("click", () => {
          if (setId) combineUnknownSet(String(setId));
        });
      }
      const bDrop = btns[idx++];
      bDrop.addEventListener("click", () => dropItem(it.id));
      $ui.inventory.appendChild(row);
    }
  }

  function dropItem(itemId) {
    const p = state.player;
    if (!p) return;
    const i = p.inventory.findIndex((x) => x.id === itemId);
    if (i === -1) return;
    const it = p.inventory[i];
    p.inventory.splice(i, 1);
    pushLog(`Ты выбросил предмет: <strong>${it.name}</strong>.`, "muted");
    saveGame(state);
    render();
  }

  // Сборка неизвестных сетов оружия из частей "НЕИЗВЕСТНОЕ 1/5".
  function combineUnknownSet(setId) {
    const p = state.player;
    if (!p) return;

    const parts = p.inventory.filter(
      (x) => x.type === "unknown_part" && x.mods?.unknownSetId === setId
    );
    if (!parts.length) {
      render();
      return;
    }

    const total = typeof parts[0].mods?.partTotal === "number" ? parts[0].mods.partTotal : 5;
    const indices = new Set(
      parts
        .map((it) => (typeof it.mods?.partIndex === "number" ? it.mods.partIndex : 0))
        .filter((n) => n > 0)
    );

    let hasAll = true;
    for (let i = 1; i <= total; i++) {
      if (!indices.has(i)) {
        hasAll = false;
        break;
      }
    }

    if (!hasAll) {
      pushLog(
        `Похоже, у тебя ещё не все части этого набора. Нужно собрать полный комплект, чтобы создать оружие.`,
        "muted"
      );
      saveGame(state);
      render();
      return;
    }

    // Удаляем по одной части каждого индекса 1..total.
    const idsToRemove = [];
    for (let i = 1; i <= total; i++) {
      const idx = p.inventory.findIndex(
        (x) =>
          x.type === "unknown_part" &&
          x.mods?.unknownSetId === setId &&
          x.mods?.partIndex === i
      );
      if (idx !== -1) {
        idsToRemove.push(p.inventory[idx].id);
      }
    }
    for (const rid of idsToRemove) {
      const idx = p.inventory.findIndex((x) => x.id === rid);
      if (idx !== -1) p.inventory.splice(idx, 1);
    }

    const reward = makeUnknownSetReward(setId);
    if (!reward) {
      pushLog(
        `Что-то пошло не так при сборке неизвестного оружия. Сообщи автору, чтобы он проверил конфиги.`,
        "muted"
      );
      saveGame(state);
      render();
      return;
    }

    addToInventory(reward, reward.qty ?? 1);
    pushLog(
      `Ты собираешь все части набора и получаешь: <strong>${reward.name}</strong>.`,
      "normal"
    );
    saveGame(state);
    render();
  }

  function toggleEquip(itemId) {
    const p = state.player;
    if (!p) return;
    const it = p.inventory.find((x) => x.id === itemId);
    if (!it || it.type !== "trinket") return;
    it.equipped = !it.equipped;
    pushLog(`${it.equipped ? "Ты надел" : "Ты снял"}: <strong>${it.name}</strong>.`, "muted");
    // если сняли и HP стало выше текущего max — подрезаем (вниз ничего не делаем)
    const d = computeDerived(p);
    p.hp = Math.min(p.hp, d.maxHp);
    saveGame(state);
    render();
  }

  function equipWeaponItem(itemId) {
    const p = state.player;
    if (!p) return;
    const it = p.inventory.find((x) => x.id === itemId);
    if (!it || it.type !== "weapon") return;

    if (it.condition === "broken") {
      pushLog(
        `Оружие <strong>${it.name}</strong> в слишком плохом состоянии. Сейчас его можно только продать или починить в будущем.`,
        "muted"
      );
      saveGame(state);
      render();
      return;
    }

    // Проверка требований по характеристикам (если заданы для предмета-оружия).
    const req = it.reqStats;
    if (req) {
      const s = p.stats ?? defaultStats();
      const lacks = [];
      if (req.str && (s.str ?? 0) < req.str) lacks.push(`Сила ≥ ${req.str}`);
      if (req.agi && (s.agi ?? 0) < req.agi) lacks.push(`Ловкость ≥ ${req.agi}`);
      if (req.end && (s.end ?? 0) < req.end) lacks.push(`Выносливость ≥ ${req.end}`);
      if (req.vit && (s.vit ?? 0) < req.vit) lacks.push(`Стойкость ≥ ${req.vit}`);
      if (req.luck && (s.luck ?? 0) < req.luck) lacks.push(`Удача ≥ ${req.luck}`);

      if (lacks.length) {
        const needs = lacks.join(", ");
        pushLog(
          `Не хватает характеристик, чтобы экипировать <strong>${it.name}</strong>. Требуется: <span class="mono">${needs}</span>.`,
          "muted"
        );
        saveGame(state);
        render();
        return;
      }
    }

    // снимаем другие экипированные “weapon”
    for (const x of p.inventory) {
      if (x.type === "weapon") x.equipped = false;
    }

    // если предмет ещё не привязан к стилю, считаем его оружием текущего стиля
    if (!it.weaponId) {
      it.weaponId = p.weaponId;
    }

    it.equipped = !it.equipped;

    // смена стиля оружия при экипировке нового предмета
    if (it.equipped && it.weaponId) {
      p.weaponId = it.weaponId;
    }

    pushLog(`${it.equipped ? "Ты экипировал" : "Ты снял"}: <strong>${it.name}</strong>.`, "muted");
    const d = computeDerived(p);
    p.hp = Math.min(p.hp, d.maxHp);
    saveGame(state);
    render();
  }

  function useConsumable(itemId) {
    const p = state.player;
    if (!p) return;
    const idx = p.inventory.findIndex((x) => x.id === itemId);
    if (idx === -1) return;
    const it = p.inventory[idx];
    if (it.type !== "consumable") return;
    const d = computeDerived(p);
    let used = false;
    if (typeof it.mods.heal === "number" && it.mods.heal > 0) {
      const before = p.hp;
      p.hp = Math.min(d.maxHp, p.hp + it.mods.heal);
      const healed = p.hp - before;
      pushLog(`Ты используешь <strong>${it.name}</strong> и лечишь ${healed} HP.`, "muted");
      used = true;
    }
    if (typeof it.mods.tempDefNextFight === "number" && it.mods.tempDefNextFight !== 0) {
      p.temp.nextFightDef += it.mods.tempDefNextFight;
      pushLog(`Эффект: +${it.mods.tempDefNextFight} ЗАЩ на следующий бой.`, "muted");
      used = true;
    }
    if (!used) {
      pushLog(`Предмет <strong>${it.name}</strong> не дал эффекта.`, "muted");
    }
    // Алхимик/повар получают небольшой проф. опыт за работу с расходниками.
    gainProfessionXp(2, "alchemy");
    const maxQty = typeof it.qty === "number" && it.qty > 0 ? it.qty : 1;
    if (maxQty > 1) {
      it.qty = maxQty - 1;
    } else {
      p.inventory.splice(idx, 1);
    }
    saveGame(state);
    render();
  }

  function gainMoney(baseAmount) {
    const p = state.player;
    if (!p) return 0;
    const d = computeDerived(p);
    const amt = Math.max(0, Math.floor(baseAmount * (1 + d.moneyMult)));
    p.money += amt;
    return amt;
  }

  function gainProfessionXp(rawAmount, reason) {
    const p = state.player;
    if (!p || !p.professionId) return;
    ensurePlayerModel(p);
    if (p.professionLevel >= 100) return;

    let amt = Math.max(0, Math.floor(rawAmount));
    if (!amt) return;

    const prof = getProfessionById(p.professionId);

    // Небольшие модификаторы в зависимости от источника опыта и профессии.
    let mult = 1;
    if (reason === "battle" && p.professionId === "hunting") mult = 1.4;
    else if (reason === "battle" && p.professionId === "blacksmith") mult = 0.9;
    else if (reason === "resource" && (p.professionId === "mining" || p.professionId === "blacksmith")) mult = 1.35;
    else if (reason === "alchemy" && p.professionId === "alchemy") mult = 1.5;
    else if (reason === "cooking" && p.professionId === "cooking") mult = 1.4;

    amt = Math.max(1, Math.floor(amt * mult * 0.6));

    p.professionXp += amt;

    let leveled = false;
    while (p.professionLevel < 100) {
      const need = professionXpToNext(p.professionLevel || 1);
      if (!Number.isFinite(need) || need <= 0) break;
      if (p.professionXp < need) break;

      // Спец-гейт на 100-й уровень: с 99 на 100 — только при выполненном флаге.
      if (p.professionLevel === 99 && !p.professionGateComplete) {
        p.professionXp = need;
        pushLog(
          `Чтобы поднять профессию <strong>${prof?.name ?? p.professionId}</strong> до 100 уровня, нужно выполнить особое условие.`,
          "muted"
        );
        break;
      }

      p.professionXp -= need;
      p.professionLevel += 1;
      leveled = true;
    }

    if (leveled) {
      const name = prof?.name ?? p.professionId;
      pushLog(
        `Профессия <strong>${name}</strong> повышена до уровня <strong>${p.professionLevel}</strong>.`,
        "normal"
      );
    }
  }

  function gainXp(amount) {
    const p = state.player;
    if (!p) return;
    p.xp += Math.max(0, Math.floor(amount));
    while (p.xp >= xpToNext(p.level)) {
      p.xp -= xpToNext(p.level);
      p.level += 1;
      ensurePlayerModel(p);
      p.sxFree += 5;
      const d = computeDerived(p);
      p.hp = d.maxHp; // при уровне — полный хил (как “safe zone” бонус)
      pushLog(`<strong>Уровень повышен!</strong> Теперь ты уровень ${p.level}. HP восстановлено. Ты получаешь <strong>+5 СХ</strong>.`, "normal");
    }
  }

  // --- Квесты и NPC-метки ---

  function ensureQuestModel() {
    ensureMetaModel(state);
  }

  function isQuestCompleted(id) {
    ensureQuestModel();
    return state.quests.completed.includes(id);
  }

  function isQuestActive(id) {
    ensureQuestModel();
    return state.quests.active.includes(id);
  }

  function acceptQuest(id) {
    const def = getQuestById(id);
    if (!def) return;
    ensureQuestModel();
    if (isQuestCompleted(id) || isQuestActive(id)) return;
    state.quests.active.push(id);
    if (!state.questProgress[id]) state.questProgress[id] = {};
    pushLog(`Новый квест: <strong>${def.name}</strong>.`, "normal");
  }

  function addQuestProgress(id, goalIndex, delta) {
    if (!isQuestActive(id)) return;
    const def = getQuestById(id);
    if (!def) return;
    const goal = def.goals?.[goalIndex];
    if (!goal) return;
    ensureQuestModel();
    const prog = state.questProgress[id] || {};
    const prev = typeof prog[goalIndex] === "number" ? prog[goalIndex] : 0;
    const next = Math.min(goal.count ?? 1, prev + delta);
    prog[goalIndex] = next;
    state.questProgress[id] = prog;
    // проверка на завершение
    let done = true;
    for (let i = 0; i < (def.goals?.length ?? 0); i++) {
      const g = def.goals[i];
      const cur = typeof prog[i] === "number" ? prog[i] : 0;
      if (cur < (g.count ?? 1)) {
        done = false;
        break;
      }
    }
    if (done) {
      completeQuest(id);
    }
  }

  function completeQuest(id) {
    ensureQuestModel();
    if (!isQuestActive(id)) return;
    const def = getQuestById(id);
    if (!def) return;
    state.quests.active = state.quests.active.filter((q) => q !== id);
    if (!state.quests.completed.includes(id)) state.quests.completed.push(id);
    const rewards = def.rewards || {};
    const xp = Math.max(0, Math.floor(rewards.xp ?? 0));
    const money = Math.max(0, Math.floor(rewards.money ?? 0));
    if (xp > 0) gainXp(xp);
    if (money > 0) {
      const gained = gainMoney(money);
      pushLog(`Награда Коллами за квест <strong>${def.name}</strong>: ${formatColl(gained)}.`, "muted");
    }
    if (typeof rewards.items === "function") {
      const items = rewards.items() || [];
      for (const it of items) {
        addToInventory(it, it.qty ?? 1);
      }
    }
    pushLog(`Квест завершён: <strong>${def.name}</strong>.`, "normal");
  }

  function updateKillQuestsForMob(mob) {
    ensureQuestModel();
    const activeIds = state.quests.active.slice();
    for (const qid of activeIds) {
      const def = getQuestById(qid);
      if (!def || !Array.isArray(def.goals)) continue;
      def.goals.forEach((g, idx) => {
        if (g.type === "kill" && g.mobId === mob.id) {
          addQuestProgress(qid, idx, 1);
        }
      });
    }
  }

  function updateCollectQuestsForItem(itemId, qty) {
    ensureQuestModel();
    const amount = Math.max(1, Math.floor(qty ?? 1));
    const activeIds = state.quests.active.slice();
    for (const qid of activeIds) {
      const def = getQuestById(qid);
      if (!def || !Array.isArray(def.goals)) continue;
      def.goals.forEach((g, idx) => {
        if (g.type === "collect" && g.itemId === itemId) {
          addQuestProgress(qid, idx, amount);
        }
      });
    }
  }

  function updateTalkQuestsForNpc(npcId) {
    ensureQuestModel();
    const activeIds = state.quests.active.slice();
    for (const qid of activeIds) {
      const def = getQuestById(qid);
      if (!def || !Array.isArray(def.goals)) continue;
      def.goals.forEach((g, idx) => {
        if (g.type === "talk" && g.npcId === npcId) {
          addQuestProgress(qid, idx, 1);
        }
      });
    }
  }

  function updateVisitQuestsForArea(areaId) {
    ensureQuestModel();
    const activeIds = state.quests.active.slice();
    for (const qid of activeIds) {
      const def = getQuestById(qid);
      if (!def || !Array.isArray(def.goals)) continue;
      def.goals.forEach((g, idx) => {
        if (g.type === "visit" && g.areaId === areaId) {
          addQuestProgress(qid, idx, 1);
        }
      });
    }
  }

  function gainWeaponSkill(min, max) {
    const p = state.player;
    if (!p) return 0;
    ensurePlayerModel(p);
    const cap = weaponSkillCap(p.level);
    const addRaw = randInt(min, max);
    // Ещё более жёсткое замедление роста мастерства.
    const add = Math.max(1, Math.floor(addRaw * 0.2));
    const map = p.weaponSkillByType || {};
    const cur = typeof map[p.weaponId] === "number" ? map[p.weaponId] : 0;
    const next = clamp(cur + add, 0, cap);
    map[p.weaponId] = next;
    p.weaponSkillByType = map;
    p.weaponSkill = next;
    return next - cur;
  }

  function resolveDrops(mob) {
    const p = state.player;
    if (!p) return [];
    const got = [];

    // Базовый дроп из таблицы моба.
    for (const d of mob.drops ?? []) {
      if (roll(d.p)) {
        const base = d.item();
        got.push(base);
        addToInventory(base, base.qty ?? 1);
      }
    }

    // Редкий системный дроп: случайное оружие и части "НЕИЗВЕСТНОЕ 1/5".
    const ctx = {
      level: p.level,
      isElite: mob.meta?.isElite ?? false,
      isBoss: mob.meta?.isBoss ?? false,
      floor: mob.meta?.floor ?? null,
    };

    // Очень маленький шанс оружия: обычные мобы ~0.4%, элита ~2%, босс ~6%.
    const baseWeaponChance = ctx.isBoss ? 0.06 : ctx.isElite ? 0.02 : 0.004;
    if (roll(baseWeaponChance)) {
      const w = randomWorldWeaponDrop(ctx);
      if (w) {
        got.push(w);
        addToInventory(w, w.qty ?? 1);
      }
    }

    // Части неизвестных сетов: обычные ~0.3%, элита ~1.2%, босс ~4%.
    const basePartChance = ctx.isBoss ? 0.04 : ctx.isElite ? 0.012 : 0.003;
    if (roll(basePartChance)) {
      const part = randomUnknownPart(ctx);
      if (part) {
        got.push(part);
        addToInventory(part, part.qty ?? 1);
      }
    }

    return got;
  }

  function startNewRun() {
    clearActions();
    renderScene([
      { html: `<strong>Новый заход.</strong> Ты на острове, где выживает лишь тот, кто читает ситуацию и не ошибается.`, tone: "normal" },
      { html: `Правило одно: <strong>умер — персонаж удалён</strong>.`, tone: "normal" },
      { html: `Создай персонажа, выбери <strong>пол</strong> и оружие. Класс не выбирается. Магии нет — только ближний бой.`, tone: "muted" },
      { html: `<div class="sep"></div><span class="mono">Введите имя (необязательно) и выберите пол:</span>`, tone: "muted" },
    ]);

    // inline form
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr";
    wrap.style.gap = "10px";

    const nameRow = document.createElement("div");
    nameRow.style.display = "flex";
    nameRow.style.gap = "10px";
    nameRow.style.flexWrap = "wrap";
    const inp = document.createElement("input");
    inp.placeholder = "Например: Кирито (можно любое)";
    inp.maxLength = 18;
    inp.className = "btn";
    inp.style.flex = "1";
    inp.style.minWidth = "240px";
    inp.style.cursor = "text";
    const genderRow = document.createElement("div");
    genderRow.style.display = "flex";
    genderRow.style.gap = "10px";
    genderRow.style.flexWrap = "wrap";

    const labelMale = document.createElement("button");
    labelMale.type = "button";
    labelMale.className = "btn";
    labelMale.textContent = "Мужской";

    const labelFemale = document.createElement("button");
    labelFemale.type = "button";
    labelFemale.className = "btn";
    labelFemale.textContent = "Женский";

    let selectedGender = "male";
    function applyGenderButtons() {
      labelMale.classList.toggle("btn-primary", selectedGender === "male");
      labelFemale.classList.toggle("btn-primary", selectedGender === "female");
    }
    labelMale.addEventListener("click", () => {
      selectedGender = "male";
      applyGenderButtons();
    });
    labelFemale.addEventListener("click", () => {
      selectedGender = "female";
      applyGenderButtons();
    });
    applyGenderButtons();

    genderRow.appendChild(labelMale);
    genderRow.appendChild(labelFemale);

    const hint = document.createElement("div");
    hint.className = "small";
    hint.textContent = "Дальше выберешь оружие. Его навыки и техники будут качаться всю игру.";
    nameRow.appendChild(inp);
    wrap.appendChild(nameRow);
    wrap.appendChild(genderRow);
    wrap.appendChild(hint);
    $scene.appendChild(wrap);

    addAction("Продолжить", () => weaponSelect(inp.value, selectedGender), { primary: true });
  }

  function weaponSelect(name, gender) {
    clearActions();
    const lines = [
      { html: `<strong>Выбор оружия.</strong> Это твой единственный “класс”.`, tone: "normal" },
      { html: `Магии нет. Техники открываются по навыку выбранного оружия.`, tone: "muted" },
      { html: `<div class="sep"></div>Выбери оружие:`, tone: "normal" },
    ];
    renderScene(lines);

    for (const w of WEAPONS) {
      addAction(w.name, () => {
        state.player = newPlayer(name, w.id, gender);
        state.inBattle = null;
        state.log = [];
        pushLog(`Ты создал персонажа <strong>${state.player.name}</strong> и выбрал оружие: <strong>${w.name}</strong>.`, "normal");
        pushLog(`Стиль: ${w.desc}`, "muted");
        saveGame(state);
        syncPlayerToServer();
        goToTown();
      }, { primary: true });
    }
    addAction("Назад", () => startNewRun(), {});
  }

  function goToTown() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    setSceneTownMode(true);
    const w = WEAPONS.find((x) => x.id === p.weaponId);
    const lines = [
      { html: `<strong>Город Начала.</strong> Безопасная зона 1-го этажа.`, tone: "normal" },
      { html: `Оружие: <strong>${w?.name ?? p.weaponId}</strong> • Уровень: <strong>${p.level}</strong> • Жильё: <strong>${p.home?.name ?? "Без жилья"}</strong>`, tone: "muted" },
      { html: `Деньги: <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
    ];
    renderScene(lines.concat([{ html: `<div class="sep"></div>Куда пойдёшь?`, tone: "normal" }]));

    addAction("Первый этаж (поля/лабиринт)", () => floor1Hub(), { primary: true });
    addAction("Гильдия", () => townDistrict("guild"), {});
    addAction("Характеристики (распределить СХ)", () => openStatsMenu(), {});
    addAction("Магазин оружия", () => townDistrict("weaponShop"), {});
    addAction("Магазин зелий", () => townDistrict("potionShop"), {});
    addAction("Лавка ресурсов", () => townDistrict("resourceShop"), {});
    addAction("Жилой район", () => townDistrict("housing"), {});
    addAction("Тренировка (случайный бой)", () => beginHunt(), {});
    addAction("Квесты и NPC", () => openQuestJournal(), {});
    addAction("Профессия", () => openProfessionMenu(), {});
    addAction("Отдохнуть (полный HP)", () => {
      const d = computeDerived(p);
      p.hp = d.maxHp;
      pushLog("Ты отдохнул. HP восстановлено.", "muted");
      saveGame(state);
      goToTown();
    }, {});
    addAction("Посмотреть журнал", () => showLog(), {});
    addAction("Социальное меню (онлайн)", () => openSocialMenu(), {});
  }

  function showLog() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    const last = state.log.slice(-20);
    renderScene([
      { html: `<strong>Журнал последних событий</strong> (последние 20):`, tone: "normal" },
      { html: `<div class="sep"></div>`, tone: "muted" },
      ...last.map((x) => ({ html: x.html, tone: x.tone === "muted" ? "muted" : "normal" })),
    ]);
    addAction("Назад", () => goToTown(), { primary: true });
  }

  function openQuestJournal() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    ensureQuestModel();
    /** @type {{html:string; tone:"normal"|"muted"}[]} */
    const lines = [
      { html: `<strong>Журнал квестов</strong>`, tone: "normal" },
      { html: `<div class="sep"></div>Активные квесты:`, tone: "normal" },
    ];

    const activeIds = state.quests.active || [];
    if (!activeIds.length) {
      lines.push({
        html: `Сейчас нет активных квестов. Поговори с NPC в Городе Начала или в локациях, чтобы получить задания.`,
        tone: "muted",
      });
    } else {
      for (const id of activeIds) {
        const def = getQuestById(id);
        if (!def) continue;
        const prog = state.questProgress[id] || {};
        const goals = (def.goals || [])
          .map((g, idx) => {
            const cur = typeof prog[idx] === "number" ? prog[idx] : 0;
            const need = g.count ?? 1;
            let label = "";
            if (g.type === "kill") label = `Убить ${g.mobId}`;
            else if (g.type === "collect") label = `Собрать предмет: ${g.itemId}`;
            else if (g.type === "talk") label = `Поговорить с NPC: ${g.npcId}`;
            else if (g.type === "visit") label = `Посетить локацию: ${g.areaId}`;
            return `${label} — <span class="mono">${cur}/${need}</span>`;
          })
          .join("<br/>");
        lines.push({
          html: `<strong>${def.name}</strong><br/><span class="muted">${def.description}</span><br/>${goals}`,
          tone: "normal",
        });
      }
    }

    lines.push({ html: `<div class="sep"></div>Завершённые квесты:`, tone: "normal" });
    const completedIds = state.quests.completed || [];
    if (!completedIds.length) {
      lines.push({ html: `Пока что нет завершённых квестов.`, tone: "muted" });
    } else {
      for (const id of completedIds) {
        const def = getQuestById(id);
        if (!def) continue;
        lines.push({
          html: `<strong>${def.name}</strong> — <span class="muted">${def.hint || "квест выполнен"}</span>`,
          tone: "muted",
        });
      }
    }

    renderScene(lines);
    addAction("Назад в город", () => goToTown(), { primary: true });
  }

  // --- Город Начала: магазины/гильдия/жильё ---
  const HOUSING = [
    { tier: 0, name: "Без жилья", price: 0, desc: "Без бонусов." },
    { tier: 1, name: "Койка в комнате", price: 10_000, desc: "+10 HP к максимуму." },
    { tier: 2, name: "Комната в трактире", price: 50_000, desc: "+20 HP к максимуму." },
    { tier: 3, name: "Съёмная квартира", price: 200_000, desc: "+35 HP к максимуму." },
    { tier: 4, name: "Небольшой дом", price: 1_000_000, desc: "+55 HP к максимуму и +1% крит." },
  ];

  function addUniqueId(it) {
    // Для нестакуемых предметов сохраняем уникальность id (оружие, тринки и т.п.)
    if (!isStackableItem(it)) {
      it.id = `${it.id}#${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    }
    if (typeof it.qty !== "number" || it.qty <= 0) it.qty = 1;
    it.equipped = false;
    return it;
  }

  // Добавление предмета в инвентарь с учётом стаков.
  function addToInventory(item, qty = 1) {
    const p = state.player;
    if (!p) return;
    const amount = Math.max(1, Math.floor(qty));
    const stackable = isStackableItem(item);

    if (stackable) {
      const existing = p.inventory.find(
        (x) =>
          isStackableItem(x) &&
          !x.equipped &&
          x.type === item.type &&
          x.id === item.id
      );
      if (existing) {
        const baseQty = typeof existing.qty === "number" ? existing.qty : 1;
        existing.qty = baseQty + amount;
        updateCollectQuestsForItem(item.id, amount);
        return;
      }
      const copy = { ...item };
      copy.equipped = false;
      copy.qty = amount;
      p.inventory.push(copy);
      updateCollectQuestsForItem(item.id, amount);
      return;
    }

    const unique = addUniqueId({ ...item });
    unique.qty = 1;
    p.inventory.push(unique);
  }

  function estimateSellPrice(it) {
    if (it.type === "trophy") return 40;
    if (it.type === "resource") return 55;
    if (it.type === "consumable") return 60;
    if (it.type === "unknown_part") return 400;
    if (it.type === "weapon") return 600;
    if (it.type === "trinket") return 800;
    return 30;
  }

  function buyFromShop(entry) {
    const p = state.player;
    if (!p) return;
    if (p.money < entry.price) {
      pushLog(`Недостаточно Коллов. Нужно ${formatColl(entry.price)}.`, "muted");
      saveGame(state);
      render();
      return;
    }
    p.money -= entry.price;
    const baseItem = entry.item();
    addToInventory(baseItem, baseItem.qty ?? 1);
    pushLog(`Покупка: <strong>${baseItem.name}</strong> за ${formatColl(entry.price)}.`, "normal");
    // Небольшой проф. опыт за работу с ресурсами/материалами.
    if (baseItem.type === "resource" || baseItem.type === "trophy") {
      gainProfessionXp(2, "resource");
    }
    saveGame(state);
    render();
  }

  function sellItem(itemId) {
    const p = state.player;
    if (!p) return;
    const idx = p.inventory.findIndex((x) => x.id === itemId);
    if (idx === -1) return;
    const it = p.inventory[idx];
    const unitPrice = estimateSellPrice(it);
    const maxQty = typeof it.qty === "number" && it.qty > 0 ? it.qty : 1;

    let qtyToSell = 1;
    if (isStackableItem(it) && maxQty > 1) {
      const raw = prompt(
        `Сколько продать? В наличии: ${maxQty}. Цена за 1: ${formatColl(unitPrice)}.`,
        String(maxQty)
      );
      if (raw === null) {
        // отмена
        render();
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        render();
        return;
      }
      qtyToSell = clamp(Math.floor(n), 1, maxQty);
    }

    const totalPrice = unitPrice * qtyToSell;

    if (isStackableItem(it) && maxQty > qtyToSell) {
      it.qty = maxQty - qtyToSell;
    } else {
      it.equipped = false;
      p.inventory.splice(idx, 1);
    }

    p.money += totalPrice;
    const qtyLabel = qtyToSell > 1 ? ` ×${qtyToSell}` : "";
    pushLog(`Продано: <strong>${it.name}${qtyLabel}</strong> за ${formatColl(totalPrice)}.`, "muted");
    if (it.type === "resource" || it.type === "trophy") {
      gainProfessionXp(2, "resource");
    }
    saveGame(state);
    render();
  }

  function openSellMenu(backId) {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    const sellables = p.inventory.filter((x) => x.type === "trophy" || x.type === "resource");
    renderScene([
      { html: `<strong>Продажа</strong>`, tone: "normal" },
      { html: `Можно продавать трофеи и ресурсы. Деньги: <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
      { html: `<div class="sep"></div>Выбери предмет:`, tone: "normal" },
    ]);
    if (!sellables.length) {
      addAction("Нечего продавать", () => {}, { disabled: true });
    } else {
      for (const it of sellables.slice(0, 12)) {
        const unitPrice = estimateSellPrice(it);
        const qty = typeof it.qty === "number" && it.qty > 0 ? it.qty : 1;
        const labelQty = qty > 1 ? ` ×${qty}` : "";
        addAction(
          `${it.name}${labelQty} — ${formatCollShort(unitPrice)} за 1`,
          () => sellItem(it.id),
          { primary: true }
        );
      }
    }
    addAction("Назад", () => townDistrict(backId), {});
  }

  function buyHome(tier) {
    const p = state.player;
    if (!p) return;
    const h = HOUSING.find((x) => x.tier === tier);
    if (!h) return;
    if (p.money < h.price) return;
    p.money -= h.price;
    p.home = { tier: h.tier, name: h.name };
    pushLog(`Ты приобрёл жильё: <strong>${h.name}</strong> за ${formatColl(h.price)}.`, "normal");
    saveGame(state);
    townDistrict("housing");
  }

  function townDistrict(id) {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();

    if (id === "guild") {
      const hintBoss = state.floor?.bossDefeated
        ? "Босс 1-го этажа уже побеждён."
        : "Босс 1-го этажа ещё жив.";
      renderScene([
        { html: `<strong>Гильдия.</strong> Здесь собирают рейды и обсуждают тактики.`, tone: "normal" },
        { html: `Справка: <span class="mono">${hintBoss}</span>`, tone: "muted" },
        { html: `Совет: на босса лучше идти с уровнем <strong>5+</strong> и запасом зелий.`, tone: "muted" },
        { html: `<div class="sep"></div>Онлайн-функции гильдий управляются через социальное меню.`, tone: "muted" },
      ]);
      addAction("Поговорить с регистратором (квесты)", () => openNpcDialog("npc_guild_receptionist"), {
        primary: true,
      });
      addAction("К первому этажу", () => floor1Hub(), {});
      addAction("Социальное меню (гильдия/друзья/пати)", () => openSocialMenu(), {});
      addAction("Назад", () => goToTown(), {});
      return;
    }

    if (id === "weaponShop") {
      const catalog = shopCatalogWeapon();
      renderScene([
        {
          html: `<strong>Магазин оружия.</strong> Любое оружие для разных стилей. Экипировать можно только при выполнении требований по характеристикам.`,
          tone: "normal",
        },
        { html: `Деньги: <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
        { html: `<div class="sep"></div>Покупка:`, tone: "normal" },
      ]);
      for (const e of catalog) {
        addAction(`${e.name} — ${formatCollShort(e.price)}`, () => buyFromShop(e), { primary: true, disabled: p.money < e.price });
      }
      addAction("Продать (трофеи/ресурсы)", () => openSellMenu("weaponShop"), {});
      addAction("Назад", () => goToTown(), {});
      return;
    }

    if (id === "potionShop") {
      renderScene([
        { html: `<strong>Магазин зелий.</strong> Расходники — страховка.`, tone: "normal" },
        { html: `Деньги: <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
        { html: `<div class="sep"></div>Покупка:`, tone: "normal" },
      ]);
      for (const e of SHOP_POTIONS) {
        addAction(`${e.name} — ${formatCollShort(e.price)}`, () => buyFromShop(e), { primary: true, disabled: p.money < e.price });
      }
      addAction("Поговорить с алхимиком (квесты)", () => openNpcDialog("npc_potion_alchemist"), {});
      addAction("Продать (трофеи/ресурсы)", () => openSellMenu("potionShop"), {});
      addAction("Назад", () => goToTown(), {});
      return;
    }

    if (id === "resourceShop") {
      renderScene([
        { html: `<strong>Лавка ресурсов.</strong> Руда, слитки, детали.`, tone: "normal" },
        { html: `Деньги: <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
        { html: `<div class="sep"></div>Покупка:`, tone: "normal" },
      ]);
      for (const e of SHOP_RESOURCES) {
        addAction(`${e.name} — ${formatCollShort(e.price)}`, () => buyFromShop(e), { primary: true, disabled: p.money < e.price });
      }
      addAction("Поговорить с подмастерьем (квест)", () => openNpcDialog("npc_crafter_apprentice"), {});
      addAction("Продать (трофеи/ресурсы)", () => openSellMenu("resourceShop"), {});
      addAction("Назад", () => goToTown(), {});
      return;
    }

    if (id === "housing") {
      const currentTier = p.home?.tier ?? 0;
      renderScene([
        { html: `<strong>Жилой район.</strong> Можно купить жильё (чем лучше — тем дороже).`, tone: "normal" },
        { html: `Текущее жильё: <strong>${p.home?.name ?? "Без жилья"}</strong>. Деньги: <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
        { html: `<div class="sep"></div>Варианты:`, tone: "normal" },
      ]);
      for (const h of HOUSING) {
        if (h.tier <= currentTier) continue;
        addAction(`${h.name} — ${formatCollShort(h.price)}`, () => buyHome(h.tier), { primary: true, disabled: p.money < h.price });
      }
      addAction("Описание бонусов", () => {
        clearActions();
        renderScene([
          { html: `<strong>Жильё и бонусы</strong>`, tone: "normal" },
          { html: `<div class="sep"></div>`, tone: "muted" },
          ...HOUSING.slice(1).map((h) => ({ html: `<strong>${h.name}</strong> — ${formatColl(h.price)}<br/><span class="muted">${h.desc}</span>`, tone: "normal" })),
        ]);
        addAction("Назад", () => townDistrict("housing"), { primary: true });
      }, {});
      addAction("Назад", () => goToTown(), {});
      return;
    }
  }

  function beginHunt() {
    const p = state.player;
    if (!p) return startNewRun();
    setSceneTownMode(false);
    const table = mobTableForLevel(p.level);
    const mobBase = pick(table);

    const mob = {
      id: mobBase.id,
      name: mobBase.name,
      level: p.level,
      maxHp: mobBase.hp,
      hp: mobBase.hp,
      atk: mobBase.atk,
      def: mobBase.def,
      xp: mobBase.xp,
      money: mobBase.money,
      drops: mobBase.drops,
      effects: {
        defDownTurns: 0,
        defDownAmount: 0,
        atkDownTurns: 0,
        atkDownAmount: 0,
        stunned: 0,
        bleeding: 0,
        poisoned: 0,
      },
    };

    state.inBattle = {
      mob,
      turn: 1,
      playerEffects: {
        evadeTurns: 0,
        empoweredTurns: 0,
        parryReadyTurns: 0,
      },
      tempDefApplied: false,
    };

    pushLog(`Ты выходишь на охоту и встречаешь: <strong>${mob.name}</strong> (HP ${mob.hp}).`, "normal");
    if (net.connected && net.social.party) {
      sendNet({
        type: "battle_state",
        mode: "mob",
        mob: { id: mob.id, name: mob.name, hp: mob.hp, maxHp: mob.maxHp },
      });
    }
    saveGame(state);
    renderBattle();
  }

  function openStatsMenu() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    ensurePlayerModel(p);

    // Базовые значения, ниже них опускать нельзя.
    const baseStats = { ...p.stats };
    /** @type {{str:number; agi:number; end:number; vit:number; luck:number}} */
    const workingStats = { ...p.stats };
    let sxLeft = typeof p.sxFree === "number" ? p.sxFree : 0;

    function recomputePreview() {
      const tmpPlayer = { ...p, stats: workingStats };
      return computeDerived(tmpPlayer);
    }

    function renderStatsScreen() {
      clearActions();
      const d = recomputePreview();

      /** @type {{html:string; tone:"normal"|"muted"}[]} */
      const extraLines = [
        {
          html: `<div class="section-title">Характеристики персонажа</div>
            Свободные СХ: <strong>${sxLeft}</strong>. Каждое нажатие “+” тратит 1 СХ, “−” возвращает, но не ниже текущих базовых значений.`,
          tone: "muted",
        },
        {
          html:
            `<div class="section-title">Текущие значения</div>` +
            `<span class="mono">Сила (STR)</span>: <strong>${workingStats.str}</strong><br/>` +
            `<span class="mono">Ловкость (AGI)</span>: <strong>${workingStats.agi}</strong><br/>` +
            `<span class="mono">Выносливость (END)</span>: <strong>${workingStats.end}</strong><br/>` +
            `<span class="mono">Стойкость (VIT)</span>: <strong>${workingStats.vit}</strong><br/>` +
            `<span class="mono">Удача (LCK)</span>: <strong>${workingStats.luck}</strong>`,
          tone: "normal",
        },
        {
          html:
            `<div class="section-title">Производные параметры (предпросмотр)</div>` +
            `HP: <strong>${p.hp}</strong> / <strong>${Math.round(d.maxHp)}</strong><br/>` +
            `АТК: <strong>${formatStatInt(d.atk)}</strong><br/>` +
            `ЗАЩ: <strong>${formatStatInt(d.def)}</strong><br/>` +
            `Шанс попадания: <strong>${Math.round(d.hitChance * 100)}%</strong><br/>` +
            `Шанс уклонения: <strong>${Math.round(d.evadeChance * 100)}%</strong>`,
          tone: "muted",
        },
        {
          html: `<div class="section-title">Распределение СХ</div>Используй кнопки действий внизу, чтобы перераспределить очки.`,
          tone: "normal",
        },
      ];

      renderSaoInfo("stats", extraLines);

      // На сцене оставляем только короткий заголовок, чтобы не перекрывать фон.
      renderScene([
        {
          html: `<strong>Распределение характеристик.</strong> Детальная информация и предпросмотр — в левом окне.`,
          tone: "normal",
        },
      ]);

      const canMinus = (key) => workingStats[key] > baseStats[key];
      const canPlus = () => sxLeft > 0;

      const entries = [
        { key: "str", label: "Сила (увеличивает АТК и немного выживаемость)" },
        { key: "agi", label: "Ловкость (меткость, уклонение и немного АТК)" },
        { key: "end", label: "Выносливость (общая выживаемость, запас HP)" },
        { key: "vit", label: "Стойкость (защита и HP)" },
        { key: "luck", label: "Удача (криты и немного меткости)" },
      ];

      for (const e of entries) {
        const label = `${e.label}: ${workingStats[e.key]}`;
        addAction(`+ ${label}`, () => {
          if (!canPlus()) return;
          workingStats[e.key] += 1;
          sxLeft -= 1;
          renderStatsScreen();
        }, { primary: true, disabled: !canPlus() });
        addAction(`− ${label}`, () => {
          if (!canMinus(e.key)) return;
          workingStats[e.key] -= 1;
          sxLeft += 1;
          renderStatsScreen();
        }, { disabled: !canMinus(e.key) });
      }

      addAction(
        "Применить изменения",
        () => {
          p.stats = { ...workingStats };
          p.sxFree = sxLeft;
          const dFinal = computeDerived(p);
          // При перераспределении не лечим сверх нового максимума.
          p.hp = Math.min(p.hp, dFinal.maxHp);
          pushLog(
            `Характеристики обновлены. Свободные СХ: <strong>${p.sxFree}</strong>.`,
            "normal"
          );
          saveGame(state);
          render();
        },
        { primary: true, disabled: false }
      );

      addAction("Отменить и вернуться в город", () => goToTown(), {});
    }

    renderStatsScreen();
  }

  function openSkillsMenu() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    ensurePlayerModel(p);

    const w = WEAPONS.find((x) => x.id === p.weaponId);
    const skill = currentWeaponSkill(p);
    const cap = weaponSkillCap(p.level);
    const active = getActiveSkillsForWeapon(p.weaponId);
    const passives = getPassiveSkillsForWeapon(p.weaponId);

    const unlockedActive = active.filter((s) => skill >= s.reqWeaponSkill);
    const lockedActive = active.filter((s) => skill < s.reqWeaponSkill);
    const unlockedPassive = passives.filter((s) => skill >= s.reqWeaponSkill);
    const lockedPassive = passives.filter((s) => skill < s.reqWeaponSkill);

    const fmtList = (list) =>
      !list.length
        ? "<span class=\"muted\">пока ничего</span>"
        : list
            .slice(0, 12)
            .map(
              (s) =>
                `<span class="mono">${s.name}</span> — треб. навык: ${s.reqWeaponSkill}`
            )
            .join("<br/>");

    /** @type {{html:string; tone:"normal"|"muted"}[]} */
    const extraLines = [
      {
        html: `<div class="section-title">Навыки оружия</div>
          Оружие: <strong>${w?.name ?? p.weaponId}</strong>. Навык: <strong>${skill} / ${cap}</strong>.`,
        tone: "normal",
      },
      {
        html: `<div class="section-title">Открытые активные навыки</div>${fmtList(
          unlockedActive
        )}`,
        tone: "normal",
      },
      {
        html: `<div class="section-title">Закрытые активные навыки</div>${fmtList(
          lockedActive
        )}`,
        tone: "muted",
      },
      {
        html: `<div class="section-title">Открытые пассивные навыки</div>${fmtList(
          unlockedPassive
        )}`,
        tone: "normal",
      },
      {
        html: `<div class="section-title">Закрытые пассивные навыки</div>${fmtList(
          lockedPassive
        )}`,
        tone: "muted",
      },
    ];

    renderSaoInfo("skills", extraLines);
    renderScene([
      {
        html: `<strong>Навыки оружия.</strong> Полный список и прогресс — в левом окне.`,
        tone: "normal",
      },
    ]);

    addAction("Назад в город", () => goToTown(), { primary: true });
  }

  function openEquipmentMenu() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    ensurePlayerModel(p);

    const w = WEAPONS.find((x) => x.id === p.weaponId);
    const equippedTrinkets = p.inventory.filter(
      (it) => it.equipped && it.type === "trinket"
    );

    const trinketsHtml =
      equippedTrinkets.length === 0
        ? "<span class=\"muted\">аксессуары не надеты</span>"
        : equippedTrinkets
            .map(
              (t) =>
                `<span class="mono">${t.name}</span> — ${t.desc ?? "без описания"}`
            )
            .join("<br/>");

    /** @type {{html:string; tone:"normal"|"muted"}[]} */
    const extraLines = [
      {
        html: `<div class="section-title">Экипировка</div>
          Текущее оружие: <strong>${w?.name ?? p.weaponId}</strong>.<br/>
          Жильё: <strong>${p.home?.name ?? "Без жилья"}</strong>.`,
        tone: "normal",
      },
      {
        html: `<div class="section-title">Аксессуары</div>${trinketsHtml}`,
        tone: "normal",
      },
      {
        html:
          `<div class="section-title">Подсказка</div>` +
          `Меняй оружие и аксессуары в инвентаре справа, а здесь смотри общую картину билда.`,
        tone: "muted",
      },
    ];

    renderSaoInfo("equipment", extraLines);
    renderScene([
      {
        html: `<strong>Экипировка.</strong> Сводка по оружию, жилью и аксессуарам — в левом окне.`,
        tone: "normal",
      },
    ]);

    addAction("Назад в город", () => goToTown(), { primary: true });
  }

  // --- Первый этаж (детально): поля, лабиринт, босс Illfang ---
  function floor1Hub() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    setSceneTownMode(false);
    const bossStatus = state.floor?.bossDefeated ? "побеждён (можно вызывать снова)" : "жив";
    renderScene([
      { html: `<strong>Первый этаж.</strong> Поля вокруг Города Начала и вход в Лабиринт.`, tone: "normal" },
      { html: `Босс этажа: <strong>${bossStatus}</strong>.`, tone: "muted" },
      { html: `Поля — безопаснее. Лабиринт — опаснее, но выгоднее.`, tone: "muted" },
      { html: `<div class="sep"></div>Выбери локацию 1-го этажа:`, tone: "normal" },
    ]);

    const locations = FLOOR1_LOCATIONS.slice().sort(
      (a, b) => (a.danger ?? 1) - (b.danger ?? 1)
    );
    for (const loc of locations) {
      const danger = loc.danger ?? 1;
      const stars = "★".repeat(danger);
      const label = `${loc.name} (${stars || "★"})`;
      addAction(
        label,
        () => {
          beginFloorHunt(loc.id);
          updateVisitQuestsForArea(loc.id);
        },
        { primary: danger >= 4 }
      );
    }

    addAction("Вход в Лабиринт (описание)", () => labyrinthEntrance(), {});
    addAction("Комната босса (Илфанг)", () => beginFloor1Boss(), { primary: true });
    addAction("Назад в Город Начала", () => goToTown(), {});
  }

  function openProfessionMenu() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    ensurePlayerModel(p);

    const prof = p.professionId ? getProfessionById(p.professionId) : null;

    /** @type {{html:string; tone:"normal"|"muted"}[]} */
    const lines = [];

    if (!prof) {
      lines.push(
        { html: `<strong>Профессии</strong>`, tone: "normal" },
        {
          html:
            "Ты можешь выбрать <strong>одну</strong> профессию. Она качается до 100 уровня, но чем выше — тем сложнее. Выбор <strong>без возврата</strong>.",
          tone: "muted",
        },
        { html: `<div class="sep"></div>Доступные профессии:`, tone: "normal" }
      );

      for (const pr of PROFESSIONS) {
        lines.push({
          html: `<strong>${pr.name}</strong><br/><span class="muted">${pr.desc}</span>`,
          tone: "normal",
        });
      }

      renderScene(lines);
      for (const pr of PROFESSIONS) {
        addAction(
          `Выбрать: ${pr.name}`,
          () => {
            selectProfession(pr.id);
          },
          { primary: true }
        );
      }
      addAction("Назад в Город Начала", () => goToTown(), {});
      return;
    }

    const level = p.professionLevel ?? 0;
    const xp = p.professionXp ?? 0;
    const need = professionXpToNext(level);
    const gate = p.professionGateComplete;

    lines.push(
      { html: `<strong>Профессия: ${prof.name}</strong>`, tone: "normal" },
      {
        html: `Текущий уровень: <strong>${level >= 100 ? "100 (макс.)" : level}</strong>${
          level > 0 && level < 100 && Number.isFinite(need)
            ? ` — опыт: <span class="mono">${xp} / ${need}</span>`
            : ""
        }`,
        tone: "muted",
      },
      {
        html:
          "Кривая опыта усложняется после 50 и особенно после 80 уровня. Переход на 100 возможен только при выполненном спец-условии.",
        tone: "muted",
      }
    );

    if (!gate && level >= 80 && level < 100) {
      lines.push({
        html:
          "Особое условие: чтобы открыть путь к 100 уровню, нужно проявить себя в тяжёлом испытании. Победа над боссом 1-го этажа при такой профессии считается достаточным доказательством.",
        tone: "muted",
      });
    } else if (gate && level < 100) {
      lines.push({
        html:
          "Спец-условие уже выполнено. Теперь всё упирается только в опыт профессии.",
        tone: "muted",
      });
    }

    lines.push({ html: `<div class="sep"></div>`, tone: "muted" });
    renderScene(lines);

    addAction("Назад в Город Начала", () => goToTown(), { primary: true });
  }

  function selectProfession(professionId) {
    const p = state.player;
    if (!p) return;
    ensurePlayerModel(p);
    if (p.professionId) {
      pushLog(
        `Профессия уже выбрана: <strong>${getProfessionById(p.professionId)?.name ?? p.professionId}</strong>. Сменить её нельзя.`,
        "muted"
      );
      saveGame(state);
      openProfessionMenu();
      return;
    }
    const prof = getProfessionById(professionId);
    if (!prof) {
      pushLog("Неизвестная профессия. Сообщи автору, чтобы он проверил конфиги.", "muted");
      saveGame(state);
      goToTown();
      return;
    }
    p.professionId = prof.id;
    p.professionLevel = 1;
    p.professionXp = 0;
    p.professionGateComplete = false;
    pushLog(
      `Ты выбираешь профессию: <strong>${prof.name}</strong>. С этого момента она будет расти до 100 уровня, но всё сложнее с каждым десятком уровней.`,
      "normal"
    );
    saveGame(state);
    openProfessionMenu();
  }

  function labyrinthEntrance() {
    clearActions();
    renderScene([
      { html: `<strong>Вход в Лабиринт.</strong> Каменные арки, холодный воздух, и тишина.`, tone: "normal" },
      { html: `Сюда ходят группами. В одиночку — только если уверен в себе и с запасом зелий.`, tone: "muted" },
      { html: `<div class="sep"></div>`, tone: "muted" },
    ]);
    addAction("Зайти в Лабиринт", () => beginFloorHunt("labyrinth"), { primary: true });
    addAction("Назад", () => floor1Hub(), {});
  }

  function beginFloorHunt(areaId) {
    const p = state.player;
    if (!p) return startNewRun();
    setSceneTownMode(false);
    const loc = getFloor1Location(areaId);
    const table = floor1MobTable(loc.id, p.level);
    let mobBase = pick(table);

    let isElite = false;
    const eliteChance = loc.eliteChance ?? 0;
    if (eliteChance > 0 && Math.random() < eliteChance) {
      isElite = true;
      mobBase = {
        ...mobBase,
        name: `Элита: ${mobBase.name}`,
        hp: Math.floor(mobBase.hp * 1.7),
        atk: Math.floor(mobBase.atk * 1.4),
        def: Math.floor(mobBase.def * 1.35),
        xp: Math.floor(mobBase.xp * 2.4),
        money: Math.floor(mobBase.money * 2.2),
      };
    }

    const mob = {
      id: mobBase.id,
      name: mobBase.name,
      level: p.level,
      maxHp: mobBase.hp,
      hp: mobBase.hp,
      atk: mobBase.atk,
      def: mobBase.def,
      xp: mobBase.xp,
      money: mobBase.money,
      drops: mobBase.drops,
      effects: {
        defDownTurns: 0,
        defDownAmount: 0,
        atkDownTurns: 0,
        atkDownAmount: 0,
        stunned: 0,
        bleeding: 0,
        poisoned: 0,
      },
      meta: { floor: 1, areaId: loc.id, isBoss: false, isElite },
    };

    state.inBattle = {
      mob,
      turn: 1,
      playerEffects: {
        evadeTurns: 0,
        empoweredTurns: 0,
        parryReadyTurns: 0,
      },
      tempDefApplied: false,
    };

    pushLog(`Локация: <strong>${loc.name}</strong>. Враг: <strong>${mob.name}</strong>.`, "normal");
    if (net.connected && net.social.party) {
      sendNet({
        type: "battle_state",
        mode: "mob",
        mob: { id: mob.id, name: mob.name, hp: mob.hp, maxHp: mob.maxHp },
      });
    }
    saveGame(state);
    renderBattle();
  }

  function beginFloor1Boss() {
    const p = state.player;
    if (!p) return startNewRun();
    setSceneTownMode(false);

    state.floor = state.floor ?? { id: 1, cleared: false, bossDefeated: false };
    const now = Date.now();
    const cdUntil = state.floor.bossCooldownUntil || 0;
    if (cdUntil && now < cdUntil) {
      const leftMs = cdUntil - now;
      const leftSec = Math.max(1, Math.ceil(leftMs / 1000));
      pushLog(
        `Босс ещё восстанавливается после прошлого боя. Подожди <strong>${leftSec} сек.</strong> перед повторной попыткой.`,
        "muted"
      );
      saveGame(state);
      floor1Hub();
      return;
    }

    // Босс стал значительно плотнее и опаснее — соло-убийство сложнее.
    const barMax = 130 + p.level * 14;
    const boss = {
      id: "boss_illfang",
      name: "Илфанг — Кобольд-Лорд (Босс 1-го этажа)",
      level: 1,
      maxHp: barMax,
      hp: barMax,
      atk: Math.floor((13 + p.level * 3.0)),
      def: 6 + Math.floor(p.level * 1.3),
      xp: 100 + p.level * 14,
      money: 2_500 + p.level * 120,
      drops: [],
      effects: {
        defDownTurns: 0,
        defDownAmount: 0,
        atkDownTurns: 0,
        atkDownAmount: 0,
        stunned: 0,
        bleeding: 0,
        poisoned: 0,
      },
      boss: {
        barsTotal: 4,
        barIndex: 1,
        weapon: "Топор",
        phase: 1,
      },
      meta: { floor: 1, areaId: "bossroom", isBoss: true },
    };

    state.inBattle = {
      mob: boss,
      turn: 1,
      playerEffects: {
        evadeTurns: 0,
        empoweredTurns: 0,
        parryReadyTurns: 0,
      },
      tempDefApplied: false,
    };

    pushLog(`<strong>Рейд.</strong> Ты входишь в зал и видишь босса: <strong>Илфанг — Кобольд-Лорд</strong>.`, "normal");
    pushLog(`У босса <strong>4 полоски HP</strong>. На последней он сменит оружие.`, "muted");
    if (net.connected && net.social.party) {
      sendNet({
        type: "battle_state",
        mode: "boss1",
        mob: { id: boss.id, name: boss.name, hp: boss.hp, maxHp: boss.maxHp },
      });
    }
    saveGame(state);
    renderBattle();
  }

  // --- Социальное меню и простые онлайн‑действия ---
  function openSocialMenu() {
    clearActions();
    initNetworkOnce();
    const p = state.player;
    if (!p) return startNewRun();

    const guild = net.social.guild;
    const party = net.social.party;
    const spouse = net.social.spouse;
    const friends = net.social.friends || [];

    const lines = [
      { html: `<strong>Социальное меню (онлайн)</strong>`, tone: "normal" },
      {
        html: `Подключение: <span class="mono">${net.connected ? "есть" : "нет (офлайн режим)"}</span>`,
        tone: "muted",
      },
      {
        html: `Твой ID: <span class="mono">${net.playerId || "—"}</span>. Игроков онлайн: <strong>${(net.online || []).length}</strong>.`,
        tone: "muted",
      },
      {
        html: `Гильдия: <strong>${guild ? guild.name : "нет"}</strong>. Пати: <strong>${party ? party.id : "нет"}</strong>.`,
        tone: "muted",
      },
      {
        html: `Брак: <strong>${spouse && spouse.name ? spouse.name : "нет"}</strong>. Друзей: <strong>${friends.length}</strong>.`,
        tone: "muted",
      },
      { html: `<div class="sep"></div>Что хочешь сделать?`, tone: "normal" },
    ];
    renderScene(lines);

    addAction("Создать гильдию", () => {
      if (!net.connected) {
        pushLog("Нужен запущенный сервер, чтобы создать гильдию.", "muted");
        render();
        return;
      }
      const name = prompt("Название гильдии:");
      if (!name) {
        render();
        return;
      }
      sendNet({ type: "create_guild", name: String(name).slice(0, 24) });
      render();
    }, { primary: true });

    addAction("Список друзей", () => {
      renderFriendsWindow();
    }, {});

    addAction("Список пати", () => {
      renderPartyWindow();
    }, {});

    addAction("Добавить друга (ID игрока)", () => {
      if (!net.connected) {
        pushLog("Нужен запущенный сервер, чтобы добавлять друзей.", "muted");
        render();
        return;
      }
      const id = prompt("Введите ID игрока (например p2):");
      if (!id) {
        render();
        return;
      }
      sendNet({ type: "add_friend", targetId: String(id).trim() });
      render();
    }, {});

    addAction("Пригласить в пати (ID)", () => {
      if (!net.connected) {
        pushLog("Нужен запущенный сервер, чтобы собирать пати.", "muted");
        render();
        return;
      }
      const id = prompt("Введите ID игрока для приглашения в пати:");
      if (!id) {
        render();
        return;
      }
      sendNet({ type: "invite_party", targetId: String(id).trim() });
      render();
    }, {});

    addAction("Предложить брак (ID)", () => {
      if (!net.connected) {
        pushLog("Нужен запущенный сервер, чтобы заключать брак.", "muted");
        render();
        return;
      }
      const id = prompt("Введите ID игрока, с которым хочешь заключить брак:");
      if (!id) {
        render();
        return;
      }
      sendNet({ type: "marry", targetId: String(id).trim() });
      render();
    }, {});

    addAction("Совместный бой (случайный моб)", () => {
      if (!net.connected) {
        pushLog("Нужен запущенный сервер и пати, чтобы начать совместный бой.", "muted");
        render();
        return;
      }
      sendNet({ type: "party_start_battle", mode: "mob" });
      render();
    }, {});

    addAction("Совместный бой (босс 1-го этажа)", () => {
      if (!net.connected) {
        pushLog("Нужен запущенный сервер и пати, чтобы идти на босса вместе.", "muted");
        render();
        return;
      }
      sendNet({ type: "party_start_battle", mode: "boss1" });
      render();
    }, {});

    addAction("Назад в город", () => goToTown(), { danger: false });
  }

  function renderFriendsWindow() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    const friends = net.social.friends || [];
    const onlineIds = new Set((net.online || []).map((x) => x.id));

    const lines = [
      { html: `<strong>Друзья</strong>`, tone: "normal" },
      {
        html: `Всего друзей: <strong>${friends.length}</strong>. Подключение: <span class="mono">${net.connected ? "онлайн" : "офлайн"}</span>.`,
        tone: "muted",
      },
      { html: `<div class="sep"></div>`, tone: "muted" },
    ];

    if (!friends.length) {
      lines.push({
        html: `У тебя пока нет друзей в списке. Добавить можно через “Добавить друга (ID игрока)” в социальном меню.`,
        tone: "muted",
      });
    } else {
      for (const fr of friends) {
        const online = onlineIds.has(fr.id);
        const status = online ? "онлайн" : "оффлайн";
        lines.push({
          html: `<strong>${fr.name}</strong> <span class="mono">(${fr.id})</span> — <span class="${online ? "" : "muted"}">${status}</span>`,
          tone: online ? "normal" : "muted",
        });
      }
    }

    renderScene(lines);
    addAction("Назад в социальное меню", () => openSocialMenu(), { primary: true });
    addAction("Назад в город", () => goToTown(), {});
  }

  function renderPartyWindow() {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    const party = net.social.party;
    const onlineIds = new Set((net.online || []).map((x) => x.id));

    const lines = [
      { html: `<strong>Пати</strong>`, tone: "normal" },
      {
        html: `Подключение: <span class="mono">${net.connected ? "онлайн" : "офлайн"}</span>.`,
        tone: "muted",
      },
      { html: `<div class="sep"></div>`, tone: "muted" },
    ];

    if (!party) {
      lines.push({
        html: `Ты сейчас не состоишь в пати. Пригласи игрока через “Пригласить в пати (ID)” в социальном меню.`,
        tone: "muted",
      });
    } else {
      const members = party.members || [];
      lines.push({
        html: `ID пати: <span class="mono">${party.id}</span>. Участников: <strong>${members.length}</strong>.`,
        tone: "muted",
      });
      lines.push({ html: `<div class="sep"></div>Состав:`, tone: "normal" });
      for (const m of members) {
        const online = onlineIds.has(m.id);
        const status = online ? "онлайн" : "оффлайн";
        const isLeader = party.leaderId === m.id;
        const leaderMark = isLeader ? " — лидер" : "";
        lines.push({
          html: `<strong>${m.name}</strong> <span class="mono">(${m.id})</span>${leaderMark} — <span class="${online ? "" : "muted"}">${status}</span>`,
          tone: online ? "normal" : "muted",
        });
      }
    }

    renderScene(lines);
    addAction("Назад в социальное меню", () => openSocialMenu(), { primary: true });
    addAction("Назад в город", () => goToTown(), {});
  }

  function ensureActiveLoadout(p) {
    ensurePlayerModel(p);
    const skill = currentWeaponSkill(p);
    const all = getActiveSkillsForWeapon(p.weaponId);
    const unlocked = all.filter((s) => skill >= s.reqWeaponSkill);
    if (!Array.isArray(p.activeLoadout)) {
      p.activeLoadout = [];
    }
    // выбрасываем навыки не для текущего оружия или ещё не открытые
    p.activeLoadout = p.activeLoadout.filter((id) => unlocked.some((s) => s.id === id));
    // автозаполнение слотов до 5
    for (const s of unlocked) {
      if (p.activeLoadout.length >= 5) break;
      if (!p.activeLoadout.includes(s.id)) p.activeLoadout.push(s.id);
    }
  }

  function getEquippedActiveSkills(p) {
    ensureActiveLoadout(p);
    const all = getActiveSkillsForWeapon(p.weaponId);
    return p.activeLoadout
      .map((id) => all.find((s) => s.id === id) || null)
      .filter((x) => x);
  }

  function battleComputeMob(mob) {
    let def = mob.def;
    let atk = mob.atk;
    if (mob.effects.defDownTurns > 0) def = Math.max(0, def - mob.effects.defDownAmount);
    if (mob.effects.atkDownTurns > 0) atk = Math.max(0, atk - mob.effects.atkDownAmount);
    return { def, atk };
  }

  function maybeApplyStartOfBattleTempDef(b) {
    const p = state.player;
    if (!p) return;
    if (b.tempDefApplied) return;
    if (p.temp.nextFightDef !== 0) {
      // эффект расходуется на старт боя — как “зелье стойкости”
      b.playerTempDef = p.temp.nextFightDef;
      p.temp.nextFightDef = 0;
    } else {
      b.playerTempDef = 0;
    }
    b.tempDefApplied = true;
  }

  function renderBattle() {
    clearActions();
    const p = state.player;
    const b = state.inBattle;
    if (!p || !b) return goToTown();

    maybeApplyStartOfBattleTempDef(b);
    const d = computeDerived(p);
    const mobNow = battleComputeMob(b.mob);
    const eff = b.playerEffects;

    const playerAtk = Math.round(d.atk);
    const playerDefTotal = Math.round(d.def + (b.playerTempDef || 0));
    const mobAtk = Math.round(mobNow.atk);
    const mobDef = Math.round(mobNow.def);

    let mobLine = `${b.mob.name}: HP <strong>${b.mob.hp}</strong> / ${b.mob.maxHp} • АТК <strong>${mobAtk}</strong> • ЗАЩ <strong>${mobDef}</strong>`;
    if (b.mob.boss?.barsTotal) {
      mobLine = `${b.mob.name}: <strong>Полоска ${b.mob.boss.barIndex}/${b.mob.boss.barsTotal}</strong> • HP <strong>${b.mob.hp}</strong> / ${b.mob.maxHp} • АТК <strong>${mobAtk}</strong> • ЗАЩ <strong>${mobDef}</strong> • <span class="mono">${b.mob.boss.weapon}</span>`;
    }

    const lines = [
      { html: `<strong>Бой</strong> — ход ${b.turn}`, tone: "normal" },
      { html: `Ты: HP <strong>${p.hp}</strong> / ${Math.round(d.maxHp)} • АТК <strong>${playerAtk}</strong> • ЗАЩ <strong>${playerDefTotal}</strong>`, tone: "muted" },
      { html: mobLine, tone: "muted" },
    ];

    const status = [];
    if (b.mob.effects.stunned > 0) status.push("враг оглушён");
    if (b.mob.effects.bleeding > 0) status.push("кровотечение");
    if (b.mob.effects.poisoned > 0) status.push("яд");
    if (eff.evadeTurns > 0) status.push("уклонение");
    if (eff.empoweredTurns > 0) status.push("усиление");
    if (eff.parryReadyTurns > 0) status.push("парирование");
    if (status.length) lines.push({ html: `Статусы: <span class="mono">${status.join(" • ")}</span>`, tone: "muted" });

    lines.push({ html: `<div class="sep"></div>Выбери действие:`, tone: "normal" });
    renderScene(lines);

    addAction("Обычная атака", () => playerAttack({ type: "basic" }), { primary: true });

    const skills = getEquippedActiveSkills(p);
    const cds = b.skillCooldowns || {};
    for (const s of skills) {
      const cdLeft = cds[s.id] ?? 0;
      const label =
        cdLeft > 0 ? `Навык: ${s.name} (КД: ${cdLeft})` : `Навык: ${s.name}`;
      addAction(
        label,
        () => playerAttack({ type: "skill", skillId: s.id }),
        { disabled: cdLeft > 0 }
      );
    }

    addAction("Попытаться сбежать", () => tryFlee(), {});
    addAction("В город (если не в бою)", () => goToTown(), { disabled: true });
  }

  function playerAttack(action) {
    const p = state.player;
    const b = state.inBattle;
    if (!p || !b) return;

    const d = computeDerived(p);
    const mobNow = battleComputeMob(b.mob);
    const eff = b.playerEffects;

    // эффекты “дота” на старте хода игрока не применяем — только на старте хода врага, чтобы было читаемо

    let text = "";
    let dmg = 0;
    let crit = false;
    let bonusXpOnKill = 0;
    let bonusMoneyOnCrit = 0;

    const baseCrit = d.crit;
    // базовая точность/уклонение берём из производных характеристик игрока и уровня врага
    let hitChance = d.hitChance; // уже учтены статы AGI/LUCK

    // катана: техники чуть более рискованные — легче промахнуться
    if (p.weaponId === "katana" && action.type !== "basic") hitChance -= 0.05;

    // собственный бафф уклонения даёт позиционное преимущество → немного легче попадать
    if (b.playerEffects.evadeTurns > 0) hitChance += 0.02;

    let mult = 1.0;
    let ignoresDef = 0;
    let apply = { bleed: 0, poison: 0, stun: 0, defDown: 0, atkDown: 0, evade: 0, empower: 0, parry: 0 };

    let usedSkillId = null;

    if (action.type === "basic") {
      text = "Ты наносишь обычную атаку.";
      mult = 1.0;
    } else if (action.type === "skill") {
      const baseSkill = ACTIVE_SKILLS.find((s) => s.id === action.skillId);
      if (!baseSkill) {
        renderBattle();
        return;
      }
      usedSkillId = baseSkill.id;
      const techId = baseSkill.variantOf || baseSkill.id;
      text = `Ты используешь навык: <strong>${baseSkill.name}</strong>.`;
      // техники — “вкус” под оружие
      switch (techId) {
        // rapier
        case "thrust":
          mult = 1.05;
          ignoresDef = roll(0.20) ? 999 : 0;
          break;
        case "pierce_line":
          mult = 0.78;
          ignoresDef = 2;
          // 2–3 удара
          break;
        case "needle_zero":
          mult = 1.05;
          // повышенный крит
          break;
        // sword
        case "slash":
          mult = 1.02;
          apply.bleed = roll(0.18) ? 2 : 0;
          break;
        case "guard_break":
          mult = 0.65;
          apply.defDown = 2;
          break;
        case "parry":
          mult = 0.50;
          apply.parry = 2;
          break;
        // katana
        case "draw_cut":
          mult = 1.18;
          break;
        case "dash_cut":
          mult = 1.12;
          bonusXpOnKill = 8 + p.level * 2;
          break;
        case "moon_arc":
          mult = 1.10;
          break;
        // axe
        case "cleave":
          mult = 1.08;
          ignoresDef = 2;
          break;
        case "overhead":
          mult = 1.12;
          apply.stun = roll(0.18) ? 1 : 0;
          break;
        case "split_earth":
          mult = 1.24;
          ignoresDef = 3;
          break;
        // spear
        case "stop_thrust":
          mult = 1.02;
          apply.atkDown = roll(0.25) ? 2 : 0;
          break;
        case "counter_line":
          mult = 0.55;
          apply.parry = 1;
          break;
        case "lance_storm":
          mult = 0.74;
          break;
        // dagger
        case "double_cut":
          mult = 0.72;
          apply.poison = roll(0.16) ? 2 : 0;
          break;
        case "shadow_step":
          mult = 0.55;
          apply.evade = 2;
          apply.empower = 1;
          break;
        case "heart_pin":
          mult = 1.00;
          break;
        default:
          mult = 1.0;
      }
    }

    // уклонение цели зависит от её уровня + статусов
    let mobEvade = clamp(0.04 + b.mob.level * 0.004, 0.02, 0.18);
    if (b.mob.effects.stunned > 0) mobEvade *= 0.4; // оглушённым сложнее уйти от удара

    const finalHitChance = clamp(hitChance - mobEvade, 0.05, 0.98);

    // крит
    let critChance = baseCrit;
    if (p.weaponId === "rapier" && action.type === "tech" && action.techId === "needle_zero") critChance += 0.08;
    if (p.weaponId === "katana" && action.type === "tech" && action.techId === "moon_arc") critChance += 0.06;
    if (p.weaponId === "dagger" && action.type === "tech" && action.techId === "heart_pin") {
      if (b.mob.effects.poisoned > 0 || b.mob.effects.bleeding > 0) critChance += 0.14;
    }
    critChance = clamp(critChance, 0, 0.45);

    // усиление
    if (eff.empoweredTurns > 0) mult += 0.12;

    // расчёт урона
    if (!roll(finalHitChance)) {
      const missMsg =
        b.mob.effects.stunned > 0
          ? `${text} Ты промахнулся даже по оглушённому врагу — неудачный замах.`
          : `${text} Ты промахнулся — враг уходит с линии удара.`;
      pushLog(missMsg, "muted");
    } else {
      crit = roll(critChance);
      const critMult = crit ? (1.55 + clamp(p.weaponSkill / 220, 0, 0.35)) : 1.0;
      const skillScale = 1 + clamp(p.weaponSkill / 220, 0, 0.35);
      const raw = d.atk * mult * skillScale * critMult;

      let defEff = mobNow.def;
      if (typeof ignoresDef === "number" && ignoresDef > 0) defEff = Math.max(0, defEff - ignoresDef);
      if (ignoresDef >= 999) defEff = 0;

      dmg = Math.max(1, Math.floor(raw - defEff));

      // многократные техники
      if (action.type === "skill") {
        const techId =
          (ACTIVE_SKILLS.find((s) => s.id === action.skillId)?.variantOf ||
            ACTIVE_SKILLS.find((s) => s.id === action.skillId)?.id ||
            "") ;
        if (["pierce_line", "double_cut", "lance_storm"].includes(techId)) {
          const hits = techId === "pierce_line" ? (roll(0.35) ? 3 : 2) : 2;
          const per = Math.max(1, Math.floor(dmg * 0.85));
          dmg = per * hits;
        }
      }

      b.mob.hp = Math.max(0, b.mob.hp - dmg);
      if (net.connected && net.social.party) {
        sendNet({ type: "battle_damage", delta: dmg });
      }

      if (crit && p.weaponId === "rapier" && action.type === "skill") {
        const techId =
          (ACTIVE_SKILLS.find((s) => s.id === action.skillId)?.variantOf ||
            ACTIVE_SKILLS.find((s) => s.id === action.skillId)?.id ||
            "") ;
        if (techId === "needle_zero") {
        bonusMoneyOnCrit = 1;
        }
      }

      // применяем эффекты
      const isBoss = !!b.mob.meta?.isBoss;
      if (apply.bleed) {
        const val = isBoss ? 1 : apply.bleed;
        b.mob.effects.bleeding = Math.max(b.mob.effects.bleeding, val);
      }
      if (apply.poison) {
        const val = isBoss ? 1 : apply.poison;
        b.mob.effects.poisoned = Math.max(b.mob.effects.poisoned, val);
      }
      if (apply.stun) {
        const val = isBoss ? 1 : apply.stun;
        b.mob.effects.stunned = Math.max(b.mob.effects.stunned, val);
      }
      if (apply.defDown) {
        const turns = isBoss ? 1 : 2;
        const amount = isBoss ? 1 : 2;
        b.mob.effects.defDownTurns = Math.max(b.mob.effects.defDownTurns, turns);
        b.mob.effects.defDownAmount = Math.max(b.mob.effects.defDownAmount, amount);
      }
      if (apply.atkDown) {
        const turns = isBoss ? 1 : 2;
        const amount = isBoss ? 1 : 2;
        b.mob.effects.atkDownTurns = Math.max(b.mob.effects.atkDownTurns, turns);
        b.mob.effects.atkDownAmount = Math.max(b.mob.effects.atkDownAmount, amount);
      }
      if (apply.evade) eff.evadeTurns = Math.max(eff.evadeTurns, apply.evade);
      if (apply.empower) eff.empoweredTurns = Math.max(eff.empoweredTurns, apply.empower);
      if (apply.parry) eff.parryReadyTurns = Math.max(eff.parryReadyTurns, apply.parry);

      pushLog(`${text} Ты наносишь ${dmg} урона${crit ? " <strong>(КРИТ)</strong>" : ""}.`, "normal");
    }

    // босс: 4 полоски HP и смена оружия на 4-й
    if (b.mob.hp <= 0 && b.mob.boss?.barsTotal) {
      const boss = b.mob;
      if (boss.boss.barIndex < boss.boss.barsTotal) {
        boss.boss.barIndex += 1;
        boss.hp = boss.maxHp;
        pushLog(`<strong>${boss.name}</strong> теряет полоску HP.`, "normal");
        if (boss.boss.barIndex === 4) {
          boss.boss.phase = 2;
          boss.boss.weapon = "Найтрейвер (Nightraver)";
          boss.atk = Math.floor(boss.atk * 1.25);
          boss.def = Math.max(0, boss.def - 1);
          pushLog(`<strong>Перелом!</strong> Илфанг меняет оружие на <strong>Найтрейвер</strong>.`, "normal");
        }
      } else {
        winBossFloor1({ bonusXpOnKill, bonusMoneyOnCrit });
        return;
      }
    }

    // если использовали навык — ставим КД
    if (usedSkillId) {
      const skillDef = ACTIVE_SKILLS.find((s) => s.id === usedSkillId);
      if (!b.skillCooldowns) b.skillCooldowns = {};
      const cd = Math.max(0, skillDef?.cooldown ?? 1);
      if (cd > 0) b.skillCooldowns[usedSkillId] = cd;
    }

    // обычная победа
    if (b.mob.hp <= 0) {
      winBattle({ bonusXpOnKill, bonusMoneyOnCrit });
      return;
    }

    // ход врага
    enemyTurn();
  }

  function enemyTurn() {
    const p = state.player;
    const b = state.inBattle;
    if (!p || !b) return;
    b.turn += 1;

    const d = computeDerived(p);
    const mobNow = battleComputeMob(b.mob);
    const eff = b.playerEffects;

    // доты на старте хода врага
    if (b.mob.effects.bleeding > 0) {
      const baseBleed = Math.max(1, Math.floor(2 + p.level * 0.6));
      const bleedDmg = b.mob.meta?.isBoss ? Math.max(1, Math.floor(baseBleed * 0.4)) : baseBleed;
      b.mob.hp = Math.max(0, b.mob.hp - bleedDmg);
      pushLog(`${b.mob.name} теряет ${bleedDmg} HP от кровотечения.`, "muted");
    }
    if (b.mob.effects.poisoned > 0) {
      const basePoison = Math.max(1, Math.floor(2 + p.level * 0.4));
      const poisonDmg = b.mob.meta?.isBoss ? Math.max(1, Math.floor(basePoison * 0.4)) : basePoison;
      b.mob.hp = Math.max(0, b.mob.hp - poisonDmg);
      pushLog(`${b.mob.name} теряет ${poisonDmg} HP от яда.`, "muted");
    }

    if (b.mob.hp <= 0) {
      winBattle({ bonusXpOnKill: 0, bonusMoneyOnCrit: 0 });
      return;
    }

    // оглушение
    if (b.mob.effects.stunned > 0) {
      b.mob.effects.stunned -= 1;
      pushLog(`${b.mob.name} оглушён и пропускает ход.`, "muted");
      tickEffectsAfterRound();
      saveGame(state);
      renderBattle();
      return;
    }

    // шанс попадания врага по игроку: базовая точность врага против твоего уклонения
    let enemyBaseHit = 0.86;
    if (b.mob.meta?.isBoss) enemyBaseHit += 0.06;

    const playerEvadeBase = d.evadeChance;
    let playerEvade = playerEvadeBase;
    if (eff.evadeTurns > 0) {
      // активный бафф уклонения усиливает шанс ухода от удара
      playerEvade = clamp(playerEvade * 1.6 + 0.08, 0.05, 0.6);
    }

    const enemyFinalHit = clamp(enemyBaseHit - playerEvade, 0.05, 0.97);

    if (!roll(enemyFinalHit)) {
      pushLog(`${b.mob.name} атакует, но ты уходишь с линии удара.`, "muted");
      tickEffectsAfterRound();
      saveGame(state);
      renderBattle();
      return;
    }

    // парирование
    let parried = false;
    if (eff.parryReadyTurns > 0) {
      const parryChance = 0.22 + clamp(p.weaponSkill / 260, 0, 0.22);
      if (roll(parryChance)) parried = true;
    }

    const playerDef = d.def + (b.playerTempDef || 0);
    let incoming = Math.max(1, Math.floor(mobNow.atk - playerDef));

    // босс: на 2-й фазе иногда усиливает удар
    if (b.mob.boss?.phase === 2) {
      if (roll(0.20)) {
        incoming = Math.floor(incoming * 1.35);
        pushLog(`Илфанг ускоряется с <strong>Найтрейвером</strong>!`, "muted");
      }
      if (roll(0.08)) {
        incoming = Math.floor(incoming * 1.35);
        pushLog(`<strong>Крит босса!</strong>`, "muted");
      }
    }

    if (parried) {
      incoming = Math.max(0, Math.floor(incoming * 0.15));
      pushLog(`Ты <strong>парируешь</strong> удар! Урон снижен до ${incoming}.`, "normal");
    } else {
      pushLog(`${b.mob.name} наносит удар. Урон: ${incoming}.`, "normal");
    }

    p.hp = Math.max(0, p.hp - incoming);

    // контратака при удачном парировании
    if (parried && incoming === 0) {
      const counter = Math.max(1, Math.floor(d.atk * 0.55));
      b.mob.hp = Math.max(0, b.mob.hp - counter);
      pushLog(`Контратака наносит ${counter} урона.`, "muted");
      if (b.mob.hp <= 0) {
        winBattle({ bonusXpOnKill: 0, bonusMoneyOnCrit: 0 });
        return;
      }
    }

    // смерть игрока = удаление персонажа полностью
    if (p.hp <= 0) {
      die();
      return;
    }

    // тик эффектов
    tickEffectsAfterRound();
    saveGame(state);
    renderBattle();
  }

  function tickEffectsAfterRound() {
    const b = state.inBattle;
    if (!b) return;
    const m = b.mob.effects;
    const e = b.playerEffects;
    if (m.defDownTurns > 0) m.defDownTurns -= 1;
    if (m.atkDownTurns > 0) m.atkDownTurns -= 1;
    if (m.bleeding > 0) m.bleeding -= 1;
    if (m.poisoned > 0) m.poisoned -= 1;
    if (e.evadeTurns > 0) e.evadeTurns -= 1;
    if (e.empoweredTurns > 0) e.empoweredTurns -= 1;
    if (e.parryReadyTurns > 0) e.parryReadyTurns -= 1;

    // кулдауны навыков (в бою)
    if (!b.skillCooldowns) b.skillCooldowns = {};
    for (const k of Object.keys(b.skillCooldowns)) {
      if (b.skillCooldowns[k] > 0) b.skillCooldowns[k] -= 1;
      if (b.skillCooldowns[k] <= 0) delete b.skillCooldowns[k];
    }
  }

  function tryFlee() {
    const p = state.player;
    const b = state.inBattle;
    if (!p || !b) return goToTown();
    if (b.mob.meta?.isBoss) {
      pushLog(`От босса сбежать нельзя.`, "muted");
      enemyTurn();
      return;
    }
    // шанс зависит от навыка: 35% + до 20%
    const chance = 0.35 + clamp(p.weaponSkill / 250, 0, 0.20);
    if (roll(chance)) {
      pushLog(`Ты успешно сбежал от <strong>${b.mob.name}</strong>.`, "muted");
      state.inBattle = null;
      saveGame(state);
      if (b.mob.meta?.floor === 1) floor1Hub();
      else goToTown();
      return;
    }
    pushLog(`Ты пытался сбежать, но <strong>${b.mob.name}</strong> не отпускает.`, "muted");
    // враг получает бесплатный ход
    enemyTurn();
  }

  function winBattle({ bonusXpOnKill, bonusMoneyOnCrit }) {
    const p = state.player;
    const b = state.inBattle;
    if (!p || !b) return;
    const mob = b.mob;
    state.inBattle = null;

    const money = gainMoney(mob.money);
    const xp = Math.floor(mob.xp * 0.5);
    gainXp(xp + Math.floor(bonusXpOnKill * 0.5));
    // Профессия получает опыт за боевой опыт.
    gainProfessionXp(Math.max(1, Math.floor((xp + bonusXpOnKill) / 6)), "battle");
    const sk = gainWeaponSkill(1, 3);
    const drops = resolveDrops(mob);

    // Обновление квестов “убей X мобов” и “собери предметы” уже происходит в resolveDrops/addToInventory.
    updateKillQuestsForMob(mob);

    let extra = "";
    if (bonusMoneyOnCrit > 0) {
      p.money += bonusMoneyOnCrit;
      extra = ` Также ты получаешь <strong>+${bonusMoneyOnCrit} колл</strong> за точный стиль.`;
    }

    pushLog(`<strong>Победа!</strong> Ты победил: ${mob.name}.`, "normal");
    pushLog(`Награда: опыт <strong>+${xp}${bonusXpOnKill ? ` (+${bonusXpOnKill})` : ""}</strong>, деньги <strong>+${formatColl(money)}</strong>.${extra}`, "muted");
    pushLog(`Навык оружия: <strong>+${sk}</strong>.`, "muted");
    if (drops.length) {
      const list = drops
        .map((it) => `<strong>${it.name}</strong> <span class="mono">(${it.rarity?.name ?? "Обычный"})</span>`)
        .join(", ");
      pushLog(`Добыча: ${list}.`, "normal");
    } else {
      pushLog(`Добыча: ничего.`, "muted");
    }

    let handledByNpc = false;
    if (mob.meta?.floor === 1) {
      handledByNpc = maybeTriggerRareNpcAfterBattle(mob);
    }

    saveGame(state);
    if (handledByNpc) {
      // сцена редкого NPC уже отрендерена
      return;
    }
    if (mob.meta?.floor === 1) postFloorBattleScreen(mob);
    else postBattleScreen(mob);
  }

  function winBossFloor1({ bonusXpOnKill, bonusMoneyOnCrit }) {
    const p = state.player;
    const b = state.inBattle;
    if (!p || !b) return;
    const mob = b.mob;
    state.inBattle = null;

    // Лут с босса 1-го этажа “как в аниме”
    const coat = addUniqueId(
      mkItem({
        id: "coat_of_midnight",
        name: "Плащ Полуночи (Coat of Midnight)",
        rarity: RARITY.legendary,
        type: "trinket",
        desc: "Легендарный плащ с босса 1-го этажа. +5 ЗАЩ, +45 HP.",
        mods: { def: 5, hp: 45 },
      })
    );
    const key = addUniqueId(
      mkItem({
        id: "floor1_key",
        name: "Ключ 1-го этажа",
        rarity: RARITY.rare,
        type: "trophy",
        desc: "Доказательство победы над боссом 1-го этажа.",
      })
    );
    p.inventory.push(coat, key);

    const money = gainMoney(mob.money);
    const xp = Math.floor(mob.xp * 0.6);
    gainXp(xp + Math.floor(bonusXpOnKill * 0.5));
    // Усиленный проф. опыт за победу над боссом (но всё ещё хардкорно).
    gainProfessionXp(Math.max(4, Math.floor((xp + bonusXpOnKill) / 5)), "battle");
    const sk = gainWeaponSkill(3, 7);
    if (bonusMoneyOnCrit > 0) p.money += bonusMoneyOnCrit;

    updateKillQuestsForMob(mob);

    state.floor = state.floor ?? { id: 1, cleared: false, bossDefeated: false };
    state.floor.bossDefeated = true;
    state.floor.cleared = true;
    // Многоразовый босс: после победы уходит на КД 60 секунд.
    state.floor.bossCooldownUntil = Date.now() + 60_000;

    // Спец-условие для 100 уровня профессии:
    // если профессия уже 80+ уровня — победа над боссом открывает путь к 100.
    if (p.professionId && p.professionLevel >= 80 && !p.professionGateComplete) {
      p.professionGateComplete = true;
      const prof = getProfessionById(p.professionId);
      pushLog(
        `Твоя профессия <strong>${prof?.name ?? p.professionId}</strong> достигает признания: путь к <strong>100 уровню</strong> теперь открыт.`,
        "normal"
      );
    }

    pushLog(`<strong>Победа!</strong> Босс повержен: <strong>Илфанг — Кобольд-Лорд</strong>.`, "normal");
    pushLog(`Награда: опыт <strong>+${xp}${bonusXpOnKill ? ` (+${bonusXpOnKill})` : ""}</strong>, деньги <strong>+${formatColl(money)}</strong>.`, "muted");
    pushLog(`Навык оружия: <strong>+${sk}</strong>.`, "muted");
    pushLog(`Лут босса: <strong>${coat.name}</strong>.`, "normal");

    saveGame(state);
    clearActions();
    renderScene([
      { html: `<strong>Первый этаж очищен.</strong>`, tone: "normal" },
      { html: `Ты получаешь: <strong>${coat.name}</strong> и <strong>${key.name}</strong>.`, tone: "muted" },
      { html: `Гильдия будет говорить об этом ещё долго.`, tone: "muted" },
      { html: `<div class="sep"></div>`, tone: "muted" },
    ]);
    addAction("Вернуться в Город Начала", () => goToTown(), { primary: true });
    addAction("На 1-й этаж (поля/лабиринт)", () => floor1Hub(), {});
    addAction("Посмотреть журнал", () => showLog(), {});
  }

  function postFloorBattleScreen(mob) {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    const where = mob.meta?.areaId === "labyrinth" ? "Лабиринт" : "Поля";
    const lines = [
      { html: `<strong>Итоги боя — ${where}</strong>`, tone: "normal" },
      { html: `Ты победил: <strong>${mob.name}</strong>.`, tone: "muted" },
      { html: `Теперь: уровень <strong>${p.level}</strong>, навык оружия <strong>${p.weaponSkill}</strong>, деньги <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
      { html: `<div class="sep"></div>Что дальше?`, tone: "normal" },
    ];
    renderScene(lines);
    addAction("Ещё бой (в этой зоне)", () => beginFloorHunt(mob.meta?.areaId ?? "field"), { primary: true });
    addAction("К хабу 1-го этажа", () => floor1Hub(), {});
    addAction("В Город Начала", () => goToTown(), {});
  }

  function postBattleScreen(mob) {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();

    const lines = [
      { html: `<strong>Итоги боя</strong>`, tone: "normal" },
      { html: `Ты победил: <strong>${mob.name}</strong>.`, tone: "muted" },
      { html: `Теперь: уровень <strong>${p.level}</strong>, навык оружия <strong>${p.weaponSkill}</strong>, деньги <strong>${formatColl(p.money)}</strong>.`, tone: "muted" },
      { html: `<div class="sep"></div>Что дальше?`, tone: "normal" },
    ];
    renderScene(lines);
    addAction("Продолжить охоту (следующий бой)", () => beginHunt(), { primary: true });
    addAction("Вернуться в безопасную зону", () => goToTown(), {});
    addAction("Посмотреть журнал", () => showLog(), {});
  }

  function die() {
    const p = state.player;
    const mobName = state.inBattle?.mob?.name ?? "враг";
    const name = p?.name ?? "Персонаж";
    clearActions();
    renderScene([
      { html: `<strong>Смерть.</strong> ${name} пал в бою против <strong>${mobName}</strong>.`, tone: "normal" },
      { html: `По правилам этого мира персонаж удаляется полностью.`, tone: "muted" },
      { html: `<div class="sep"></div><span class="mono">Создай нового персонажа, чтобы начать заново.</span>`, tone: "muted" },
    ]);

    // перманентная смерть: очищаем сохранение
    try {
      for (const key of STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {}
    state = newSave();
    $ui.saveBadge.textContent = "не сохранено";
    renderPlayerPanel();
    addAction("Новый персонаж", () => startNewRun(), { primary: true, danger: false });
  }

  // --- NPC-диалоги и редкие встречи ---

  function openNpcDialog(npcId, nodeId = "start") {
    clearActions();
    const p = state.player;
    if (!p) return startNewRun();
    const npc = getNpcById(npcId);
    if (!npc) {
      goToTown();
      return;
    }

    ensureQuestModel();
    state.npcFlags ||= {};
    state.npcFlags[`met:${npcId}`] = true;
    updateTalkQuestsForNpc(npcId);

    const tree = npc.dialog || {};
    const node = tree[nodeId] || tree.start;
    if (!node) {
      goToTown();
      return;
    }

    const lines = [
      { html: `<strong>${npc.name}</strong>`, tone: "normal" },
      { html: `<div class="sep"></div>${(node.text || "").replace(/\n/g, "<br/>")}`, tone: "normal" },
      { html: `<div class="sep"></div>Твои варианты:`, tone: "normal" },
    ];
    renderScene(lines);

    const options = node.options || [];
    if (!options.length) {
      addAction("Завершить разговор", () => goToTown(), { primary: true });
      return;
    }

    for (const opt of options) {
      const label = opt.text || "...";
      const action = opt.action || null;

      addAction(
        label,
        () => {
          if (action) {
            if (action.type === "acceptQuest" && action.questId) {
              acceptQuest(action.questId);
            } else if (action.type === "inviteToGuildNpc") {
              handleInviteNpcToGuild(npcId, action.questId || null);
            } else if (action.type === "angerNpcOnce") {
              handleAngerNpc(npcId);
            } else if (action.type === "exitToTown") {
              saveGame(state);
              goToTown();
              return;
            } else if (action.type === "exitAfterRare") {
              saveGame(state);
              floor1Hub();
              return;
            }
          }

          if (opt.next) {
            openNpcDialog(npcId, opt.next);
            return;
          }

          // по умолчанию — возврат в город
          saveGame(state);
          goToTown();
        },
        {}
      );
    }

    addAction("Завершить разговор", () => goToTown(), { danger: false });
  }

  function handleInviteNpcToGuild(npcId, questId) {
    ensureQuestModel();
    state.npcFlags ||= {};
    if (!net.social.guild) {
      pushLog(
        "У тебя пока нет онлайн‑гильдии. Создай её через социальное меню, чтобы такие приглашения имели вес.",
        "muted"
      );
      return;
    }
    const key = `npcGuild:${npcId}`;
    if (!state.npcFlags[key]) {
      state.npcFlags[key] = true;
      const npc = getNpcById(npcId);
      pushLog(
        `Ты предлагаешь ${npc?.name ?? "NPC"} вступить в твою гильдию. Он молчит, но кивает — считай, что в рейдах за тебя кто‑то там болеет.`,
        "normal"
      );
      if (questId && isQuestActive(questId)) {
        // засчитываем разговор как выполнение цели квеста
        updateTalkQuestsForNpc(npcId);
      }
    } else {
      pushLog("Похоже, вы уже договорились о гильдии. Повторяться не нужно.", "muted");
    }
  }

  function handleAngerNpc(npcId) {
    ensureQuestModel();
    state.npcFlags ||= {};
    const key = `npcAngry:${npcId}`;
    if (state.npcFlags[key]) {
      pushLog("Ты снова пытаешься спровоцировать NPC, но он просто исчезает в толпе.", "muted");
      floor1Hub();
      return;
    }
    state.npcFlags[key] = true;
    const npc = getNpcById(npcId);
    pushLog(
      `${npc?.name ?? "NPC"} молча смотрит на тебя, оценивая угрозу. Через пару секунд он растворяется в тени деревьев. Кажется, второй шанс ты уже потратил.`,
      "normal"
    );
    saveGame(state);
    floor1Hub();
  }

  function maybeTriggerRareNpcAfterBattle(mob) {
    const areaId = mob.meta?.areaId;
    if (!areaId) return false;
    const npc = getRareNpcForArea(areaId);
    if (!npc || !npc.rare) return false;
    ensureQuestModel();
    state.npcFlags ||= {};
    const onceKey = npc.rare.onceFlag || `rare_seen:${npc.id}`;
    if (state.npcFlags[onceKey]) return false;

    const baseChance = typeof npc.rare.baseChance === "number" ? npc.rare.baseChance : 0.05;
    if (!roll(baseChance)) return false;

    state.npcFlags[onceKey] = true;

    clearActions();
    renderScene([
      {
        html: `<strong>Редкая встреча.</strong> В этой локации появляется кто‑то необычный...`,
        tone: "normal",
      },
      { html: `<div class="sep"></div>`, tone: "muted" },
    ]);
    addAction(`Подойти к фигуре (${npc.name})`, () => openNpcDialog(npc.id), { primary: true });
    addAction("Игнорировать и вернуться к делам", () => postFloorBattleScreen(mob), {});
    return true;
  }

  function render() {
    renderPlayerPanel();
    const p = state.player;
    if (!p) {
      startNewRun();
      return;
    }
    if (state.inBattle) {
      renderBattle();
      return;
    }
    initNetworkOnce();
    if ($ui.chatSend && !$ui.chatSend.__chatInit) {
      $ui.chatSend.__chatInit = true;
      $ui.chatSend.addEventListener("click", () => sendChatMessage());
    }
    if ($ui.chatInput && !$ui.chatInput.__chatInit) {
      $ui.chatInput.__chatInit = true;
      $ui.chatInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          sendChatMessage();
        }
      });
    }
    updateChatConnectionState();
    goToTown();
  }

  // Первичный рендер
  render();
})();

