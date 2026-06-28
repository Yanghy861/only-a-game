/* ============================================================
   卡片模块:制作消耗品卡片,使用获得"次数"加成(不用时间)
   数据见 config/cards.json
   ============================================================ */

const cardEls = {
  craftList: $('cardCraftList'),
  bag: $('cardBag'),
  active: $('cardActive'),
  craftLevel: $('cardCraftLevel'),
};

/* ---------- 渲染制卡台 ---------- */
function renderCardCraftList() {
  // 显示制卡等级
  const c = state.cards;
  const need = cardCraftXpForLevel(c.craftLevel);
  const xpPct = need > 0 ? Math.min(100, (c.craftXp / need) * 100) : 100;
  cardEls.craftLevel.innerHTML = `
    <div class="card-craft-header">
      <span class="card-craft-level">🃏 制卡 Lv.${c.craftLevel}</span>
      <span class="card-craft-xp">${c.craftXp.toFixed(0)} / ${need} XP</span>
    </div>
    <div class="card-craft-xp-bar"><div class="card-craft-xp-fill" style="width:${xpPct}%"></div></div>`;

  let html = '';
  CARD_RECIPES().forEach((r) => {
    const canMake = canCraftCard(r);
    const have = state.cards.inventory?.[r.id] || 0;
    const typeName = CARD_TYPES()[r.type] || r.type;

    // 材料显示
    const mats = Object.keys(r.recipe).map((matId) => {
      const need = r.recipe[matId];
      const haveMat = getItemCount(matId);
      const matName = getCombatMatName(matId);
      const ok = haveMat >= need;
      return `<span class="${ok ? 'mat-ok' : 'mat-no'}" title="出自:${getItemSourceText(matId)}">${matName} ${haveMat}/${need}</span>`;
    }).join(' · ');

    // 效果描述
    const chargesText = r.effect.charges > 1 ? `${r.effect.charges}次` : '1次';

    html += `
      <div class="card-item ${canMake ? '' : 'locked'}">
        <span class="card-item-icon">${r.icon}</span>
        <div class="card-item-body">
          <div class="card-item-name">${r.name} ${have > 0 ? `<span class="card-have">×${have}</span>` : ''}</div>
          <div class="card-item-type">${typeName}</div>
          <div class="card-item-desc">${r.desc}</div>
          <div class="card-item-effect">效果: ${chargesText} · ${getCardEffectText(r.effect)}</div>
          <div class="card-item-recipe">材料: ${mats}</div>
        </div>
        <div class="card-item-actions">
          <button class="btn btn-primary" data-craft="${r.id}" ${canMake ? '' : 'disabled'}>
            ${canMake ? '制作' : '不足'}
          </button>
          ${have > 0 ? `<button class="btn btn-ghost" data-use="${r.id}">使用</button>` : ''}
        </div>
      </div>`;
  });
  cardEls.craftList.innerHTML = html;

  // 绑定制作事件
  cardEls.craftList.querySelectorAll('button[data-craft]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.craft;
      if (craftCard(id)) {
        const r = getCardRecipeById(id);
        showToast(`制作成功:${r.name}`, r.icon);
        saveState();
        renderCards();
      } else {
        showToast('材料不足', '✗');
      }
    });
  });

  // 绑定使用事件
  cardEls.craftList.querySelectorAll('button[data-use]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.use;
      if (useCard(id)) {
        const r = getCardRecipeById(id);
        showToast(`使用${r.name}!${r.effect.charges}次加成已激活`, r.icon);
        saveState();
        renderCards();
      }
    });
  });
}

/* ---------- 获取卡片效果文本 ---------- */
function getCardEffectText(effect) {
  const targetMap = {
    combat_atk: '战斗攻击',
    combat_def: '战斗防御',
    combat_crit: '战斗暴击',
    combat_all: '战斗全属性',
    fishing_rarity: '钓鱼稀有',
    fishing_gold: '钓鱼金币',
    wood_yield: '伐木产出',
    mine_yield: '采矿产出',
    gem_rarity: '宝石稀有',
    global_xp: '全局经验',
    global_gold: '全局金币',
  };
  const name = targetMap[effect.target] || effect.target;
  return `${name}+${(effect.value * 100).toFixed(0)}%`;
}

