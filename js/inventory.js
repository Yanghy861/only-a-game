/* ============================================================
   统一背包模块:查看所有物品(材料/装备/消耗品)
   装备为激活型(制作一次永久拥有),消耗品可堆叠
   ============================================================ */

const invEls = {
  tabs: $('invTabs'),
  grid: $('invGrid'),
  count: $('invCount'),
};

let currentInvTab = 'all';

/* ---------- 收集所有拥有的物品 ---------- */
function collectAllItems() {
  const items = [];

  // 材料:鱼类
  const fishInv = state.inventory.fish || {};
  const seenFish = new Set();
  getAllFishList().forEach((f) => {
    if (seenFish.has(f.id)) return;
    seenFish.add(f.id);
    if (fishInv[f.id] > 0) {
      items.push({ icon: f.icon, name: f.name, id: f.id, count: fishInv[f.id], category: 'material', subCat: 'fish' });
    }
  });

  // 材料去重：同一 ID 只显示一次（多个地点掉落同一材料时）
  const seenMats = new Set();

  // 材料:木材
  const woodInv = state.inventory.wood || {};
  WOODCUTTING_SPOTS().flatMap((s) => s.drops).forEach((d) => {
    if (seenMats.has(d.id)) return;
    if (woodInv[d.id] > 0) {
      seenMats.add(d.id);
      items.push({ icon: d.icon, name: d.name, id: d.id, count: woodInv[d.id], category: 'material', subCat: 'wood' });
    }
  });

  // 材料:矿石
  const oreInv = state.inventory.ore || {};
  MINING_SPOTS().flatMap((s) => s.drops).forEach((d) => {
    if (seenMats.has(d.id)) return;
    if (oreInv[d.id] > 0) {
      seenMats.add(d.id);
      items.push({ icon: d.icon, name: d.name, id: d.id, count: oreInv[d.id], category: 'material', subCat: 'ore' });
    }
  });

  // 材料:掉落物(钓鱼杂物 + 怪物掉落)
  const lootInv = state.inventory.loot || {};
  FISHING_LOOT().forEach((l) => {
    if (seenMats.has(l.id)) return;
    if (lootInv[l.id] > 0) {
      seenMats.add(l.id);
      items.push({ icon: l.icon, name: l.name, id: l.id, count: lootInv[l.id], category: 'material', subCat: 'loot' });
    }
  });
  MONSTER_DROPS().forEach((d) => {
    if (seenMats.has(d.id)) return;
    if (lootInv[d.id] > 0) {
      seenMats.add(d.id);
      items.push({ icon: d.icon, name: d.name, id: d.id, count: lootInv[d.id], category: 'material', subCat: 'loot' });
    }
  });

  // 材料:宝石原石
  const roughInv = state.inventory.gem_rough || {};
  GEM_TYPES().forEach((g) => {
    if (seenMats.has(g.roughId)) return;
    if (roughInv[g.roughId] > 0) {
      seenMats.add(g.roughId);
      items.push({ icon: g.icon, name: `${g.name}原石`, id: g.roughId, count: roughInv[g.roughId], category: 'material', subCat: 'gem_rough' });
    }
  });

  // 材料:切割宝石
  const gemInv = state.inventory.gem || {};
  GEM_TYPES().forEach((g) => {
    if (seenMats.has(g.id)) return;
    if (gemInv[g.id] > 0) {
      seenMats.add(g.id);
      items.push({ icon: g.icon, name: g.name, id: g.id, count: gemInv[g.id], category: 'material', subCat: 'gem' });
    }
  });

  // 消耗品:食物(可堆叠)
  const foodInv = state.inventory.food || {};
  COOKING_RECIPES().forEach((r) => {
    if (foodInv[r.id] > 0) {
      items.push({ icon: r.icon, name: r.name, id: r.id, count: foodInv[r.id], category: 'consumable', subCat: 'food' });
    }
  });

  // 消耗品:卡片(可堆叠,按次数消耗)
  const cardInv = state.cards.inventory || {};
  CARD_RECIPES().forEach((r) => {
    if (cardInv[r.id] > 0) {
      items.push({ icon: r.icon, name: r.name, id: r.id, count: cardInv[r.id], category: 'consumable', subCat: 'card' });
    }
  });

  return items;
}

/* ---------- 渲染背包 ---------- */
function renderInventory() {
  const allItems = collectAllItems();
  let items = allItems;
  if (currentInvTab === 'material') {
    items = allItems.filter((i) => i.category === 'material');
  } else if (currentInvTab === 'consumable') {
    items = allItems.filter((i) => i.category === 'consumable');
  }

  invEls.count.textContent = `${allItems.length} 种物品`;

  if (items.length === 0) {
    invEls.grid.innerHTML = '<div class="log-empty">背包空空如也,去采集和制作吧!</div>';
    return;
  }

  const subCatNames = {
    fish: '🐟 鱼类', wood: '🪵 木材', ore: '💎 矿石', loot: '🎒 掉落',
    gem_rough: '🪨 原石', gem: '💎 宝石',
  };

  let html = '';
  items.forEach((item) => {
    let tag = '';
    if (item.category === 'consumable') {
      const tagClass = item.subCat === 'card' ? 'card' : 'food';
      const tagName = item.subCat === 'card' ? '🃏 卡片' : '🍳 食物';
      tag = `<span class="inv-tag ${tagClass}">${tagName}</span>`;
    } else if (item.category === 'material') {
      tag = `<span class="inv-tag material">${subCatNames[item.subCat] || '材料'}</span>`;
    }

    const countText = `<span class="inv-count">×${item.count}</span>`;

    html += `
      <div class="inv-slot" title="${item.name}&#10;出自:${getItemSourceText(item.id)}">
        <span class="inv-icon">${item.icon}</span>
        <div class="inv-info">
          <span class="inv-name">${item.name}</span>
          ${tag}
        </div>
        ${countText}
      </div>`;
  });
  invEls.grid.innerHTML = html;
}

/* ---------- 背包标签切换 ---------- */
function initInventoryTabs() {
  invEls.tabs.querySelectorAll('.inv-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      invEls.tabs.querySelectorAll('.inv-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentInvTab = tab.dataset.inv;
      renderInventory();
    });
  });
}
