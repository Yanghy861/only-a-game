/* ============================================================
   配置加载器:异步从 config/ 目录加载所有 JSON 到全局 CONFIG
   修改游戏数据只需编辑 config/*.json,无需改代码
   ============================================================ */

const CONFIG = {};

// 需要加载的配置文件列表
const CONFIG_FILES = {
  game: 'config/game.json',
  fishing: 'config/fishing.json',
  gathering: 'config/gathering.json',
  equipment: 'config/equipment.json',
  cooking: 'config/cooking.json',
  weather: 'config/weather.json',
  shop: 'config/shop.json',
  encyclopedia: 'config/encyclopedia.json',
  combat: 'config/combat.json',
  dungeons: 'config/dungeons.json',
  combatEquipment: 'config/combat_equipment.json',
  combatAreas: 'config/combat_areas.json',
  gems: 'config/gems.json',
  cards: 'config/cards.json',
};

async function loadConfig() {
  const entries = Object.entries(CONFIG_FILES);
  const results = await Promise.all(
    entries.map(async ([key, path]) => {
      try {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return [key, await resp.json()];
      } catch (e) {
        console.error(`配置加载失败: ${path}`, e);
        throw new Error(`无法加载配置文件 ${path},请确保通过 HTTP 服务器运行(非 file:// 协议)`);
      }
    })
  );
  results.forEach(([key, data]) => {
    CONFIG[key] = data;
  });
  console.log('%c✓ 所有配置已加载', 'color:#7a9a5a;font-weight:bold');
  return CONFIG;
}
