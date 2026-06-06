import { motion } from "framer-motion";
import { SHOP_ITEMS, SHOP_PRICES } from "../data/gameData";
import { Character } from "../types/game";

interface Props {
  character: Character;
  onBuy: (itemId: string) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#aaa",
  uncommon: "#27ae60",
  rare: "#3498db",
  epic: "#9b59b6",
};

export default function ShopScreen({ character, onBuy }: Props) {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4"
      style={{ background: "linear-gradient(160deg, #0a0800 0%, #1a1000 100%)" }}>
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <h2 className="text-2xl font-black" style={{ color: "#f39c12", fontFamily: "'Georgia', serif" }}>
            🛒 ร้านค้า
          </h2>
          <div className="text-yellow-400 font-bold">💰 เงินของคุณ: {character.gold}G</div>
        </motion.div>

        <div className="p-3 rounded-xl mb-4"
          style={{ background: "rgba(243,156,18,0.08)", border: "1px solid rgba(243,156,18,0.2)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">👴</span>
            <div className="text-sm text-gray-300">
              "ยินดีต้อนรับนักผจญภัย! ฉันมีสินค้าดีๆ ราคาไม่แพง มาดูกันเลย!"
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SHOP_ITEMS.map((item, i) => {
            const price = SHOP_PRICES[item.id] || 99;
            const canAfford = character.gold >= price;
            const rarityColor = RARITY_COLORS[item.rarity];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${rarityColor}30`,
                }}
              >
                <div className="text-3xl text-center mb-2">{item.icon}</div>
                <div className="text-white text-xs font-bold text-center mb-0.5">{item.name}</div>
                <div className="text-xs font-bold text-center mb-1" style={{ color: rarityColor }}>{item.rarity}</div>
                <div className="text-gray-500 text-xs text-center mb-2">{item.description}</div>
                {item.effect && (
                  <div className="flex flex-wrap gap-1 justify-center mb-2">
                    {item.effect.attack && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#e74c3c22", color: "#e74c3c" }}>ATK+{item.effect.attack}</span>}
                    {item.effect.defense && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#27ae6022", color: "#27ae60" }}>DEF+{item.effect.defense}</span>}
                    {item.effect.hp && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#e74c3c22", color: "#e74c3c" }}>HP+{item.effect.hp}</span>}
                    {item.effect.mp && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#3498db22", color: "#3498db" }}>MP+{item.effect.mp}</span>}
                  </div>
                )}
                <div className="text-center font-bold text-yellow-400 text-sm mb-2">
                  💰 {price}G
                </div>
                <motion.button
                  whileHover={canAfford ? { scale: 1.04 } : {}}
                  whileTap={canAfford ? { scale: 0.96 } : {}}
                  onClick={() => canAfford && onBuy(item.id)}
                  disabled={!canAfford}
                  className="w-full py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: canAfford ? "rgba(243,156,18,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${canAfford ? "#f39c1244" : "rgba(255,255,255,0.05)"}`,
                    color: canAfford ? "#f39c12" : "#666",
                    cursor: canAfford ? "pointer" : "not-allowed",
                  }}
                >
                  {canAfford ? "ซื้อ" : "เงินไม่พอ"}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
