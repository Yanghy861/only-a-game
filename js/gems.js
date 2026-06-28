/* ============================================================
   宝石模块:采集原石 + 切割成宝石
   数据见 config/gems.json
   ============================================================ */

const gemEls = {
  headerLevel: $('gemHeaderLevel'),
  modeSub: $('gemModeSub'),
  gatherPanel: $('gemGatherPanel'),
  cutPanel: $('gemCutPanel'),
  spotsGrid: $('gemSpotsGrid'),
  sceneIcon: $('gemSceneIcon'),
  sceneName: $('gemSceneName'),
  sceneMeta: $('gemSceneMeta'),
  target: $('gemTarget'),
  progress: $('gemProgress'),
  progressTime: $('gemProgressTime'),
  progressPct: $('gemProgressPct'),
  toggleBtn: $('toggleGemBtn'),
  toggleText: $('toggleGemText'),
  modeControl: $('gemModeControl'),
  log: $('gemLog'),
  dropsGrid: $('gemDropsGrid'),
  // 切割台
  cutList: $('gemCutList'),
  // 原石库存
  roughBag: $('gemRoughBag'),
  // 宝石库存
  gemBag: $('gemBag'),
  effectList: $('gemEffectList'),
};

/* ---------- 渲染采集点网格 ---------- */
function renderGemSpots() {
  gemEls.spotsGrid.innerHTML = '';
  const s = state.gemology;
  GEM_SPOTS().forEach((spot) => {
    const unlocked = s.level >= spot.requiredLevel;
    const selected = s.currentSpotId === spot.id;
    const card = document.createElement('div');
    card.className = 'spot-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <span class="spot-icon">${spot.icon}</span>
      <div class="spot-name">${spot.name}</div>
      <div class="spot-req">${unlocked ? '✓ 已解锁' : `需 Lv.${spot.requiredLevel}`}</div>
      <div class="spot-fish-preview">
        ${spot.drops.map((d) => `<span>${d.icon}</span>`).join('')}
      </div>
      ${unlocked ? '' : '<div class="spot-lock-overlay">🔒 未解锁</div>'}
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        s.currentSpotId = spot.id;
        renderGemSpots();
        renderGemScene();
        saveState();
      });
    }
    gemEls.spotsGrid.appendChild(card);
  });
}

/* ---------- 渲染场景信息 ---------- */
function renderGemScene() {
  const s = state.gemology;
  const spot = getGemSpotById(s.currentSpotId);
  if (s.mode === 'cut') {
    const gemType = s.cutTarget ? getGemTypeByRoughId(s.cutTarget) : null;
    gemEls.sceneIcon.textContent = gemType?.icon || '🔨';
    gemEls.sceneName.textContent = gemType ? `切割${gemType.name}` : '选择原石';
    gemEls.sceneMeta.textContent = gemType
      ? `费用 ${GEM_CUTTING().costPerCut}🪙 · 成功率 ${(GEM_CUTTING().successRate * 100).toFixed(0)}% · 单次 ${formatTime(GEM_CUT_DURATION(s.cutTarget))}`
      : '选择一种原石后开始持续切割';
    return;
  }
  gemEls.sceneIcon.textContent = spot.icon;
  gemEls.sceneName.textContent = spot.name;
  gemEls.sceneMeta.textContent = `Lv.${spot.requiredLevel} 解锁 · 单次 ${formatTime(gemDuration(spot))}`;
}

/* ---------- 渲染进度 ---------- */
function renderGemProgress() {
  const s = state.gemology;
  const dur = s.mode === 'cut' ? GEM_CUT_DURATION(s.cutTarget) : gemDuration(getGemSpotById(s.currentSpotId));
  const pct = Math.min(100, s.progress * 100);
  gemEls.progress.style.width = pct + '%';
  gemEls.progressPct.textContent = Math.floor(pct) + '%';
  const remaining = Math.max(0, (1 - s.progress) * dur);
  const modeText = s.mode === 'cut' ? '切割中' : '挖矿中';
  gemEls.progressTime.textContent = s.isWorking ? `${modeText} · ${formatTime(remaining)}` : '已暂停';
  const top = getGemSpotById(s.currentSpotId).drops.reduce((a, b) => (a.weight > b.weight ? a : b));
  if (s.mode === 'cut') {
    if (s.cutTarget) {
      const gemType = getGemTypeByRoughId(s.cutTarget);
      gemEls.target.textContent = `${gemType.icon} 切割${gemType.name}`;
    } else {
      gemEls.target.textContent = '💎 请选择要切割的原石';
    }
  } else {
    gemEls.target.textContent = `${top.icon} ${top.name}`;
  }
  const actionText = s.mode === 'cut' ? '切割' : '挖矿';
  gemEls.toggleText.textContent = s.isWorking ? `暂停${actionText}` : `继续${actionText}`;
}

