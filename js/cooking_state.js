/* ============================================================
   烹饪与食物增益
   ============================================================ */

/* ============================================================
   烹饪系统(消耗鱼制作食物,食用获得 buff)
   ============================================================ */
// 检查鱼类材料是否足够烹饪某食谱
function canCook(recipe) {
  if (!recipe || !recipe.recipe) return false;
  return Object.keys(recipe.recipe).every((fishId) => {
    return (state.inventory.fish[fishId] || 0) >= recipe.recipe[fishId];
  });
}

// 烹饪:消耗鱼类材料,制作食物加入 inventory.food
function cook(recipeId) {
  const recipe = getCookingRecipeById(recipeId);
  if (!recipe || !canCook(recipe)) return false;
  Object.keys(recipe.recipe).forEach((fishId) => {
    const need = recipe.recipe[fishId];
    state.inventory.fish[fishId] = (state.inventory.fish[fishId] || 0) - need;
  });
  addItem('food', recipeId, 1);
  return true;
}

// 食用食物:消耗一份食物,添加对应 buff(复用现有 buff 系统,支持 'all' 全属性类型)
function consumeFood(recipeId) {
  const have = state.inventory.food?.[recipeId] || 0;
  if (have <= 0) return false;
  const recipe = getCookingRecipeById(recipeId);
  if (!recipe || !recipe.buff) return false;
  // 消耗一份食物
  state.inventory.food[recipeId] = have - 1;
  // 添加 buff(同类型叠加时间,与药水逻辑一致)
  const existing = state.buffs.find((b) => b.type === recipe.buff.type);
  if (existing) {
    existing.expireAt = Math.max(existing.expireAt, Date.now()) + recipe.duration;
    existing.value = Math.max(existing.value, recipe.buff.value);
  } else {
    state.buffs.push({
      type: recipe.buff.type,
      value: recipe.buff.value,
      expireAt: Date.now() + recipe.duration,
    });
  }
  return true;
}

