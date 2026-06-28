/* ============================================================
   战斗等级、无尽塔、手动战斗与战斗结算
   ============================================================ */

/* ============================================================
   战斗系统:状态管理函数
   ============================================================ */

// 增加战斗经验并处理升级
function addCombatXp(amount, styleId = getCurrentCombatStyleId()) {
  const c = state.combat;
  if (!c.styles) c.styles = {};
  if (!c.styles[styleId]) c.styles[styleId] = { level: 1, xp: 0 };
  const styleState = c.styles[styleId];
  const bonus = 1 + getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getBuffValue('xp');
  const finalXp = Math.floor(amount * bonus);
  styleState.xp += finalXp;
  let leveledUp = false;
  let newLevel = styleState.level;
  while (styleState.level < 999) {
    const need = combatXpForLevel(styleState.level);
    if (styleState.xp >= need) {
      styleState.xp -= need;
      styleState.level++;
      leveledUp = true;
      newLevel = styleState.level;
    } else break;
  }
  c.level = getCombatDisplayLevel();
  c.xp = getCombatStyleState(getCurrentCombatStyleId()).xp;
  if (leveledUp) recalculateCharacterLevel();
  const style = getCombatStyleById(styleId);
  return { leveledUp, newLevel, gainedXp: finalXp, styleId, styleName: style.name };
}

function setCombatStyle(styleId) {
  if (!getCombatStyleById(styleId)) return false;
  state.combat.currentStyle = styleId;
  state.combat.level = getCombatDisplayLevel();
  state.combat.xp = getCombatStyleState(styleId).xp;
  return true;
}

function getNextStoryDungeon() {
  return STORY_DUNGEONS().find((d) => !state.combat.storyCleared[d.id]) || null;
}

function getVisibleBossDungeons() {
  const bosses = MANUAL_DUNGEONS();
  const currentIndex = bosses.findIndex((d) => !isBossCleared(d.id));
  if (currentIndex === -1) {
    return {
      known: bosses.slice(-2),
      rumor: null,
      hiddenCount: 0,
      allCleared: true,
    };
  }
  const known = bosses.slice(Math.max(0, currentIndex - 1), currentIndex + 1);
  const rumor = bosses[currentIndex + 1] || null;
  const hiddenCount = Math.max(0, bosses.length - currentIndex - 2);
  return { known, rumor, hiddenCount, allCleared: false };
}

// 获取无尽塔某层的敌人属性
function getEndlessEnemy(floor, dungeon) {
  const f = floor - 1;
  return {
    id: 'endless_' + floor,
    name: `第${floor}层守卫`,
    icon: '👹',
    hp: Math.floor(dungeon.baseEnemyHp * Math.pow(dungeon.hpGrowth, f)),
    atk: Math.floor(dungeon.baseEnemyAtk * Math.pow(dungeon.atkGrowth, f)),
    def: Math.floor(dungeon.baseEnemyDef * Math.pow(dungeon.defGrowth, f)),
    spd: Math.floor(dungeon.baseEnemySpd * Math.pow(dungeon.spdGrowth, f)),
  };
}

// 获取无尽塔某层奖励
function getEndlessReward(floor, dungeon) {
  const f = floor - 1;
  return {
    gold: Math.floor(dungeon.goldPerFloor * Math.pow(dungeon.goldGrowth, f)),
    xp: Math.floor(dungeon.xpPerFloor * Math.pow(dungeon.xpGrowth, f)),
  };
}

// 检查Boss是否已击败(一次性)
function isBossCleared(dungeonId) {
  return !!state.combat.bossCleared[dungeonId];
}

// 检查Boss是否可挑战
function canChallengeBoss(dungeonId) {
  if (isBossCleared(dungeonId)) return false;
  const d = getManualDungeonById(dungeonId);
  if (!d || !d.requires) return true;
  return d.requires.every((req) => {
    if (req.type === 'bossCleared') return isBossCleared(req.id);
    if (req.type === 'combatLevel') return state.combat.level >= req.level;
    return true;
  });
}

