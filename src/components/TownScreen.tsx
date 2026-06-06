import { motion } from "framer-motion";
import { Character } from "../types/game";
import { CLASS_DATA } from "../data/gameData";

interface Props {
  character: Character;
  onGoToDungeon: () => void;
  onGoToShop: () => void;
  onGoToQuest: () => void;
  onGoToInventory: () => void;
}

export default function TownScreen({ character, onGoToDungeon, onGoToShop, onGoToQuest, onGoToInventory }: Props) {
  const cls = CLASS_DATA[character.class];

  const buildings = [
    { icon: "⚔️", name: "ดันเจี้ยน", desc: "ผจญภัยและต่อสู้กับมอนสเตอร์", color: "#e74c3c", action: onGoToDungeon },
    { icon: "🛒", name: "ร้านค้า", desc: "ซื้อไอเทม อุปกรณ์ต่างๆ", color: "#f39c12", action: onGoToShop },
    { icon: "📜", name: "กระดานเควส", desc: "รับและตรวจสอบเควส", color: "#27ae60", action: onGoToQuest },
    { icon: "🎒", name: "กระเป๋าไอเทม", desc: "ดูและจัดการไอเทม", color: "#3498db", action: onGoToInventory },
  ];

  return (
    <div className="min-h-screen pt-20 pb-20 px-4"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)" }}>
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6">
          <div className="text-4xl mb-1">🏰</div>
          <h2 className="text-2xl font-black" style={{ color: "#f0d060", fontFamily: "'Georgia', serif" }}>
            เมืองหลวง Arendor
          </h2>
          <p className="text-gray-400 text-sm">ศูนย์กลางของนักผจญภัยทั่วแผ่นดิน</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-4 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{cls.icon}</div>
            <div className="flex-1">
              <div className="font-bold text-white">{character.name}</div>
              <div className="text-sm" style={{ color: cls.color }}>{cls.label} • เลเวล {character.level}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                ATK: {character.attack} | DEF: {character.defense} | 💰 {character.gold}G
              </div>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-bold text-lg">Lv.{character.level}</div>
              <div className="text-xs text-gray-500">{character.exp}/{character.expToNext} EXP</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {buildings.map((b, i) => (
            <motion.button
              key={b.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={b.action}
              className="p-5 rounded-2xl text-left cursor-pointer transition-all"
              style={{
                background: `linear-gradient(135deg, ${b.color}15, ${b.color}05)`,
                border: `1px solid ${b.color}33`,
              }}
            >
              <div className="text-3xl mb-2">{b.icon}</div>
              <div className="font-bold text-white text-sm">{b.name}</div>
              <div className="text-xs text-gray-400 mt-1">{b.desc}</div>
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs text-gray-500 font-bold mb-2">📢 ข่าวสารเมือง</div>
          <div className="space-y-1 text-xs text-gray-400">
            <div>🐉 มังกรโบราณถูกพบเห็นทางตะวันออกของ Dungeon</div>
            <div>⚔️ Tournament นักสู้เปิดรับสมัครแล้ว!</div>
            <div>🛒 ร้านค้ารับซื้อไอเทมหายากราคาพิเศษ</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