/* ---------- 渲染卡片背包 ---------- */
function renderCardBag() {
  const inv = state.cards.inventory || {};
  const owned = Object.keys(inv).filter((id) => inv[id] > 0);
  if (owned.length === 0) {
    cardEls.bag.innerHTML = '<div class="log-empty">尚未制作任何卡片</div>';
    return;
  }
  let html = '';
  owned.forEach((id) => {
    const r = getCardRecipeById(id);
    if (!r) return;
    html += `
      <div class="card-bag-item">
        <span class="card-bag-icon">${r.icon}</span>
        <div class="card-bag-body">
          <div class="card-bag-name">${r.name}</div>
          <div class="card-bag-desc">${r.desc}</div>
        </div>
        <span class="card-bag-count">×${inv[id]}</span>
        <button class="btn btn-ghost card-bag-use" data-use-bag="${id}">使用</button>
      </div>`;
  });
  cardEls.bag.innerHTML = html;

  cardEls.bag.querySelectorAll('button[data-use-bag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.useBag;
      if (useCard(id)) {
        const r = getCardRecipeById(id);
        showToast(`使用${r.name}!${r.effect.charges}次加成已激活`, r.icon);
        saveState();
        renderCards();
      }
    });
  });
}

/* ---------- 渲染激活的卡片效果 ---------- */
function renderCardActive() {
  const active = state.cards.active || {};
  const keys = Object.keys(active).filter((k) => active[k].charges > 0);
  if (keys.length === 0) {
    cardEls.active.innerHTML = '<div class="log-empty">当前无激活的卡片效果</div>';
    return;
  }
  let html = '';
  keys.forEach((target) => {
    const card = active[target];
    const targetMap = {
      combat_atk: '战斗攻击',
      combat_def: '战斗防御',
      combat_crit: '战斗暴击',
      combat_all: '战斗全属性',
      fishing_rarity: '钓鱼稀有',
      fishing_gold: '钓鱼金币',
      wood_yield: '伐木产出',
      mine_yield: '采矿产出',
      gem_rarity: '宝石稀有',
      global_xp: '全局经验',
      global_gold: '全局金币',
    };
    const iconMap = {
      combat_atk: '⚔️', combat_def: '🛡️', combat_crit: '🎯', combat_all: '🌟',
      fishing_rarity: '🍀', fishing_gold: '💰', wood_yield: '🪓', mine_yield: '⛏️',
      gem_rarity: '💎', global_xp: '⭐', global_gold: '🪙',
    };
    html += `
      <div class="card-active-chip">
        <span class="card-active-icon">${iconMap[target] || '🃏'}</span>
        <span class="card-active-name">${targetMap[target] || target} +${(card.value * 100).toFixed(0)}%</span>
        <span class="card-active-charges">剩余${card.charges}次</span>
      </div>`;
  });
  cardEls.active.innerHTML = html;
}

/* ---------- 整体渲染卡片页 ---------- */
function renderCards() {
  renderCardCraftList();
  renderCardBag();
  renderCardActive();
}

/* ---------- 卡片自动制作与使用 ---------- */
function tickCardsAuto() {
  const c = state.cards;
  if (!c) return;
  // 自动制作:有材料就制作,优先制作没有库存/未激活的卡片
  CARD_RECIPES().forEach((r) => {
    const active = c.active?.[r.effect.target];
    const have = c.inventory?.[r.id] || 0;
    if (active && active.charges > 0 && have > 0) return; // 已激活且有余货,不急
    if (canCraftCard(r)) {
      craftCard(r.id);
    }
  });
  // 自动使用:当对应类型没有激活效果或次数耗尽时使用
  CARD_RECIPES().forEach((r) => {
    const active = c.active?.[r.effect.target];
    const have = c.inventory?.[r.id] || 0;
    if (have <= 0) return;
    if (!active || active.charges <= 0) {
      useCard(r.id);
    }
  });
}
