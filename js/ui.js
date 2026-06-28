/* ============================================================
   通用 UI 渲染:顶部状态栏、导航、Toast、弹窗
   ============================================================ */

const $ = (id) => document.getElementById(id);

const els = {
  gold: $('goldValue'),
  fishLevel: $('fishLevelValue'),
  woodLevel: $('woodLevelValue'),
  mineLevel: $('mineLevelValue'),
  cookLevel: $('cookLevelValue'),
  gemLevel: $('gemLevelValue'),
  cardLevel: $('cardLevelValue'),
  combatLevel: $('combatLevelValue'),
  speedBtn: $('speedBtn'),
  weatherInfo: $('weatherInfo'),
  timeInfo: $('timeInfo'),
  buffInfo: $('buffInfo'),
  toastLayer: $('toastLayer'),
  resetModal: $('resetModal'),
};

/* ---------- 顶部状态栏 ---------- */
function renderTopbar() {
  els.gold.textContent = formatNum(state.character.gold);
  els.fishLevel.textContent = state.fishing.level;
  els.woodLevel.textContent = state.woodcutting.level;
  els.mineLevel.textContent = state.mining.level;
  els.cookLevel.textContent = '-';
  els.gemLevel.textContent = state.gemology.level;
  els.cardLevel.textContent = state.cards.craftLevel;
  els.combatLevel.textContent = state.combat.level;
  const mult = getSpeedMultiplier();
  els.speedBtn.textContent = `×${mult}`;
  els.speedBtn.classList.toggle('active', mult > 1);

  // 同步左侧导航等级小标
  document.querySelectorAll('.nav-level[data-skill]').forEach((el) => {
    const skill = el.dataset.skill;
    let lv = '-';
    if (skill === 'fishing') lv = state.fishing.level;
    else if (skill === 'woodcutting') lv = state.woodcutting.level;
    else if (skill === 'mining') lv = state.mining.level;
    else if (skill === 'gemology') lv = state.gemology.level;
    else if (skill === 'cards') lv = state.cards.craftLevel;
    else if (skill === 'combat') lv = state.combat.level;
    el.textContent = lv;
  });
}

/* ---------- 10倍速按钮 ---------- */
function initSpeedBtn() {
  els.speedBtn.addEventListener('click', () => {
    const mult = toggleSpeed();
    renderTopbar();
    showToast(mult > 1 ? `已开启 ${mult} 倍速(测试)` : '已恢复正常速度', mult > 1 ? '⚡' : '✓');
  });
}

/* ---------- 天气时段栏 ---------- */
function renderWeatherBar() {
  const w = getWeatherById(state.weather.current);
  const t = getTimePeriodById(state.time.current);
  els.weatherInfo.textContent = `${w.icon} ${w.name}`;
  els.timeInfo.textContent = `${t.icon} ${t.name}`;

  // 渲染活跃 buff
  const now = Date.now();
  const activeBuffs = state.buffs.filter((b) => b.expireAt > now);
  if (activeBuffs.length === 0) {
    els.buffInfo.innerHTML = '';
  } else {
    const buffIcons = { xp: '🧪', gold: '💰', speed: '⚡', rarity: '🍀', all: '🌟' };
    const buffNames = { xp: '经验', gold: '金币', speed: '速度', rarity: '幸运', all: '全属性' };
    els.buffInfo.innerHTML = activeBuffs
      .map((b) => {
        const remain = Math.ceil((b.expireAt - now) / 1000);
        const min = Math.floor(remain / 60);
        const sec = remain % 60;
        return `<span class="buff-chip">${buffIcons[b.type] || '✨'} ${buffNames[b.type] || b.type} +${(b.value * 100).toFixed(0)}% ${min}:${String(sec).padStart(2, '0')}</span>`;
      })
      .join('');
  }
}

/* ---------- 导航切换 ---------- */
let currentTab = 'fishing';

function initNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      const tab = item.dataset.tab;
      currentTab = tab;
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      $(`page-${tab}`).classList.add('active');
      // 切换时刷新对应页面
      if (tab === 'character') renderCharacter();
      if (tab === 'woodcutting') renderGathering('woodcutting');
      if (tab === 'mining') renderGathering('mining');
      if (tab === 'fishing') renderFishing();
      if (tab === 'equipment') renderEquipment();
      if (tab === 'shop') renderShopPage();
      if (tab === 'encyclopedia') renderEncyclopedia();
      if (tab === 'cooking') renderCooking();
      if (tab === 'combat') renderCombat();
      if (tab === 'combat_equip') renderCombatEquipment();
      if (tab === 'gems') renderGemology();
      if (tab === 'cards') renderCards();
      if (tab === 'inventory') renderInventory();
    });
  });
}

/* ---------- Toast 提示 ---------- */
function showToast(text, icon = '✦') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${text}</span>`;
  els.toastLayer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ---------- 重置弹窗 ---------- */
function initResetModal() {
  $('resetBtn').addEventListener('click', () => {
    els.resetModal.classList.add('show');
  });
  $('resetCancel').addEventListener('click', () => {
    els.resetModal.classList.remove('show');
  });
  $('resetConfirm').addEventListener('click', () => {
    resetState();
    els.resetModal.classList.remove('show');
    renderAll();
    showToast('存档已重置', '↺');
  });
  els.resetModal.addEventListener('click', (e) => {
    if (e.target === els.resetModal) els.resetModal.classList.remove('show');
  });
}

/* ---------- 数字格式化 ---------- */
function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return Math.floor(n).toString();
}

/* ---------- 时间格式化 ---------- */
function formatTime(ms) {
  const s = ms / 1000;
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return `${m}m ${rs}s`;
  }
  return s.toFixed(1) + 's';
}

/* ---------- 全量刷新 ---------- */
function renderAll() {
  renderTopbar();
  renderWeatherBar();
  renderFishing();
  renderAllGathering();
  renderEquipment();
  renderShopPage();
  renderEncyclopedia();
  renderCharacter();
  renderCooking();
  renderCombat();
  renderCombatEquipment();
  renderGemology();
  renderCards();
  renderInventory();
}
