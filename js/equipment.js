/* ============================================================
   装备模块:当前装备(8槽)、制作台、装备库、出售杂物
   ============================================================ */

const equipEls = {
  equippedGrid: $('equippedGrid'),
  bonusSummary: $('bonusSummary'),
  craftTabs: $('craftTabs'),
  craftList: $('craftList'),
  sellList: $('sellList'),
  sellAllBtn: $('sellAllBtn'),
};

// 当前选中的制作台标签
let currentCraftTab = 'rod';

/* ---------- 渲染当前装备槽(8槽位) ---------- */
function renderEquippedGrid() {
  let html = '';
  EQUIP_SLOTS().forEach((slot) => {
    const eqId = state.equipped[slot.key];
    const eq = eqId ? getEquipById(slot.key, eqId) : null;
    if (eq) {
      const bonusText = formatEquipBonus(slot.key, eq);
      html += `
        <div class="equip-slot-card" data-slot="${slot.key}" title="点击卸下">
          <span class="slot-card-icon">${eq.icon}</span>
          <div class="slot-card-body">
            <div class="slot-card-name">${eq.name}</div>
            <div class="slot-card-type">${slot.name}</div>
            <div class="slot-card-bonus">${bonusText}</div>
          </div>
        </div>`;
    } else {
      html += `
        <div class="equip-slot-card empty">
          <span class="slot-card-icon">${slot.icon}</span>
          <div class="slot-card-body">
            <div class="slot-card-name">${slot.name}</div>
            <div class="slot-card-empty-label">未装备</div>
          </div>
        </div>`;
    }
  });
  equipEls.equippedGrid.innerHTML = html;

  // 绑定卸下事件
  equipEls.equippedGrid.querySelectorAll('.equip-slot-card[data-slot]').forEach((card) => {
    card.addEventListener('click', () => {
      const slotKey = card.dataset.slot;
      unequipItem(slotKey);
      saveState();
      renderEquipment();
      renderCharacter();
      const slotDef = EQUIP_SLOTS().find((s) => s.key === slotKey);
      showToast(`已卸下${slotDef.name}`, '⬇');
    });
  });
}

/* ---------- 格式化装备加成文本 ---------- */
function formatEquipBonus(slot, eq) {
  const parts = [];
  if (eq.speedBonus) parts.push(`速度+${(eq.speedBonus * 100).toFixed(0)}%`);
  if (eq.rarityBonus) parts.push(`稀有+${(eq.rarityBonus * 100).toFixed(0)}%`);
  if (eq.goldBonus) parts.push(`金币+${(eq.goldBonus * 100).toFixed(0)}%`);
  if (eq.xpBonus) parts.push(`经验+${(eq.xpBonus * 100).toFixed(0)}%`);
  return parts.join(' · ') || '无加成';
}

/* ---------- 渲染加成汇总(三项技能) ---------- */
function renderBonusSummary() {
  const fSpeed = fishingSpeedWithGear();
  const wSpeed = woodcuttingSpeedWithGear();
  const mSpeed = miningSpeedWithGear();
  const rarity = rarityBonus();
  const wRarity = woodRarityBonus();
  const mRarity = mineRarityBonus();
  const gold = goldBonus();
  const xp = xpBonus();
  equipEls.bonusSummary.innerHTML = `
    <div class="bonus-group"><span class="bonus-group-title">🎣 钓鱼</span>
      <div class="bonus-row"><span>速度</span><strong>×${fSpeed.toFixed(2)}</strong></div>
      <div class="bonus-row"><span>稀有</span><strong>+${(rarity * 100).toFixed(0)}%</strong></div>
    </div>
    <div class="bonus-group"><span class="bonus-group-title">🪓 伐木</span>
      <div class="bonus-row"><span>速度</span><strong>×${wSpeed.toFixed(2)}</strong></div>
      <div class="bonus-row"><span>稀有</span><strong>+${(wRarity * 100).toFixed(0)}%</strong></div>
    </div>
    <div class="bonus-group"><span class="bonus-group-title">⛏️ 采矿</span>
      <div class="bonus-row"><span>速度</span><strong>×${mSpeed.toFixed(2)}</strong></div>
      <div class="bonus-row"><span>稀有</span><strong>+${(mRarity * 100).toFixed(0)}%</strong></div>
    </div>
    <div class="bonus-group"><span class="bonus-group-title">💰 通用</span>
      <div class="bonus-row"><span>金币</span><strong>+${(gold * 100).toFixed(0)}%</strong></div>
      <div class="bonus-row"><span>经验</span><strong>+${(xp * 100).toFixed(0)}%</strong></div>
    </div>`;
}

