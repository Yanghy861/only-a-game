/* ============================================================
   游戏数据访问层:从 CONFIG(外置 JSON)读取数据 + 工具函数
   修改游戏数据请编辑 config/*.json 文件
   ============================================================ */

// 经验与等级
const MAX_LEVEL = () => CONFIG.game.maxLevel;

function xpForLevel(level) {
  if (level >= CONFIG.game.maxLevel) return 0;
  const f = CONFIG.game.xpFormula;
  return Math.floor(f.base * Math.pow(level, f.exponent) + f.linear * level + f.constant);
}

// 钓鱼数据
const FISHING_SPOTS = () => CONFIG.fishing.spots;
const FISHING_LOOT = () => CONFIG.fishing.loot;
const FISHING_LOOT_CHANCE = () => CONFIG.fishing.lootChance;
const SELLABLE_LOOT = () => CONFIG.fishing.sellableLoot;

// 采集数据
const WOODCUTTING_SPOTS = () => CONFIG.gathering.woodcutting;
const MINING_SPOTS = () => CONFIG.gathering.mining;

// 装备数据
const EQUIP_SLOTS = () => CONFIG.equipment.slots;
const EQUIPMENT = () => CONFIG.equipment.items;

// 烹饪数据
const COOKING_RECIPES = () => CONFIG.cooking.recipes;

// 天气数据
const WEATHER_TYPES = () => CONFIG.weather.weather;
const TIME_PERIODS = () => CONFIG.weather.timePeriods;
const WEATHER_DURATION_MIN = () => CONFIG.weather.weatherDurationMin;
const WEATHER_DURATION_MAX = () => CONFIG.weather.weatherDurationMax;
const TIME_PERIOD_DURATION = () => CONFIG.weather.timePeriodDuration;

// 商店数据
const SHOP_ITEMS = () => CONFIG.shop.shopItems;
const UPGRADES = () => CONFIG.shop.upgrades;

// 图鉴数据
const ENCYCLOPEDIA_MILESTONES = () => CONFIG.encyclopedia.milestones;

// 战斗数据
const COMBAT_PLAYER_BASE = () => CONFIG.combat.playerBase;
const COMBAT_RESOURCE = () => CONFIG.combat.resource;
const COMBAT_SKILLS = () => CONFIG.combat.skills;
const COMBAT_ENEMY_SKILLS = () => CONFIG.combat.enemySkills;
const COMBAT_CONFIG = () => CONFIG.combat;
const COMBAT_TALENTS = () => CONFIG.combat.talents;
const COMBAT_STYLE_DEFS = [
  {
    id: 'melee',
    name: '近战',
    icon: '⚔️',
    short: '稳',
    desc: '稳定推进,依赖武器与护甲。',
    stat: { hp: 1.08, atk: 1.0, def: 1.12, spd: 0.95 },
  },
  {
    id: 'ranged',
    name: '远程',
    icon: '🏹',
    short: '快',
    desc: '出手更快,后续会消耗箭矢和皮革材料。',
    stat: { hp: 0.92, atk: 0.95, def: 0.85, spd: 1.25, crit: 0.03 },
  },
  {
    id: 'magic',
    name: '魔法',
    icon: '✨',
    short: '爆',
    desc: '伤害更高但更脆,后续会消耗宝石和符文材料。',
    stat: { hp: 0.85, atk: 1.22, def: 0.75, spd: 1.0, critDmg: 0.25 },
  },
];

// 副本数据
const STORY_DUNGEONS = () => CONFIG.dungeons.story;
const ENDLESS_DUNGEONS = () => CONFIG.dungeons.endless;
const MANUAL_DUNGEONS = () => CONFIG.dungeons.manual;
const COMBAT_AREAS = () => CONFIG.combatAreas?.areas || [];

// 战斗装备数据
const COMBAT_EQUIP_SLOTS = () => CONFIG.combatEquipment.slots;
const COMBAT_EQUIPMENT = () => CONFIG.combatEquipment.items;
const MONSTER_DROPS = () => CONFIG.combatEquipment.monsterDrops;

// 宝石数据
const GEM_SPOTS = () => CONFIG.gems.gemSpots;
const GEM_TYPES = () => CONFIG.gems.gemTypes;
const GEM_CUTTING = () => CONFIG.gems.cutting;
function GEM_CUT_DURATION(roughId) {
  if (roughId) {
    const gemType = getGemTypeByRoughId(roughId);
    if (gemType && gemType.cutDuration) return gemType.cutDuration;
  }
  return GEM_CUTTING().cutDuration || 3000;
}

// 卡片数据
const CARD_TYPES = () => CONFIG.cards.cardTypes;
const CARD_RECIPES = () => CONFIG.cards.recipes;
const CARD_CRAFTING = () => CONFIG.cards.crafting;

