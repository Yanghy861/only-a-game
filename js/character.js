/* ============================================================
   人物模块:角色信息、三技能属性面板、分区背包
   ============================================================ */

const charEls = {
  name: $('charName'),
  level: $('heroLevel'),
  gold: $('heroGold'),
  xpFill: $('heroXpFill'),
  xpText: $('heroXpText'),
  attrsList: $('attrsList'),
  bagGrid: $('bagGrid'),
  bagCount: $('bagCount'),
  bagTabs: $('bagTabs'),
  equippedSlots: $('charEquippedSlots'),
};

// 当前选中的背包分类
let currentBagTab = 'fish';

/* ---------- 渲染角色信息卡 ---------- */
function renderCharHero() {
  charEls.name.textContent = state.character.name;
  charEls.level.textContent = state.character.level;
  charEls.gold.textContent = formatNum(state.character.gold);

  // 角色经验条显示最高技能的经验进度
  const skills = ['fishing', 'woodcutting', 'mining'];
  let topSkill = 'fishing';
  skills.forEach((s) => {
    if (state[s].level > state[topSkill].level) topSkill = s;
  });
  const need = xpForLevel(state[topSkill].level);
  const pct = need > 0 ? Math.min(100, (state[topSkill].xp / need) * 100) : 100;
  charEls.xpFill.style.width = pct + '%';
  charEls.xpText.textContent =
    state[topSkill].level >= MAX_LEVEL()
      ? '已满级'
      : `${state[topSkill].xp.toFixed(0)} / ${need} XP`;

  const titleEl = document.querySelector('.hero-title');
  if (titleEl) titleEl.textContent = getTitleByLevel(state.fishing.level);
}

/* ---------- 渲染属性面板(三项技能) ---------- */
function renderAttrs() {
  const skills = [
    { key: 'fishing', icon: '🎣', name: '钓鱼', spots: () => FISHING_SPOTS() },
    { key: 'woodcutting', icon: '🪓', name: '伐木', spots: () => WOODCUTTING_SPOTS() },
    { key: 'mining', icon: '⛏️', name: '采矿', spots: () => MINING_SPOTS() },
  ];

  let html = '';
  skills.forEach((sk) => {
    const s = state[sk.key];
    const need = xpForLevel(s.level);
    const xpPct = need > 0 ? Math.min(100, (s.xp / need) * 100) : 100;
    const speed = skillSpeedMultiplier(sk.key);
    const speedPct = Math.min(100, ((speed - 1) / 0.5) * 100);
    const spotList = sk.spots();
    const unlocked = spotList.filter((sp) => s.level >= sp.requiredLevel).length;

    html += `
      <div class="attr-row">
        <span class="attr-icon">${sk.icon}</span>
        <div class="attr-body">
          <div class="attr-name">${sk.name} · Lv.${s.level}</div>
          <div class="attr-desc">速度 ×${speed.toFixed(2)} · 已解锁 ${unlocked}/${spotList.length} 个地点</div>
          <div class="attr-bar"><div class="attr-bar-fill" style="width:${xpPct}%"></div></div>
        </div>
        <span class="attr-val">${s.level >= MAX_LEVEL() ? 'MAX' : `${s.xp.toFixed(0)}/${need}`}</span>
      </div>`;
  });

  charEls.attrsList.innerHTML = html;
}

/* ---------- 渲染背包(分区) ---------- */
function renderBag() {
  const inv = state.inventory[currentBagTab] || {};
  const ownedIds = Object.keys(inv).filter((id) => inv[id] > 0);

  // 收集所有该分类下已拥有的物品信息
  const items = [];
  const seen = new Set();
  const sources = [
    ...FISHING_SPOTS().flatMap((s) => s.fish.map((f) => ({ ...f, cat: 'fish' }))),
    ...FISHING_LOOT().map((l) => ({ ...l, cat: 'loot' })),
    ...WOODCUTTING_SPOTS().flatMap((s) => s.drops.map((d) => ({ ...d, cat: 'wood' }))),
    ...MINING_SPOTS().flatMap((s) => s.drops.map((d) => ({ ...d, cat: 'ore' }))),
  ];

  sources.forEach((item) => {
    if (item.cat === currentBagTab && inv[item.id] > 0 && !seen.has(item.id)) {
      items.push(item);
      seen.add(item.id);
    }
  });

  charEls.bagCount.textContent = `${ownedIds.length} 种物品`;

  const totalSlots = Math.max(8, Math.ceil(items.length / 4) * 4);
  let html = '';
  for (let i = 0; i < totalSlots; i++) {
    const item = items[i];
    if (item) {
      const reward = item.xp ? `+${item.xp}xp` : '';
      html += `
        <div class="bag-slot has-item" title="${item.name} ${reward} +${item.gold}🪙">
          <span class="bag-slot-icon">${item.icon}</span>
          <span class="bag-slot-name">${item.name}</span>
          <span class="bag-slot-count">${inv[item.id]}</span>
        </div>`;
    } else {
      html += `<div class="bag-slot empty"></div>`;
    }
  }
  charEls.bagGrid.innerHTML = html;
}

/* ---------- 背包标签切换 ---------- */
function initBagTabs() {
  charEls.bagTabs.querySelectorAll('.bag-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      charEls.bagTabs.querySelectorAll('.bag-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentBagTab = tab.dataset.bag;
      renderBag();
    });
  });
}

/* ---------- 渲染人物页装备槽(8槽位) ---------- */
function renderCharEquipped() {
  let html = '';
  EQUIP_SLOTS().forEach((slot) => {
    const eqId = state.equipped[slot.key];
    const eq = eqId ? getEquipById(slot.key, eqId) : null;
    if (eq) {
      html += `
        <div class="equip-slot has-item" title="${eq.name} · ${formatEquipBonus(slot.key, eq)}">
          <span class="slot-icon">${eq.icon}</span>
          <span class="slot-name">${slot.name}</span>
          <span class="slot-lock">${eq.name}</span>
        </div>`;
    } else {
      html += `
        <div class="equip-slot locked">
          <span class="slot-icon">${slot.icon}</span>
          <span class="slot-name">${slot.name}</span>
          <span class="slot-lock">空</span>
        </div>`;
    }
  });
  charEls.equippedSlots.innerHTML = html;
}

/* ---------- 整体渲染人物页 ---------- */
function renderCharacter() {
  renderCharHero();
  renderAttrs();
  renderBag();
  renderCharEquipped();
}