function getBossLockText(dungeonId) {
  const d = getManualDungeonById(dungeonId);
  if (!d || !d.requires) return '';
  const unmet = d.requires.find((req) => {
    if (req.type === 'bossCleared') return !isBossCleared(req.id);
    if (req.type === 'combatLevel') return state.combat.level < req.level;
    return false;
  });
  if (!unmet) return '';
  if (unmet.type === 'bossCleared') {
    const boss = getManualDungeonById(unmet.id);
    return `需先击败${boss ? boss.name : unmet.id}`;
  }
  if (unmet.type === 'combatLevel') return `需要战斗 Lv.${unmet.level}`;
  return '尚未解锁';
}

// 获取当前可用天赋点数
function getAvailableTalentPoints() {
  const total = (state.combat.level - 1) * (COMBAT_TALENTS().pointsPerLevel || 1);
  const spent = Object.keys(state.combat.talents || {}).length;
  return Math.max(0, total - spent);
}

// 检查天赋是否已解锁
function isTalentUnlocked(talentId) {
  return !!(state.combat.talents && state.combat.talents[talentId]);
}

// 尝试解锁天赋
function unlockTalent(talentId) {
  const talent = getTalentById(talentId);
  if (!talent) return { ok: false, msg: '天赋不存在' };
  if (isTalentUnlocked(talentId)) return { ok: false, msg: '已解锁' };
  if (talent.requires && !talent.requires.every((id) => isTalentUnlocked(id))) {
    return { ok: false, msg: '前置天赋未解锁' };
  }
  if (getAvailableTalentPoints() < talent.cost) {
    return { ok: false, msg: '天赋点不足' };
  }
  state.combat.talents[talentId] = true;
  return { ok: true };
}

// 标记Boss已击败并应用解锁
function markBossCleared(dungeonId) {
  state.combat.bossCleared[dungeonId] = true;
  const d = getManualDungeonById(dungeonId);
  if (!d || !d.unlocks) return;
  d.unlocks.forEach((u) => {
    if (u.type === 'spot') state.combat.unlocks.spots[u.id] = true;
    if (u.type === 'equip') state.combat.unlocks.equips[u.id] = true;
    if (u.type === 'feature') state.combat.unlocks.features[u.id] = true;
    if (u.type === 'recipe') state.combat.unlocks.recipes[u.id] = true;
    if (u.type === 'area') state.combat.unlocks.areas[u.id] = true;
  });
}

// 创建一场战斗实例(手动战斗)
function createBattle(enemy, options = {}) {
  const stats = getPlayerCombatStats();
  const res = COMBAT_RESOURCE();
  return {
    enemy: {
      ...enemy, maxHp: enemy.hp, currentHp: enemy.hp,
      energy: res.startWith,
      buffs: {},     // { stat: { value, turns } } 增益
      debuffs: {},   // { stat: { value, turns } } 减益
      dots: [],      // [{ power, turns, element, sourceAtk }] 持续伤害
      stun: 0,       // 眩晕剩余回合
    },
    player: {
      ...stats,
      maxHp: stats.hp,
      currentHp: stats.hp,
      energy: res.startWith,
      defending: false,
      buffs: {},
      debuffs: {},
      dots: [],
      stun: 0,
    },
    turn: 1,
    log: [{ type: 'start', text: `战斗开始!${enemy.name} 出现了!` }],
    result: null, // null=进行中, 'win'=胜利, 'lose'=失败
    type: options.type || 'story', // 'story' | 'boss'
    dungeonId: options.dungeonId,
  };
}

// 获取受增益/减益影响后的有效属性
function effectiveStat(unit, stat) {
  let val = unit[stat] || 0;
  if (unit.buffs && unit.buffs[stat]) val *= (1 + unit.buffs[stat].value);
  if (unit.debuffs && unit.debuffs[stat]) val *= (1 - unit.debuffs[stat].value);
  return val;
}

// 执行一次攻击动作(玩家或敌人)
// 返回 { damage, crit, element, multiplier }
function executeAttack(attacker, defender, power = 1.0, element = 'physical') {
  const atk = effectiveStat(attacker, 'atk');
  const def = effectiveStat(defender, 'def');
  const baseAtk = atk * power;
  const isCrit = Math.random() < (attacker.crit || 0);
  const defenderElement = defender.element || 'physical';
  let multiplier = getElementDamageMultiplier(element, defenderElement);
  if (attacker.elementStrong && multiplier > 1) multiplier += attacker.elementStrong;
  if (attacker.elementWeak && multiplier < 1) multiplier += attacker.elementWeak;
  multiplier = Math.max(0.1, Math.min(3.0, multiplier));
  let damage = Math.max(1, Math.floor((baseAtk - def * 0.5) * multiplier));
  if (isCrit) damage = Math.floor(damage * (attacker.critDmg || 1.5));
  return { damage, crit: isCrit, element, multiplier };
}