/* ---------- 查找函数 ---------- */
function getSpotById(id) {
  return FISHING_SPOTS().find((s) => s.id === id) || FISHING_SPOTS()[0];
}
function getWoodSpotById(id) {
  return WOODCUTTING_SPOTS().find((s) => s.id === id) || WOODCUTTING_SPOTS()[0];
}
function getMineSpotById(id) {
  return MINING_SPOTS().find((s) => s.id === id) || MINING_SPOTS()[0];
}
function getEquipById(slot, id) {
  return EQUIPMENT()[slot]?.find((e) => e.id === id) || null;
}
function getWeatherById(id) {
  return WEATHER_TYPES().find((w) => w.id === id) || WEATHER_TYPES()[0];
}
function getTimePeriodById(id) {
  return TIME_PERIODS().find((t) => t.id === id) || TIME_PERIODS()[0];
}
function getUpgradeById(id) {
  return UPGRADES().find((u) => u.id === id);
}
function getCookingRecipeById(id) {
  return COOKING_RECIPES().find((r) => r.id === id);
}
function getStoryDungeonById(id) {
  return STORY_DUNGEONS().find((d) => d.id === id);
}
function getEndlessDungeonById(id) {
  return ENDLESS_DUNGEONS().find((d) => d.id === id);
}
function getManualDungeonById(id) {
  return MANUAL_DUNGEONS().find((d) => d.id === id);
}
function getCombatAreaById(id) {
  return COMBAT_AREAS().find((a) => a.id === id) || COMBAT_AREAS()[0] || null;
}
function getCombatMonsterById(areaId, monsterId) {
  const area = getCombatAreaById(areaId);
  return area?.monsters?.find((m) => m.id === monsterId) || area?.monsters?.[0] || null;
}
function getCombatDropName(id) {
  const drop = getMonsterDropInfo(id);
  if (drop) return `${drop.icon} ${drop.name}`;
  return getCombatMatName ? getCombatMatName(id) : id;
}
function getSkillById(id) {
  return COMBAT_SKILLS().find((s) => s.id === id);
}
function getCombatEquipById(slot, id) {
  return (COMBAT_EQUIPMENT()[slot] || []).find((e) => e.id === id);
}
function getCombatEquipByIdAnySlot(id) {
  for (const slot of COMBAT_EQUIP_SLOTS()) {
    const eq = (COMBAT_EQUIPMENT()[slot.key] || []).find((e) => e.id === id);
    if (eq) return { ...eq, slot: slot.key };
  }
  return null;
}
function getGemSpotById(id) {
  return GEM_SPOTS().find((s) => s.id === id) || GEM_SPOTS()[0];
}
function getGemTypeById(id) {
  return GEM_TYPES().find((g) => g.id === id);
}
function getGemTypeByRoughId(roughId) {
  return GEM_TYPES().find((g) => g.roughId === roughId);
}
function getCardRecipeById(id) {
  return CARD_RECIPES().find((r) => r.id === id);
}
function getMonsterDropInfo(id) {
  return MONSTER_DROPS().find((d) => d.id === id);
}

function getElementInfo(id) {
  return CONFIG.combat.elements[id] || null;
}

function getAllTalents() {
  const t = COMBAT_TALENTS();
  if (!t || !t.branches) return [];
  return t.branches.flatMap((b) => b.talents.map((talent) => ({ ...talent, branchId: b.id, branchName: b.name, branchIcon: b.icon })));
}

function getTalentById(id) {
  return getAllTalents().find((t) => t.id === id);
}

function getCombatStyleDefs() {
  return COMBAT_STYLE_DEFS;
}

function getCombatStyleById(id) {
  return COMBAT_STYLE_DEFS.find((s) => s.id === id) || COMBAT_STYLE_DEFS[0];
}

function getCurrentCombatStyleId() {
  return state.combat?.currentStyle || 'melee';
}

function getCombatStyleState(styleId) {
  const id = styleId || getCurrentCombatStyleId();
  return state.combat?.styles?.[id] || { level: 1, xp: 0 };
}

function getCombatDisplayLevel() {
  const styleLevels = Object.values(state.combat?.styles || {}).map((s) => s.level || 1);
  return Math.max(state.combat?.level || 1, ...styleLevels);
}

function getTalentEffects() {
  const effects = {};
  if (!state.combat || !state.combat.talents) return effects;
  getAllTalents().forEach((t) => {
    if (!state.combat.talents[t.id]) return;
    const stat = t.effect?.stat;
    const value = t.effect?.value || 0;
    if (!stat) return;
    effects[stat] = (effects[stat] || 0) + value;
  });
  return effects;
}