/* ---------- 渲染日志 ---------- */
function renderGemLog() {
  const logs = state.log.gemology;
  if (!logs || logs.length === 0) {
    gemEls.log.innerHTML = '<div class="log-empty">尚未开始采集…</div>';
    return;
  }
  gemEls.log.innerHTML = logs
    .map((en) => `
      <div class="log-entry">
        <span class="log-fish-icon">${en.icon}</span>
        <span class="log-fish-name">${en.name}</span>
        <span class="log-fish-reward">+${en.xp}xp +${en.gold}🪙</span>
        <span class="log-time">${en.time}</span>
      </div>`)
    .join('');
}

/* ---------- 渲染切割台 ---------- */
function renderGemCutList() {
  let html = '';
  GEM_TYPES().forEach((gemType) => {
    const roughId = gemType.roughId;
    const have = state.inventory.gem_rough?.[roughId] || 0;
    const cost = GEM_CUTTING().costPerCut;
    const canCut = have > 0 && state.character.gold >= cost;
    const successRate = (GEM_CUTTING().successRate * 100).toFixed(0);
    const cutTime = formatTime(GEM_CUT_DURATION(roughId));
    const isTarget = state.gemology.mode === 'cut' && state.gemology.cutTarget === roughId;

    html += `
      <div class="gem-cut-item ${canCut ? '' : 'locked'} ${isTarget ? 'cutting' : ''}">
        <span class="gem-cut-icon">${gemType.icon}</span>
        <div class="gem-cut-body">
          <div class="gem-cut-name">${gemType.name}</div>
          <div class="gem-cut-desc">${gemType.desc}</div>
          <div class="gem-cut-info">原石: ${have} · 费用: ${cost}🪙 · 成功率: ${successRate}% · 耗时: ${cutTime}</div>
        </div>
        <button class="btn btn-primary" data-cut="${roughId}" ${canCut ? '' : 'disabled'}>
          ${isTarget ? '切割中' : (canCut ? '选择' : '不足')}
        </button>
      </div>`;
  });
  gemEls.cutList.innerHTML = html;

  gemEls.cutList.querySelectorAll('button[data-cut]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const roughId = btn.dataset.cut;
      if (state.gemology.mode === 'cut') {
        // 切割模式:选中该原石开始持续切割
        state.gemology.cutTarget = roughId;
        state.gemology.progress = 0;
        state.gemology.isWorking = true;
        renderGemology();
        saveState();
        return;
      }
    });
  });
}

function renderGemInventoryList(type) {
  let html = '';
  GEM_TYPES().forEach((gemType) => {
    const id = type === 'rough' ? gemType.roughId : gemType.id;
    const have = type === 'rough'
      ? state.inventory.gem_rough?.[id] || 0
      : state.inventory.gem?.[id] || 0;
    if (have > 0) {
      html += `
        <div class="gem-bag-item">
          <span class="gem-bag-icon">${gemType.icon}</span>
          <span class="gem-bag-name">${type === 'rough' ? `${gemType.name}原石` : gemType.name}</span>
          <span class="gem-bag-count">×${have}</span>
          <span class="gem-bag-desc">${type === 'rough' ? `可切割为${gemType.name}` : gemType.desc}</span>
        </div>`;
    }
  });
  if (!html) {
    html = `<div class="log-empty">${type === 'rough' ? '尚未拥有任何原石' : '尚未拥有任何切割好的宝石'}</div>`;
  }
  return html;
}

/* ---------- 渲染宝石库存 ---------- */
function renderGemBag() {
  gemEls.roughBag.innerHTML = renderGemInventoryList('rough');
  gemEls.gemBag.innerHTML = renderGemInventoryList('gem');
}

