/* ============================================================
   设置、天气、商店与永久升级
   ============================================================ */

/* ---------- 10倍速切换(测试用) ---------- */
function toggleSpeed() {
  state.settings.speedMultiplier = state.settings.speedMultiplier === 1 ? 10 : 1;
  return state.settings.speedMultiplier;
}

function getSpeedMultiplier() {
  return state.settings.speedMultiplier || 1;
}

/* ============================================================
   天气与时段系统
   ============================================================ */
function updateWeather() {
  if (Date.now() >= state.weather.changeAt) {
    // 随机切换天气
    const types = WEATHER_TYPES();
    state.weather.current = types[Math.floor(Math.random() * types.length)].id;
    state.weather.changeAt = Date.now() + WEATHER_DURATION_MIN() + Math.random() * (WEATHER_DURATION_MAX() - WEATHER_DURATION_MIN());
  }
}

function updateTime() {
  if (Date.now() >= state.time.changeAt) {
    const order = ['dawn', 'day', 'dusk', 'night'];
    const idx = order.indexOf(state.time.current);
    state.time.current = order[(idx + 1) % order.length];
    state.time.changeAt = Date.now() + TIME_PERIOD_DURATION();
  }
}

// 获取天气对钓鱼速度的影响倍率
function weatherSpeedBonus() {
  return 0;
}

// 天气仅作为氛围展示,不影响钓鱼结果
function weatherRarityBonus() {
  return 0;
}

/* ============================================================
   Buff 系统(药水)
   ============================================================ */
// 获取某类型 buff 的总加成值
// 支持 'all' 类型:查询 'xp'/'gold'/'speed'/'rarity' 时会额外加上 'all' 类型 buff 的值
function getBuffValue(type) {
  const now = Date.now();
  const active = state.buffs.filter((b) => b.expireAt > now);
  if (type === 'all') {
    return active.filter((b) => b.type === 'all').reduce((sum, b) => sum + b.value, 0);
  }
  return active
    .filter((b) => b.type === type || b.type === 'all')
    .reduce((sum, b) => sum + b.value, 0);
}

// 清理过期 buff
function cleanBuffs() {
  const now = Date.now();
  state.buffs = state.buffs.filter((b) => b.expireAt > now);
}

// 购买商店物品
function buyShopItem(itemId) {
  const item = SHOP_ITEMS().find((i) => i.id === itemId);
  if (!item) return { ok: false, msg: '物品不存在' };
  const price = getItemPrice(item);
  if (state.character.gold < price) return { ok: false, msg: '金币不足' };
  state.character.gold -= price;

  if (item.id === 'mystery_box') {
    // 神秘宝箱:随机奖励
    return { ok: true, mystery: openMysteryBox() };
  } else if (item.buff) {
    // 药水:添加 buff(同类型叠加时间)
    const existing = state.buffs.find((b) => b.type === item.buff.type);
    if (existing) {
      existing.expireAt = Math.max(existing.expireAt, Date.now()) + item.duration;
      existing.value = Math.max(existing.value, item.buff.value);
    } else {
      state.buffs.push({
        type: item.buff.type,
        value: item.buff.value,
        expireAt: Date.now() + item.duration,
      });
    }
    return { ok: true, buff: item.buff.type };
  }
  return { ok: false, msg: '未知物品' };
}

// 开神秘宝箱
function openMysteryBox() {
  const roll = Math.random();
  if (roll < 0.4) {
    // 40%:大量金币
    const topLv = Math.max(state.fishing.level, state.woodcutting.level, state.mining.level);
    const gold = Math.floor(2000 * (1 + topLv * 0.5) * (0.5 + Math.random()));
    addGold(gold);
    return { type: 'gold', gold };
  } else if (roll < 0.7) {
    // 30%:随机材料
    const allMats = [
      ...WOODCUTTING_SPOTS().flatMap((s) => s.drops),
      ...MINING_SPOTS().flatMap((s) => s.drops),
    ];
    const mat = allMats[Math.floor(Math.random() * allMats.length)];
    const count = 5 + Math.floor(Math.random() * 10);
    const cat = WOODCUTTING_SPOTS().some((s) => s.drops.some((d) => d.id === mat.id)) ? 'wood' : 'ore';
    addItem(cat, mat.id, count);
    return { type: 'material', mat, count };
  } else if (roll < 0.9) {
    // 20%:随机装备
    const slots = ['rod', 'bait'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const list = EQUIPMENT()[slot];
    const eq = list[Math.floor(Math.random() * list.length)];
    if (eq.recipe) {
      addItem('equip', eq.id, 1);
      return { type: 'equip', eq };
    }
    // 如果是掉落类装备(无 recipe),给金币补偿
    addGold(500);
    return { type: 'gold', gold: 500 };
  } else {
    // 10%:稀有宝物
    const loot = FISHING_LOOT().filter((l) => l.type === 'treasure');
    const t = loot[Math.floor(Math.random() * loot.length)];
    addGold(t.gold * 5);
    addItem('loot', t.id, 1);
    return { type: 'treasure', loot: t };
  }
}

/* ============================================================
   永久升级系统
   ============================================================ */
function buyUpgrade(upgId) {
  const upg = getUpgradeById(upgId);
  if (!upg) return { ok: false, msg: '升级不存在' };
  const lv = state.upgrades[upgId] || 0;
  if (lv >= upg.maxLevel) return { ok: false, msg: '已满级' };
  const cost = getUpgradeCost(upg);
  if (state.character.gold < cost) return { ok: false, msg: '金币不足' };
  state.character.gold -= cost;
  state.upgrades[upgId] = lv + 1;
  return { ok: true, newLevel: lv + 1 };
}

