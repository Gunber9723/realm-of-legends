import { Character, GameLocation } from "../types/game";
import { CLASS_DATA } from "../data/gameData";
import { motion } from "framer-motion";

interface Props {
  character: Character;
  location: GameLocation;
  onNav: (loc: GameLocation) => void;
  notifications: string[];
}

export default function HUD({ character, location, onNav, notifications }: Props) {
  const cls = CLASS_DATA[character.class];

  const navItems: { id: GameLocation; label: string; icon: string }[] = [
    { id: "town", label: "เมือง", icon: "🏰" },
    { id: "dungeon", label: "ดันเจี้ยน", icon: "⚔️" },
    { id: "inventory", label: "กระเป๋า", icon: "🎒" },
    { id: "quest", label: "เควส", icon: "📜" },
    { id: "shop", label: "ร้านค้า", icon: "🛒" },
  ];

  const hpPercent = (character.hp / character.maxHp) * 100;
  const mpPercent = (character.mp / character.maxMp) * 100;
  const expPercent = (character.exp / character.expToNext) * 100;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 px-3 py-2"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{cls.icon}</span>
            <div>
              <div className="text-white font-bold text-sm leading-none">{character.name}</div>
              <div className="text-xs" style={{ color: cls.color }}>{cls.label} Lv.{character.level}</div>
            </div>
          </div>

          <div className="flex-1 min-w-48 space-y-1">
            <BarStat label="HP" value={character.hp} max={character.maxHp} percent={hpPercent}
              color={hpPercent > 50 ? "#27ae60" : hpPercent > 25 ? "#e67e22" : "#e74c3c"} />
            <BarStat label="MP" value={character.mp} max={character.maxMp} percent={mpPercent} color="#3498db" />
            <BarStat label="EXP" value={character.exp} max={character.expToNext} percent={expPercent} color="#9b59b6" />
          </div>

          <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm whitespace-nowrap">
            💰 {character.gold.toLocaleString()}G
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="max-w-4xl mx-auto flex justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => item.id !== "battle" && onNav(item.id)}
              className="flex flex-col items-center py-2 px-3 transition-all flex-1"
              style={{
                color: location === item.id ? "#f0d060" : "#888",
                borderTop: location === item.id ? "2px solid #f0d060" : "2px solid transparent",
                background: location === item.id ? "rgba(240,208,96,0.05)" : "transparent",
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-0.5 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed top-16 right-3 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map((n, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="px-3 py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: "rgba(27,20,100,0.9)", border: "1px solid rgba(155,89,182,0.5)" }}
          >{n}</motion.div>
        ))}
      </div>
    </>
  );
}

function BarStat({ label, value, max, percent, color }: {
  label: string; value: number; max: number; percent: number; color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 w-6">{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, percent)}%`, background: color }} />
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap" style={{ fontSize: "10px" }}>{value}/{max}</span>
    </div>
  );
}
