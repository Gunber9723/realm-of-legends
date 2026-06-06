import { motion } from "framer-motion";
import { Quest } from "../types/game";

interface Props {
  quests: Quest[];
  onAccept: (questId: string) => void;
}

export default function QuestScreen({ quests, onAccept }: Props) {
  const active = quests.filter(q => q.active && !q.completed);
  const available = quests.filter(q => !q.active && !q.completed);
  const completed = quests.filter(q => q.completed);

  return (
    <div className="min-h-screen pt-20 pb-20 px-4"
      style={{ background: "linear-gradient(160deg, #0a1000 0%, #101a00 100%)" }}>
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <h2 className="text-2xl font-black" style={{ color: "#27ae60", fontFamily: "'Georgia', serif" }}>
            📜 กระดานเควส
          </h2>
          <p className="text-gray-500 text-sm">{active.length} กำลังดำเนินการ • {available.length} รอรับ • {completed.length} สำเร็จ</p>
        </motion.div>

        {active.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-yellow-500 font-bold tracking-widest uppercase mb-2">⚡ กำลังดำเนินการ</div>
            <div className="space-y-2">
              {active.map((q, i) => (
                <QuestCard key={q.id} quest={q} index={i} onAccept={() => onAccept(q.id)} />
              ))}
            </div>
          </div>
        )}

        {available.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-2">📋 รอรับเควส</div>
            <div className="space-y-2">
              {available.map((q, i) => (
                <QuestCard key={q.id} quest={q} index={i} onAccept={() => onAccept(q.id)} />
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-green-600 font-bold tracking-widest uppercase mb-2">✅ สำเร็จแล้ว</div>
            <div className="space-y-2">
              {completed.map((q, i) => (
                <QuestCard key={q.id} quest={q} index={i} onAccept={() => {}} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestCard({ quest, index, onAccept }: { quest: Quest; index: number; onAccept: () => void }) {
  const progressPct = (quest.progress / quest.required) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-xl"
      style={{
        background: quest.completed ? "rgba(39,174,96,0.08)" : quest.active ? "rgba(241,196,15,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${quest.completed ? "#27ae6040" : quest.active ? "#f1c40f40" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold text-white text-sm flex items-center gap-1">
            {quest.completed ? "✅" : quest.active ? "⚡" : "📋"} {quest.title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{quest.description}</div>
        </div>
        {!quest.active && !quest.completed && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
            style={{ background: "rgba(39,174,96,0.2)", border: "1px solid #27ae6044", color: "#27ae60" }}
          >
            รับเควส
          </motion.button>
        )}
      </div>

      {quest.active && !quest.completed && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{quest.objective}</span>
            <span>{quest.progress}/{quest.required}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div className="h-full rounded-full"
              style={{ background: "#27ae60" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 text-xs">
        <span className="text-purple-400">✨ {quest.reward.exp} EXP</span>
        <span className="text-yellow-400">💰 {quest.reward.gold}G</span>
        {quest.reward.items && quest.reward.items.length > 0 && (
          <span className="text-blue-400">🎁 ไอเทม</span>
        )}
      </div>
    </motion.div>
  );
}