// 玩家使用技能(手动战斗)
function playerUseSkill(battle, skillId) {
  if (battle.result) return { ok: false, msg: '战斗已结束' };
  const skill = getSkillById(skillId);
  if (!skill) return { ok: false, msg: '技能不存在' };
  if (battle.player.energy < skill.cost) return { ok: false, msg: '能量不足' };

  battle.player.energy -= skill.cost;
  battle.player.energy += skill.gain || 0;
  battle.player.energy = Math.min(battle.player.energy, COMBAT_RESOURCE().max);
  battle.player.defending = false;

  let logText = '';
  const isDamageType = ['damage', 'damage_dot', 'damage_debuff', 'damage_stun', 'damage_lifesteal'].includes(skill.type);

  if (isDamageType) {
    const r = executeAttack(battle.player, battle.enemy, skill.power, skill.element || 'physical');
    battle.enemy.currentHp -= r.damage;
    const elemInfo = r.multiplier !== 1 ? getElementInfo(skill.element || 'physical') : null;
    const elemHint = elemInfo ? `[${elemInfo.name}${r.multiplier > 1 ? '克制' : '被抗'}]` : '';
    logText = `你使用${skill.name}${r.crit ? '(暴击!)' : ''}${elemHint},对${battle.enemy.name}造成${r.damage}伤害`;
    // 持续伤害(DOT)
    if (skill.dot) {
      const srcAtk = effectiveStat(battle.player, 'atk');
      battle.enemy.dots.push({ power: skill.dot.power, turns: skill.dot.turns, element: skill.dot.element, sourceAtk: srcAtk });
      const elemName = CONFIG.combat.elements[skill.dot.element]?.name || '';
      logText += `,附加${elemName}持续伤害${skill.dot.turns}回合`;
    }
    // 减益(debuff)
    if (skill.debuff) {
      battle.enemy.debuffs[skill.debuff.stat] = { value: skill.debuff.value, turns: skill.debuff.turns };
      logText += `,降低敌人${skill.debuff.stat.toUpperCase()}`;
    }
    // 眩晕(stun)
    if (skill.stunChance && Math.random() < skill.stunChance) {
      battle.enemy.stun = 1;
      logText += ',眩晕敌人!';
    }
    // 吸血(lifesteal)
    if (skill.lifesteal) {
      const heal = Math.floor(r.damage * skill.lifesteal);
      battle.player.currentHp = Math.min(battle.player.maxHp, battle.player.currentHp + heal);
      logText += `,汲取${heal}生命`;
    }
  } else if (skill.type === 'defend') {
    battle.player.defending = true;
    logText = `你使用${skill.name},本回合减伤${(1 - skill.power) * 100}%`;
  } else if (skill.type === 'heal') {
    const heal = Math.floor(battle.player.maxHp * skill.power);
    battle.player.currentHp = Math.min(battle.player.maxHp, battle.player.currentHp + heal);
    logText = `你使用${skill.name},恢复${heal}点生命`;
  } else if (skill.type === 'buff') {
    if (skill.buff) {
      battle.player.buffs[skill.buff.stat] = { value: skill.buff.value, turns: skill.buff.turns };
      logText = `你使用${skill.name},${skill.buff.turns}回合内${skill.buff.stat.toUpperCase()}+${(skill.buff.value * 100)}%`;
    }
  }
  battle.log.push({ type: 'player', text: logText });

  // 处理敌人身上的持续伤害
  processEnemyDots(battle);

  // 检查胜利
  if (battle.enemy.currentHp <= 0) {
    battle.enemy.currentHp = 0;
    battle.result = 'win';
    battle.log.push({ type: 'win', text: `胜利!你击败了${battle.enemy.name}` });
    return { ok: true, ended: true, result: 'win' };
  }

  // 敌人回合
  enemyTurn(battle);

  // 回合结束:递减所有持续效果
  tickStatusEffects(battle);

  if (battle.player.currentHp <= 0) {
    battle.player.currentHp = 0;
    battle.result = 'lose';
    battle.log.push({ type: 'lose', text: '你被击败了...' });
    return { ok: true, ended: true, result: 'lose' };
  }

  battle.turn++;
  return { ok: true, ended: false };
}

