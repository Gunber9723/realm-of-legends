import { motion } from "framer-motion";
import { Character } from "../types/game";

interface Props {
  character: Character;
  dungeonLevel: number;
  onEnterBattle: () => void;
  onBack: () => void;
}

export default function DungeonScreen({ character, dungeonLevel, onEnterBattle, onBack }: Props) {
  const floors = [
    { level: 1, name: "ป่าโบราณ", monsters: "สไลม์, โกบลิน", danger: 1, color: "#27ae60" },
    { level: 3, name: "ถ้ำมืด", monsters: "ออร์ค, โครงกระดูก", danger: 3, color: "#e67e22" },
    { level: 5, name: "ป้อมปราการอมตะ", monsters: "เอลฟ์มืด, มนุษย์หมาป่า", danger: 5, color: "#e74c3c" },
    { level: 8, name: "รังมังกร", monsters: "มังกร, บอสโบราณ", danger: 8, color: "#8e44ad" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-20 px-4"
      style={{ background: "linear-gradient(160deg, #0a0010 0%, #100020 50%, #0a0a10 100%)" }}>
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="text-4xl mb-1">⚔️</div>
          <h2 className="text-2xl font-black" style={{ color: "#e74c3c", fontFamily: "'Georgia', serif" }}>
            ดันเจี้ยน
          </h2>
          <p className="text-gray-500 text-sm">ระดับดันเจี้ยนปัจจุบัน: <span className="text-white font-bold">{dungeonLevel}</span></p>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onEnterBattle}
          className="w-full py-5 rounded-2xl mb-6 font-black text-xl cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #c0392b, #8e44ad)",
            color: "#fff",
            boxShadow: "0 0 30px rgba(192,57,43,0.4)",
            fontFamily: "'Georgia', serif",
          }}
        >
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            ⚔️ เริ่มต่อสู้! ⚔️
          </motion.div>
          <div className="text-sm font-normal text-red-200 mt-1">
            ศัตรูระดับ {Math.max(1, character.level - 1)} - {character.level + 2}
          </div>
        </motion.button>

        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-bold tracking-widest uppercase">โซนผจญภัย</div>
          {floors.map((floor, i) => (
            <motion.div
              key={floor.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${floor.color}10, transparent)`,
                border: `1px solid ${floor.color}30`,
                opacity: character.level >= floor.level ? 1 : 0.4,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{floor.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">มอนสเตอร์: {floor.monsters}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold" style={{ color: floor.color }}>
                    ต้องการ Lv.{floor.level}
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="w-2 h-2 rounded-full"
                        style={{ background: j < floor.danger ? floor.color : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs text-gray-500">💡 เคล็ดลับ: เตรียม Potion ไว้ก่อนเข้าต่อสู้ และใช้ Skill ให้ถูกจังหวะ!</div>
        </div>
      </div>
    </div>
  );
}
