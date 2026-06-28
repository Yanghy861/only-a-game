/* ============================================================
   入口:异步加载配置 → 初始化 → 游戏循环(三技能并行) → 离线收益
   ============================================================ */

const TICK_MS = 100;
const SAVE_INTERVAL_MS = 5000;
const RENDER_INTERVAL_MS = 200;
const MAX_RAW_DT_MS = 500;
const MAX_COMPLETIONS_PER_TICK = 1;

let lastTick = Date.now();
let lastSave = Date.now();
let lastRender = Date.now();

/* ---------- 通用技能 tick 推进 ---------- */
function tickSkill(skill, cfg) {
  const s = state[skill];
  if (!s[cfg.activeFlag]) return;
  const spot = cfg.getSpot(s.currentSpotId);
  const dur = skillDuration(skill, spot);
  s.progress += TICK_MS / dur;
  while (s.progress >= 1) {
    s.progress -= 1;
    cfg.complete();
  }
}

/* ---------- 离线收益结算(三技能) ---------- */
function settleOffline() {
  const now = Date.now();
  const last = state.settings.lastSaved || now;
  const elapsed = now - last;
  if (elapsed < 5000) return;

  const skills = [
    { key: 'fishing', spotList: () => FISHING_SPOTS(), getSpot: getSpotById, invCat: 'fish', complete: completeFishing, label: '钓鱼' },
    { key: 'woodcutting', spotList: () => WOODCUTTING_SPOTS(), getSpot: getWoodSpotById, invCat: 'wood', complete: () => completeGathering('woodcutting'), label: '伐木' },
    { key: 'mining', spotList: () => MINING_SPOTS(), getSpot: getMineSpotById, invCat: 'ore', complete: () => completeGathering('mining'), label: '采矿' },
  ];

  let anyOffline = false;

  skills.forEach((sk) => {
    const s = state[sk.key];
    const spot = sk.getSpot(s.currentSpotId);
    // 三技能都使用装备加成时长
    const dur = sk.key === 'fishing'
      ? fishingDurationWithGear(spot)
      : sk.key === 'woodcutting'
        ? woodcuttingDurationWithGear(spot)
        : miningDurationWithGear(spot);
    const cycles = Math.floor(elapsed / dur);
    if (cycles <= 0) return;

    const maxCycles = Math.min(cycles, 300);
    let totalGold = 0;
    let totalXp = 0;
    let leveledUp = false;
    let newLevel = s.level;

    // 加成计算(三技能统一公式)
    const yieldUpg = sk.key === 'fishing' ? 'fish_yield' : sk.key === 'woodcutting' ? 'wood_yield' : 'mine_yield';
    const gBonus = sk.key === 'fishing'
      ? goldBonus() + getBuffValue('gold') + getUpgradeBonus('global_gold') + encyclopediaGoldBonus() + getUpgradeBonus(yieldUpg)
      : getUpgradeBonus('global_gold') + encyclopediaGoldBonus() + getUpgradeBonus(yieldUpg) + getBuffValue('gold');
    const xBonus = sk.key === 'fishing'
      ? xpBonus() + getBuffValue('xp') + getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getUpgradeBonus(yieldUpg)
      : getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getUpgradeBonus(yieldUpg) + getBuffValue('xp');

    for (let i = 0; i < maxCycles; i++) {
      if (sk.key === 'fishing') {
        const fish = rollFishWithRarity(spot.fish);
        totalGold += Math.floor(fish.gold * (1 + gBonus));
        totalXp += Math.floor(fish.xp * (1 + xBonus));
        addItem('fish', fish.id, 1);
        recordFishDiscovery(fish.id);
        if (Math.random() < FISHING_LOOT_CHANCE()) {
          const loot = rollByWeight(FISHING_LOOT());
          totalGold += Math.floor(loot.gold * (1 + gBonus));
          addItem('loot', loot.id, 1);
        }
      } else {
        // 伐木/采矿:应用护符稀有加成
        const drop = sk.key === 'woodcutting'
          ? rollWoodWithRarity(spot.drops)
          : rollOreWithRarity(spot.drops);
        totalGold += Math.floor(drop.gold * (1 + gBonus));
        totalXp += Math.floor(drop.xp * (1 + xBonus));
        addItem(sk.invCat, drop.id, 1);
      }
    }

    addGold(totalGold);
    const r = addSkillXp(sk.key, totalXp);
    leveledUp = r.leveledUp;
    newLevel = r.newLevel;

    if (maxCycles > 0) {
      anyOffline = true;
      const now2 = new Date();
      const timeStr = `${String(now2.getHours()).padStart(2, '0')}:${String(now2.getMinutes()).padStart(2, '0')}`;
      addLog(sk.key, {
        id: 'offline',
        name: `离线${sk.label} ×${maxCycles}`,
        icon: '🌙',
        gold: totalGold,
        xp: totalXp,
        time: timeStr,
      });
      if (leveledUp) {
        showToast(`离线期间${sk.label}升级至 Lv.${newLevel}!`, '⭐');
      }
    }
  });

  if (anyOffline) {
    showToast('离线收益已结算,查看日志了解详情', '🌙');
  }
}

/* ---------- 游戏循环 ---------- */
function gameTick() {
  gameTickOrchestrated();
}


/* ---------- 页面可见性 ---------- */
function initVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveState();
  });
  window.addEventListener('beforeunload', () => {
    saveState();
  });
}

function gameTickOrchestrated() {
  const now = Date.now();
  const rawDt = Math.min(now - lastTick, MAX_RAW_DT_MS);
  const dt = rawDt * getSpeedMultiplier();
  lastTick = now;

  tickGameSystems(dt);

  if (now - lastSave >= SAVE_INTERVAL_MS) {
    saveState();
    lastSave = now;
  }

  if (now - lastRender >= RENDER_INTERVAL_MS) {
    renderTimedSystems();
    lastRender = now;
  }
}

/* ---------- 启动(异步:先加载配置) ---------- */
async function init() {
  // 显示加载提示
  document.body.insertAdjacentHTML('beforeend', `
    <div class="loading-mask" id="loadingMask">
      <div class="loading-box">
        <div class="loading-icon">⚓</div>
        <div class="loading-text">正在加载游戏配置…</div>
      </div>
    </div>
  `);

  try {
    await loadConfig();
  } catch (e) {
    document.getElementById('loadingMask').innerHTML = `
      <div class="loading-box">
        <div class="loading-icon">⚠️</div>
        <div class="loading-text">配置加载失败</div>
        <div class="loading-error">${e.message}</div>
        <div class="loading-hint">请使用本地 HTTP 服务器运行,例如:<br>python -m http.server 8000<br>然后访问 http://localhost:8000/</div>
      </div>
    `;
    return;
  }

  loadState();
  settleOffline();
  initializeGameSystems();
  renderAll();
  lastTick = Date.now();
  setInterval(gameTickOrchestrated, TICK_MS);

  // 移除加载提示
  const mask = document.getElementById('loadingMask');
  if (mask) mask.remove();

  console.log('%c⚓ 垂钓纪元已启动(100级·图鉴·商店·升级·烹饪·8槽装备·战斗副本)', 'color:#d4a04a;font-size:14px;font-weight:bold');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
