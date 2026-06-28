/* ============================================================
   采集模块:伐木与采矿(结构一致,数据驱动)
   ============================================================ */

// 两个技能的配置,统一用一套逻辑处理
// 注意:spotList/getSpot/selectFn 都改为函数式,在调用时取值
const GATHER_CONFIGS = {
  woodcutting: {
    skill: 'woodcutting',
    stateKey: 'woodcutting',
    spotList: () => WOODCUTTING_SPOTS(),
    getSpot: getWoodSpotById,
    invCategory: 'wood',
    logKey: 'woodcutting',
    selectFn: (id) => selectSkillSpot('woodcutting', id, WOODCUTTING_SPOTS()),
    activeFlag: 'isWorking',
    speedWithGear: woodcuttingSpeedWithGear,
    durationWithGear: woodcuttingDurationWithGear,
    rarityBonus: woodRarityBonus,
    rollWithRarity: rollWoodWithRarity,
    yieldUpgrade: 'wood_yield',
    els: {
      spotsGrid: 'woodSpotsGrid',
      sceneIcon: 'woodSceneIcon',
      sceneName: 'woodSceneName',
      sceneMeta: 'woodSceneMeta',
      target: 'woodTarget',
      progress: 'woodProgress',
      progressTime: 'woodProgressTime',
      progressPct: 'woodProgressPct',
      toggleBtn: 'toggleWoodBtn',
      toggleText: 'toggleWoodText',
      log: 'woodLog',
    },
    actionLabel: '伐木',
  },
  mining: {
    skill: 'mining',
    stateKey: 'mining',
    spotList: () => MINING_SPOTS(),
    getSpot: getMineSpotById,
    invCategory: 'ore',
    logKey: 'mining',
    selectFn: (id) => selectSkillSpot('mining', id, MINING_SPOTS()),
    activeFlag: 'isWorking',
    speedWithGear: miningSpeedWithGear,
    durationWithGear: miningDurationWithGear,
    rarityBonus: mineRarityBonus,
    rollWithRarity: rollOreWithRarity,
    yieldUpgrade: 'mine_yield',
    els: {
      spotsGrid: 'mineSpotsGrid',
      sceneIcon: 'mineSceneIcon',
      sceneName: 'mineSceneName',
      sceneMeta: 'mineSceneMeta',
      target: 'mineTarget',
      progress: 'mineProgress',
      progressTime: 'mineProgressTime',
      progressPct: 'mineProgressPct',
      toggleBtn: 'toggleMineBtn',
      toggleText: 'toggleMineText',
      log: 'mineLog',
    },
    actionLabel: '采矿',
  },
};

// 缓存 DOM 引用
const gatherEls = {};
Object.keys(GATHER_CONFIGS).forEach((k) => {
  const cfg = GATHER_CONFIGS[k];
  gatherEls[k] = {};
  Object.keys(cfg.els).forEach((ek) => {
    gatherEls[k][ek] = document.getElementById(cfg.els[ek]);
  });
});

/* ---------- 带稀有加成的采集物权重抽取(类似钓鱼) ---------- */
function rollGatherWithRarity(dropList, bonus) {
  if (bonus <= 0) return rollByWeight(dropList);
  const sorted = [...dropList].sort((a, b) => a.weight - b.weight);
  const adjusted = dropList.map((d) => {
    const rank = sorted.indexOf(d);
    const rarityFactor = 1 + bonus * (1 - rank / Math.max(1, sorted.length - 1));
    return { ...d, weight: d.weight * rarityFactor };
  });
  return rollByWeight(adjusted);
}
function rollWoodWithRarity(dropList) {
  return rollGatherWithRarity(dropList, woodRarityBonus());
}
function rollOreWithRarity(dropList) {
  return rollGatherWithRarity(dropList, mineRarityBonus());
}

/* ---------- 渲染采集点网格 ---------- */
function renderGatherSpots(cfg, e) {
  e.spotsGrid.innerHTML = '';
  const s = state[cfg.stateKey];
  cfg.spotList().forEach((spot) => {
    const unlocked = isSpotUnlocked(cfg.skill, spot);
    const selected = s.currentSpotId === spot.id;
    const card = document.createElement('div');
    card.className = 'spot-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <span class="spot-icon">${spot.icon}</span>
      <div class="spot-name">${spot.name}</div>
      <div class="spot-req">${unlocked ? '✓ 已解锁' : getSpotLockText(cfg.skill, spot)}</div>
      <div class="spot-fish-preview">
        ${spot.drops.map((d) => `<span>${d.icon}</span>`).join('')}
      </div>
      ${unlocked ? '' : '<div class="spot-lock-overlay">🔒 未解锁</div>'}
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        if (cfg.selectFn(spot.id)) {
          renderGatherSpots(cfg, e);
          renderGatherScene(cfg, e);
          saveState();
        }
      });
    }
    e.spotsGrid.appendChild(card);
  });
}

