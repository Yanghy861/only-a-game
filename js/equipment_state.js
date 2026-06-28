/* ============================================================
   生活装备、天气、商店、图鉴、战斗、宝石与卡片系统
   ============================================================ */

/* ============================================================
   装备系统:制作、装备/卸下、出售、加成计算
   ============================================================ */

// 检查是否拥有某装备(在 equip 背包中)
function hasEquip(equipId) {
  return (state.inventory.equip[equipId] || 0) > 0;
}

// 检查制作配方是否满足(材料足够)
function canCraft(equip) {
  if (!equip.recipe) return false;
  return Object.keys(equip.recipe).every((matId) => {
    // 材料可能在 wood / ore / fish 分类(护符类装备用鱼制作)
    const have = (state.inventory.wood[matId] || 0) + (state.inventory.ore[matId] || 0) + (state.inventory.fish[matId] || 0);
    return have >= equip.recipe[matId];
  });
}

// 制作装备:消耗材料,激活装备(激活型,每件只能制作一次)
function craftEquip(slot, equipId) {
  const equip = getEquipById(slot, equipId);
  if (!equip || !equip.recipe || !canCraft(equip)) return false;
  if (hasEquip(equipId)) return false; // 已激活,不可重复制作
  Object.keys(equip.recipe).forEach((matId) => {
    const need = equip.recipe[matId];
    // 优先从 wood 扣,再从 ore 扣,最后从 fish 扣(护符类装备)
    const fromWood = Math.min(state.inventory.wood[matId] || 0, need);
    state.inventory.wood[matId] = (state.inventory.wood[matId] || 0) - fromWood;
    let rest = need - fromWood;
    if (rest > 0) {
      const fromOre = Math.min(state.inventory.ore[matId] || 0, rest);
      state.inventory.ore[matId] = (state.inventory.ore[matId] || 0) - fromOre;
      rest -= fromOre;
    }
    if (rest > 0) {
      consumeFish(matId, rest);
    }
  });
  addItem('equip', equipId, 1);
  return true;
}

// 装备:把某装备穿戴到对应槽位(需拥有)
function equipItem(slot, equipId) {
  const slotDef = EQUIP_SLOTS().find((s) => s.key === slot);
  const isLoot = slotDef?.source === 'loot';
  const haveInEquip = hasEquip(equipId);
  const haveInLoot = isLoot && (state.inventory.loot?.[equipId] || 0) > 0;
  if (!haveInEquip && !haveInLoot) return false;
  // 如果该槽位已有装备,先放回背包(不消耗,因为装备不减少)
  state.equipped[slot] = equipId;
  return true;
}

// 卸下装备
function unequipItem(slot) {
  state.equipped[slot] = null;
  return true;
}

// 出售杂物掉落物(一键出售所有可出售的)
function sellJunk() {
  let total = 0;
  SELLABLE_LOOT().forEach((id) => {
    const count = state.inventory.loot[id] || 0;
    if (count > 0) {
      const loot = FISHING_LOOT().find((l) => l.id === id);
      if (loot) {
        total += count * loot.gold;
        state.inventory.loot[id] = 0;
      }
    }
  });
  if (total > 0) addGold(total);
  return total;
}

// 出售单种物品(鱼类/木材/矿石/掉落物)
function sellItem(category, id, count) {
  const have = state.inventory[category]?.[id] || 0;
  const n = Math.min(have, count);
  if (n <= 0) return 0;
  // 查找单价
  let gold = 0;
  if (category === 'fish') {
    FISHING_SPOTS().forEach((s) => s.fish.forEach((f) => { if (f.id === id) gold = f.gold; }));
  } else if (category === 'loot') {
    FISHING_LOOT().forEach((l) => { if (l.id === id) gold = l.gold; });
  } else if (category === 'wood') {
    WOODCUTTING_SPOTS().forEach((s) => s.drops.forEach((d) => { if (d.id === id) gold = d.gold; }));
  } else if (category === 'ore') {
    MINING_SPOTS().forEach((s) => s.drops.forEach((d) => { if (d.id === id) gold = d.gold; }));
  }
  if (gold <= 0) return 0;
  state.inventory[category][id] -= n;
  addGold(gold * n);
  return gold * n;
}

