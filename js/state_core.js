/* ============================================================
   游戏状态管理与存档系统
   ============================================================ */

const SAVE_KEY = 'fishing_epoch_save_v1';
const SAVE_BACKUP_KEY = 'fishing_epoch_save_backups_v1';
const SAVE_VERSION = 2;
const SAVE_BACKUP_LIMIT = 5;

// 默认初始状态
function createDefaultState() {
  return {
    character: {
      name: '冒险者',
      level: 1, // 角色总等级(取最高技能等级)
      gold: 0,
    },
    fishing: {
      level: 1,
      xp: 0,
      currentSpotId: 'pond',
      progress: 0,
      isFishing: true,
    },
    woodcutting: {
      level: 1,
      xp: 0,
      currentSpotId: 'grove',
      progress: 0,
      isWorking: true,
    },
    mining: {
      level: 1,
      xp: 0,
      currentSpotId: 'quarry',
      progress: 0,
      isWorking: true,
    },
    inventory: {
      fish: {},   // 鱼类
      loot: {},   // 钓鱼掉落物
      wood: {},   // 木材
      ore: {},    // 矿石
      equip: {},  // 拥有的装备 { equipId: count }
      food: {},   // 烹饪食物 { recipeId: count }
      fishQuality: {}, // 旧存档兼容字段,新版本不再使用
      gem_rough: {}, // 宝石原石 { roughId: count }
      gem: {},      // 切割好的宝石 { gemId: count }
    },
    equipped: {
      rod: null,        // 装备的鱼竿 ID
      hook: null,       // 装备的鱼钩 ID
      line: null,       // 装备的鱼线 ID
      bait: null,       // 装备的鱼饵 ID
      axe: null,        // 装备的斧头 ID
      wood_charm: null, // 装备的伐木护符 ID
      pickaxe: null,    // 装备的镐子 ID
      mine_charm: null, // 装备的矿工护符 ID
    },
    log: {
      fishing: [],
      woodcutting: [],
      mining: [],
      gemology: [],
    },
    // 图鉴:记录每种鱼是否发现 { fishId: true }
    encyclopedia: {},
    encyclopediaRewards: {}, // 已领取的里程碑 { count: true }
    // 天气与时段
    weather: {
      current: 'clear',
      changeAt: Date.now() + 180000, // 下次变化时间
    },
    time: {
      current: 'day',
      changeAt: Date.now() + 360000,
    },
    // 活跃 buff(药水){ type: 'xp', value: 0.5, expireAt: timestamp }
    buffs: [],
    // 永久升级等级
    upgrades: {},
      // 战斗系统
      combat: {
        level: 1,
        xp: 0,
        currentStyle: 'melee',
        currentAreaId: 'forest_edge',
        currentMonsterId: 'slime',
        isAutoArea: false,
        areaProgress: 0,
        areaThreatCleared: {},
        areaLog: [],
        styles: {
          melee: { level: 1, xp: 0 },
          ranged: { level: 1, xp: 0 },
          magic: { level: 1, xp: 0 },
        },
        // 剧情副本进度 { dungeonId: true } 表示已通关
        storyCleared: {},
      // 当前正在进行的剧情副本ID(手动战斗)
      activeStory: null,
      // 无尽塔状态
      endless: {
        currentFloor: 1,      // 当前选择的挂机层(不能超过最高层)
        highestFloor: 1,      // 历史最高层
        isAuto: false,        // 是否自动战斗中(必须由玩家主动开启)
        isAutoChallenge: false, // 是否正在自动挑战更高层
        progress: 0,          // 当前回合进度 0-1
        lastTick: Date.now(),
        battle: null,         // 当前挂机战斗实例
      },
      // Boss挑战进度 { dungeonId: true } 表示已击败(一次性)
      bossCleared: {},
      // 已解锁内容(由Boss击败获得)
      unlocks: { spots: {}, equips: {}, features: {}, recipes: {}, areas: {} },
      // 当前手动战斗状态(剧情/Boss共用)
      activeBattle: null,
      // 战斗日志
      log: [],
      // 战斗装备槽(8槽:weapon/helmet/armor/legs/boots/shield/ring/amulet)
      equipped: {},
      // 战斗装备库存
      inventory: {},
      // 已解锁的天赋 { talentId: true }
      talents: {},
    },
    // 宝石系统
    gemology: {
      level: 1,
      xp: 0,
      currentSpotId: 'gem_riverbed',
      isWorking: false,
      progress: 0,
      mode: 'gather', // 'gather' 采集原石 | 'cut' 切割
      cutTarget: null, // 当前选中的原石ID(仅切割模式)
    },
    // 卡片系统
    cards: {
      // 制卡技能等级
      craftLevel: 1,
      craftXp: 0,
      // 卡片库存 { cardId: count }
      inventory: {},
      // 激活的卡片效果 { target: { value, charges } }
      active: {},
    },
    settings: {
      saveVersion: SAVE_VERSION,
      lastSaved: Date.now(),
      speedMultiplier: 1, // 游戏速度倍数(1=正常,10=10倍速测试)
    },
  };
}