function renderGemEffects() {
  gemEls.effectList.innerHTML = GEM_TYPES().map((gemType) => {
    const have = state.inventory.gem?.[gemType.id] || 0;
    return `
      <div class="gem-effect-item ${have > 0 ? '' : 'dim'}">
        <span class="gem-bag-icon">${gemType.icon}</span>
        <div class="gem-effect-body">
          <div class="gem-effect-name">${gemType.name}</div>
          <div class="gem-effect-desc">${gemType.desc}</div>
        </div>
      </div>`;
  }).join('');
}

/* ---------- 检查是否有可切割的原石 ---------- */
function canCutAnyGem() {
  const cost = GEM_CUTTING().costPerCut;
  if (state.character.gold < cost) return false;
  return GEM_TYPES().some((gemType) => (state.inventory.gem_rough?.[gemType.roughId] || 0) > 0);
}

/* ---------- 渲染模式切换按钮 ---------- */
function renderGemMode() {
  if (!gemEls.modeControl) return;
  const isCut = state.gemology.mode === 'cut';
  gemEls.headerLevel.textContent = `Lv.${state.gemology.level}`;
  gemEls.modeSub.textContent = isCut
    ? '消耗原石和金币,自动切割成可用于装备、卡片和后续炼金的成品宝石'
    : '选择采集点挂机挖矿,获得可切割的宝石原石';
  gemEls.gatherPanel.hidden = isCut;
  gemEls.cutPanel.hidden = !isCut;
  gemEls.modeControl.querySelectorAll('[data-gem-mode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.gemMode === state.gemology.mode);
  });
}

/* ---------- 渲染当前采集点掉落概率 ---------- */
function renderGemDrops() {
  if (!gemEls.dropsGrid) return;
  const spot = getGemSpotById(state.gemology.currentSpotId);
  const totalWeight = spot.drops.reduce((sum, d) => sum + d.weight, 0);
  const sorted = [...spot.drops].sort((a, b) => (a.type === 'waste' ? 1 : -1) || b.weight - a.weight);

  let html = '';
  let gemChance = 0;
  sorted.forEach((d) => {
    const chance = d.weight / totalWeight;
    if (d.type !== 'waste') gemChance += chance;
    const typeLabel = d.type === 'waste' ? '废石' : '原石';
    html += `
      <div class="gem-drop-item ${d.type === 'waste' ? 'waste' : ''}">
        <span class="gem-drop-icon">${d.icon}</span>
        <div class="gem-drop-body">
          <div class="gem-drop-name">${d.name} <span class="gem-drop-type">${typeLabel}</span></div>
          <div class="gem-drop-chance">${(chance * 100).toFixed(1)}%</div>
        </div>
      </div>`;
  });
  html = `<div class="gem-drop-summary">宝石原石总爆率: ${(gemChance * 100).toFixed(0)}%</div>` + html;
  gemEls.dropsGrid.innerHTML = html;
}

/* ---------- 整体渲染宝石页 ---------- */
function renderGemology() {
  renderGemSpots();
  renderGemScene();
  renderGemProgress();
  renderGemMode();
  renderGemLog();
  renderGemDrops();
  renderGemCutList();
  renderGemBag();
  renderGemEffects();
}

/* ---------- 初始化交互 ---------- */
function initGemology() {
  gemEls.toggleBtn.addEventListener('click', () => {
    state.gemology.isWorking = !state.gemology.isWorking;
    renderGemProgress();
    saveState();
  });

  gemEls.modeControl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-gem-mode]');
    if (!btn) return;
    const mode = btn.dataset.gemMode;
    if (mode === state.gemology.mode) return;
    state.gemology.mode = mode;
    state.gemology.progress = 0;
    if (mode === 'cut') {
      // 切换到切割时清空选中,让用户选择具体原石
      state.gemology.cutTarget = null;
      if (!canCutAnyGem()) {
        state.gemology.mode = 'gather';
        showToast('没有可切割的原石', '💎');
      }
    } else {
      // 切回采集时清空切割目标
      state.gemology.cutTarget = null;
    }
    renderGemology();
    saveState();
  });
}
