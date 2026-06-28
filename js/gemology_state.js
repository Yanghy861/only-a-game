/* ============================================================
   宝石采集与切割
   ============================================================ */

/* ============================================================
   宝石系统:采集与切割
   ============================================================ */

// 宝石采集时长(基础时长,可加装备/升级加成)
function gemDuration(spot) {
  let dur = spot.baseDuration;
  // 全局速度升级
  dur /= 1 + getUpgradeBonus('global_xp') * 0.1;
  // 速度药水
  dur /= 1 + getBuffValue('speed');
  return Math.max(1000, dur);
}

// 宝石采集结算
function completeGemology() {
  const s = state.gemology;
  const spot = getGemSpotById(s.currentSpotId);
  // 应用卡片稀有加成
  const cardRarity = getCardBonus('gem_rarity');
  const drops = spot.drops.map((d) => ({ ...d }));
  if (cardRarity > 0) {
    // 提高稀有掉落物权重
    const sorted = [...drops].sort((a, b) => a.weight - b.weight);
    drops.forEach((d) => {
      const rank = sorted.indexOf(d);
      d.weight *= 1 + cardRarity * (1 - rank / Math.max(1, sorted.length - 1));
    });
  }
  const drop = rollByWeight(drops);
  // 消耗卡片次数
  if (cardRarity > 0) consumeCardCharge('gem_rarity');

  const gBonus = getUpgradeBonus('global_gold') + encyclopediaGoldBonus() + getBuffValue('gold');
  const xBonus = getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getBuffValue('xp');
  const cardGold = getCardBonus('global_gold');
  const cardXp = getCardBonus('global_xp');

  const finalGold = Math.floor(drop.gold * (1 + gBonus + cardGold));
  const finalXp = Math.floor(drop.xp * (1 + xBonus + cardXp));

  addGold(finalGold);
  const isWaste = drop.type === 'waste';
  if (!isWaste) {
    addItem('gem_rough', drop.id, 1);
  }
  const r = addSkillXp('gemology', finalXp);

  // 消耗通用卡片次数
  if (cardGold > 0) consumeCardCharge('global_gold');
  if (cardXp > 0) consumeCardCharge('global_xp');

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  addLog('gemology', { id: drop.id, name: drop.name, icon: drop.icon, gold: finalGold, xp: finalXp, time: timeStr });

  if (r.leveledUp) {
    showToast(`宝石学等级提升至 Lv.${r.newLevel}!`, '💎');
  }
}

// 宝石切割(消耗金币,有成功率)
function cutGem(roughId) {
  const gemType = getGemTypeByRoughId(roughId);
  if (!gemType) return { ok: false, msg: '未知的原石' };
  const have = state.inventory.gem_rough?.[roughId] || 0;
  if (have <= 0) return { ok: false, msg: '原石不足' };
  const cost = GEM_CUTTING().costPerCut;
  if (state.character.gold < cost) return { ok: false, msg: '金币不足' };

  state.character.gold -= cost;
  state.inventory.gem_rough[roughId]--;

  if (Math.random() < GEM_CUTTING().successRate) {
    addItem('gem', gemType.id, 1);
    return { ok: true, success: true, gem: gemType };
  } else {
    // 失败返还30%概率返还原石
    if (Math.random() < GEM_CUTTING().failReturnRate) {
      addItem('gem_rough', roughId, 1);
      return { ok: true, success: false, returned: true };
    }
    return { ok: true, success: false, returned: false };
  }
}

