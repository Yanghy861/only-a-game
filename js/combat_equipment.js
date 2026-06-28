/* ============================================================
   战斗装备页面:制作、装备、卸下
   ============================================================ */

const combatEquipEls = {
  equippedGrid: $('combatEquippedGrid'),
  craftTabs: $('combatEquipCraftTabs'),
  craftList: $('combatEquipCraftList'),
};

let currentCombatCraftTab = 'weapon';

function renderCombatEquippedGrid() {
  let html = '';
  COMBAT_EQUIP_SLOTS().forEach((slot) => {
    const eqId = state.combat.equipped?.[slot.key];
    const eq = eqId ? getCombatEquipById(slot.key, eqId) : null;
    if (eq) {
      html += `
        <div class="combat-equip-slot has-item" data-slot="${slot.key}" title="点击卸下">
          <span class="ces-icon">${eq.icon}</span>
          <div class="ces-body">
            <div class="ces-name">${eq.name}</div>
            <div class="ces-type">${slot.name}${eq.twoHanded ? ' · 双手' : ''}</div>
            <div class="ces-bonus">${formatCombatEquipBonus(eq)}</div>
          </div>
        </div>`;
    } else {
      const locked = slot.key === 'offhand' && getEquippedWeapon()?.twoHanded;
      html += `
        <div class="combat-equip-slot empty ${locked ? 'locked' : ''}">
          <span class="ces-icon">${slot.icon}</span>
          <div class="ces-body">
            <div class="ces-name">${slot.name}</div>
            <div class="ces-empty-label">${locked ? '双手武器占用' : '未装备'}</div>
          </div>
        </div>`;
    }
  });
  combatEquipEls.equippedGrid.innerHTML = html;

  combatEquipEls.equippedGrid.querySelectorAll('.combat-equip-slot[data-slot]').forEach((card) => {
    card.addEventListener('click', () => {
      const slotKey = card.dataset.slot;
      const slotDef = COMBAT_EQUIP_SLOTS().find((s) => s.key === slotKey);
      unequipCombatEquip(slotKey);
      saveState();
      renderCombatEquipment();
      renderCombat();
      showToast(`已卸下${slotDef?.name || ''}`, '↩');
    });
  });
}

function formatCombatEquipBonus(eq) {
  const parts = [];
  if (eq.atk) parts.push(`攻+${eq.atk}`);
  if (eq.def) parts.push(`防+${eq.def}`);
  if (eq.hp) parts.push(`生命+${eq.hp}`);
  if (eq.spd) parts.push(`速度+${eq.spd}`);
  if (eq.crit) parts.push(`暴击+${(eq.crit * 100).toFixed(0)}%`);
  if (eq.critDmg) parts.push(`暴伤+${(eq.critDmg * 100).toFixed(0)}%`);
  if (eq.twoHanded) parts.push('双手');
  return parts.join(' ') || '无加成';
}