function getElementDamageMultiplier(attackerElement, defenderElement) {
  const relations = CONFIG.combat.elementRelations;
  const multipliers = CONFIG.combat.elementMultiplier;
  if (!attackerElement || !defenderElement) return multipliers.normal;
  if (attackerElement === defenderElement) return multipliers.same;
  const rel = relations[attackerElement];
  if (rel) {
    if (rel.strong === defenderElement) return multipliers.strong;
    if (rel.weak === defenderElement) return multipliers.weak;
  }
  return multipliers.normal;
}

/* ---------- 战斗属性计算(含战斗装备加成) ---------- */
// 玩家战斗属性 = 基础 + 等级成长 + 战斗装备 + 升级 + 食物buff + 卡片
function getPlayerCombatStats() {
  const base = COMBAT_PLAYER_BASE();
  const style = getCombatStyleById(getCurrentCombatStyleId());
  const lv = getCombatDisplayLevel();
  let hp = Math.floor(base.hp + base.hpPerLevel * (lv - 1) * (1 + getUpgradeBonus('combat_hp')));
  let atk = Math.floor(base.atk + base.atkPerLevel * (lv - 1) * (1 + getUpgradeBonus('combat_atk')));
  let def = Math.floor(base.def + base.defPerLevel * (lv - 1) * (1 + getUpgradeBonus('combat_def')));
  let spd = Math.floor(base.spd + base.spdPerLevel * (lv - 1));
  let crit = base.crit + getUpgradeBonus('combat_crit');
  let critDmg = base.critDmg + getUpgradeBonus('combat_critdmg');

  hp = Math.floor(hp * (style.stat.hp || 1));
  atk = Math.floor(atk * (style.stat.atk || 1));
  def = Math.floor(def * (style.stat.def || 1));
  spd = Math.floor(spd * (style.stat.spd || 1));
  crit += style.stat.crit || 0;
  critDmg += style.stat.critDmg || 0;

  // 战斗装备加成
  COMBAT_EQUIP_SLOTS().forEach((slot) => {
    const eqId = state.combat.equipped ? state.combat.equipped[slot.key] : null;
    if (!eqId) return;
    const eq = getCombatEquipById(slot.key, eqId);
    if (!eq) return;
    if (eq.hp) hp += eq.hp;
    if (eq.atk) atk += eq.atk;
    if (eq.def) def += eq.def;
    if (eq.spd) spd += eq.spd;
    if (eq.crit) crit += eq.crit;
    if (eq.critDmg) critDmg += eq.critDmg;
  });

  // 卡片加成(战斗类卡片,有次数)
  const cardBonus = getCardBonus('combat_atk');
  if (cardBonus > 0) atk = Math.floor(atk * (1 + cardBonus));
  const cardDefBonus = getCardBonus('combat_def');
  if (cardDefBonus > 0) def = Math.floor(def * (1 + cardDefBonus));
  const cardCritBonus = getCardBonus('combat_crit');
  if (cardCritBonus > 0) crit += cardCritBonus;
  const cardAllBonus = getCardBonus('combat_all');
  if (cardAllBonus > 0) {
    atk = Math.floor(atk * (1 + cardAllBonus));
    def = Math.floor(def * (1 + cardAllBonus));
    hp = Math.floor(hp * (1 + cardAllBonus));
  }

  // 天赋加成
  const talentEffects = getTalentEffects();
  if (talentEffects.hp) hp = Math.floor(hp * (1 + talentEffects.hp));
  if (talentEffects.atk) atk = Math.floor(atk * (1 + talentEffects.atk));
  if (talentEffects.def) def = Math.floor(def * (1 + talentEffects.def));
  if (talentEffects.spd) spd = Math.floor(spd * (1 + talentEffects.spd));
  if (talentEffects.crit) crit += talentEffects.crit;
  if (talentEffects.critDmg) critDmg += talentEffects.critDmg;

  return { hp, atk, def, spd, crit, critDmg, level: lv, styleId: style.id, styleName: style.name, elementStrong: talentEffects.elementStrong || 0, elementWeak: talentEffects.elementWeak || 0 };
}

// 战斗经验需求
function combatXpForLevel(level) {
  const c = CONFIG.combat.combatLevel;
  return Math.floor(c.baseXp * Math.pow(level, c.xpGrowth));
}

// 获取卡片加成值(用于各种场景)
function getCardBonus(target) {
  const card = state.cards.active ? state.cards.active[target] : null;
  return card && card.charges > 0 ? card.value : 0;
}

// 消耗一次卡片次数
function consumeCardCharge(target) {
  if (!state.cards.active || !state.cards.active[target]) return false;
  const card = state.cards.active[target];
  card.charges--;
  if (card.charges <= 0) {
    delete state.cards.active[target];
  }
  return true;
}

