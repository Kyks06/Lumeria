/** Style de mise en scène d'une attaque. */
export function moveStyle(mv) {
  if (!mv) return 'projectile';
  if (mv.cat === 'St') return 'aura';
  if (mv.ground) return 'quake';
  if (mv.cat === 'P' && !mv.nc) return 'contact';
  if (mv.cat === 'P') return 'area';
  if ((mv.power || 0) >= 95) return 'area';
  if (['lumiere', 'astral', 'glace', 'dragon'].includes(mv.type) && (mv.power || 0) >= 75) return 'beam';
  return 'projectile';
}
