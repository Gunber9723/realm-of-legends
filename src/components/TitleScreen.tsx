import { motion } from "framer-motion";

interface Props {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() * 0.7 + 0.1 }}
            animate={{ opacity: [0.1, 0.8, 0.1] }}
            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center z-10 px-4"
      >
        <motion.div
          animate={{ textShadow: ["0 0 20px #9b59b6", "0 0 40px #e74c3c", "0 0 20px #9b59b6"] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl md:text-8xl font-black mb-2"
          style={{ fontFamily: "'Georgia', serif", color: "#f0d060", letterSpacing: "0.1em" }}
        >
          ⚔️ REALM
        </motion.div>
        <div className="text-2xl md:text-3xl text-purple-300 mb-2 font-bold tracking-widest">OF</div>
        <motion.div
          animate={{ textShadow: ["0 0 20px #e74c3c", "0 0 40px #9b59b6", "0 0 20px #e74c3c"] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="text-5xl md:text-7xl font-black mb-8"
          style={{ fontFamily: "'Georgia', serif", color: "#e74c3c", letterSpacing: "0.1em" }}
        >
          LEGENDS 🔮
        </motion.div>

        <div className="text-gray-400 text-sm md:text-base mb-12 max-w-md mx-auto">
          ผจญภัยในโลกแฟนตาซี เลือกอาชีพ ต่อสู้กับมอนสเตอร์ สะสมไอเทม และเติบโตเป็นวีรบุรุษในตำนาน
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="px-12 py-4 text-xl font-bold rounded-lg cursor-pointer border-2 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #8e44ad, #c0392b)",
            color: "#fff",
            borderColor: "#f0d060",
            boxShadow: "0 0 30px rgba(142,68,173,0.6)",
            fontFamily: "'Georgia', serif",
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ▶ เริ่มการผจญภัย
          </motion.span>
        </motion.button>

        <div className="mt-8 flex gap-8 justify-center text-3xl">
          {["⚔️", "🔮", "🏹", "🐉", "💎"].map((emoji, i) => (
            <motion.span key={i}
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              className="cursor-default select-none"
            >{emoji}</motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