// 处理敌人身上的持续伤害(DOT)
function processEnemyDots(battle) {
  const enemy = battle.enemy;
  if (!enemy.dots || enemy.dots.length === 0) return;
  enemy.dots.forEach((dot) => {
    const dmg = Math.max(1, Math.floor(dot.sourceAtk * dot.power));
    enemy.currentHp -= dmg;
    const elemName = CONFIG.combat.elements[dot.element]?.name || '';
    battle.log.push({ type: 'dot', text: `${elemName}持续伤害对${enemy.name}造成${dmg}伤害` });
  });
}

// 回合结束:递减所有持续效果持续时间
function tickStatusEffects(battle) {
  const p = battle.player;
  const e = battle.enemy;
  // 玩家增益
  for (const stat in p.buffs) {
    p.buffs[stat].turns--;
    if (p.buffs[stat].turns <= 0) delete p.buffs[stat];
  }
  // 玩家减益
  for (const stat in p.debuffs) {
    p.debuffs[stat].turns--;
    if (p.debuffs[stat].turns <= 0) delete p.debuffs[stat];
  }
  // 玩家DOT
  p.dots = p.dots.filter((d) => { d.turns--; return d.turns > 0; });
  if (p.stun > 0) p.stun--;
  // 敌人增益
  for (const stat in e.buffs) {
    e.buffs[stat].turns--;
    if (e.buffs[stat].turns <= 0) delete e.buffs[stat];
  }
  // 敌人减益
  for (const stat in e.debuffs) {
    e.debuffs[stat].turns--;
    if (e.debuffs[stat].turns <= 0) delete e.debuffs[stat];
  }
  // 敌人DOT
  e.dots = e.dots.filter((d) => { d.turns--; return d.turns > 0; });
  if (e.stun > 0) e.stun--;
}

// 敌人回合AI
function enemyTurn(battle) {
  const enemy = battle.enemy;

  // 眩晕检查:跳过本回合
  if (enemy.stun > 0) {
    battle.log.push({ type: 'stun', text: `${enemy.name}被眩晕,无法行动!` });
    return;
  }

  const enemySkills = COMBAT_ENEMY_SKILLS();
  let skill;
  enemy.energy += COMBAT_RESOURCE().perTurn;
  enemy.energy = Math.min(enemy.energy, COMBAT_RESOURCE().max);

  // 狂暴检查(血量低于阈值)
  const enrageAt = enemy.enrageAt || 0;
  const hpRatio = enemy.currentHp / enemy.maxHp;
  const isEnraged = enrageAt > 0 && hpRatio < enrageAt;

  if (enemy.energy >= 50 && enemySkills[1]) {
    skill = enemySkills[1]; // 狂暴
  } else {
    skill = enemySkills[0]; // 普通攻击
  }

  enemy.energy -= skill.cost || 0;
  enemy.energy += skill.gain || 0;

  let power = skill.power;
  if (isEnraged) power *= (enemy.enrageMult || 1.5);

  const r = executeAttack(enemy, battle.player, power, enemy.element || 'physical');
  let damage = r.damage;
  if (battle.player.defending) {
    damage = Math.floor(damage * 0.4);
  }
  battle.player.currentHp -= damage;
  const enrageText = isEnraged ? '(狂暴!)' : '';
  const critText = r.crit ? '(暴击!)' : '';
  battle.log.push({
    type: 'enemy',
    text: `${enemy.name}使用${skill.name}${enrageText}${critText},对你造成${damage}伤害`,
  });
}

