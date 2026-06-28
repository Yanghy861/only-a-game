/* ============================================================
   烹饪模块:消耗鱼类制作食物,食用获得 buff
   食谱数据见 config/cooking.json(修改数值无需改代码)
   ============================================================ */

const cookEls = {
  recipeList: $('recipeList'),
  foodBag: $('foodBag'),
  activeBuffs: $('cookActiveBuffs'),
};

/* ---------- 渲染食谱列表 ---------- */
function renderRecipes() {
  let html = '';
  COOKING_RECIPES().forEach((r) => {
    const canMake = canCook(r);
    const have = state.inventory.food?.[r.id] || 0;

    // 材料显示
    const mats = Object.keys(r.recipe).map((fishId) => {
      const need = r.recipe[fishId];
      const haveFish = state.inventory.fish[fishId] || 0;
      const fish = getAllFishList().find((f) => f.id === fishId);
      const fishName = fish ? `${fish.icon} ${fish.name}` : fishId;
      const ok = haveFish >= need;
      return `<span class="${ok ? 'mat-ok' : 'mat-no'}" title="出自:${getItemSourceText(fishId)}">${fishName} ${haveFish}/${need}</span>`;
    }).join(' · ');

    // buff 描述
    const buffTypeMap = { xp: '经验', gold: '金币', speed: '速度', rarity: '幸运', all: '全属性' };
    const buffIconMap = { xp: '🧪', gold: '💰', speed: '⚡', rarity: '🍀', all: '🌟' };
    const buffName = buffTypeMap[r.buff.type] || r.buff.type;
    const buffIcon = buffIconMap[r.buff.type] || '✨';
    const durMin = Math.floor(r.duration / 60000);

    html += `
      <div class="cook-item ${canMake ? '' : 'locked'}">
        <span class="cook-item-icon">${r.icon}</span>
        <div class="cook-item-body">
          <div class="cook-item-name">${r.name} ${have > 0 ? `<span class="cook-have">×${have}</span>` : ''}</div>
          <div class="cook-item-buff">${buffIcon} ${buffName}+${(r.buff.value * 100).toFixed(0)}% · ${durMin}分钟</div>
          <div class="cook-item-recipe">材料: ${mats}</div>
        </div>
        <div class="cook-item-actions">
          <button class="btn btn-primary" data-cook="${r.id}" ${canMake ? '' : 'disabled'}>
            ${canMake ? '烹饪' : '材料不足'}
          </button>
          ${have > 0 ? `<button class="btn btn-ghost" data-eat="${r.id}">食用</button>` : ''}
        </div>
      </div>`;
  });
  cookEls.recipeList.innerHTML = html;

  // 绑定烹饪事件
  cookEls.recipeList.querySelectorAll('button[data-cook]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.cook;
      const recipe = getCookingRecipeById(id);
      if (cook(id)) {
        showToast(`烹饪成功:${recipe.name}`, recipe.icon);
        saveState();
        renderCooking();
      } else {
        showToast('材料不足', '✗');
      }
    });
  });

  // 绑定食用事件
  cookEls.recipeList.querySelectorAll('button[data-eat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.eat;
      const recipe = getCookingRecipeById(id);
      if (consumeFood(id)) {
        const buffTypeMap = { xp: '经验', gold: '金币', speed: '速度', rarity: '幸运', all: '全属性' };
        showToast(`食用${recipe.name},${buffTypeMap[recipe.buff.type]}+${(recipe.buff.value * 100).toFixed(0)}% 已生效!`, recipe.icon);
        saveState();
        renderCooking();
        renderTopbar();
        renderWeatherBar();
      }
    });
  });
}

/* ---------- 渲染食物背包 ---------- */
function renderFoodBag() {
  const food = state.inventory.food || {};
  const owned = Object.keys(food).filter((id) => food[id] > 0);
  if (owned.length === 0) {
    cookEls.foodBag.innerHTML = '<div class="cook-empty">尚未制作任何食物,先去烹饪吧!</div>';
    return;
  }
  let html = '';
  owned.forEach((id) => {
    const r = getCookingRecipeById(id);
    if (!r) return;
    html += `
      <div class="food-card" title="${r.name} · ${r.desc}">
        <span class="food-icon">${r.icon}</span>
        <span class="food-name">${r.name}</span>
        <span class="food-count">×${food[id]}</span>
        <button class="btn btn-ghost food-eat-btn" data-eat-bag="${id}">食用</button>
      </div>`;
  });
  cookEls.foodBag.innerHTML = html;

  cookEls.foodBag.querySelectorAll('button[data-eat-bag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.eatBag;
      const recipe = getCookingRecipeById(id);
      if (consumeFood(id)) {
        const buffTypeMap = { xp: '经验', gold: '金币', speed: '速度', rarity: '幸运', all: '全属性' };
        showToast(`食用${recipe.name},${buffTypeMap[recipe.buff.type]}+${(recipe.buff.value * 100).toFixed(0)}% 已生效!`, recipe.icon);
        saveState();
        renderCooking();
        renderTopbar();
        renderWeatherBar();
      }
    });
  });
}

/* ---------- 渲染当前活跃 buff ---------- */
function renderCookBuffs() {
  const now = Date.now();
  const active = state.buffs.filter((b) => b.expireAt > now);
  if (active.length === 0) {
    cookEls.activeBuffs.innerHTML = '<div class="cook-empty">当前无活跃增益</div>';
    return;
  }
  const buffTypeMap = { xp: '经验', gold: '金币', speed: '速度', rarity: '幸运', all: '全属性' };
  const buffIconMap = { xp: '🧪', gold: '💰', speed: '⚡', rarity: '🍀', all: '🌟' };
  let html = '';
  active.forEach((b) => {
    const remain = Math.ceil((b.expireAt - now) / 1000);
    const min = Math.floor(remain / 60);
    const sec = remain % 60;
    html += `
      <div class="cook-buff-chip">
        <span class="cook-buff-icon">${buffIconMap[b.type] || '✨'}</span>
        <span class="cook-buff-name">${buffTypeMap[b.type] || b.type} +${(b.value * 100).toFixed(0)}%</span>
        <span class="cook-buff-time">${min}:${String(sec).padStart(2, '0')}</span>
      </div>`;
  });
  cookEls.activeBuffs.innerHTML = html;
}

/* ---------- 整体渲染烹饪页 ---------- */
function renderCooking() {
  renderRecipes();
  renderFoodBag();
  renderCookBuffs();
}
