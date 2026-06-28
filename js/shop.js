/* ============================================================
   商店模块:药水购买、神秘宝箱、永久升级
   ============================================================ */

const shopEls = {
  shopGrid: $('shopGrid'),
  upgradeList: $('upgradeList'),
};

/* ---------- 渲染药水商店 ---------- */
function renderShop() {
  let html = '';
  SHOP_ITEMS().forEach((item) => {
    const price = getItemPrice(item);
    const canAfford = state.character.gold >= price;
    html += `
      <div class="shop-item">
        <div class="shop-item-head">
          <span class="shop-item-icon">${item.icon}</span>
          <span class="shop-item-name">${item.name}</span>
        </div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-buy">
          <span class="shop-item-price">${formatNum(price)} 🪙</span>
          <button class="btn btn-primary" data-buy="${item.id}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '购买' : '金币不足'}
          </button>
        </div>
      </div>`;
  });
  shopEls.shopGrid.innerHTML = html;

  // 绑定购买事件
  shopEls.shopGrid.querySelectorAll('button[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.buy;
      const result = buyShopItem(itemId);
      if (result.ok) {
        const item = SHOP_ITEMS().find((i) => i.id === itemId);
        if (result.mystery) {
          // 神秘宝箱结果
          showMysteryResult(result.mystery);
        } else {
          showToast(`${item.name} 已生效!`, item.icon);
        }
        saveState();
        renderShop();
        renderTopbar();
      } else {
        showToast(result.msg, '✗');
      }
    });
  });
}

/* ---------- 显示神秘宝箱结果 ---------- */
function showMysteryResult(mystery) {
  let msg = '';
  let icon = '🎁';
  switch (mystery.type) {
    case 'gold':
      msg = `获得 ${formatNum(mystery.gold)} 金币!`;
      icon = '🪙';
      break;
    case 'material':
      msg = `获得 ${mystery.mat.name} ×${mystery.count}!`;
      icon = mystery.mat.icon;
      break;
    case 'equip':
      msg = `获得装备:${mystery.eq.name}!`;
      icon = mystery.eq.icon;
      break;
    case 'treasure':
      msg = `获得稀有宝物:${mystery.loot.name}!`;
      icon = mystery.loot.icon;
      break;
  }
  showToast(msg, icon);
}

/* ---------- 渲染永久升级 ---------- */
function renderUpgrades() {
  let html = '';
  UPGRADES().forEach((upg) => {
    const lv = state.upgrades[upg.id] || 0;
    const maxed = lv >= upg.maxLevel;
    const cost = getUpgradeCost(upg);
    const canAfford = state.character.gold >= cost;
    const pct = (lv / upg.maxLevel) * 100;
    const currentBonus = (upg.perLevel * lv * 100).toFixed(0);

    html += `
      <div class="upgrade-item ${maxed ? 'maxed' : ''}">
        <span class="upgrade-icon">${upg.icon}</span>
        <div class="upgrade-body">
          <div class="upgrade-name">${upg.name}</div>
          <div class="upgrade-desc">${upg.desc}</div>
          <div class="upgrade-level-bar">
            <span class="upgrade-level-text">Lv.${lv}/${upg.maxLevel}</span>
            <div class="upgrade-progress"><div class="upgrade-progress-fill" style="width:${pct}%"></div></div>
            <span class="upgrade-level-text">+${currentBonus}${upg.id === 'bag_capacity' ? '格' : '%'}</span>
          </div>
        </div>
        ${maxed
          ? '<span class="upgrade-cost" style="color:var(--moss-bright)">已满级</span>'
          : `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <span class="upgrade-cost">${formatNum(cost)} 🪙</span>
              <button class="btn btn-primary" data-upgrade="${upg.id}" ${canAfford ? '' : 'disabled'}>升级</button>
            </div>`}
      </div>`;
  });
  shopEls.upgradeList.innerHTML = html;

  // 绑定升级事件
  shopEls.upgradeList.querySelectorAll('button[data-upgrade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const upgId = btn.dataset.upgrade;
      const result = buyUpgrade(upgId);
      if (result.ok) {
        const upg = getUpgradeById(upgId);
        showToast(`${upg.name} 升级至 Lv.${result.newLevel}!`, upg.icon);
        saveState();
        renderUpgrades();
        renderTopbar();
      } else {
        showToast(result.msg, '✗');
      }
    });
  });
}

/* ---------- 整体渲染商店页 ---------- */
function renderShopPage() {
  renderShop();
  renderUpgrades();
}

/* ---------- 初始化 ---------- */
function initShop() {
  // 渲染由 renderShopPage 触发,无需额外绑定
}
