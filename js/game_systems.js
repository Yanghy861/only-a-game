/* ============================================================
   Game system orchestration

   main.js should own boot/save/timing only. Feature modules keep their
   gameplay logic, and this file wires those modules into the shared loop.
   ============================================================ */

function isPageActive(tabId) {
  return !!$(`page-${tabId}`)?.classList.contains('active');
}

function advanceProgressLoop(progressOwner, options) {
  if (!options.isActive()) return;
  const duration = options.getDuration();
  if (!duration || duration <= 0) return;

  progressOwner[options.progressKey || 'progress'] += options.dt / duration;
  let cycles = 0;
  while (progressOwner[options.progressKey || 'progress'] >= 1 && cycles < MAX_COMPLETIONS_PER_TICK) {
    progressOwner[options.progressKey || 'progress'] -= 1;
    options.complete();
    cycles++;
  }
  if (progressOwner[options.progressKey || 'progress'] >= 1) {
    progressOwner[options.progressKey || 'progress'] = 0.999;
  }
}

function tickFishingSystem(dt) {
  advanceProgressLoop(state.fishing, {
    dt,
    isActive: () => state.fishing.isFishing,
    getDuration: () => fishingDurationWithGear(getSpotById(state.fishing.currentSpotId)),
    complete: completeFishing,
  });
}

function tickGatherSystem(skill, dt) {
  const cfg = GATHER_CONFIGS[skill];
  const skillState = state[cfg.stateKey];
  advanceProgressLoop(skillState, {
    dt,
    isActive: () => skillState[cfg.activeFlag],
    getDuration: () => cfg.durationWithGear(cfg.getSpot(skillState.currentSpotId)),
    complete: () => completeGathering(skill),
  });
}

function tickLegacyEndlessSystem(dt) {
  if (typeof tickEndlessBattle !== 'function') {
    state.combat.endless.isAuto = false;
    return;
  }
  advanceProgressLoop(state.combat.endless, {
    dt,
    isActive: () => !state.combat.activeBattle && state.combat.endless.isAuto,
    getDuration: () => COMBAT_CONFIG().autoTickMs,
    complete: tickEndlessBattle,
  });
}

function tickGemologySystem(dt) {
  const s = state.gemology;
  if (!s.isWorking) return;

  if (s.mode === 'gather') {
    advanceProgressLoop(s, {
      dt,
      isActive: () => s.isWorking,
      getDuration: () => gemDuration(getGemSpotById(s.currentSpotId)),
      complete: completeGemology,
    });
    return;
  }

  if (s.mode !== 'cut') return;
  if (!s.cutTarget) {
    s.progress = 0;
    return;
  }

  advanceProgressLoop(s, {
    dt,
    isActive: () => s.isWorking && s.mode === 'cut' && !!s.cutTarget,
    getDuration: () => GEM_CUT_DURATION(s.cutTarget),
    complete: () => {
      const result = cutGem(s.cutTarget);
      if (!result.ok) {
        s.cutTarget = null;
        s.progress = 0;
        return;
      }
      if (result.success) {
        showToast(`切割成功!获得${result.gem.name}`, result.gem.icon);
      } else if (result.returned) {
        showToast('切割失败,但回收了原石', '💎');
      } else {
        showToast('切割失败,原石碎裂', '💥');
      }
      if ((state.inventory.gem_rough?.[s.cutTarget] || 0) <= 0) {
        s.cutTarget = null;
        s.mode = 'gather';
        s.progress = 0;
        showToast('原石已耗尽,自动返回采集模式', '💎');
      }
      renderGemology();
      renderTopbar();
    },
  });
}

function tickAreaCombatSystem(dt) {
  if (!state.combat.isAutoArea) return;
  const monster = ensureAreaEncounter();
  if (!monster) return;

  advanceProgressLoop(state.combat, {
    dt,
    progressKey: 'areaProgress',
    isActive: () => state.combat.isAutoArea,
    getDuration: () => getAreaBattleDuration(monster),
    complete: completeAreaMonsterKill,
  });
}

const GAME_TICK_SYSTEMS = [
  {
    id: 'world',
    tick: () => {
      updateWeather();
      updateTime();
      cleanBuffs();
    },
  },
  { id: 'fishing', tick: tickFishingSystem },
  { id: 'woodcutting', tick: (dt) => tickGatherSystem('woodcutting', dt) },
  { id: 'mining', tick: (dt) => tickGatherSystem('mining', dt) },
  { id: 'legacyEndlessCombat', tick: tickLegacyEndlessSystem },
  { id: 'gemology', tick: tickGemologySystem },
  { id: 'areaCombat', tick: tickAreaCombatSystem },
  { id: 'cards', tick: () => tickCardsAuto() },
];

function tickGameSystems(dt) {
  GAME_TICK_SYSTEMS.forEach((system) => system.tick(dt));
}

function renderTimedSystems() {
  renderTopbar();
  renderWeatherBar();
  renderFishingProgress();
  renderGatherProgress(GATHER_CONFIGS.woodcutting, gatherEls.woodcutting);
  renderGatherProgress(GATHER_CONFIGS.mining, gatherEls.mining);

  if (isPageActive('fishing')) renderCatchLog();
  if (isPageActive('woodcutting')) renderGatherLog(GATHER_CONFIGS.woodcutting, gatherEls.woodcutting);
  if (isPageActive('mining')) renderGatherLog(GATHER_CONFIGS.mining, gatherEls.mining);
  if (isPageActive('character')) renderCharacter();
  if (isPageActive('cooking')) renderCookBuffs();
  if (isPageActive('combat')) renderCombat();
  if (isPageActive('gems')) {
    renderGemProgress();
    renderGemMode();
  }
  if (isPageActive('cards')) renderCardActive();
}

function initializeGameSystems() {
  [
    initNav,
    initResetModal,
    initSpeedBtn,
    initFishingToggle,
    initGatherToggles,
    initBagTabs,
    initEquipment,
    initShop,
    initEndlessToggle,
    initGemology,
    initInventoryTabs,
    initVisibilityHandler,
  ].forEach((initFn) => initFn());
}
