/* ============================================================
   钓鱼模块:钓点渲染、钓鱼循环、渔获结算(含掉落物)、日志
   ============================================================ */

const fishingEls = {
  spotsGrid: $('spotsGrid'),
  sceneIcon: $('sceneIcon'),
  sceneName: $('sceneName'),
  sceneMeta: $('sceneMeta'),
  targetFish: $('targetFish'),
  fishingProgress: $('fishingProgress'),
  progressTime: $('progressTime'),
  progressPct: $('progressPct'),
  toggleBtn: $('toggleFishingBtn'),
  toggleText: $('toggleFishingText'),
  catchLog: $('catchLog'),
  lootGrid: $('fishingLootGrid'),
};

/* ---------- 渲染钓点网格 ---------- */
function renderSpots() {
  fishingEls.spotsGrid.innerHTML = '';
  FISHING_SPOTS().forEach((spot) => {
    const unlocked = isSpotUnlocked('fishing', spot);
    const selected = state.fishing.currentSpotId === spot.id;
    const card = document.createElement('div');
    card.className = 'spot-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <span class="spot-icon">${spot.icon}</span>
      <div class="spot-name">${spot.name}</div>
      <div class="spot-req">${unlocked ? '✓ 已解锁' : getSpotLockText('fishing', spot)}</div>
      <div class="spot-fish-preview">
        ${spot.fish.map((f) => `<span>${f.icon}</span>`).join('')}
      </div>
      ${unlocked ? '' : '<div class="spot-lock-overlay">🔒 未解锁</div>'}
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        if (selectSpot(spot.id)) {
          renderSpots();
          renderFishingScene();
          saveState();
        }
      });
    }
    fishingEls.spotsGrid.appendChild(card);
  });
}

/* ---------- 渲染当前钓鱼场景 ---------- */
function renderFishingScene() {
  const spot = getSpotById(state.fishing.currentSpotId);
  fishingEls.sceneIcon.textContent = spot.icon;
  fishingEls.sceneName.textContent = spot.name;
  fishingEls.sceneMeta.textContent = `Lv.${spot.requiredLevel} 解锁 · 单次 ${formatTime(fishingDurationWithGear(spot))}`;
}

/* ---------- 渲染钓鱼进度 ---------- */
function renderFishingProgress() {
  const spot = getSpotById(state.fishing.currentSpotId);
  const dur = fishingDurationWithGear(spot);
  const pct = Math.min(100, state.fishing.progress * 100);
  fishingEls.fishingProgress.style.width = pct + '%';
  fishingEls.progressPct.textContent = Math.floor(pct) + '%';
  const remaining = Math.max(0, (1 - state.fishing.progress) * dur);
  fishingEls.progressTime.textContent = state.fishing.isFishing ? formatTime(remaining) : '已暂停';

  const topFish = spot.fish.reduce((a, b) => (a.weight > b.weight ? a : b));
  fishingEls.targetFish.textContent = `${topFish.icon} ${topFish.name}`;
  fishingEls.toggleText.textContent = state.fishing.isFishing ? '暂停垂钓' : '继续垂钓';
}

/* ---------- 渲染钓鱼掉落物表 ---------- */
function renderFishingLoot() {
  if (!fishingEls.lootGrid) return;
  const totalWeight = FISHING_LOOT().reduce((sum, l) => sum + l.weight, 0);
  const baseChance = FISHING_LOOT_CHANCE();
  const haveMap = state.inventory.loot || {};

  const typeOrder = { tackle: 0, treasure: 1, junk: 2 };
  const sorted = [...FISHING_LOOT()].sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) || b.weight - a.weight);

  fishingEls.lootGrid.innerHTML = sorted.map((l) => {
    const chance = baseChance * (l.weight / totalWeight);
    const have = haveMap[l.id] || 0;
    const typeLabel = l.type === 'tackle' ? '渔具' : l.type === 'treasure' ? '珍宝' : '杂物';
    return `
      <div class="fishing-loot-item ${l.type}">
        <span class="fishing-loot-icon">${l.icon}</span>
        <div class="fishing-loot-body">
          <div class="fishing-loot-name">${l.name} <span class="fishing-loot-type">${typeLabel}</span></div>
          <div class="fishing-loot-chance">概率: ${(chance * 100).toFixed(2)}% · 拥有: ${have}</div>
        </div>
      </div>`;
  }).join('');
}

