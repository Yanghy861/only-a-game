/* ============================================================
   战斗系统:自动刷怪 + 自由装备构筑 + 探索解锁
   ============================================================ */

const combatEls = {
  statsPanel: $('combatStats'),
  storyList: $('storyDungeonList'),
  endlessInfo: $('endlessInfo'),
  endlessToggle: $('endlessToggleBtn'),
  endlessToggleText: $('endlessToggleText'),
  endlessProgress: $('endlessProgress'),
  endlessProgressPct: $('endlessProgressPct'),
  endlessProgressTime: $('endlessProgressTime'),
  endlessLog: $('endlessLog'),
  bossList: $('bossDungeonList'),
  battlePanel: $('battlePanel'),
  battlePlayer: $('battlePlayer'),
  battleEnemy: $('battleEnemy'),
  battleLog: $('battleLog'),
  battleSkills: $('battleSkills'),
  battleResult: $('battleResult'),
  battleCloseBtn: $('battleCloseBtn'),
  talentPoints: $('talentPoints'),
  talentTree: $('talentTree'),
};

function renderCombatStats() {
  const s = getPlayerCombatStats();
  const currentStyle = getCombatStyleById(getCurrentCombatStyleId());
  const styleTabs = getCombatStyleDefs().map((style) => {
    const st = getCombatStyleState(style.id);
    const need = combatXpForLevel(st.level);
    const pct = need > 0 ? Math.min(100, (st.xp / need) * 100) : 100;
    const active = style.id === currentStyle.id;
    return `
      <button class="combat-style-card ${active ? 'active' : ''}" data-combat-style="${style.id}">
        <div class="combat-style-top">
          <span class="combat-style-icon">${style.icon}</span>
          <span class="combat-style-name">${style.name}</span>
          <span class="combat-style-lv">Lv.${st.level}</span>
        </div>
        <div class="combat-style-desc">${style.desc}</div>
        <div class="combat-style-bar"><span style="width:${pct}%"></span></div>
      </button>`;
  }).join('');

  combatEls.statsPanel.innerHTML = `
    <div class="combat-stats-header compact">
      <span class="combat-level">${currentStyle.icon} 战斗 Lv.${getCombatDisplayLevel()}</span>
      <span class="combat-xp-text">当前出击方式: ${currentStyle.name}</span>
    </div>
    <div class="combat-style-grid compact">${styleTabs}</div>
    <div class="combat-quick-stats">
      <span>生命 <b>${s.hp}</b></span>
      <span>攻击 <b>${s.atk}</b></span>
      <span>防御 <b>${s.def}</b></span>
      <span>速度 <b>${s.spd}</b></span>
      <span>暴击 <b>${(s.crit * 100).toFixed(1)}%</b></span>
      <span>暴伤 <b>${s.critDmg.toFixed(1)}x</b></span>
    </div>`;

  combatEls.statsPanel.querySelectorAll('[data-combat-style]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setCombatStyle(btn.dataset.combatStyle);
      saveState();
      renderCombat();
      const style = getCombatStyleById(btn.dataset.combatStyle);
      showToast(`已切换为${style.name}出击`, style.icon);
    });
  });
}
function renderExplorePanel() {
  const currentArea = getCurrentCombatArea();
  const nextLocked = getNextLockedCombatArea();
  const unlocked = getUnlockedCombatAreas();
  let html = '<div class="threat-section-title">已发现区域</div>';

  unlocked.forEach((area) => {
    const active = currentArea?.id === area.id;
    const threat = area.threat;
    const cleared = !!state.combat.areaThreatCleared?.[area.id];
    html += `
      <div class="dungeon-card ${active ? 'current' : ''}" data-area="${area.id}">
        <span class="dungeon-icon">${area.icon}</span>
        <div class="dungeon-body">
          <div class="dungeon-name">${area.name}</div>
          <div class="dungeon-desc">${area.desc}</div>
          <div class="dungeon-reward">${cleared ? '关键威胁已解决' : `当前威胁: ${threat.icon} ${threat.name}`}</div>
        </div>
      </div>`;
  });

  const threat = getCurrentAreaThreat();
  html += '<div class="threat-section-title">当前威胁</div>';
  html += threat
    ? `<div class="dungeon-card boss current">
        <span class="dungeon-icon">${threat.icon}</span>
        <div class="dungeon-body">
          <div class="dungeon-name">${threat.name}</div>
          <div class="dungeon-desc">${threat.desc}</div>
          <div class="dungeon-enemy">HP:${threat.hp} ATK:${threat.atk} DEF:${threat.def}</div>
        </div>
        <div class="dungeon-actions"><button class="btn btn-primary" id="challengeAreaThreatBtn">自动讨伐</button></div>
      </div>`
    : `<div class="dungeon-card mystery"><span class="dungeon-icon">✓</span><div class="dungeon-body"><div class="dungeon-name">本区域已安定</div><div class="dungeon-desc">可以继续刷普通怪,或等待新的传闻。</div></div></div>`;

  html += '<div class="threat-section-title">传闻</div>';
  html += nextLocked
    ? `<div class="dungeon-card mystery rumor"><span class="dungeon-icon">◼</span><div class="dungeon-body"><div class="dungeon-name">${currentArea?.rumorAfterClear || '远处传来新的动静'}</div><div class="dungeon-desc">解决当前威胁后会显露更多信息。</div></div></div>`
    : `<div class="dungeon-card mystery rumor"><span class="dungeon-icon">…</span><div class="dungeon-body"><div class="dungeon-name">暂无线索</div><div class="dungeon-desc">这个最小版本的已知区域到此为止。</div></div></div>`;

  html += '<div class="threat-section-title">未知</div>';
  html += `<div class="dungeon-card mystery unknown"><span class="dungeon-icon">?</span><div class="dungeon-body"><div class="dungeon-name">？？？</div><div class="dungeon-desc">后续区域不会提前展示。</div></div></div>`;

  combatEls.storyList.innerHTML = html;

  combatEls.storyList.querySelectorAll('[data-area]').forEach((card) => {
    card.addEventListener('click', () => {
      setCombatArea(card.dataset.area);
      saveState();
      renderCombat();
    });
  });
  const threatBtn = $('challengeAreaThreatBtn');
  if (threatBtn) {
    threatBtn.addEventListener('click', () => {
      const result = runAreaThreatBattle();
      showToast(result.msg, result.ok ? '🏆' : '⚠️');
      saveState();
      renderCombat();
    });
  }
}

