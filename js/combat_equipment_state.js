/* ============================================================
   战斗装备制作与穿戴
   ============================================================ */

function hasCombatEquip(eqId) {
  return (state.combat.inventory?.[eqId] || 0) > 0;
}

function craftCombatEquip(slot, eqId) {
  const eq = getCombatEquipById(slot, eqId);
  if (!eq || !eq.recipe) return false;
  if (hasCombatEquip(eqId)) return false;
  for (const [matId, need] of Object.entries(eq.recipe)) {
    if (getItemCount(matId) < need) return false;
  }
  for (const [matId, need] of Object.entries(eq.recipe)) {
    consumeItem(matId, need);
  }
  addItem('combat_equip', eqId, 1);
  return true;
}

function getEquippedWeapon() {
  const id = state.combat.equipped?.weapon;
  return id ? getCombatEquipById('weapon', id) : null;
}

function equipCombatEquip(slot, eqId) {
  if (!hasCombatEquip(eqId)) return false;
  const eq = getCombatEquipById(slot, eqId);
  if (!eq) return false;
  if (!state.combat.equipped) state.combat.equipped = {};

  if (slot === 'offhand') {
    const weapon = getEquippedWeapon();
    if (weapon?.twoHanded) return false;
  }

  if (slot === 'weapon' && eq.twoHanded) {
    delete state.combat.equipped.offhand;
  }

  state.combat.equipped[slot] = eqId;
  return true;
}

function unequipCombatEquip(slot) {
  if (!state.combat.equipped) return;
  delete state.combat.equipped[slot];
}
