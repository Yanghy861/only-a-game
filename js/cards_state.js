/* ============================================================
   卡片制作与激活效果
   ============================================================ */

/* ============================================================
   卡片系统:制作与使用
   ============================================================ */

// 制卡经验需求
function cardCraftXpForLevel(level) {
  const c = CARD_CRAFTING();
  return Math.floor(c.baseXp * Math.pow(level, c.xpGrowth));
}

// 增加制卡经验
function addCardCraftXp(amount) {
  const c = state.cards;
  const bonus = 1 + getUpgradeBonus('global_xp') + encyclopediaXpBonus() + getBuffValue('xp');
  const finalXp = Math.floor(amount * bonus);
  c.craftXp += finalXp;
  let leveledUp = false;
  let newLevel = c.craftLevel;
  while (c.craftLevel < 999) {
    const need = cardCraftXpForLevel(c.craftLevel);
    if (c.craftXp >= need) {
      c.craftXp -= need;
      c.craftLevel++;
      leveledUp = true;
      newLevel = c.craftLevel;
    } else break;
  }
  if (leveledUp) recalculateCharacterLevel();
  return { leveledUp, newLevel, gainedXp: finalXp };
}

// 检查能否制作卡片
function canCraftCard(recipe) {
  if (!recipe.recipe) return true;
  for (const [matId, need] of Object.entries(recipe.recipe)) {
    if (getItemCount(matId) < need) return false;
  }
  return true;
}

// 制作卡片
function craftCard(recipeId) {
  const recipe = getCardRecipeById(recipeId);
  if (!recipe) return false;
  if (!canCraftCard(recipe)) return false;
  // 消耗材料
  for (const [matId, need] of Object.entries(recipe.recipe)) {
    consumeItem(matId, need);
  }
  // 添加卡片
  addItem('card', recipeId, 1);
  // 增加制卡经验
  addCardCraftXp(recipe.craftXp || 10);
  return true;
}

// 使用卡片(激活效果,用次数记录)
function useCard(recipeId) {
  const have = state.cards.inventory?.[recipeId] || 0;
  if (have <= 0) return false;
  const recipe = getCardRecipeById(recipeId);
  if (!recipe || !recipe.effect) return false;
  // 消耗一张卡片
  state.cards.inventory[recipeId]--;
  // 激活效果(同类型叠加次数)
  const target = recipe.effect.target;
  if (state.cards.active[target]) {
    // 叠加次数
    state.cards.active[target].charges += recipe.effect.charges;
    state.cards.active[target].value = Math.max(state.cards.active[target].value, recipe.effect.value);
  } else {
    state.cards.active[target] = {
      value: recipe.effect.value,
      charges: recipe.effect.charges,
    };
  }
  return true;
}