let state = createDefaultState();

const LEGACY_FISH_ID_MAP = {
  goldfish: 'carp',
  bighead: 'carp',
  silver_carp: 'carp',
  mahseer: 'salmon',
  river_monster: 'pike',
  golden_carp: 'carp',
  snook: 'mullet',
  stingray: 'tarpon',
  lionfish: 'angelfish',
  moray_eel: 'eel',
  sea_turtle: 'parrotfish',
  abyss_eye: 'leviathan',
  giant_squid: 'leviathan',
  sperm_whale: 'leviathan',
  armor_fish: 'wreck_bass',
  cursed_eel: 'ghost_fish',
  skeleton_shark: 'ghost_fish',
  outer_god: 'void_king',
  ancient_one: 'creator',
  star_fish: 'void_fish',
  nebula_eel: 'shadow_ray',
  black_hole_shark: 'void_horror',
  dimensional_ray: 'shadow_ray',
  cosmic_horror: 'void_horror',
};

const LEGACY_FISH_SPOT_MAP = {
  grand_river: 'lake',
  void: 'abyss',
};

function getCharacterLevelSources() {
  const combatStyleLevels = Object.values(state.combat?.styles || {}).map((s) => s.level || 1);
  return [
    state.fishing?.level || 1,
    state.woodcutting?.level || 1,
    state.mining?.level || 1,
    state.gemology?.level || 1,
    Math.max(state.combat?.level || 1, ...combatStyleLevels),
    state.cards?.craftLevel || 1,
  ];
}

function recalculateCharacterLevel() {
  state.character.level = Math.max(...getCharacterLevelSources());
  return state.character.level;
}

function migrateLegacyFishIds() {
  const fishInv = state.inventory.fish || {};
  Object.entries(LEGACY_FISH_ID_MAP).forEach(([fromId, toId]) => {
    const count = fishInv[fromId] || 0;
    if (count > 0) {
      fishInv[toId] = (fishInv[toId] || 0) + count;
      delete fishInv[fromId];
    }
  });

  const nextEncyclopedia = {};
  Object.entries(state.encyclopedia || {}).forEach(([fishId, entry]) => {
    const nextId = LEGACY_FISH_ID_MAP[fishId] || fishId;
    const discovered = entry === true || (entry && typeof entry === 'object' && Object.keys(entry).length > 0);
    if (discovered) nextEncyclopedia[nextId] = true;
  });
  state.encyclopedia = nextEncyclopedia;

  state.inventory.fishQuality = {};
}