/* ---------- 渲染渔获日志 ---------- */
function renderCatchLog() {
  const logs = state.log.fishing;
  if (!logs || logs.length === 0) {
    fishingEls.catchLog.innerHTML = '<div class="log-empty">尚无渔获,静待鱼儿上钩…</div>';
    return;
  }
  fishingEls.catchLog.innerHTML = logs
    .map(
      (e) => `
      <div class="log-entry">
        <span class="log-fish-icon">${e.icon}</span>
        <span class="log-fish-name">${e.name}</span>
        <span class="log-fish-reward">+${e.xp}xp +${e.gold}🪙</span>
        <span class="log-time">${e.time}</span>
      </div>`
    )
    .join('');
}

/* ---------- 整体渲染钓鱼页 ---------- */
function renderFishing() {
  renderSpots();
  renderFishingScene();
  renderFishingProgress();
  renderFishingLoot();
}

/* ---------- 暂停/继续 ---------- */
function initFishingToggle() {
  fishingEls.toggleBtn.addEventListener('click', () => {
    state.fishing.isFishing = !state.fishing.isFishing;
    renderFishingProgress();
    saveState();
  });
}

/* ---------- 单次钓鱼结算(图鉴+升级加成) ---------- */
function completeFishing() {
  const spot = getSpotById(state.fishing.currentSpotId);
  const fish = rollFishWithRarity(spot.fish);

  // 计算所有加成(含卡片)
  const cardGold = getCardBonus('fishing_gold') + getCardBonus('global_gold');
  const cardXp = getCardBonus('global_xp');
  const gBonus = goldBonus() + getBuffValue('gold') + getUpgradeBonus('global_gold') + encyclopediaGoldBonus() + getUpgradeBonus('fish_yield') + cardGold;
  const xBonus = xpBonus() + getBuffValue('xp') + getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getUpgradeBonus('fish_yield') + cardXp;

  const finalGold = Math.floor(fish.gold * (1 + gBonus));
  const finalXp = Math.floor(fish.xp * (1 + xBonus));

  // 鱼类奖励
  addGold(finalGold);
  addItem('fish', fish.id, 1);
  const { leveledUp, newLevel } = addSkillXp('fishing', finalXp);

  // 消耗卡片次数
  if (cardGold > 0) {
    consumeCardCharge('fishing_gold');
    consumeCardCharge('global_gold');
  }
  if (cardXp > 0) consumeCardCharge('global_xp');

  // 图鉴记录
  const firstDiscovery = recordFishDiscovery(fish.id);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  addLog('fishing', {
    id: fish.id,
    name: fish.name,
    icon: fish.icon,
    gold: finalGold,
    xp: finalXp,
    time: timeStr,
  });

  // 首次发现提示
  if (firstDiscovery) {
    showToast(`发现新鱼种:${fish.name}!`, fish.icon);
  }

  // 掉落物判定
  if (Math.random() < FISHING_LOOT_CHANCE()) {
    const loot = rollByWeight(FISHING_LOOT());
    const lootGold = Math.floor(loot.gold * (1 + gBonus));
    addGold(lootGold);
    addItem('loot', loot.id, 1);
    addLog('fishing', {
      id: loot.id,
      name: `${loot.name}(掉落)`,
      icon: loot.icon,
      gold: lootGold,
      xp: 0,
      time: timeStr,
    });
    if (loot.type === 'treasure') {
      showToast(`稀有掉落:${loot.name}!`, loot.icon);
    }
  }

  // 升级提示
  if (leveledUp) {
    showToast(`钓鱼等级提升至 Lv.${newLevel}!`, '⭐');
    FISHING_SPOTS().forEach((s) => {
      if (s.requiredLevel === newLevel) {
        setTimeout(() => showToast(`解锁新钓点:${s.name}`, s.icon), 600);
      }
    });
    renderSpots();
  }}
