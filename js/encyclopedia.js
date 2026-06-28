/* ============================================================
   图鉴模块:鱼种发现、里程碑奖励
   ============================================================ */

const encEls = {
  progress: $('encyclopediaProgress'),
  stats: $('encyclopediaStats'),
  milestones: $('encyclopediaMilestones'),
  grid: $('encyclopediaGrid'),
};

/* ---------- 渲染图鉴统计 ---------- */
function renderEncyclopediaStats() {
  const allFish = getAllFishList();
  const total = allFish.length;
  const discovered = getDiscoveredCount();

  encEls.progress.textContent = `${discovered} / ${total}`;

  encEls.stats.innerHTML = `
    <div class="encyclopedia-stat-row"><span>已发现鱼种</span><strong>${discovered} / ${total}</strong></div>
    <div class="encyclopedia-stat-row"><span>经验加成</span><strong>+${(encyclopediaXpBonus() * 100).toFixed(0)}%</strong></div>
    <div class="encyclopedia-stat-row"><span>金币加成</span><strong>+${(encyclopediaGoldBonus() * 100).toFixed(0)}%</strong></div>
  `;
}

/* ---------- 渲染里程碑 ---------- */
function renderMilestones() {
  const discovered = getDiscoveredCount();
  let html = '';
  ENCYCLOPEDIA_MILESTONES().forEach((m) => {
    const claimed = !!state.encyclopediaRewards[m.count];
    const ready = !claimed && discovered >= m.count;
    const cls = claimed ? 'claimed' : ready ? 'ready' : '';
    html += `
      <div class="milestone-item ${cls}">
        <span class="milestone-count">${m.count}</span>
        <span class="milestone-desc">${m.reward.desc}</span>
        ${claimed
          ? '<span style="color:var(--moss-bright);font-size:12px">✓ 已领取</span>'
          : ready
            ? `<button class="btn btn-primary milestone-btn" data-claim="${m.count}">领取</button>`
            : `<span style="color:var(--parchment-dim);font-size:11px">${discovered}/${m.count}</span>`}
      </div>`;
  });
  encEls.milestones.innerHTML = html;

  // 绑定领取事件
  encEls.milestones.querySelectorAll('button[data-claim]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.claim);
      const result = claimEncyclopediaReward(count);
      if (result.ok) {
        showToast('里程碑奖励已领取!', '🏆');
        saveState();
        renderEncyclopedia();
        renderTopbar();
      } else {
        showToast(result.msg, '✗');
      }
    });
  });
}

/* ---------- 渲染鱼类图鉴网格 ---------- */
function renderEncyclopediaGrid() {
  const allFish = getAllFishList();
  let html = '';
  allFish.forEach((fish) => {
    const entry = state.encyclopedia[fish.id];
    const discovered = entry === true || (entry && typeof entry === 'object' && Object.keys(entry).length > 0);
    const cls = discovered ? 'discovered' : 'undiscovered';

    html += `
      <div class="fish-card ${cls}" title="${discovered ? `${fish.name} · ${fish.spotName}` : '未发现'}">
        <span class="fish-card-icon">${discovered ? fish.icon : '❓'}</span>
        <span class="fish-card-name">${discovered ? fish.name : '???'}</span>
        <span class="fish-card-spot">${discovered ? fish.spotName : ''}</span>
      </div>`;
  });
  encEls.grid.innerHTML = html;
}

/* ---------- 整体渲染图鉴页 ---------- */
function renderEncyclopedia() {
  renderEncyclopediaStats();
  renderMilestones();
  renderEncyclopediaGrid();
}
