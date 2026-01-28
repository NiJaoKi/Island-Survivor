// Простейший сервер WebSocket для Island Survivor
// Позволяет видеть игроков онлайн, создавать гильдии, друзей, пати и брак,
// а также синхронно запускать бои (мобы/босс 1-го этажа) для всей пати.
//
// Запуск:
//   1) Установи Node.js (https://nodejs.org)
//   2) В этой папке выполни:
//        npm init -y
//        npm install ws
//   3) Запусти сервер:
//        node server.js
//   4) Открой игру (index.html) у себя и у друзей,
//      укажи в браузере адрес сервера, если нужно, через window.IS_ONLINE_ENDPOINT.

const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Railway (и похожие хостинги) ждут обычный HTTP‑сервер,
// а WebSocket “вешается” на него через upgrade.
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Island Survivor WebSocket server. Use WebSocket to connect.\n");
});

/** @type {import("ws").Server} */
const wss = new WebSocket.Server({ server });

let nextId = 1;

/** @type {Map<WebSocket, {
 *  id: string,
 *  player: { name: string, gender: string, level: number },
 *  friends: Set<string>,
 *  spouseId: string | null,
 *  guildId: string | null,
 *  partyId: string | null,
 * }>}
 */
const clients = new Map();

/** @type {Map<string, { id: string, name: string, leaderId: string, members: Set<string> }>} */
const guilds = new Map();

/** @type {Map<string, { id: string, leaderId: string, members: Set<string> }>} */
const parties = new Map();

/** @type {Map<string, { mode: "mob" | "boss1", hp: number, maxHp: number }>} */
const battles = new Map();

function send(ws, msg) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  } catch {
    // ignore
  }
}

function broadcast(msg) {
  for (const ws of clients.keys()) {
    send(ws, msg);
  }
}

function getAllPlayers() {
  const list = [];
  for (const c of clients.values()) {
    list.push({
      id: c.id,
      name: c.player.name,
      gender: c.player.gender,
      level: c.player.level,
    });
  }
  return list;
}

function broadcastOnlineState() {
  const players = getAllPlayers();
  for (const [ws, c] of clients.entries()) {
    send(ws, {
      type: "online_state",
      playerId: c.id,
      players,
    });
  }
}

function findClientById(id) {
  for (const [ws, c] of clients.entries()) {
    if (c.id === id) return { ws, client: c };
  }
  return null;
}

function getGuildForClient(client) {
  if (!client.guildId) return null;
  const g = guilds.get(client.guildId);
  if (!g) return null;
  const members = [];
  for (const mid of g.members) {
    const found = [...clients.values()].find((c) => c.id === mid);
    if (found) {
      members.push({
        id: found.id,
        name: found.player.name,
      });
    }
  }
  return { id: g.id, name: g.name, leaderId: g.leaderId, members };
}

function getPartyForClient(client) {
  if (!client.partyId) return null;
  const p = parties.get(client.partyId);
  if (!p) return null;
  const members = [];
  for (const mid of p.members) {
    const found = [...clients.values()].find((c) => c.id === mid);
    if (found) {
      members.push({
        id: found.id,
        name: found.player.name,
      });
    }
  }
  return { id: p.id, leaderId: p.leaderId, members };
}

function getFriendsForClient(client) {
  const arr = [];
  for (const fid of client.friends) {
    const found = [...clients.values()].find((c) => c.id === fid);
    if (found) {
      arr.push({
        id: found.id,
        name: found.player.name,
      });
    }
  }
  return arr;
}

function getSpouseForClient(client) {
  if (!client.spouseId) return null;
  const found = [...clients.values()].find((c) => c.id === client.spouseId);
  if (!found) return null;
  return { id: found.id, name: found.player.name };
}

function sendSocialState(ws, client) {
  send(ws, {
    type: "social_state",
    guild: getGuildForClient(client),
    friends: getFriendsForClient(client),
    party: getPartyForClient(client),
    spouse: getSpouseForClient(client),
  });
}

function ensurePartyForLeader(leader) {
  if (leader.partyId) {
    return parties.get(leader.partyId);
  }
  const id = "party" + Date.now().toString(16);
  const party = {
    id,
    leaderId: leader.id,
    members: new Set([leader.id]),
  };
  parties.set(id, party);
  leader.partyId = id;
  return party;
}