/* ---------- 渲染制作/装备列表 ---------- */
function renderCraftList() {
  const slot = currentCraftTab;
  const list = EQUIPMENT()[slot] || [];
  const slotDef = EQUIP_SLOTS().find((s) => s.key === slot);
  let html = '';

  list.forEach((eq) => {
    // 掉落物类装备可从 equip 背包或 loot 背包中装备
    const isLoot = slotDef?.source === 'loot';
    const owned = hasEquip(eq.id) || (isLoot && (state.inventory.loot?.[eq.id] || 0) > 0);
    const equipped = state.equipped[slot] === eq.id;
    const canMake = eq.recipe ? canCraft(eq) : false;

    let recipeHtml = '';
    if (eq.recipe) {
      const mats = Object.keys(eq.recipe).map((matId) => {
        const need = eq.recipe[matId];
        // 材料可能在 wood/ore/fish 分类(护符类装备用鱼制作)
        const have = (state.inventory.wood[matId] || 0) + (state.inventory.ore[matId] || 0) + (state.inventory.fish[matId] || 0);
        const matName = getMatName(matId);
        const ok = have >= need;
        return `<span class="${ok ? 'mat-ok' : 'mat-no'}" title="出自:${getItemSourceText(matId)}">${matName} ${have}/${need}</span>`;
      }).join(' · ');
      recipeHtml = `<div class="craft-item-recipe">材料: ${mats}</div>`;
    }

    let actionsHtml = '';
    if (equipped) {
      actionsHtml = `<button class="btn btn-ghost" disabled>已装备</button>`;
    } else if (owned) {
      actionsHtml = `<button class="btn btn-primary" data-action="equip" data-id="${eq.id}">装备</button>`;
    } else if (isLoot) {
      actionsHtml = `<button class="btn btn-ghost" disabled>钓鱼掉落获得</button>`;
    } else if (canMake) {
      actionsHtml = `<button class="btn btn-primary" data-action="craft" data-id="${eq.id}">制作</button>`;
    } else {
      actionsHtml = `<button class="btn btn-ghost" disabled>材料不足</button>`;
    }

    html += `
      <div class="craft-item ${equipped ? 'equipped' : ''} ${owned ? 'activated' : ''} ${!owned && !canMake && !isLoot ? 'locked' : ''}">
        <span class="craft-item-icon">${eq.icon}</span>
        <div class="craft-item-body">
          <div class="craft-item-name">${eq.name}${owned ? ` <span class="activated-badge">已激活</span>` : ''}</div>
          <div class="craft-item-bonus">${formatEquipBonus(slot, eq)}</div>
          ${recipeHtml}
        </div>
        <div class="craft-item-actions">${actionsHtml}</div>
      </div>`;
  });

  equipEls.craftList.innerHTML = html;

  // 绑定制作/装备事件
  equipEls.craftList.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'craft') {
        if (craftEquip(slot, id)) {
          const eq = getEquipById(slot, id);
          showToast(`制作成功:${eq.name}`, eq.icon);
          saveState();
          renderEquipment();
          renderCharacter();
        }
      } else if (action === 'equip') {
        if (equipItem(slot, id)) {
          const eq = getEquipById(slot, id);
          showToast(`已装备:${eq.name}`, eq.icon);
          saveState();
          renderEquipment();
          renderCharacter();
        }
      }
    });
  });
}

/* ---------- 获取材料名称(木材/矿石/鱼类) ---------- */
function getMatName(matId) {
  const all = [
    ...WOODCUTTING_SPOTS().flatMap((s) => s.drops),
    ...MINING_SPOTS().flatMap((s) => s.drops),
    ...getAllFishList(),
  ];
  const m = all.find((d) => d.id === matId);
  return m ? `${m.icon} ${m.name}` : matId;
}

/* ---------- 渲染出售杂物列表 ---------- */
function renderSellList() {
  let html = '';
  let hasJunk = false;
  SELLABLE_LOOT().forEach((id) => {
    const count = state.inventory.loot[id] || 0;
    if (count > 0) {
      hasJunk = true;
      const loot = FISHING_LOOT().find((l) => l.id === id);
      if (!loot) return;
      html += `
        <div class="sell-item">
          <span class="sell-item-icon">${loot.icon}</span>
          <span class="sell-item-name">${loot.name}</span>
          <span class="sell-item-count">×${count}</span>
          <span class="sell-item-value">${count * loot.gold}🪙</span>
        </div>`;
    }
  });
  if (!hasJunk) {
    html = '<div class="sell-empty">背包中没有杂物可出售</div>';
  }
  equipEls.sellList.innerHTML = html;
}

/* ---------- 整体渲染装备页 ---------- */
function renderEquipment() {
  renderEquippedGrid();
  renderBonusSummary();
  renderCraftList();
  renderSellList();
}

/* ---------- 初始化装备页交互 ---------- */
function initEquipment() {
  // 制作台标签切换(动态生成,适配8槽位)
  renderCraftTabs();

  // 一键出售杂物
  equipEls.sellAllBtn.addEventListener('click', () => {
    const total = sellJunk();
    if (total > 0) {
      showToast(`出售杂物获得 ${formatNum(total)} 金币`, '🪙');
      saveState();
      renderEquipment();
      renderTopbar();
    } else {
      showToast('没有可出售的杂物', '🗑');
    }
  });
}

/* ---------- 动态生成制作台标签(基于 EQUIP_SLOTS) ---------- */
function renderCraftTabs() {
  equipEls.craftTabs.innerHTML = EQUIP_SLOTS()
    .map((slot) => `<button class="craft-tab ${slot.key === currentCraftTab ? 'active' : ''}" data-slot="${slot.key}">${slot.icon} ${slot.name}</button>`)
    .join('');
  equipEls.craftTabs.querySelectorAll('.craft-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      equipEls.craftTabs.querySelectorAll('.craft-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentCraftTab = tab.dataset.slot;
      renderCraftList();
    });
  });
}