/* ---------- 渲染场景信息 ---------- */
function renderGatherScene(cfg, e) {
  const s = state[cfg.stateKey];
  const spot = cfg.getSpot(s.currentSpotId);
  e.sceneIcon.textContent = spot.icon;
  e.sceneName.textContent = spot.name;
  e.sceneMeta.textContent = `Lv.${spot.requiredLevel} 解锁 · 单次 ${formatTime(cfg.durationWithGear(spot))}`;
}

/* ---------- 渲染进度 ---------- */
function renderGatherProgress(cfg, e) {
  const s = state[cfg.stateKey];
  const spot = cfg.getSpot(s.currentSpotId);
  const dur = cfg.durationWithGear(spot);
  const pct = Math.min(100, s.progress * 100);
  e.progress.style.width = pct + '%';
  e.progressPct.textContent = Math.floor(pct) + '%';
  const remaining = Math.max(0, (1 - s.progress) * dur);
  e.progressTime.textContent = s[cfg.activeFlag] ? formatTime(remaining) : '已暂停';
  const top = spot.drops.reduce((a, b) => (a.weight > b.weight ? a : b));
  e.target.textContent = `${top.icon} ${top.name}`;
  e.toggleText.textContent = s[cfg.activeFlag] ? `暂停${cfg.actionLabel}` : `继续${cfg.actionLabel}`;
}

/* ---------- 渲染日志 ---------- */
function renderGatherLog(cfg, e) {
  const logs = state.log[cfg.logKey];
  if (!logs || logs.length === 0) {
    e.log.innerHTML = `<div class="log-empty">尚未开始${cfg.actionLabel}…</div>`;
    return;
  }
  e.log.innerHTML = logs
    .map(
      (en) => `
      <div class="log-entry">
        <span class="log-fish-icon">${en.icon}</span>
        <span class="log-fish-name">${en.name}</span>
        <span class="log-fish-reward">+${en.xp}xp +${en.gold}🪙</span>
        <span class="log-time">${en.time}</span>
      </div>`
    )
    .join('');
}

/* ---------- 整体渲染 ---------- */
function renderGathering(skill) {
  const cfg = GATHER_CONFIGS[skill];
  const e = gatherEls[skill];
  renderGatherSpots(cfg, e);
  renderGatherScene(cfg, e);
  renderGatherProgress(cfg, e);
  renderGatherLog(cfg, e);
}

function renderAllGathering() {
  renderGathering('woodcutting');
  renderGathering('mining');
}

/* ---------- 单次采集结算(应用装备+升级+图鉴+卡片加成) ---------- */
function completeGathering(skill) {
  const cfg = GATHER_CONFIGS[skill];
  const s = state[cfg.stateKey];
  const spot = cfg.getSpot(s.currentSpotId);
  // 应用稀有加成(护符)
  const drop = cfg.rollWithRarity(spot.drops);

  // 计算加成:全局金币/经验 + 图鉴 + 该技能产出升级 + 速度药水 + 卡片
  const cardTarget = skill === 'woodcutting' ? 'wood_yield' : 'mine_yield';
  const cardGold = getCardBonus(cardTarget) + getCardBonus('global_gold');
  const cardXp = getCardBonus('global_xp');
  const gBonus = getUpgradeBonus('global_gold') + encyclopediaGoldBonus() + getUpgradeBonus(cfg.yieldUpgrade) + getBuffValue('gold') + cardGold;
  const xBonus = getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getUpgradeBonus(cfg.yieldUpgrade) + getBuffValue('xp') + cardXp;

  const finalGold = Math.floor(drop.gold * (1 + gBonus));
  const finalXp = Math.floor(drop.xp * (1 + xBonus));

  addGold(finalGold);
  addItem(cfg.invCategory, drop.id, 1);
  const { leveledUp, newLevel } = addSkillXp(cfg.skill, finalXp);

  // 消耗卡片次数
  if (cardGold > 0) {
    consumeCardCharge(cardTarget);
    consumeCardCharge('global_gold');
  }
  if (cardXp > 0) consumeCardCharge('global_xp');

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  addLog(cfg.logKey, {
    id: drop.id,
    name: drop.name,
    icon: drop.icon,
    gold: finalGold,
    xp: finalXp,
    time: timeStr,
  });

  if (leveledUp) {
    showToast(`${cfg.actionLabel}等级提升至 Lv.${newLevel}!`, '⭐');
    cfg.spotList().forEach((sp) => {
      if (sp.requiredLevel === newLevel) {
        setTimeout(() => showToast(`解锁新地点:${sp.name}`, sp.icon), 600);
      }
    });
    renderGatherSpots(cfg, gatherEls[skill]);
  }
}

/* ---------- 暂停/继续 ---------- */
function initGatherToggles() {
  Object.keys(GATHER_CONFIGS).forEach((skill) => {
    const cfg = GATHER_CONFIGS[skill];
    const e = gatherEls[skill];
    e.toggleBtn.addEventListener('click', () => {
      state[cfg.stateKey][cfg.activeFlag] = !state[cfg.stateKey][cfg.activeFlag];
      renderGatherProgress(cfg, e);
      saveState();
    });
  });
}
