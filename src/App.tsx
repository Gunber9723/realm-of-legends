import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TitleScreen from "./components/TitleScreen";
import CharacterCreate from "./components/CharacterCreate";
import InventoryScreen from "./components/InventoryScreen";
import QuestScreen from "./components/QuestScreen";
import ShopScreen from "./components/ShopScreen";
import GameCanvas, { CombatResult } from "./game/GameCanvas";
import { Interactable } from "./game/world";
import { Character, Item } from "./types/game";
import {
  createCharacter, SHOP_ITEMS, SHOP_PRICES, INITIAL_QUESTS,
  getExpToNext, CLASS_DATA,
} from "./data/gameData";

type AppScreen = "title" | "create" | "world" | "panel";
type PanelType = "inventory" | "quest" | "shop";

const SAVE_KEY = "mmorpg_realm_v3";

interface GameData {
  character: Character;
  inventory: Item[];
  quests: typeof INITIAL_QUESTS;
}

function addToInventory(inv: Item[], newItem: Item): Item[] {
  const i = inv.findIndex(x => x.id === newItem.id && newItem.type === "consumable");
  if (i >= 0) return inv.map((it, idx) => idx === i ? { ...it, quantity: it.quantity + 1 } : it);
  return [...inv, { ...newItem }];
}

