/* ============================================================
   图鉴进度与奖励
   ============================================================ */

/* ============================================================
   图鉴系统
   ============================================================ */
// 记录发现某种鱼,返回是否为首次发现
function recordFishDiscovery(fishId) {
  const firstTime = !state.encyclopedia[fishId];
  state.encyclopedia[fishId] = true;
  return firstTime;
}

// 统计已发现的鱼种数。旧存档中 { normal: true } 也视为已发现。
function getDiscoveredCount() {
  return Object.keys(state.encyclopedia).filter((id) => {
    const entry = state.encyclopedia[id];
    return entry === true || (entry && typeof entry === 'object' && Object.keys(entry).length > 0);
  }).length;
}

// 兼容旧调用:现在只返回是否发现该鱼种
function getDiscoveredQualities(fishId) {
  return state.encyclopedia[fishId] ? 1 : 0;
}

// 领取图鉴里程碑奖励
function claimEncyclopediaReward(count) {
  const milestone = ENCYCLOPEDIA_MILESTONES().find((m) => m.count === count);
  if (!milestone) return { ok: false, msg: '无此奖励' };
  if (state.encyclopediaRewards[count]) return { ok: false, msg: '已领取' };
  if (getDiscoveredCount() < count) return { ok: false, msg: '未达成' };
  state.encyclopediaRewards[count] = true;
  if (milestone.reward.gold) addGold(milestone.reward.gold);
  return { ok: true, reward: milestone.reward };
}

// 图鉴里程碑加成(已领取的永久生效)
function encyclopediaXpBonus() {
  let bonus = 0;
  ENCYCLOPEDIA_MILESTONES().forEach((m) => {
    if (state.encyclopediaRewards[m.count] && m.reward.xpBonus) bonus += m.reward.xpBonus;
  });
  return bonus;
}

function encyclopediaGoldBonus() {
  let bonus = 0;
  ENCYCLOPEDIA_MILESTONES().forEach((m) => {
    if (state.encyclopediaRewards[m.count] && m.reward.goldBonus) bonus += m.reward.goldBonus;
  });
  return bonus;
}