/* ---------- 工具函数 ---------- */
function getTitleByLevel(level) {
  if (level >= 95) return '创世垂钓者';
  if (level >= 80) return '虚空渔夫';
  if (level >= 65) return '沉船猎人';
  if (level >= 52) return '深海老手';
  if (level >= 40) return '珊瑚行者';
  if (level >= 30) return '远洋渔夫';
  if (level >= 22) return '河口行家';
  if (level >= 16) return '大河钓客';
  if (level >= 10) return '湖畔老手';
  if (level >= 5) return '溪流行家';
  return '见习渔夫';
}

function rollByWeight(items) {
  const total = items.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of items) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return items[0];
}

function getAllFishList() {
  const list = [];
  FISHING_SPOTS().forEach((spot) => {
    spot.fish.forEach((fish) => {
      list.push({ ...fish, spotId: spot.id, spotName: spot.name, spotIcon: spot.icon, spotLevel: spot.requiredLevel });
    });
  });
  return list;
}

function getItemPrice(item) {
  const topLv = Math.max(state.fishing.level, state.woodcutting.level, state.mining.level);
  return Math.floor(item.basePrice * (1 + topLv * 0.15));
}

function getUpgradeCost(upg) {
  const lv = state.upgrades?.[upg.id] || 0;
  return Math.floor(upg.baseCost * Math.pow(upg.costGrowth, lv));
}

function getUpgradeBonus(upgId) {
  const upg = getUpgradeById(upgId);
  if (!upg) return 0;
  const lv = state.upgrades?.[upgId] || 0;
  return upg.perLevel * lv;
}

/* ---------- 材料来源查询(用于制作/背包提示) ---------- */
function getItemSources(id) {
  const sources = [];
  // 钓鱼
  FISHING_SPOTS().forEach((spot) => {
    if (spot.fish.some((f) => f.id === id)) sources.push(`${spot.name}钓鱼`);
  });
  // 钓鱼掉落物
  if (FISHING_LOOT().some((l) => l.id === id)) sources.push('钓鱼掉落');
  // 伐木
  WOODCUTTING_SPOTS().forEach((spot) => {
    if (spot.drops.some((d) => d.id === id)) sources.push(`${spot.name}伐木`);
  });
  // 采矿
  MINING_SPOTS().forEach((spot) => {
    if (spot.drops.some((d) => d.id === id)) sources.push(`${spot.name}采矿`);
  });
  // 宝石采集
  GEM_SPOTS().forEach((spot) => {
    if (spot.drops.some((d) => d.id === id)) sources.push(`${spot.name}采集`);
  });
  // 怪物掉落
  if (MONSTER_DROPS().some((d) => d.id === id)) {
    const dungeons = [];
    STORY_DUNGEONS().forEach((d) => {
      if (d.enemy.drops?.some((drop) => drop.id === id)) dungeons.push(`${d.name}(${d.enemy.name})`);
    });
    MANUAL_DUNGEONS().forEach((d) => {
      if (d.enemy.drops?.some((drop) => drop.id === id)) dungeons.push(`${d.name}(${d.enemy.name})`);
    });
    if (dungeons.length) sources.push(...dungeons.slice(0, 2));
    else sources.push('怪物掉落');
  }
  return sources;
}

// 计算某件钓鱼杂物每次上钩的掉落概率
function getFishingLootDropChance(id) {
  const loot = FISHING_LOOT().find((l) => l.id === id);
  if (!loot) return null;
  const totalWeight = FISHING_LOOT().reduce((sum, l) => sum + l.weight, 0);
  return FISHING_LOOT_CHANCE() * (loot.weight / totalWeight);
}

function getItemSourceText(id) {
  let src = getItemSources(id);
  if (src.length > 0) {
    src = src.map((s) => {
      if (s === '钓鱼掉落') {
        const chance = getFishingLootDropChance(id);
        if (chance !== null) return `所有钓点 ${(chance * 100).toFixed(2)}%`;
      }
      return s;
    });
    return src.slice(0, 2).join(' / ');
  }
  // 成品来源
  for (const slot of COMBAT_EQUIP_SLOTS()) {
    const ceq = (COMBAT_EQUIPMENT()[slot.key] || []).find((e) => e.id === id);
    if (ceq) {
      if (ceq.bossDrop) {
        const boss = getManualDungeonById(ceq.bossDrop);
        return boss ? `击败${boss.name}获得` : 'Boss掉落';
      }
      return '战斗装备制作';
    }
  }
  for (const slot of EQUIP_SLOTS()) {
    if ((EQUIPMENT()[slot.key] || []).some((e) => e.id === id)) return '生活装备制作';
  }
  if (CARD_RECIPES().some((r) => r.id === id)) return '卡片制作';
  if (COOKING_RECIPES().some((r) => r.id === id)) return '烹饪';
  return '未知来源';
}