function renderAreaCombatPanel() {
  const area = getCurrentCombatArea();
  const monster = getCurrentCombatMonster();
  if (!area || !monster) {
    combatEls.endlessInfo.innerHTML = '<div class="log-empty">暂无可战斗区域</div>';
    return;
  }
  const duration = getAreaBattleDuration(monster);
  const dropTip = (monster.drops || []).map((d) => {
    const mat = getMonsterDropInfo(d.id);
    return `${mat?.name || getCombatMatName(d.id)} ${(d.chance * 100).toFixed(0)}%`;
  }).join(' / ') || '无主要掉落';
  const areaMonsterTip = area.monsters.map((m) => `${m.name}`).join(" / ");
  const infoTip = `${monster.name}: HP ${monster.hp}, ATK ${monster.atk}, DEF ${monster.def}, ${monster.gold}金币, ${monster.xp}XP。\\n可能遭遇: ${areaMonsterTip}。\\n掉落: ${dropTip}`;

  combatEls.endlessInfo.innerHTML = `
    <div class="combat-scene-visual compact">
      <button class="combat-info-dot" title="${infoTip}">?</button>
      <div class="combat-scene-side">
        <span class="combat-scene-icon">${area.icon}</span>
        <small>区域</small>
        <strong>${area.name}</strong>
      </div>
      <div class="combat-scene-versus">随机</div>
      <div class="combat-scene-side enemy">
        <span class="combat-scene-icon">${monster.icon}</span>
        <small>${state.combat.isAutoArea ? '本场遭遇' : '下次遭遇'}</small>
        <strong>${monster.name}</strong>
      </div>
    </div>`;

  const pct = Math.min(100, (state.combat.areaProgress || 0) * 100);
  combatEls.endlessProgress.style.width = pct + '%';
  combatEls.endlessProgressPct.textContent = Math.floor(pct) + '%';
  combatEls.endlessProgressTime.textContent = state.combat.isAutoArea ? formatTime(duration * (1 - (state.combat.areaProgress || 0))) : '已暂停';
  combatEls.endlessToggleText.textContent = state.combat.isAutoArea ? '暂停战斗' : '开始战斗';
}
function renderBuildAndLogPanel() {
  const area = getCurrentCombatArea();
  const threat = getCurrentAreaThreat();
  const nextLocked = getNextLockedCombatArea();
  const logs = state.combat.areaLog || [];
  const goalHtml = threat
    ? `<div class="combat-goal-card">
        <span class="goal-icon">${threat.icon}</span>
        <div><strong>${threat.name}</strong><small>击败后推进区域线索</small></div>
      </div>`
    : nextLocked
      ? `<div class="combat-goal-card mystery">
          <span class="goal-icon">?</span>
          <div><strong>${area?.rumorAfterClear || nextLocked.name}</strong><small>新的区域会逐步显露</small></div>
        </div>`
      : `<div class="combat-goal-card mystery">
          <span class="goal-icon">✓</span>
          <div><strong>当前版本威胁已清理</strong><small>继续挂机积累材料</small></div>
        </div>`;
  const logHtml = logs.length
    ? logs.slice(-10).reverse().map((l) => `<div class="combat-log-entry ${l.type}">${l.text}</div>`).join('')
    : '<div class="log-empty">暂无战斗记录</div>';

  combatEls.bossList.innerHTML = `
    <div class="threat-section-title">下一步</div>
    ${goalHtml}
    <div class="threat-section-title">最近记录</div>
    <div class="endless-log combat-log-compact">${logHtml}</div>`;
}
function initEndlessToggle() {
  combatEls.endlessToggle.addEventListener('click', () => {
    state.combat.isAutoArea = !state.combat.isAutoArea;
    if (state.combat.isAutoArea) {
      state.combat.areaLog = [];
      rerollAreaEncounter();
      state.combat.areaProgress = 0;
    }
    saveState();
    renderCombat();
  });

  if (combatEls.battleCloseBtn) combatEls.battleCloseBtn.addEventListener('click', closeBattle);
}

function renderTalents() {
  if (!combatEls.talentTree || !combatEls.talentPoints) return;
  combatEls.talentPoints.textContent = '暂未启用';
  combatEls.talentTree.innerHTML = '<div class="log-empty">天赋树会在战斗构筑稳定后再重新设计。</div>';
}

function renderBattle() {
  if (combatEls.battlePanel) combatEls.battlePanel.style.display = 'none';
}

function closeBattle() {
  state.combat.activeBattle = null;
  renderBattle();
  saveState();
}

function renderCombat() {
  renderCombatStats();
  renderExplorePanel();
  renderAreaCombatPanel();
  renderBuildAndLogPanel();
  renderBattle();
  renderTalents();
}