// 自动战斗一轮(无尽塔用)
function autoBattleOnce(playerStats, enemy) {
  let pHp = playerStats.hp;
  let eHp = enemy.hp;
  const pMaxHp = playerStats.hp;
  const eMaxHp = enemy.hp;
  let turn = 0;
  const log = [];
  while (pHp > 0 && eHp > 0 && turn < 50) {
    turn++;
    // 玩家先手(如果速度高)
    const playerFirst = playerStats.spd >= enemy.spd;
    if (playerFirst) {
      const multiplier = getElementDamageMultiplier('physical', enemy.element || 'physical');
      const dmg = Math.max(1, Math.floor((playerStats.atk - enemy.def * 0.5) * multiplier));
      eHp -= dmg;
      if (eHp <= 0) break;
      const eMultiplier = getElementDamageMultiplier(enemy.element || 'physical', 'physical');
      const eDmg = Math.max(1, Math.floor((enemy.atk - playerStats.def * 0.5) * eMultiplier));
      pHp -= eDmg;
    } else {
      const eMultiplier = getElementDamageMultiplier(enemy.element || 'physical', 'physical');
      const eDmg = Math.max(1, Math.floor((enemy.atk - playerStats.def * 0.5) * eMultiplier));
      pHp -= eDmg;
      if (pHp <= 0) break;
      const multiplier = getElementDamageMultiplier('physical', enemy.element || 'physical');
      const dmg = Math.max(1, Math.floor((playerStats.atk - enemy.def * 0.5) * multiplier));
      eHp -= dmg;
    }
  }
  return {
    win: eHp <= 0,
    playerHpRemaining: Math.max(0, pHp),
    turns: turn,
  };
}

// 添加战斗日志
function addCombatLog(text, type = 'info') {
  state.combat.log.push({ text, type, time: Date.now() });
  if (state.combat.log.length > 30) state.combat.log.shift();
}


/* ---------- 区域自动战斗 ---------- */
function isCombatAreaUnlocked(areaId) {
  const area = getCombatAreaById(areaId);
  if (!area) return false;
  const unlock = area.unlock || { type: 'start' };
  if (unlock.type === 'start') return true;
  if (unlock.type === 'threatCleared') return !!state.combat.areaThreatCleared?.[unlock.areaId];
  return false;
}

function getUnlockedCombatAreas() {
  return COMBAT_AREAS().filter((area) => isCombatAreaUnlocked(area.id));
}

function getCurrentCombatArea() {
  const area = getCombatAreaById(state.combat.currentAreaId);
  if (area && isCombatAreaUnlocked(area.id)) return area;
  return getUnlockedCombatAreas()[0] || COMBAT_AREAS()[0] || null;
}

function pickNextAreaMonster(area = getCurrentCombatArea()) {
  if (!area?.monsters?.length) return null;
  return area.monsters[Math.floor(Math.random() * area.monsters.length)];
}

function setNextAreaMonster() {
  const area = getCurrentCombatArea();
  const next = pickNextAreaMonster(area);
  state.combat.currentMonsterId = next?.id || null;
  return next;
}

function ensureAreaEncounter() {
  const area = getCurrentCombatArea();
  if (!area) return null;
  const current = area.monsters.find((m) => m.id === state.combat.currentMonsterId);
  if (current) return current;
  return setNextAreaMonster();
}

function rerollAreaEncounter() {
  return setNextAreaMonster();
}

function getCurrentCombatMonster() {
  return ensureAreaEncounter();
}

function setCombatArea(areaId) {
  const area = getCombatAreaById(areaId);
  if (!area || !isCombatAreaUnlocked(areaId)) return false;
  state.combat.currentAreaId = areaId;
  state.combat.areaLog = [];
  state.combat.currentMonsterId = pickNextAreaMonster(area)?.id || null;
  state.combat.areaProgress = 0;
  return true;
}

function setCombatMonster(monsterId) {
  const area = getCurrentCombatArea();
  if (!area || !area.monsters.some((m) => m.id === monsterId)) return false;
  state.combat.currentMonsterId = monsterId;
  state.combat.areaProgress = 0;
  return true;
}

function getNextLockedCombatArea() {
  return COMBAT_AREAS().find((area) => !isCombatAreaUnlocked(area.id)) || null;
}

function getCurrentAreaThreat() {
  const area = getCurrentCombatArea();
  if (!area || state.combat.areaThreatCleared?.[area.id]) return null;
  return area.threat || null;
}

function addAreaCombatLog(text, type = 'info') {
  if (!state.combat.areaLog) state.combat.areaLog = [];
  state.combat.areaLog.push({ text, type, time: Date.now() });
  if (state.combat.areaLog.length > 30) state.combat.areaLog.shift();
}

function getAreaBattleDuration(monster) {
  const stats = getPlayerCombatStats();
  const playerDmg = Math.max(1, Math.floor(stats.atk - (monster.def || 0) * 0.45));
  const hits = Math.max(1, Math.ceil(monster.hp / playerDmg));
  const speedFactor = Math.max(0.55, 1 - (stats.spd - 10) * 0.015);
  return Math.max(900, Math.floor(hits * 900 * speedFactor));
}