function renderCombatCraftList() {
  const slot = currentCombatCraftTab;
  const list = COMBAT_EQUIPMENT()[slot] || [];
  let html = '';

  list.forEach((eq) => {
    const owned = hasCombatEquip(eq.id);
    const equipped = state.combat.equipped?.[slot] === eq.id;
    const canMake = eq.recipe ? checkRecipeMaterials(eq.recipe) : false;
    const offhandBlocked = slot === 'offhand' && getEquippedWeapon()?.twoHanded;

    let recipeHtml = '';
    if (eq.recipe) {
      const mats = Object.keys(eq.recipe).map((matId) => {
        const need = eq.recipe[matId];
        const have = getItemCount(matId);
        const matName = getCombatMatName(matId);
        const ok = have >= need;
        return `<span class="${ok ? 'mat-ok' : 'mat-no'}" title="来源:${getItemSourceText(matId)}">${matName} ${have}/${need}</span>`;
      }).join(' · ');
      recipeHtml = `<div class="ce-recipe">材料: ${mats}</div>`;
    }

    let actionsHtml = '';
    if (equipped) {
      actionsHtml = `<button class="btn btn-ghost" disabled>已装备</button>`;
    } else if (owned && offhandBlocked) {
      actionsHtml = `<button class="btn btn-ghost" disabled>副手被双手武器占用</button>`;
    } else if (owned) {
      actionsHtml = `<button class="btn btn-primary" data-action="equip" data-id="${eq.id}">装备</button>`;
    } else if (eq.bossDrop) {
      const boss = getManualDungeonById(eq.bossDrop);
      actionsHtml = `<button class="btn btn-ghost" disabled>击败${boss?.name || 'Boss'}获得</button>`;
    } else if (canMake) {
      actionsHtml = `<button class="btn btn-primary" data-action="craft" data-id="${eq.id}">制作</button>`;
    } else {
      actionsHtml = `<button class="btn btn-ghost" disabled>材料不足</button>`;
    }

    html += `
      <div class="ce-item ${equipped ? 'equipped' : ''} ${owned ? 'activated' : ''}">
        <span class="ce-icon">${eq.icon}</span>
        <div class="ce-body">
          <div class="ce-name">${eq.name}${owned ? ` <span class="activated-badge">已拥有</span>` : ''}</div>
          <div class="ce-bonus">${formatCombatEquipBonus(eq)}</div>
          ${eq.desc ? `<div class="ce-desc">${eq.desc}</div>` : ''}
          ${recipeHtml}
        </div>
        <div class="ce-actions">${actionsHtml}</div>
      </div>`;
  });

  combatEquipEls.craftList.innerHTML = html;

  combatEquipEls.craftList.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'craft') {
        if (craftCombatEquip(slot, id)) {
          const eq = getCombatEquipById(slot, id);
          showToast(`制作成功:${eq.name}`, eq.icon);
          saveState();
          renderCombatEquipment();
          renderCombat();
        } else {
          showToast('材料不足', '⚠️');
        }
      } else if (action === 'equip') {
        if (equipCombatEquip(slot, id)) {
          const eq = getCombatEquipById(slot, id);
          showToast(`已装备:${eq.name}`, eq.icon);
          saveState();
          renderCombatEquipment();
          renderCombat();
        } else {
          showToast('当前装备组合不可用', '⚠️');
        }
      }
    });
  });
}

function checkRecipeMaterials(recipe) {
  return Object.entries(recipe).every(([matId, need]) => getItemCount(matId) >= need);
}

function getCombatMatName(matId) {
  const drop = getMonsterDropInfo(matId);
  if (drop) return `${drop.icon} ${drop.name}`;
  const wood = WOODCUTTING_SPOTS().flatMap((s) => s.drops).find((d) => d.id === matId);
  if (wood) return `${wood.icon} ${wood.name}`;
  const ore = MINING_SPOTS().flatMap((s) => s.drops).find((d) => d.id === matId);
  if (ore) return `${ore.icon} ${ore.name}`;
  const fish = getAllFishList().find((f) => f.id === matId);
  if (fish) return `${fish.icon} ${fish.name}`;
  const gem = GEM_TYPES().find((g) => g.id === matId);
  if (gem) return `${gem.icon} ${gem.name}`;
  const rough = GEM_TYPES().find((g) => g.roughId === matId);
  if (rough) return `${rough.icon} ${rough.name}原石`;
  return matId;
}

function renderCombatCraftTabs() {
  combatEquipEls.craftTabs.innerHTML = COMBAT_EQUIP_SLOTS()
    .map((slot) => `<button class="ce-tab ${slot.key === currentCombatCraftTab ? 'active' : ''}" data-slot="${slot.key}">${slot.icon} ${slot.name}</button>`)
    .join('');
  combatEquipEls.craftTabs.querySelectorAll('.ce-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentCombatCraftTab = tab.dataset.slot;
      renderCombatCraftTabs();
      renderCombatCraftList();
    });
  });
}

function renderCombatEquipment() {
  if (!COMBAT_EQUIP_SLOTS().some((s) => s.key === currentCombatCraftTab)) {
    currentCombatCraftTab = COMBAT_EQUIP_SLOTS()[0]?.key || 'weapon';
  }
  renderCombatEquippedGrid();
  renderCombatCraftTabs();
  renderCombatCraftList();
}
