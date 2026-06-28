/* ============================================================
   通用技能等级、采集点与基础速度工具
   ============================================================ */

function addSkillXp(skill, amount) {
  const s = state[skill];
  if (s.level >= MAX_LEVEL()) {
    s.xp = 0;
    return { leveledUp: false, newLevel: s.level };
  }
  s.xp += amount;
  let leveledUp = false;
  while (s.level < MAX_LEVEL() && s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level += 1;
    leveledUp = true;
  }
  if (s.level >= MAX_LEVEL()) s.xp = 0;
  if (leveledUp) recalculateCharacterLevel();
  return { leveledUp, newLevel: s.level };
}

// 通用:添加日志
function addLog(skill, entry) {
  state.log[skill].unshift(entry);
  if (state.log[skill].length > 30) state.log[skill].length = 30;
}

function isUnlockConditionMet(unlock) {
  if (!unlock || unlock.type === 'start') return true;
  if (unlock.type === 'threatCleared') return !!state.combat.areaThreatCleared?.[unlock.areaId];
  if (unlock.type === 'areaUnlocked') return !!state.combat.unlocks?.areas?.[unlock.areaId];
  if (unlock.type === 'feature') return !!state.combat.unlocks?.features?.[unlock.id];
  return true;
}

function getUnlockConditionText(unlock) {
  if (!unlock || unlock.type === 'start') return '';
  if (unlock.type === 'threatCleared') {
    const area = getCombatAreaById(unlock.areaId);
    return area ? `需清理 ${area.name}` : '需清理前置威胁';
  }
  if (unlock.type === 'areaUnlocked') {
    const area = getCombatAreaById(unlock.areaId);
    return area ? `需发现 ${area.name}` : '需发现前置区域';
  }
  if (unlock.text) return unlock.text;
  return '需完成前置条件';
}

function isSpotUnlocked(skill, spot) {
  return !!spot && state[skill].level >= spot.requiredLevel && isUnlockConditionMet(spot.unlock);
}

function getSpotLockText(skill, spot) {
  if (!spot) return '未解锁';
  if (state[skill].level < spot.requiredLevel) return `需 Lv.${spot.requiredLevel}`;
  return getUnlockConditionText(spot.unlock) || '未解锁';
}

function isGemSpotUnlocked(spot) {
  return !!spot && state.gemology.level >= spot.requiredLevel && isUnlockConditionMet(spot.unlock);
}

function getGemSpotLockText(spot) {
  if (!spot) return '未解锁';
  if (state.gemology.level < spot.requiredLevel) return `需 Lv.${spot.requiredLevel}`;
  return getUnlockConditionText(spot.unlock) || '未解锁';
}

// 通用:选择采集/钓鱼点
function selectSkillSpot(skill, spotId, spotList) {
  const spot = spotList.find((s) => s.id === spotId);
  if (!isSpotUnlocked(skill, spot)) return false;
  state[skill].currentSpotId = spotId;
  state[skill].progress = 0;
  return true;
}

// 通用:速度加成(每5级提速10%,上限50%)
function skillSpeedMultiplier(skill) {
  const bonus = Math.min(0.5, Math.floor(state[skill].level / 5) * 0.1);
  return 1 + bonus;
}

function skillDuration(skill, spot) {
  return spot.baseTime / skillSpeedMultiplier(skill);
}

/* ---------- 钓鱼专用快捷方法 ---------- */
function selectSpot(spotId) {
  return selectSkillSpot('fishing', spotId, FISHING_SPOTS());
}
function fishingSpeedMultiplier() {
  return skillSpeedMultiplier('fishing');
}
function fishingDuration(spot) {
  return skillDuration('fishing', spot);
}