function doLevelUp(char: Character): { char: Character; leveled: boolean } {
  if (char.exp < char.expToNext) return { char, leveled: false };
  const newLevel = char.level + 1;
  const base = CLASS_DATA[char.class].baseStats;
  return {
    leveled: true,
    char: {
      ...char,
      level: newLevel,
      exp: char.exp - char.expToNext,
      expToNext: getExpToNext(newLevel),
      maxHp: char.maxHp + Math.floor(base.hp * 0.1),
      hp: char.hp + Math.floor(base.hp * 0.1),
      maxMp: char.maxMp + Math.floor(base.mp * 0.1),
      mp: char.mp + Math.floor(base.mp * 0.1),
      attack: char.attack + 3,
      defense: char.defense + 2,
    },
  };
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("title");
  const [panel, setPanel] = useState<PanelType | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isDead, setIsDead] = useState(false);
  const [notifs, setNotifs] = useState<string[]>([]);

  const pushNotif = useCallback((msg: string) => {
    setNotifs(n => [...n.slice(-3), msg]);
    setTimeout(() => setNotifs(n => n.filter(x => x !== msg)), 3000);
  }, []);

  // Load save
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const save = JSON.parse(raw);
        if (save?.character) {
          setGameData({ character: save.character, inventory: save.inventory ?? [], quests: save.quests ?? JSON.parse(JSON.stringify(INITIAL_QUESTS)) });
          setScreen("world");
        }
      }
    } catch {}
  }, []);

  // Auto-save
  useEffect(() => {
    if (gameData) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameData)); } catch {}
    }
  }, [gameData]);

  const handleCreate = useCallback((name: string, cls: Parameters<typeof createCharacter>[1]) => {
    const char = createCharacter(name, cls);
    setGameData({ character: char, inventory: [], quests: JSON.parse(JSON.stringify(INITIAL_QUESTS)) });
    setScreen("world");
    pushNotif(`🎉 ยินดีต้อนรับ ${name}!`);
  }, [pushNotif]);

  // ─── Real-time combat callbacks ───────────────────────────────────────────
  const handlePlayerDamaged = useCallback((dmg: number) => {
    setGameData(d => {
      if (!d) return d;
      const newHp = Math.max(0, d.character.hp - dmg);
      return { ...d, character: { ...d.character, hp: newHp } };
    });
  }, []);

  const handlePlayerDied = useCallback(() => {
    setIsDead(true);
  }, []);

  const handleMpUsed = useCallback((mp: number) => {
    setGameData(d => {
      if (!d) return d;
      return { ...d, character: { ...d.character, mp: Math.max(0, d.character.mp - mp) } };
    });
  }, []);

  const handleItemUsed = useCallback((itemId: string) => {
    setGameData(d => {
      if (!d) return d;
      const item = d.inventory.find(i => i.id === itemId);
      if (!item) return d;
      let char = { ...d.character };
      if (item.effect?.hp) char.hp = Math.min(char.hp + item.effect.hp, char.maxHp);
      if (item.effect?.mp) char.mp = Math.min(char.mp + item.effect.mp, char.maxMp);
      const inv = d.inventory.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      return { ...d, character: char, inventory: inv };
    });
  }, []);

  const handleMonsterKilled = useCallback((result: CombatResult) => {
    setGameData(d => {
      if (!d) return d;
      let char = { ...d.character, exp: d.character.exp + result.reward.exp, gold: d.character.gold + result.reward.gold };
      let inv = [...d.inventory];

      // Drop item check (35% chance)
      const killedMonster = SHOP_ITEMS;
      if (Math.random() < 0.35) {
        const drops: Record<string, string[]> = {
          slime: ["hp_potion"], goblin: ["hp_potion"], orc: ["iron_sword"],
          skeleton: ["leather_armor"], dark_elf: ["mp_potion"],
          werewolf: [], dragon: ["steel_sword", "chainmail"],
        };
        const possibleDrops = drops[result.questMonsterId] ?? [];
        if (possibleDrops.length > 0) {
          const itemId = possibleDrops[Math.floor(Math.random() * possibleDrops.length)];
          const tmpl = SHOP_ITEMS.find(i => i.id === itemId);
          if (tmpl) { inv = addToInventory(inv, tmpl); }
        }
      }

      // Level up
      const { char: levChar, leveled } = doLevelUp(char);
      if (leveled) pushNotif(`⭐ เลเวลอัพ! Lv.${levChar.level}!`);

      // Quest progress
      let quests = d.quests.map(q => {
        if (!q.active || q.completed) return q;
        const match =
          (q.id === "q1" && result.questMonsterId === "slime") ||
          (q.id === "q2" && result.questMonsterId === "goblin") ||
          (q.id === "q3" && result.questMonsterId === "orc");
        if (!match) return q;
        const prog = q.progress + 1;
        const completed = prog >= q.required;
        if (completed) pushNotif(`📜 "${q.title}" สำเร็จ! +${q.reward.exp} EXP +${q.reward.gold}G`);
        return { ...q, progress: prog, completed };
      });
      // Apply quest rewards
      quests.forEach((q, i) => {
        if (q.completed && !d.quests[i]?.completed) {
          levChar.exp += q.reward.exp;
          levChar.gold += q.reward.gold;
        }
      });

      return { ...d, character: levChar, inventory: inv, quests };
    });
  }, [pushNotif]);

  const handleRevive = useCallback(() => {
    setGameData(d => {
      if (!d) return d;
      return { ...d, character: { ...d.character, hp: Math.floor(d.character.maxHp * 0.4), mp: Math.floor(d.character.maxMp * 0.5), gold: Math.floor(d.character.gold * 0.9) } };
    });
    setIsDead(false);
    pushNotif("💀 ฟื้นคืนชีพ! กลับมาผจญภัยต่อ!");
  }, [pushNotif]);

  const handleInteract = useCallback((type: Interactable["type"]) => {
    if (type === "inn") {
      setGameData(d => d ? { ...d, character: { ...d.character, hp: d.character.maxHp, mp: d.character.maxMp } } : d);
      pushNotif("🏠 ฟื้นฟู HP/MP เต็มแล้ว!");
    } else if (type === "shop") { setPanel("shop"); setScreen("panel"); }
    else if (type === "quest") { setPanel("quest"); setScreen("panel"); }
    else if (type === "dungeon") { pushNotif("🚪 เดินเข้าดันเจี้ยน — ระวังมอนสเตอร์อันตราย!"); }
  }, [pushNotif]);

  const handleEquip = useCallback((item: Item) => {
    setGameData(d => {
      if (!d) return d;
      let char = { ...d.character };
      let inv = [...d.inventory];
      if (item.equipped) {
        if (item.effect?.attack) char.attack -= item.effect.attack;
        if (item.effect?.defense) char.defense -= item.effect.defense;
        inv = inv.map(i => i.id === item.id ? { ...i, equipped: false } : i);
      } else {
        const same = inv.find(i => i.equipped && i.type === item.type);
        if (same) {
          if (same.effect?.attack) char.attack -= same.effect.attack;
          if (same.effect?.defense) char.defense -= same.effect.defense;
          inv = inv.map(i => i.id === same.id ? { ...i, equipped: false } : i);
        }
        if (item.effect?.attack) char.attack += item.effect.attack;
        if (item.effect?.defense) char.defense += item.effect.defense;
        inv = inv.map(i => i.id === item.id ? { ...i, equipped: true } : i);
      }
      return { ...d, character: char, inventory: inv };
    });
  }, []);

  const handleUseItemFromPanel = useCallback((item: Item) => {
    setGameData(d => {
      if (!d) return d;
      let char = { ...d.character };
      if (item.effect?.hp) char.hp = Math.min(char.hp + item.effect.hp, char.maxHp);
      if (item.effect?.mp) char.mp = Math.min(char.mp + item.effect.mp, char.maxMp);
      const inv = d.inventory.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      return { ...d, character: char, inventory: inv };
    });
    pushNotif(`🧪 ใช้ ${item.name}!`);
  }, [pushNotif]);

  const handleBuy = useCallback((itemId: string) => {
    setGameData(d => {
      if (!d) return d;
      const price = SHOP_PRICES[itemId];
      if (d.character.gold < price) return d;
      const tmpl = SHOP_ITEMS.find(i => i.id === itemId);
      if (!tmpl) return d;
      return { ...d, character: { ...d.character, gold: d.character.gold - price }, inventory: addToInventory(d.inventory, tmpl) };
    });
    pushNotif("🛒 ซื้อแล้ว!");
  }, [pushNotif]);

  const handleAcceptQuest = useCallback((qid: string) => {
    setGameData(d => d ? { ...d, quests: d.quests.map(q => q.id === qid ? { ...q, active: true } : q) } : d);
    pushNotif("📜 รับเควสแล้ว!");
  }, [pushNotif]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (screen === "title") return <TitleScreen onStart={() => setScreen("create")} />;
  if (screen === "create") return <CharacterCreate onCreate={handleCreate} />;
  if (!gameData) return null;

  const { character, inventory, quests } = gameData;
  const cls = CLASS_DATA[character.class];
  const hpPct = character.hp / character.maxHp;
  const mpPct = character.mp / character.maxMp;
  const expPct = character.exp / character.expToNext;

  return (
    <div style={{ minHeight: "100svh", background: "#0a0a1a", display: "flex", flexDirection: "column" }}>

      {/* ── TOP HUD ─────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "5px 10px", background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20 }}>{cls.icon}</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, lineHeight: 1.1 }}>{character.name}</div>
              <div style={{ color: cls.color, fontSize: 10 }}>{cls.label} Lv.{character.level}</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2.5 }}>
            <HudBar label="HP" value={character.hp} max={character.maxHp} pct={hpPct} color={hpPct > 0.5 ? "#27ae60" : hpPct > 0.25 ? "#e67e22" : "#e74c3c"} />
            <HudBar label="MP" value={character.mp} max={character.maxMp} pct={mpPct} color="#3498db" />
            <HudBar label="XP" value={character.exp} max={character.expToNext} pct={expPct} color="#9b59b6" />
          </div>
          <div style={{ color: "#f0d060", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>💰{character.gold}G</div>
        </div>
      </div>

      {/* ── WORLD (always mounted behind panels) ─────────────────── */}
      <div style={{ marginTop: 52, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 48 }}>
        <GameCanvas
          playerName={character.name}
          playerClass={character.class}
          playerLevel={character.level}
          playerHp={character.hp}
          playerMaxHp={character.maxHp}
          playerMp={character.mp}
          playerMaxMp={character.maxMp}
          playerAttack={character.attack}
          playerDefense={character.defense}
          skills={character.skills.map(sk => ({ id: sk.id, name: sk.name, icon: sk.icon, mpCost: sk.mpCost, damage: sk.damage ?? 0 }))}
          inventory={inventory.map(i => ({ id: i.id, name: i.name, type: i.type, icon: i.icon, effect: i.effect, quantity: i.quantity }))}
          onInteract={handleInteract}
          onPlayerDamaged={handlePlayerDamaged}
          onPlayerDied={handlePlayerDied}
          onMpUsed={handleMpUsed}
          onItemUsed={handleItemUsed}
          onMonsterKilled={handleMonsterKilled}
        />
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────── */}
      {screen === "world" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-around" }}>
          {[
            { id: "inventory" as PanelType, icon: "🎒", label: "กระเป๋า" },
            { id: "quest" as PanelType, icon: "📜", label: "เควส" },
            { id: "shop" as PanelType, icon: "🛒", label: "ร้านค้า" },
          ].map(b => (
            <button key={b.id}
              onClick={() => { setPanel(b.id); setScreen("panel"); }}
              style={{ flex: 1, padding: "7px 4px", background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{b.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── PANEL SLIDE-UP ──────────────────────────────────────────── */}
      <AnimatePresence>
        {screen === "panel" && panel && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "#0a0a1a" }}
          >
            <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                {panel === "inventory" ? "🎒 กระเป๋า" : panel === "quest" ? "📜 เควส" : "🛒 ร้านค้า"}
              </div>
              <button onClick={() => { setScreen("world"); setPanel(null); }}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", padding: "4px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                ✕ ปิด
              </button>
            </div>
            {panel === "inventory" && <InventoryScreen inventory={inventory} onEquip={handleEquip} onUse={handleUseItemFromPanel} />}
            {panel === "quest" && <QuestScreen quests={quests} onAccept={handleAcceptQuest} />}
            {panel === "shop" && <ShopScreen character={character} onBuy={handleBuy} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DEATH SCREEN ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDead && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.82)", backdropFilter: "blur(5px)" }}>
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
              style={{ padding: 36, borderRadius: 22, textAlign: "center", background: "#0f0f1a", border: "1px solid rgba(231,76,60,0.4)", maxWidth: 300, margin: 16 }}>
              <div style={{ fontSize: 60, marginBottom: 12 }}>💀</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#e74c3c", marginBottom: 8 }}>คุณเสียชีวิต!</div>
              <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>เสียทอง 10%</div>
              <div style={{ color: "#555", fontSize: 11, marginBottom: 22 }}>HP ฟื้นฟู 40%</div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleRevive}
                style={{ width: "100%", padding: "13px 0", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer", background: "linear-gradient(135deg,#8e44ad,#c0392b)", color: "#fff", border: "none" }}>
                ✨ ฟื้นคืนชีพ
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: 58, right: 8, zIndex: 150, display: "flex", flexDirection: "column", gap: 5, pointerEvents: "none" }}>
        <AnimatePresence>
          {notifs.map((n, i) => (
            <motion.div key={n + i}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              style={{ padding: "5px 12px", borderRadius: 10, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(20,10,60,0.93)", border: "1px solid rgba(155,89,182,0.45)", maxWidth: 220 }}>
              {n}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HudBar({ label, value, max, pct, color }: { label: string; value: number; max: number; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 9, color: "#555", width: 20 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, pct * 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.25s" }} />
      </div>
      <span style={{ fontSize: 9, color: "#444", whiteSpace: "nowrap" }}>{value}/{max}</span>
    </div>
  );
}
