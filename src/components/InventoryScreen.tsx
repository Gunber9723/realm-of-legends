import { motion } from "framer-motion";
import { Item } from "../types/game";

interface Props {
  inventory: Item[];
  onEquip: (item: Item) => void;
  onUse: (item: Item) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#aaa",
  uncommon: "#27ae60",
  rare: "#3498db",
  epic: "#9b59b6",
};

export default function InventoryScreen({ inventory, onEquip, onUse }: Props) {
  const equipped = inventory.filter(i => i.equipped);
  const unequipped = inventory.filter(i => !i.equipped && i.type !== "consumable");
  const consumables = inventory.filter(i => i.type === "consumable");

  return (
    <div className="min-h-screen pt-20 pb-20 px-4"
      style={{ background: "linear-gradient(160deg, #0a0a1a 0%, #101020 100%)" }}>
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <h2 className="text-2xl font-black" style={{ color: "#3498db", fontFamily: "'Georgia', serif" }}>
            🎒 กระเป๋าไอเทม
          </h2>
          <p className="text-gray-500 text-sm">{inventory.length} ไอเทม</p>
        </motion.div>

        {equipped.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-2">⚔️ สวมใส่อยู่</div>
            <div className="grid grid-cols-2 gap-2">
              {equipped.map((item, i) => (
                <ItemCard key={i} item={item} onEquip={() => onEquip(item)} onUse={() => onUse(item)} />
              ))}
            </div>
          </div>
        )}

        {unequipped.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-2">🗡️ อาวุธ/เกราะ</div>
            <div className="grid grid-cols-2 gap-2">
              {unequipped.map((item, i) => (
                <ItemCard key={i} item={item} onEquip={() => onEquip(item)} onUse={() => onUse(item)} />
              ))}
            </div>
          </div>
        )}

        {consumables.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-2">🧪 ของใช้</div>
            <div className="grid grid-cols-2 gap-2">
              {consumables.map((item, i) => (
                <ItemCard key={i} item={item} onEquip={() => onEquip(item)} onUse={() => onUse(item)} />
              ))}
            </div>
          </div>
        )}

        {inventory.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <div className="text-5xl mb-3">🎒</div>
            <div>กระเป๋าว่างเปล่า</div>
            <div className="text-sm mt-1">ไปช้อปปิ้งที่ร้านค้าหรือผจญภัยในดันเจี้ยน</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({ item, onEquip, onUse }: { item: Item; onEquip: () => void; onUse: () => void }) {
  const rarityColor = RARITY_COLORS[item.rarity];
  const isConsumable = item.type === "consumable";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 rounded-xl"
      style={{
        background: item.equipped ? `${rarityColor}15` : "rgba(255,255,255,0.04)",
        border: `1px solid ${item.equipped ? rarityColor : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-2xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-bold truncate">{item.name}</div>
          <div className="text-xs font-bold" style={{ color: rarityColor }}>{item.rarity}</div>
        </div>
        {item.quantity > 1 && (
          <div className="text-xs font-bold text-gray-400">x{item.quantity}</div>
        )}
      </div>
      <div className="text-xs text-gray-500 mb-2">{item.description}</div>
      {item.effect && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.effect.attack && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#e74c3c22", color: "#e74c3c" }}>ATK+{item.effect.attack}</span>}
          {item.effect.defense && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#27ae6022", color: "#27ae60" }}>DEF+{item.effect.defense}</span>}
          {item.effect.hp && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#e74c3c22", color: "#e74c3c" }}>HP+{item.effect.hp}</span>}
          {item.effect.mp && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#3498db22", color: "#3498db" }}>MP+{item.effect.mp}</span>}
        </div>
      )}
      {!isConsumable && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onEquip}
          className="w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer"
          style={{
            background: item.equipped ? "rgba(231,76,60,0.2)" : "rgba(52,152,219,0.2)",
            border: `1px solid ${item.equipped ? "#e74c3c44" : "#3498db44"}`,
            color: item.equipped ? "#e74c3c" : "#3498db",
          }}
        >
          {item.equipped ? "ถอดออก" : "สวมใส่"}
        </motion.button>
      )}
      {isConsumable && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onUse}
          className="w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer"
          style={{ background: "rgba(39,174,96,0.2)", border: "1px solid #27ae6044", color: "#27ae60" }}
        >
          ใช้งาน
        </motion.button>
      )}
    </motion.div>
  );
}
