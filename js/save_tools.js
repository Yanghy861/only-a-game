/* ============================================================
   Save management: export, import and recent local backups
   ============================================================ */

const saveEls = {
  exportBtn: $('exportSaveBtn'),
  copyBtn: $('copySaveBtn'),
  importBtn: $('importSaveBtn'),
  importFileBtn: $('importSaveFileBtn'),
  fileInput: $('saveFileInput'),
  backupList: $('saveBackupList'),
  importModal: $('saveImportModal'),
  importText: $('saveImportText'),
  importCancel: $('saveImportCancel'),
  importConfirm: $('saveImportConfirm'),
};

function formatSaveDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSaveSummary(summary = {}) {
  return [
    `角色 Lv.${summary.level || 1}`,
    `金币 ${formatNum(summary.gold || 0)}`,
    `钓鱼 ${summary.fishing || 1}`,
    `伐木 ${summary.woodcutting || 1}`,
    `采矿 ${summary.mining || 1}`,
    `战斗 ${summary.combat || 1}`,
  ].join(' · ');
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSaveFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `only-a-game-save-${stamp}.json`;
}

function renderSaveManager() {
  if (!saveEls.backupList) return;

  const backups = getSaveBackups();
  if (backups.length === 0) {
    saveEls.backupList.innerHTML = `
      <div class="save-empty">
        还没有备份。正常游玩、导入、重置和手动导出后都会自动留下最近记录。
      </div>`;
    return;
  }

  saveEls.backupList.innerHTML = backups.map((backup) => `
    <div class="save-backup-card">
      <div class="save-backup-main">
        <div class="save-backup-title">${backup.label || '本地备份'}</div>
        <div class="save-backup-meta">${formatSaveDate(backup.createdAt)} · ${formatSaveSummary(backup.summary)}</div>
      </div>
      <button class="btn btn-ghost save-restore-btn" data-restore-save="${backup.id}">恢复</button>
    </div>
  `).join('');
}

function exportSaveToFile() {
  saveState();
  downloadTextFile(buildSaveFilename(), exportSaveText());
  renderSaveManager();
  showToast('存档已导出', '💾');
}

async function copySaveToClipboard() {
  saveState();
  const text = exportSaveText();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    renderSaveManager();
    showToast('存档已复制', '📋');
  } catch (e) {
    console.error('复制存档失败', e);
    showToast('复制失败，请改用导出文件', '⚠️');
  }
}

function openImportModal(text = '') {
  if (!saveEls.importModal) return;
  saveEls.importText.value = text;
  saveEls.importModal.classList.add('show');
  saveEls.importText.focus();
}

function closeImportModal() {
  if (!saveEls.importModal) return;
  saveEls.importModal.classList.remove('show');
  saveEls.importText.value = '';
}

function applyImportedSave(text) {
  const summary = importSaveText(text);
  renderAll();
  renderSaveManager();
  showToast(`导入完成 · 角色 Lv.${summary.level}`, '✅');
}

function confirmImportFromText() {
  const text = saveEls.importText.value.trim();
  if (!text) {
    showToast('请先粘贴存档文本', '⚠️');
    return;
  }

  try {
    applyImportedSave(text);
    closeImportModal();
  } catch (e) {
    console.error('导入存档失败', e);
    showToast(`导入失败：${e.message}`, '⚠️');
  }
}

function importSaveFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyImportedSave(String(reader.result || ''));
    } catch (e) {
      console.error('导入存档文件失败', e);
      showToast(`导入失败：${e.message}`, '⚠️');
    } finally {
      saveEls.fileInput.value = '';
    }
  };
  reader.onerror = () => {
    showToast('读取文件失败', '⚠️');
    saveEls.fileInput.value = '';
  };
  reader.readAsText(file);
}

function restoreSaveFromBackup(backupId) {
  if (!confirm('恢复这个备份？当前进度会先自动保存为一份恢复前备份。')) return;

  try {
    const summary = restoreSaveBackup(backupId);
    renderAll();
    renderSaveManager();
    showToast(`已恢复备份 · 角色 Lv.${summary.level}`, '♻️');
  } catch (e) {
    console.error('恢复备份失败', e);
    showToast(`恢复失败：${e.message}`, '⚠️');
  }
}

function initSaveTools() {
  if (!saveEls.exportBtn) return;

  saveEls.exportBtn.addEventListener('click', exportSaveToFile);
  saveEls.copyBtn.addEventListener('click', copySaveToClipboard);
  saveEls.importBtn.addEventListener('click', () => openImportModal());
  saveEls.importFileBtn.addEventListener('click', () => saveEls.fileInput.click());
  saveEls.fileInput.addEventListener('change', () => importSaveFile(saveEls.fileInput.files?.[0]));
  saveEls.importCancel.addEventListener('click', closeImportModal);
  saveEls.importConfirm.addEventListener('click', confirmImportFromText);

  saveEls.importModal.addEventListener('click', (e) => {
    if (e.target === saveEls.importModal) closeImportModal();
  });

  saveEls.backupList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-restore-save]');
    if (!btn) return;
    restoreSaveFromBackup(btn.dataset.restoreSave);
  });

  renderSaveManager();
}