/* ---------- 装备加成计算 ---------- */
// 钓鱼速度总加成(等级 + 鱼竿 + 天气 + 药水),返回倍率
function fishingSpeedWithGear() {
  const base = skillSpeedMultiplier('fishing');
  const rodId = state.equipped.rod;
  let rodBonus = 0;
  if (rodId) {
    const rod = getEquipById('rod', rodId);
    if (rod) rodBonus = rod.speedBonus || 0;
  }
  const wBonus = weatherSpeedBonus();
  const buffSpeed = getBuffValue('speed');
  return base + rodBonus + wBonus + buffSpeed;
}

// 钓鱼实际时长(含装备+天气+药水加成)
function fishingDurationWithGear(spot) {
  return spot.baseTime / fishingSpeedWithGear();
}

// 稀有鱼概率加成(鱼钩)
function rarityBonus() {
  const hookId = state.equipped.hook;
  if (!hookId) return 0;
  const hook = getEquipById('hook', hookId);
  return hook?.rarityBonus || 0;
}

// 金币加成(鱼线 + 黄金鱼钩)
function goldBonus() {
  let bonus = 0;
  const lineId = state.equipped.line;
  if (lineId) {
    const line = getEquipById('line', lineId);
    bonus += line?.goldBonus || 0;
  }
  const hookId = state.equipped.hook;
  if (hookId) {
    const hook = getEquipById('hook', hookId);
    bonus += hook?.goldBonus || 0;
  }
  return bonus;
}

// 经验加成(鱼饵)
function xpBonus() {
  const baitId = state.equipped.bait;
  if (!baitId) return 0;
  const bait = getEquipById('bait', baitId);
  return bait?.xpBonus || 0;
}

// 带稀有加成的鱼类权重抽取:rarityBonus 会提升低权重(稀有)鱼的概率
function rollFishWithRarity(fishList) {
  const bonus = rarityBonus();
  if (bonus <= 0) return rollByWeight(fishList);
  // 稀有鱼 = 权重最低的鱼,提升其权重
  const sorted = [...fishList].sort((a, b) => a.weight - b.weight);
  const adjusted = fishList.map((f) => {
    // 权重越低(越稀有),加成越多
    const rank = sorted.indexOf(f);
    const rarityFactor = 1 + bonus * (1 - rank / Math.max(1, sorted.length - 1));
    return { ...f, weight: f.weight * rarityFactor };
  });
  return rollByWeight(adjusted);
}

/* ---------- 伐木/采矿装备加成计算 ---------- */
// 伐木速度总加成(等级 + 斧头 + 速度药水/食物),返回倍率
function woodcuttingSpeedWithGear() {
  const base = skillSpeedMultiplier('woodcutting');
  const axeId = state.equipped.axe;
  let axeBonus = 0;
  if (axeId) {
    const axe = getEquipById('axe', axeId);
    if (axe) axeBonus = axe.speedBonus || 0;
  }
  const buffSpeed = getBuffValue('speed');
  return base + axeBonus + buffSpeed;
}

// 采矿速度总加成(等级 + 镐子 + 速度药水/食物),返回倍率
function miningSpeedWithGear() {
  const base = skillSpeedMultiplier('mining');
  const pickId = state.equipped.pickaxe;
  let pickBonus = 0;
  if (pickId) {
    const pick = getEquipById('pickaxe', pickId);
    if (pick) pickBonus = pick.speedBonus || 0;
  }
  const buffSpeed = getBuffValue('speed');
  return base + pickBonus + buffSpeed;
}

// 伐木实际时长(含装备 + 药水/食物加成)
function woodcuttingDurationWithGear(spot) {
  return spot.baseTime / woodcuttingSpeedWithGear();
}

// 采矿实际时长(含装备 + 药水/食物加成)
function miningDurationWithGear(spot) {
  return spot.baseTime / miningSpeedWithGear();
}

// 伐木稀有加成(伐木护符)
function woodRarityBonus() {
  const charmId = state.equipped.wood_charm;
  if (!charmId) return 0;
  const charm = getEquipById('wood_charm', charmId);
  return charm?.rarityBonus || 0;
}

// 采矿稀有加成(矿工护符)
function mineRarityBonus() {
  const charmId = state.equipped.mine_charm;
  if (!charmId) return 0;
  const charm = getEquipById('mine_charm', charmId);
  return charm?.rarityBonus || 0;
}

