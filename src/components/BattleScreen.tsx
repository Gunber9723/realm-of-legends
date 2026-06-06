import { motion, AnimatePresence } from "framer-motion";
import { Character, Monster, BattleLog, Skill, Item } from "../types/game";
import { CLASS_DATA } from "../data/gameData";

interface Props {
  character: Character;
  enemy: Monster;
  logs: BattleLog[];
  turn: "player" | "enemy" | "end";
  onAttack: () => void;
  onSkill: (skill: Skill) => void;
  onItem: (item: Item) => void;
  onFlee: () => void;
  inventory: Item[];
}

export default function BattleScreen({ character, enemy, logs, turn, onAttack, onSkill, onItem, onFlee, inventory }: Props) {
  const cls = CLASS_DATA[character.class];
  const consumables = inventory.filter(i => i.type === "consumable" && i.quantity > 0);
  const hpPct = (character.hp / character.maxHp) * 100;
  const mpPct = (character.mp / character.maxMp) * 100;
  const enemyHpPct = (enemy.hp / enemy.maxHp) * 100;
  const isPlayerTurn = turn === "player";

  return (
    <div className="min-h-screen pt-16 pb-20 px-4 flex flex-col"
      style={{ background: "linear-gradient(160deg, #0a0010 0%, #1a0020 50%, #100010 100%)" }}>
      <div className="max-w-xl mx-auto w-full flex flex-col flex-1 gap-3">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-2">
          <div className="text-xs font-bold tracking-widest"
            style={{ color: isPlayerTurn ? "#27ae60" : "#e74c3c" }}>
            {isPlayerTurn ? "⚔️ ถึงตาของคุณ!" : turn === "end" ? "🏆 จบการต่อสู้" : "💀 ศัตรูกำลังโจมตี..."}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <CombatantCard name={character.name} icon={cls.icon} level={character.level}
            hp={character.hp} maxHp={character.maxHp} hpPct={hpPct}
            mp={character.mp} maxMp={character.maxMp} mpPct={mpPct}
            isPlayer color={cls.color} />
          <CombatantCard name={enemy.name} icon={enemy.icon} level={enemy.level}
            hp={enemy.hp} maxHp={enemy.maxHp} hpPct={enemyHpPct} />
        </div>

        <div className="rounded-xl p-3 flex-1 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", minHeight: 120, maxHeight: 160 }}>
          {logs.slice(-8).map((log, i) => (
            <div key={i} className="text-xs py-0.5"
              style={{
                color: log.type === "player" ? "#7fffb2" :
                  log.type === "enemy" ? "#ff7f7f" :
                  log.type === "skill" ? "#c8a8ff" : "#aaa",
              }}>
              {log.message}
            </div>
          ))}
        </div>

        {isPlayerTurn && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <ActionButton onClick={onAttack} icon="⚔️" label="โจมตีปกติ" color="#e74c3c" />
              <ActionButton onClick={onFlee} icon="🏃" label="หนีออก" color="#95a5a6" />
            </div>
            {character.skills.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {character.skills.map(skill => (
                  <ActionButton
                    key={skill.id}
                    onClick={() => onSkill(skill)}
                    icon={skill.icon}
                    label={skill.name}
                    sub={`${skill.mpCost} MP`}
                    color="#9b59b6"
                    disabled={character.mp < skill.mpCost}
                  />
                ))}
              </div>
            )}
            {consumables.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {consumables.map(item => (
                  <ActionButton
                    key={item.id}
                    onClick={() => onItem(item)}
                    icon={item.icon}
                    label={item.name}
                    sub={`x${item.quantity}`}
                    color="#27ae60"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!isPlayerTurn && turn !== "end" && (
          <div className="flex items-center justify-center py-4">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-2xl">⚡</motion.div>
            <span className="ml-2 text-gray-400 text-sm">ศัตรูกำลังโจมตี...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CombatantCard({ name, icon, level, hp, maxHp, hpPct, mp, maxMp, mpPct, isPlayer, color }: {
  name: string; icon: string; level: number;
  hp: number; maxHp: number; hpPct: number;
  mp?: number; maxMp?: number; mpPct?: number;
  isPlayer?: boolean; color?: string;
}) {
  return (
    <motion.div className="rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${isPlayer ? (color + "44") : "rgba(231,76,60,0.3)"}` }}
      animate={hpPct < 25 ? { borderColor: ["rgba(231,76,60,0.3)", "rgba(231,76,60,0.8)", "rgba(231,76,60,0.3)"] } : {}}
      transition={{ duration: 1, repeat: Infinity }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-white text-xs font-bold truncate">{name}</div>
          <div className="text-gray-500 text-xs">Lv.{level}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        <MiniBar label="HP" value={hp} max={maxHp} percent={hpPct}
          color={hpPct > 50 ? "#27ae60" : hpPct > 25 ? "#e67e22" : "#e74c3c"} />
        {isPlayer && mp !== undefined && mpPct !== undefined && (
          <MiniBar label="MP" value={mp} max={maxMp!} percent={mpPct} color="#3498db" />
        )}
      </div>
    </motion.div>
  );
}

function MiniBar({ label, value, max, percent, color }: { label: string; value: number; max: number; percent: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{label}</span><span>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          animate={{ width: `${Math.max(0, percent)}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon, label, sub, color, disabled }: {
  onClick: () => void; icon: string; label: string; sub?: string; color: string; disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.04 } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      onClick={!disabled ? onClick : undefined}
      className="py-2 px-2 rounded-lg text-center transition-all"
      style={{
        background: disabled ? "rgba(255,255,255,0.03)" : `${color}22`,
        border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : color + "44"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div className="text-lg">{icon}</div>
      <div className="text-xs font-bold text-white truncate">{label}</div>
      {sub && <div className="text-xs" style={{ color: disabled ? "#666" : color }}>{sub}</div>}
    </motion.button>
  );
}
