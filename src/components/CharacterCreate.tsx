import { useState } from "react";
import { motion } from "framer-motion";
import { CharacterClass } from "../types/game";
import { CLASS_DATA } from "../data/gameData";

interface Props {
  onCreate: (name: string, cls: CharacterClass) => void;
}

export default function CharacterCreate({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);

  const handleCreate = () => {
    if (!name.trim() || !selectedClass) return;
    onCreate(name.trim(), selectedClass);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl">
        <h1 className="text-3xl font-black text-center mb-2"
          style={{ color: "#f0d060", fontFamily: "'Georgia', serif", textShadow: "0 0 20px rgba(240,208,96,0.5)" }}>
          ⚔️ สร้างตัวละคร
        </h1>
        <p className="text-gray-400 text-center mb-8">เลือกชื่อและอาชีพเพื่อเริ่มการผจญภัย</p>

        <div className="mb-6">
          <label className="block text-purple-300 text-sm font-bold mb-2">ชื่อตัวละคร</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ใส่ชื่อตัวละครของคุณ..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg text-white font-medium outline-none border-2 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderColor: name ? "#9b59b6" : "rgba(255,255,255,0.1)",
              color: "#fff",
            }}
          />
        </div>

        <div className="mb-8">
          <label className="block text-purple-300 text-sm font-bold mb-3">เลือกอาชีพ</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(CLASS_DATA) as [CharacterClass, typeof CLASS_DATA[CharacterClass]][]).map(([cls, data]) => (
              <motion.div
                key={cls}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedClass(cls)}
                className="p-4 rounded-xl cursor-pointer border-2 transition-all"
                style={{
                  background: selectedClass === cls
                    ? `linear-gradient(135deg, ${data.color}33, ${data.color}11)`
                    : "rgba(255,255,255,0.03)",
                  borderColor: selectedClass === cls ? data.color : "rgba(255,255,255,0.1)",
                  boxShadow: selectedClass === cls ? `0 0 20px ${data.color}44` : "none",
                }}
              >
                <div className="text-4xl text-center mb-2">{data.icon}</div>
                <div className="text-center font-bold mb-1" style={{ color: data.color }}>{data.label}</div>
                <div className="text-gray-400 text-xs text-center mb-3">{data.description}</div>
                <div className="space-y-1">
                  <StatBar label="HP" value={data.baseStats.hp} max={200} color="#e74c3c" />
                  <StatBar label="MP" value={data.baseStats.mp} max={180} color="#3498db" />
                  <StatBar label="ATK" value={data.baseStats.attack} max={40} color="#e67e22" />
                  <StatBar label="DEF" value={data.baseStats.defense} max={20} color="#27ae60" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={name && selectedClass ? { scale: 1.05 } : {}}
          whileTap={name && selectedClass ? { scale: 0.95 } : {}}
          onClick={handleCreate}
          disabled={!name.trim() || !selectedClass}
          className="w-full py-4 rounded-xl font-black text-lg transition-all"
          style={{
            background: name && selectedClass
              ? "linear-gradient(135deg, #8e44ad, #c0392b)"
              : "rgba(255,255,255,0.1)",
            color: name && selectedClass ? "#fff" : "#666",
            cursor: name && selectedClass ? "pointer" : "not-allowed",
            boxShadow: name && selectedClass ? "0 0 20px rgba(142,68,173,0.5)" : "none",
            fontFamily: "'Georgia', serif",
          }}
        >
          {selectedClass ? `เริ่มผจญภัยในฐานะ ${CLASS_DATA[selectedClass].label} →` : "เลือกอาชีพก่อน..."}
        </motion.button>
      </motion.div>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-6">{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}
