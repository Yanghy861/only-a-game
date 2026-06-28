/* ============================================================
   背包、金币与通用物品工具
   ============================================================ */

/* ---------- 通用状态工具 ---------- */
function addGold(amount) {
  state.character.gold = Math.max(0, state.character.gold + amount);
}

// 向指定背包分类添加物品
function addItem(category, id, count = 1) {
  // 战斗装备单独存储
  if (category === 'combat_equip') {
    if (!state.combat.inventory) state.combat.inventory = {};
    state.combat.inventory[id] = (state.combat.inventory[id] || 0) + count;
    return;
  }
  // 卡片单独存储
  if (category === 'card') {
    if (!state.cards.inventory) state.cards.inventory = {};
    state.cards.inventory[id] = (state.cards.inventory[id] || 0) + count;
    return;
  }
  // 怪物掉落物(皮革/骨头/魔法粉尘/龙鳞)存到 loot 分类
  if (category === 'monster_drop') {
    if (!state.inventory.loot) state.inventory.loot = {};
    state.inventory.loot[id] = (state.inventory.loot[id] || 0) + count;
    return;
  }
  // 宝石原石存到 gem_rough 分类,切割后宝石存到 gem 分类
  if (!state.inventory[category]) state.inventory[category] = {};
  state.inventory[category][id] = (state.inventory[category][id] || 0) + count;
}

// 获取某材料的拥有数量(跨分类查找:wood/ore/fish/loot/gem_rough/gem)
function getItemCount(id) {
  let total = 0;
  ['wood', 'ore', 'fish', 'loot', 'gem_rough', 'gem'].forEach((cat) => {
    total += state.inventory[cat]?.[id] || 0;
  });
  return total;
}

// 兼容旧调用:品质系统已移除,不再记录鱼品质
function addFishQuality() {}

// 消耗鱼
function consumeFish(id, count) {
  const base = state.inventory.fish?.[id] || 0;
  if (base < count) return false;
  state.inventory.fish[id] = base - count;
  return true;
}

// 消耗材料(跨分类,优先消耗鱼 > gem_rough > gem > loot > ore > wood)
function consumeItem(id, count) {
  if ((state.inventory.fish?.[id] || 0) > 0) {
    return consumeFish(id, count);
  }
  let remaining = count;
  const cats = ['gem_rough', 'gem', 'loot', 'ore', 'wood'];
  for (const cat of cats) {
    if (remaining <= 0) break;
    const have = state.inventory[cat]?.[id] || 0;
    if (have > 0) {
      const take = Math.min(have, remaining);
      state.inventory[cat][id] -= take;
      remaining -= take;
    }
  }
  return remaining <= 0;
}