function rollCombatDrops(entity) {
  if (!entity?.drops) return [];
  const gained = [];
  entity.drops.forEach((drop) => {
    if (Math.random() < (drop.chance ?? 1)) {
      addItem('monster_drop', drop.id, drop.count || 1);
      gained.push({ id: drop.id, count: drop.count || 1 });
    }
  });
  return gained;
}

function consumeCombatCardCharges() {
  ['combat_atk', 'combat_def', 'combat_crit', 'combat_all'].forEach((target) => {
    if (getCardBonus(target) > 0) consumeCardCharge(target);
  });
}

function completeAreaMonsterKill() {
  const area = getCurrentCombatArea();
  const monster = getCurrentCombatMonster();
  if (!area || !monster) return { ok: false };

  const battle = runAutoCombatSimulation(monster);
  if (!battle.win) {
    state.combat.isAutoArea = false;
    state.combat.areaProgress = 0;
    addAreaCombatLog(`${area.name}-${monster.name} 战败,区域强度不足,挂机已停止`, 'lose');
    return { ok: false, monster };
  }

  addGold(monster.gold || 0);
  const xpResult = addCombatXp(monster.xp || 0, getCurrentCombatStyleId());
  const drops = rollCombatDrops(monster);
  const dropText = drops.length
    ? `, 获得 ${drops.map((d) => `${getCombatMatName(d.id)}×${d.count}`).join('、')}`
    : '';
  addAreaCombatLog(`${area.name}-${monster.name} 击败! +${monster.gold || 0}金币 +${xpResult.gainedXp}XP${dropText}`, 'win');
  if (xpResult.leveledUp) showToast(`${xpResult.styleName}提升至 Lv.${xpResult.newLevel}`, '⭐');
  state.combat.currentMonsterId = pickNextAreaMonster(area)?.id || null;
  consumeCombatCardCharges();
  return { ok: true, monster };
}

function runAreaThreatBattle() {
  const area = getCurrentCombatArea();
  const threat = getCurrentAreaThreat();
  if (!area || !threat) return { ok: false, msg: '当前区域没有新的关键威胁' };
  const battle = runAutoCombatSimulation(threat);
  if (!battle.win) {
    addAreaCombatLog(`${threat.name} 讨伐失败,需要更强的构筑`, 'lose');
    return { ok: false, msg: '讨伐失败,需要更强的装备或等级' };
  }
  state.combat.areaThreatCleared[area.id] = true;
  addGold(threat.gold || 0);
  const xpResult = addCombatXp(threat.xp || 0, getCurrentCombatStyleId());
  const drops = rollCombatDrops(threat);
  addAreaCombatLog(`${threat.name} 已解决! 新的道路显露了`, 'win');
  drops.forEach((d) => addCombatLog(`获得${getCombatMatName(d.id)} ×${d.count}`, 'drop'));
  if (xpResult.leveledUp) showToast(`${xpResult.styleName}提升至 Lv.${xpResult.newLevel}`, '⭐');
  consumeCombatCardCharges();
  return { ok: true, msg: `已击败${threat.name}` };
}

function runAutoCombatSimulation(enemy) {
  const style = getCombatStyleById(getCurrentCombatStyleId());
  const stats = getPlayerCombatStats();
  const player = { ...stats, currentHp: stats.hp, maxHp: stats.hp };
  const foe = { ...enemy, currentHp: enemy.hp, maxHp: enemy.hp };
  let turn = 0;
  while (player.currentHp > 0 && foe.currentHp > 0 && turn < 120) {
    turn++;
    const order = player.spd >= foe.spd ? ['player', 'enemy'] : ['enemy', 'player'];
    for (const side of order) {
      if (side === 'player') {
        const element = style.id === 'magic' ? 'fire' : 'physical';
        const power = style.id === 'magic' ? 1.18 : style.id === 'ranged' ? 0.95 : 1;
        const r = executeAttack(player, foe, power, element);
        foe.currentHp -= r.damage;
        if (foe.currentHp <= 0) break;
      } else {
        const r = executeAttack(foe, player, 1, foe.element || 'physical');
        player.currentHp -= r.damage;
        if (player.currentHp <= 0) break;
      }
    }
  }
  return { win: foe.currentHp <= 0, turns: turn, playerHp: Math.max(0, player.currentHp) };
}