/* ---------- 存档读写 ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      state = createDefaultState();
      recalculateCharacterLevel();
      return;
    }
    const parsed = JSON.parse(raw);
    const def = createDefaultState();
    state = {
      character: { ...def.character, ...parsed.character },
      fishing: { ...def.fishing, ...parsed.fishing },
      woodcutting: { ...def.woodcutting, ...parsed.woodcutting },
      mining: { ...def.mining, ...parsed.mining },
      inventory: {
        fish: { ...(parsed.inventory?.fish || {}) },
        loot: { ...(parsed.inventory?.loot || {}) },
        wood: { ...(parsed.inventory?.wood || {}) },
        ore: { ...(parsed.inventory?.ore || {}) },
        equip: { ...(parsed.inventory?.equip || {}) },
        food: { ...(parsed.inventory?.food || {}) },
        fishQuality: { ...(parsed.inventory?.fishQuality || {}) },
        gem_rough: { ...(parsed.inventory?.gem_rough || {}) },
        gem: { ...(parsed.inventory?.gem || {}) },
      },
      equipped: {
        rod: parsed.equipped?.rod || null,
        hook: parsed.equipped?.hook || null,
        line: parsed.equipped?.line || null,
        bait: parsed.equipped?.bait || null,
        axe: parsed.equipped?.axe || null,
        wood_charm: parsed.equipped?.wood_charm || null,
        pickaxe: parsed.equipped?.pickaxe || null,
        mine_charm: parsed.equipped?.mine_charm || null,
      },
      log: {
        fishing: Array.isArray(parsed.log?.fishing) ? parsed.log.fishing.slice(0, 30) : [],
        woodcutting: Array.isArray(parsed.log?.woodcutting) ? parsed.log.woodcutting.slice(0, 30) : [],
        mining: Array.isArray(parsed.log?.mining) ? parsed.log.mining.slice(0, 30) : [],
        gemology: Array.isArray(parsed.log?.gemology) ? parsed.log.gemology.slice(0, 30) : [],
      },
      encyclopedia: { ...(parsed.encyclopedia || {}) },
      encyclopediaRewards: { ...(parsed.encyclopediaRewards || {}) },
      weather: {
        current: parsed.weather?.current || 'clear',
        changeAt: parsed.weather?.changeAt || Date.now() + 180000,
      },
      time: {
        current: parsed.time?.current || 'day',
        changeAt: parsed.time?.changeAt || Date.now() + 360000,
      },
      buffs: Array.isArray(parsed.buffs) ? parsed.buffs.filter((b) => b.expireAt > Date.now()) : [],
      upgrades: { ...(parsed.upgrades || {}) },
      combat: {
        level: parsed.combat?.level || 1,
        xp: parsed.combat?.xp || 0,
        currentStyle: parsed.combat?.currentStyle || 'melee',
        currentAreaId: parsed.combat?.currentAreaId || 'forest_edge',
        currentMonsterId: parsed.combat?.currentMonsterId || 'slime',
        isAutoArea: false,
        areaProgress: 0,
        areaThreatCleared: { ...(parsed.combat?.areaThreatCleared || {}) },
        areaLog: Array.isArray(parsed.combat?.areaLog) ? parsed.combat.areaLog.slice(-30) : [],
        styles: {
          melee: {
            level: parsed.combat?.styles?.melee?.level || parsed.combat?.level || 1,
            xp: parsed.combat?.styles?.melee?.xp || parsed.combat?.xp || 0,
          },
          ranged: {
            level: parsed.combat?.styles?.ranged?.level || 1,
            xp: parsed.combat?.styles?.ranged?.xp || 0,
          },
          magic: {
            level: parsed.combat?.styles?.magic?.level || 1,
            xp: parsed.combat?.styles?.magic?.xp || 0,
          },
        },
        storyCleared: { ...(parsed.combat?.storyCleared || {}) },
        activeStory: parsed.combat?.activeStory || null,
        endless: {
          currentFloor: parsed.combat?.endless?.currentFloor || 1,
          highestFloor: parsed.combat?.endless?.highestFloor || 1,
          isAuto: false, // 读档后默认暂停,防止一加载就暴毙
          isAutoChallenge: false,
          progress: 0,
          lastTick: Date.now(),
          battle: null,
        },
        bossCleared: { ...(parsed.combat?.bossCleared || {}) },
        unlocks: {
          spots: { ...(parsed.combat?.unlocks?.spots || {}) },
          equips: { ...(parsed.combat?.unlocks?.equips || {}) },
          features: { ...(parsed.combat?.unlocks?.features || {}) },
          recipes: { ...(parsed.combat?.unlocks?.recipes || {}) },
          areas: { ...(parsed.combat?.unlocks?.areas || {}) },
        },
        activeBattle: parsed.combat?.activeBattle || null,
        log: Array.isArray(parsed.combat?.log) ? parsed.combat.log.slice(-30) : [],
        equipped: { ...(parsed.combat?.equipped || {}) },
        inventory: { ...(parsed.combat?.inventory || {}) },
        talents: { ...(parsed.combat?.talents || {}) },
      },
      gemology: {
        level: parsed.gemology?.level || 1,
        xp: parsed.gemology?.xp || 0,
        currentSpotId: parsed.gemology?.currentSpotId || 'gem_riverbed',
        isWorking: parsed.gemology?.isWorking || false,
        progress: parsed.gemology?.progress || 0,
        mode: parsed.gemology?.mode || 'gather',
        cutTarget: parsed.gemology?.cutTarget || null,
      },
      cards: {
        craftLevel: parsed.cards?.craftLevel || 1,
        craftXp: parsed.cards?.craftXp || 0,
        inventory: { ...(parsed.cards?.inventory || {}) },
        active: { ...(parsed.cards?.active || {}) },
      },
      settings: {
        ...def.settings,
        ...parsed.settings,
        saveVersion: SAVE_VERSION,
        speedMultiplier: 1,
      },
    };
    // 校验各技能当前点是否解锁
    if (LEGACY_FISH_SPOT_MAP[state.fishing.currentSpotId]) state.fishing.currentSpotId = LEGACY_FISH_SPOT_MAP[state.fishing.currentSpotId];
    const currentFishingSpotExists = FISHING_SPOTS().some((spot) => spot.id === state.fishing.currentSpotId);
    if (!currentFishingSpotExists || !isSpotUnlocked('fishing', getSpotById(state.fishing.currentSpotId))) state.fishing.currentSpotId = 'pond';
    if (!isSpotUnlocked('woodcutting', getWoodSpotById(state.woodcutting.currentSpotId))) state.woodcutting.currentSpotId = 'grove';
    if (!isSpotUnlocked('mining', getMineSpotById(state.mining.currentSpotId))) state.mining.currentSpotId = 'quarry';
    if (!isGemSpotUnlocked(getGemSpotById(state.gemology.currentSpotId))) state.gemology.currentSpotId = 'gem_riverbed';
    // 兼容旧存档:迁移旧 inventory 结构
    if (parsed.inventory && !parsed.inventory.fish && typeof parsed.inventory === 'object') {
      state.inventory.fish = { ...parsed.inventory };
    }
    migrateLegacyFishIds();
    state.inventory.fishQuality = {};
    // 无尽塔:挂机层不能超过最高层
    if (state.combat.endless.currentFloor > state.combat.endless.highestFloor) {
      state.combat.endless.currentFloor = state.combat.endless.highestFloor;
    }
    // 兼容旧存档:已击败Boss未获得专属战斗装备的补发
    if (state.combat.bossCleared && MANUAL_DUNGEONS) {
      Object.keys(state.combat.bossCleared).forEach((dungeonId) => {
        const d = getManualDungeonById(dungeonId);
        if (d && d.rewardCombatEquip) {
          const inv = state.combat.inventory || {};
          if (!inv[d.rewardCombatEquip]) {
            addItem('combat_equip', d.rewardCombatEquip, 1);
          }
        }
      });
    }
    state.combat.level = Math.max(state.combat.level || 1, ...Object.values(state.combat.styles || {}).map((s) => s.level || 1));
    state.combat.xp = getCombatStyleState(state.combat.currentStyle).xp;
    recalculateCharacterLevel();
  } catch (e) {
    console.error('存档读取失败,使用默认状态', e);
    state = createDefaultState();
    recalculateCharacterLevel();
  }
}

function saveState() {
  state.settings.lastSaved = Date.now();
  state.settings.saveVersion = SAVE_VERSION;
  recalculateCharacterLevel();
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, raw);
    recordSaveBackup(raw, '自动备份', { dedupe: true });
  } catch (e) {
    console.error('存档写入失败', e);
  }
}

function resetState() {
  backupCurrentSave('重置前备份');
  localStorage.removeItem(SAVE_KEY);
  state = createDefaultState();
  recalculateCharacterLevel();
  saveState();
}

function getSaveSummary(saveData = state) {
  const combatStyleLevels = Object.values(saveData.combat?.styles || {}).map((s) => s.level || 1);
  return {
    level: saveData.character?.level || 1,
    gold: saveData.character?.gold || 0,
    fishing: saveData.fishing?.level || 1,
    woodcutting: saveData.woodcutting?.level || 1,
    mining: saveData.mining?.level || 1,
    gemology: saveData.gemology?.level || 1,
    combat: Math.max(saveData.combat?.level || 1, ...combatStyleLevels),
    cards: saveData.cards?.craftLevel || 1,
  };
}

function createExportPayload() {
  state.settings.lastSaved = Date.now();
  state.settings.saveVersion = SAVE_VERSION;
  recalculateCharacterLevel();
  return {
    app: 'fishing_epoch',
    version: 1,
    exportedAt: Date.now(),
    saveVersion: SAVE_VERSION,
    summary: getSaveSummary(state),
    state,
  };
}

function exportSaveText() {
  return JSON.stringify(createExportPayload(), null, 2);
}

function getSaveBackups() {
  try {
    const raw = localStorage.getItem(SAVE_BACKUP_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('备份读取失败', e);
    return [];
  }
}

function writeSaveBackups(backups) {
  localStorage.setItem(SAVE_BACKUP_KEY, JSON.stringify(backups.slice(0, SAVE_BACKUP_LIMIT)));
}

function recordSaveBackup(rawSave, label = '自动备份', options = {}) {
  if (!rawSave) return null;
  try {
    const backups = getSaveBackups();
    if (options.dedupe && backups[0]?.data === rawSave) return backups[0];
    const parsed = JSON.parse(rawSave);
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      label,
      saveVersion: parsed.settings?.saveVersion || SAVE_VERSION,
      summary: getSaveSummary(parsed),
      data: rawSave,
    };
    writeSaveBackups([entry, ...backups]);
    return entry;
  } catch (e) {
    console.error('备份写入失败', e);
    return null;
  }
}

function backupCurrentSave(label = '手动备份') {
  const raw = localStorage.getItem(SAVE_KEY) || JSON.stringify(state);
  return recordSaveBackup(raw, label, { dedupe: false });
}

function normalizeImportedSave(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('存档格式不正确');
  const candidate = parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
  if (!candidate.character || !candidate.inventory || !candidate.settings) {
    throw new Error('没有识别到有效的游戏存档');
  }
  return candidate;
}

function importSaveText(text) {
  const parsed = JSON.parse(text);
  const importedState = normalizeImportedSave(parsed);
  backupCurrentSave('导入前备份');
  localStorage.setItem(SAVE_KEY, JSON.stringify(importedState));
  loadState();
  saveState();
  return getSaveSummary(state);
}

function restoreSaveBackup(backupId) {
  const backup = getSaveBackups().find((entry) => entry.id === backupId);
  if (!backup) throw new Error('找不到这个备份');
  backupCurrentSave('恢复前备份');
  localStorage.setItem(SAVE_KEY, backup.data);
  loadState();
  saveState();
  return getSaveSummary(state);
}