wss.on("connection", (ws) => {
  const id = "p" + nextId++;
  const client = {
    id,
    player: { name: "Неизвестный", gender: "unknown", level: 1 },
    friends: new Set(),
    spouseId: null,
    guildId: null,
    partyId: null,
  };
  clients.set(ws, client);

  // Отправляем начальное состояние
  broadcastOnlineState();
  sendSocialState(ws, client);

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (!msg || typeof msg !== "object") return;

    if (msg.type === "hello") {
      // можно логировать клиента, но пока просто игнорируем
      return;
    }

    if (msg.type === "chat_send") {
      const rawText = typeof msg.text === "string" ? msg.text.trim() : "";
      if (!rawText) return;
      const text = rawText.slice(0, 240);
      const payload = {
        type: "chat_message",
        from: {
          id: client.id,
          name: client.player.name,
          level: client.player.level,
        },
        text,
        ts: Date.now(),
      };
      broadcast(payload);
      return;
    }

    if (msg.type === "set_player") {
      const name = typeof msg.name === "string" ? msg.name.slice(0, 32) : "Игрок";
      const gender =
        msg.gender === "male" || msg.gender === "female" ? msg.gender : "unknown";
      const level =
        typeof msg.level === "number" && msg.level >= 0 && msg.level <= 999
          ? Math.floor(msg.level)
          : 1;
      client.player = { name, gender, level };
      broadcastOnlineState();
      sendSocialState(ws, client);
      return;
    }

    if (msg.type === "create_guild") {
      const rawName = typeof msg.name === "string" ? msg.name.trim() : "";
      if (!rawName) return;
      if (client.guildId) {
        send(ws, {
          type: "system_message",
          text: "Ты уже состоишь в гильдии.",
        });
        return;
      }
      const id = "g" + Date.now().toString(16);
      const g = {
        id,
        name: rawName.slice(0, 32),
        leaderId: client.id,
        members: new Set([client.id]),
      };
      guilds.set(id, g);
      client.guildId = id;
      send(ws, {
        type: "system_message",
        text: `Ты создал гильдию <strong>${g.name}</strong>.`,
      });
      sendSocialState(ws, client);
      return;
    }

    if (msg.type === "add_friend") {
      const targetId = typeof msg.targetId === "string" ? msg.targetId.trim() : "";
      if (!targetId || targetId === client.id) return;
      const found = findClientById(targetId);
      if (!found) {
        send(ws, {
          type: "system_message",
          text: "Такого игрока сейчас нет онлайн.",
        });
        return;
      }
      const other = found.client;
      client.friends.add(other.id);
      other.friends.add(client.id);
      send(ws, {
        type: "system_message",
        text: `Вы с <strong>${other.player.name}</strong> теперь друзья.`,
      });
      send(found.ws, {
        type: "system_message",
        text: `<strong>${client.player.name}</strong> добавил тебя в друзья.`,
      });
      sendSocialState(ws, client);
      sendSocialState(found.ws, other);
      return;
    }

    if (msg.type === "invite_party") {
      const targetId = typeof msg.targetId === "string" ? msg.targetId.trim() : "";
      if (!targetId || targetId === client.id) return;
      const found = findClientById(targetId);
      if (!found) {
        send(ws, {
          type: "system_message",
          text: "Такого игрока сейчас нет онлайн.",
        });
        return;
      }
      const other = found.client;
      const party = ensurePartyForLeader(client);
      party.members.add(other.id);
      other.partyId = party.id;

      send(ws, {
        type: "system_message",
        text: `Ты пригласил <strong>${other.player.name}</strong> в пати.`,
      });
      send(found.ws, {
        type: "system_message",
        text: `<strong>${client.player.name}</strong> пригласил тебя в пати.`,
      });
      sendSocialState(ws, client);
      sendSocialState(found.ws, other);
      return;
    }

    if (msg.type === "marry") {
      const targetId = typeof msg.targetId === "string" ? msg.targetId.trim() : "";
      if (!targetId || targetId === client.id) return;
      const found = findClientById(targetId);
      if (!found) {
        send(ws, {
          type: "system_message",
          text: "Такого игрока сейчас нет онлайн.",
        });
        return;
      }
      const other = found.client;
      if (client.spouseId || other.spouseId) {
        send(ws, {
          type: "system_message",
          text: "Кто‑то из вас уже в браке.",
        });
        return;
      }
      client.spouseId = other.id;
      other.spouseId = client.id;
      send(ws, {
        type: "system_message",
        text: `Вы с <strong>${other.player.name}</strong> теперь в браке.`,
      });
      send(found.ws, {
        type: "system_message",
        text: `Вы с <strong>${client.player.name}</strong> теперь в браке.`,
      });
      sendSocialState(ws, client);
      sendSocialState(found.ws, other);
      return;
    }

    if (msg.type === "party_start_battle") {
      const mode = msg.mode === "boss1" ? "boss1" : "mob";
      if (!client.partyId) {
        send(ws, {
          type: "system_message",
          text: "Сначала собери пати (через приглашение), затем запускай совместный бой.",
        });
        return;
      }
      const p = parties.get(client.partyId);
      if (!p) return;
      for (const mid of p.members) {
        const found = findClientById(mid);
        if (!found) continue;
        send(found.ws, {
          type: "system_message",
          text:
            mode === "boss1"
              ? `<strong>${client.player.name}</strong> запускает совместный бой с боссом 1-го этажа.`
              : `<strong>${client.player.name}</strong> запускает совместный бой с мобами.`,
        });
        send(found.ws, { type: "party_start_battle", mode });
      }
      return;
    }

    if (msg.type === "battle_state") {
      if (!client.partyId) return;
      const partyId = client.partyId;
      const p = parties.get(partyId);
      if (!p) return;
      const mode = msg.mode === "boss1" ? "boss1" : "mob";
      const hp =
        msg.mob && typeof msg.mob.hp === "number" ? Math.max(1, Math.floor(msg.mob.hp)) : 1;
      const maxHp =
        msg.mob && typeof msg.mob.maxHp === "number"
          ? Math.max(hp, Math.floor(msg.mob.maxHp))
          : hp;

      const state = { mode, hp, maxHp };
      battles.set(partyId, state);

      const payload = {
        type: "battle_update",
        mode,
        hp: state.hp,
        maxHp: state.maxHp,
      };

      for (const mid of p.members) {
        const found = findClientById(mid);
        if (!found) continue;
        send(found.ws, payload);
      }
      return;
    }

    if (msg.type === "battle_damage") {
      if (!client.partyId) return;
      const partyId = client.partyId;
      const p = parties.get(partyId);
      if (!p) return;
      const st = battles.get(partyId);
      if (!st) return;
      const rawDelta = typeof msg.delta === "number" ? msg.delta : 0;
      const delta = Math.max(0, Math.floor(Math.abs(rawDelta)));
      if (delta <= 0) return;
      st.hp = Math.max(0, st.hp - delta);
      const payload = {
        type: "battle_update",
        mode: st.mode,
        hp: st.hp,
        maxHp: st.maxHp,
      };
      for (const mid of p.members) {
        const found = findClientById(mid);
        if (!found) continue;
        send(found.ws, payload);
      }
      if (st.hp <= 0) {
        battles.delete(partyId);
      }
      return;
    }
  });

  ws.on("close", () => {
    const c = clients.get(ws);
    clients.delete(ws);
    if (!c) {
      broadcastOnlineState();
      return;
    }

    // Удаляем из пати
    if (c.partyId) {
      const p = parties.get(c.partyId);
      if (p) {
        p.members.delete(c.id);
        if (p.members.size === 0) {
          parties.delete(p.id);
        } else {
          // если лидер вышел — передаём лидерство первому оставшемуся
          if (!p.members.has(p.leaderId)) {
            p.leaderId = [...p.members][0];
          }
        }
      }
    }

    // Удаляем из гильдии (гильдия сама остаётся, но без этого участника)
    if (c.guildId) {
      const g = guilds.get(c.guildId);
      if (g) {
        g.members.delete(c.id);
        if (g.members.size === 0) {
          guilds.delete(g.id);
        }
      }
    }

    // Брак “расходится”, если один из супругов уходит
    if (c.spouseId) {
      const other = [...clients.values()].find((x) => x.id === c.spouseId);
      if (other) {
        other.spouseId = null;
        const entry = [...clients.entries()].find(([, x]) => x.id === other.id);
        if (entry) {
          const [ows, oclient] = entry;
          send(ows, {
            type: "system_message",
            text: `${c.player.name} вышел из сети. Брак расторгнут.`,
          });
          sendSocialState(ows, oclient);
        }
      }
    }

    broadcastOnlineState();
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Island Survivor WebSocket server запущен на порту ${PORT}`);
});
