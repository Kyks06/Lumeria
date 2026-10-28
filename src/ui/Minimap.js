/**
 * MINI-CARTE : vue d'ensemble pixelisée de la carte courante (sol, eau, chemins, bâtiments),
 * centrée sur le joueur, avec PNJ, dresseurs et portes.
 */
export class Minimap {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.ctx = canvas.getContext('2d');
    this.bg = null;
  }

  setMap(map) {
    this.map = map;
    this.bg = map.overview ? map.overview() : null;
  }

  update(map, player) {
    if (map !== this.map) this.setMap(map);
    const cv = this.canvas, ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.round(cv.clientWidth * dpr);
    if (!size) return;
    if (cv.width !== size) { cv.width = size; cv.height = size; }
    ctx.imageSmoothingEnabled = false;
    const [pc, pr] = player.tile(map);
    const z = Math.max(2, Math.round((size / 44) * (map.kind === 'outdoor' ? 1 : 1.3)));
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#0d1322'; ctx.fillRect(0, 0, size, size);
    const ox = Math.round(size / 2 - (pc + 0.5) * z), oy = Math.round(size / 2 - (pr + 0.5) * z);
    if (this.bg) ctx.drawImage(this.bg, ox, oy, this.bg.width * z, this.bg.height * z);
    for (const n of map.npcs) {
      if (!n.group.visible) continue;
      const [c, r] = n.tile(map);
      const def = this.game.trainerDefeated && n.trainer ? this.game.trainerDefeated(n.trainer) : true;
      ctx.fillStyle = n.trainer && !def ? '#ff5a5a' : n.def.creature ? '#ffd23f' : '#f6f0e4';
      ctx.fillRect(ox + c * z, oy + r * z, z, z);
    }
    for (const w of map.warps) {
      const [c, r] = w.tile || map.tileOf(w.x, w.z);
      ctx.fillStyle = '#5fd4ff';
      ctx.fillRect(ox + c * z, oy + r * z, z, z);
    }
    // joueur : flèche pixel orientée
    const X = ox + pc * z, Y = oy + pr * z;
    ctx.fillStyle = '#2a1404';
    ctx.fillRect(X - z, Y - z, z * 3, z * 3);
    ctx.fillStyle = '#ffc65c';
    ctx.fillRect(X - z + 1, Y - z + 1, z * 3 - 2, z * 3 - 2);
    ctx.fillStyle = '#ff5a3d';
    const d = [[0, 1], [-1, 0], [1, 0], [0, -1]][player.dir];
    ctx.fillRect(X + d[0] * z, Y + d[1] * z, z, z);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,207,130,0.9)';
    ctx.font = `${9 * dpr}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('N', size / 2, 11 * dpr);
  }
}
