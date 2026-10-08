/**
 * The candle easter egg from the original site: tap the candle, it blows out
 * and a small burst of sprinkles pops. Skipped entirely with reduced motion.
 */
import { prefersReducedMotion } from '../lib/motion';

export function initCandle(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-candle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.add('is-out');
      const rect = btn.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 3);
      window.setTimeout(() => btn.classList.remove('is-out'), 1400);
    });
  });
}

function burst(x: number, y: number): void {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '999' });
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.remove();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#C58D61', '#E9B8AB', '#FFF5E8', '#633325', '#EBD8C1'];
  const parts = Array.from({ length: 64 }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 2 + Math.random() * 5;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, len: 4 + Math.random() * 6, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.3, color: colors[(Math.random() * colors.length) | 0]!, life: 1 };
  });
  const start = performance.now();
  const frame = (t: number) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of parts) {
      p.vy += 0.08;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      p.life -= 0.012;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.len / 2, -1.25, p.len, 2.5);
      ctx.restore();
    }
    if (t - start < 2000) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
