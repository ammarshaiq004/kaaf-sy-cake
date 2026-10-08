/**
 * Cake Studio controller: owns the design state, keeps the form, preview,
 * progress and summary in sync, and builds the WhatsApp order at the end.
 */
import { CakeRenderer } from '../cake/renderer';
import { SliceView } from '../cake/slice';
import { motifPath } from '../cake/motifs';
import { BAKERY, FLAVORS, MAX_REFERENCES, OCCASIONS, SIZES, type DecorationId } from '../data/bakery';
import { earliestDate, formatDate } from '../lib/dates';
import { $, escapeHtml } from '../lib/dom';
import { animate, EASE, prefersReducedMotion } from '../lib/motion';
import { buildDesignMessage, waLink } from '../lib/whatsapp';
import {
  EMPTY_DESIGN,
  STEPS,
  decorationAvailability,
  firstIncompleteStep,
  frostingAvailability,
  label,
  normalize,
  resolveColors,
  sizesFor,
  stepError,
  themeLabel,
  type Design,
  type StepId,
} from './design';
import { clearSaved, loadSaved, saveProgress } from './persist';
import { describeDesign, designToSpec } from './spec';
import { stepsHtml } from './templates';

interface Reference {
  file: File;
  url: string;
}

export function initStudio(): void {
  const root = $('[data-studio]');
  const form = $('[data-form]', root) as HTMLFormElement;
  form.innerHTML = stepsHtml();

  const stage = $('[data-stage]', root);
  const cakeHost = $('[data-cake]', root);
  const sliceFig = $('[data-slice]', root);
  const sliceCaption = $('[data-slice-caption]', root);
  const previewNote = $('[data-preview-note]', root);
  const motifs = $('[data-motifs]', root);
  const summary = $('[data-summary]', root);
  const stepLabel = $('[data-step-label]', root);
  const progress = $('[data-progress]', root);
  const dots = $('[data-step-dots]', root);
  const backBtn = $('[data-back]', root) as HTMLButtonElement;
  const nextBtn = $('[data-next]', root) as HTMLButtonElement;
  const errorEl = $('[data-error]', root);
  const resumeBanner = $('[data-resume-banner]', root);
  const changeNotice = $('[data-change-notice]', root);
  const savedEl = $('[data-saved]', root);

  const renderer = new CakeRenderer(cakeHost, { interactive: true, angle: 0.18, label: 'Concept preview of your cake' });
  const slice = new SliceView($('[data-slice-art]', root));

  let design: Design = { ...EMPTY_DESIGN };
  let step = 0;
  let references: Reference[] = [];
  let showErrors = false;
  let lastOccasion: string | null = null;
  let completedOnce = false;

  /* ---------------- Restore and pre-fill ---------------- */
  const params = new URLSearchParams(window.location.search);
  const prefill = readPrefill(params);
  const saved = loadSaved();
  if (saved && (saved.design.occasion || saved.design.shape || saved.design.flavor)) {
    design = saved.design;
    step = Math.min(saved.step, firstIncompleteStep(design));
    if (!prefill) resumeBanner.hidden = false;
  }
  if (prefill) design = { ...design, ...prefill };
  design = normalize(design).design;

  /* ---------------- Step dots ---------------- */
  dots.innerHTML = STEPS.map(
    (s, i) => `<li><button type="button" class="step-dot" data-goto="${i}"><span class="step-dot__n" aria-hidden="true">${i + 1}</span><span class="step-dot__label">${escapeHtml(s.short)}</span></button></li>`,
  ).join('');

  /* ---------------- Form → state ---------------- */
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.name || t.type === 'file') return;
    if (t.name === 'decorations') {
      const id = t.value as DecorationId;
      const next = t.checked ? [...design.decorations, id] : design.decorations.filter((x) => x !== id);
      update({ decorations: next }, t);
      return;
    }
    if (t.type === 'radio') {
      update({ [t.name]: t.value } as Partial<Design>, t);
      return;
    }
    update({ [t.name]: t.value } as Partial<Design>);
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type === 'radio' || t.type === 'checkbox' || t.type === 'file' || !t.name) return;
    update({ [t.name]: t.value } as Partial<Design>);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go(step + 1);
  });
  form.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && t instanceof HTMLInputElement && t.type !== 'checkbox' && t.type !== 'radio') {
      e.preventDefault();
      go(step + 1);
    }
  });
  form.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((b) =>
    b.addEventListener('click', () => {
      const input = form.elements.namedItem('message') as HTMLInputElement;
      input.value = b.dataset.example ?? '';
      update({ message: input.value });
      input.focus();
    }),
  );

  /* ---------------- Navigation ---------------- */
  backBtn.addEventListener('click', () => go(step - 1));
  nextBtn.addEventListener('click', () => go(step + 1));
  dots.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-goto]');
    if (b && !b.disabled) go(Number(b.dataset.goto), { force: true });
  });
  root.querySelectorAll('[data-start-fresh]').forEach((b) =>
    b.addEventListener('click', () => {
      clearSaved();
      references.forEach((r) => URL.revokeObjectURL(r.url));
      references = [];
      design = { ...EMPTY_DESIGN };
      resumeBanner.hidden = true;
      completedOnce = false;
      go(0, { force: true });
      sync({ instant: false });
      renderReferences();
    }),
  );

  root.querySelectorAll<HTMLButtonElement>('[data-rotate]').forEach((b) =>
    b.addEventListener('click', () => {
      const dir = Number(b.dataset.rotate);
      const from = renderer.getAngle();
      const to = from + dir * (Math.PI / 4);
      if (prefersReducedMotion()) return renderer.setAngle(to);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 450);
        renderer.setAngle(from + (to - from) * (1 - (1 - t) ** 3));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }),
  );

  /* ---------------- References ---------------- */
  const refInput = form.querySelector<HTMLInputElement>('[data-ref-input]')!;
  const drop = form.querySelector<HTMLElement>('[data-drop]')!;
  const refError = form.querySelector<HTMLElement>('[data-ref-error]')!;
  const addFiles = (files: FileList | File[]) => {
    refError.textContent = '';
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        refError.textContent = `${file.name} isn't an image, so it wasn't added.`;
        continue;
      }
      if (references.length >= MAX_REFERENCES) {
        refError.textContent = `You can add up to ${MAX_REFERENCES} photos.`;
        break;
      }
      references.push({ file, url: URL.createObjectURL(file) });
    }
    renderReferences();
    sync();
  };
  refInput.addEventListener('change', () => {
    if (refInput.files) addFiles(refInput.files);
    refInput.value = '';
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('is-over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  });
  form.querySelector('[data-ref-gallery]')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-remove-ref]');
    if (!b) return;
    const i = Number(b.dataset.removeRef);
    const [r] = references.splice(i, 1);
    if (r) URL.revokeObjectURL(r.url);
    renderReferences();
    sync();
    (form.querySelector<HTMLElement>('[data-ref-gallery] button') ?? form.querySelector<HTMLElement>('.ref-drop__label'))?.focus();
  });

  function renderReferences(): void {
    const gallery = form.querySelector<HTMLElement>('[data-ref-gallery]')!;
    gallery.innerHTML = references
      .map(
        (r, i) => `<li class="ref-thumb"><img src="${r.url}" alt="Your reference photo ${i + 1}: ${escapeHtml(r.file.name)}" /><span class="ref-thumb__tag">Your reference</span><button type="button" class="ref-thumb__remove" data-remove-ref="${i}" aria-label="Remove reference photo ${i + 1}">×</button></li>`,
      )
      .join('');
  }

  /* ---------------- Send ---------------- */
  const sendLink = form.querySelector<HTMLAnchorElement>('[data-wa-send]')!;
  const sendStatus = form.querySelector<HTMLElement>('[data-send-status]')!;
  sendLink.addEventListener('click', () => {
    sendStatus.textContent = 'WhatsApp is opening with your design. Your order is not confirmed yet: we will reply to confirm availability and price.';
    saveProgress(design, step);
  });
  form.querySelector('[data-copy]')!.addEventListener('click', async () => {
    const text = buildDesignMessage(design, references.length);
    try {
      await navigator.clipboard.writeText(text);
      sendStatus.textContent = 'Message copied. Paste it into a WhatsApp chat with 0310 7666604.';
    } catch {
      const pre = form.querySelector<HTMLElement>('[data-wa-text]')!;
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      sendStatus.textContent = 'Select and copy the message above.';
    }
  });

  /* ---------------- Core update loop ---------------- */
  function update(patch: Partial<Design>, source?: HTMLElement): void {
    const prev = design;
    const { design: next, removed } = normalize({ ...design, ...patch });
    design = next;
    if (removed.length) {
      changeNotice.innerHTML = removed.map(escapeHtml).join('<br />');
      changeNotice.hidden = false;
    } else if (!changeNotice.hidden && ('size' in patch || 'shape' in patch || 'frosting' in patch || 'decorations' in patch)) {
      changeNotice.hidden = true;
    }
    if (source) flyToPreview(source);
    if (patch.flavor && patch.flavor !== prev.flavor) revealSlice(true);
    sync();
    scheduleSave();
  }

  let saveTimer = 0;
  function scheduleSave(): void {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveProgress(design, step);
      savedEl.hidden = false;
    }, 300);
  }

  function sync({ instant = false } = {}): void {
    syncForm();
    syncAvailability();
    syncConditional();
    renderer.update(designToSpec(design), { instant });
    renderer.setLabel(describeDesign(design));
    syncAtmosphere();
    syncSlice();
    syncSummary();
    syncNav();
    if (STEPS[step]?.id === 'review') renderReview();
    if (STEPS[step]?.id === 'send') renderSend();
  }

  function syncForm(): void {
    for (const el of Array.from(form.elements) as HTMLInputElement[]) {
      if (!el.name || el.type === 'file') continue;
      const value = (design as unknown as Record<string, unknown>)[el.name];
      if (el.type === 'radio') el.checked = value === el.value;
      else if (el.type === 'checkbox') el.checked = Array.isArray(value) && value.includes(el.value);
      else if (document.activeElement !== el && typeof value === 'string' && el.value !== value) el.value = value;
    }
    form.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => {
      const v = (design as unknown as Record<string, string>)[c.dataset.count!] ?? '';
      c.textContent = String(v.length);
    });
    const dot = form.querySelector<HTMLElement>('[data-custom-dot]');
    if (dot) dot.style.background = design.customColor;
    const dateInput = form.elements.namedItem('date') as HTMLInputElement | null;
    if (dateInput) {
      const min = earliestDate(new Date(), BAKERY.leadTimeDays);
      dateInput.min = min;
      const hint = form.querySelector<HTMLElement>('[data-date-hint]');
      if (hint) hint.textContent = `We need at least ${BAKERY.leadTimeDays} days, so the earliest date is ${formatDate(min)}. For anything sooner, message us and we'll check.`;
    }
  }

  function syncAvailability(): void {
    // Sizes: only those this shape can be baked in.
    const allowed = sizesFor(design.shape);
    form.querySelectorAll<HTMLElement>('[data-size]').forEach((seg) => {
      const ok = allowed.includes(seg.dataset.size as never);
      seg.hidden = !ok;
      (seg.querySelector('input') as HTMLInputElement).disabled = !ok;
    });
    const hint = form.querySelector<HTMLElement>('[data-size-hint]')!;
    hint.textContent = design.shape ? (design.shape === 'custom' ? 'Final size depends on the shape; we will confirm it with you.' : 'Final sizing is confirmed with you on WhatsApp.') : 'Choose a shape to see its sizes.';

    const setReason = (name: string, value: string, ok: boolean, reason?: string) => {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
      const r = form.querySelector<HTMLElement>(`[data-reason="${name}:${value}"]`);
      if (input) {
        input.disabled = !ok;
        input.closest('label')?.classList.toggle('is-unavailable', !ok);
      }
      if (r) {
        r.hidden = ok;
        r.textContent = ok ? '' : (reason ?? '');
      }
    };
    form.querySelectorAll<HTMLInputElement>('input[name="frosting"]').forEach((i) => {
      const a = frostingAvailability(i.value as never, design);
      setReason('frosting', i.value, a.ok, a.reason);
    });
    form.querySelectorAll<HTMLInputElement>('input[name="decorations"]').forEach((i) => {
      const id = i.value as DecorationId;
      const a = design.decorations.includes(id) ? { ok: true } : decorationAvailability(id, design);
      setReason('decorations', id, a.ok, a.reason);
    });
  }

  function syncConditional(): void {
    form.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => {
      const rule = el.dataset.when!;
      let on = false;
      if (rule.includes('~')) {
        const [k, v] = rule.split('~') as [string, string];
        on = ((design as unknown as Record<string, unknown>)[k] as string[]).includes(v);
      } else {
        const [k, v] = rule.split('=') as [string, string];
        on = (design as unknown as Record<string, unknown>)[k] === v;
      }
      if (el.hidden === on) {
        el.hidden = !on;
        if (on) animate(el, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE.out });
      }
    });
    previewNote.hidden = design.shape !== 'custom';
    previewNote.textContent = design.shape === 'custom' ? `Custom shape${design.shapeOther.trim() ? `: ${design.shapeOther.trim()}` : ''}. Shown here as round; we will plan your shape together.` : '';
  }

  function syncAtmosphere(): void {
    const occ = OCCASIONS.find((o) => o.id === design.occasion);
    const atmo = occ?.atmosphere ?? { light: '#FFF1DC', glow: '#F4C99A', motif: 'none' as const };
    stage.style.setProperty('--stage-light', atmo.light);
    stage.style.setProperty('--stage-glow', atmo.glow);
    if (lastOccasion === (design.occasion ?? null)) return;
    lastOccasion = design.occasion ?? null;
    const old = motifs.querySelector('.motif-layer');
    if (old) {
      const a = animate(old, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: EASE.out });
      if (a) a.onfinish = () => old.remove();
      else old.remove();
    }
    if (atmo.motif === 'none') return;
    const layer = document.createElement('div');
    layer.className = 'motif-layer';
    const spots = [
      [8, 12, 0.9, -12],
      [22, 30, 0.6, 18],
      [84, 10, 0.8, 10],
      [72, 26, 0.55, -20],
      [92, 40, 0.65, 6],
      [6, 44, 0.5, 24],
      [48, 6, 0.5, -6],
    ];
    layer.innerHTML = spots
      .map(([x, y, s, r]) => `<svg viewBox="-14 -14 28 28" style="left:${x}%;top:${y}%;--s:${s};--r:${r}deg"><path d="${motifPath(atmo.motif)}"/></svg>`)
      .join('');
    motifs.append(layer);
    layer.querySelectorAll('svg').forEach((svg, i) => {
      animate(svg, [{ opacity: 0, transform: 'translateY(14px) scale(calc(var(--s) * .6)) rotate(var(--r))' }, { opacity: 1, transform: 'translateY(0) scale(var(--s)) rotate(var(--r))' }], {
        duration: 900,
        delay: 60 * i,
        easing: EASE.out,
      });
    });
  }

  function syncSlice(): void {
    const id = STEPS[step]?.id;
    const show = !!design.flavor && (id === 'flavor' || id === 'frosting');
    if (show !== !sliceFig.hidden) {
      sliceFig.hidden = !show;
      if (show) animate(sliceFig, [{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE.out });
    }
    const flavor = FLAVORS.find((f) => f.id === design.flavor);
    if (flavor) {
      slice.set(flavor, design.frosting ? resolveColors(design).coat : '#F1DFC2', { animated: false });
      sliceCaption.innerHTML = `<strong>${escapeHtml(flavor.label)}</strong><span>${escapeHtml(flavor.description)}</span>`;
    }
  }

  function revealSlice(animated: boolean): void {
    const flavor = FLAVORS.find((f) => f.id === design.flavor);
    if (!flavor) return;
    slice.set(flavor, design.frosting ? resolveColors(design).coat : '#F1DFC2', { animated });
  }

  function syncSummary(): void {
    const items: [string, string][] = [];
    if (design.occasion) items.push(['Occasion', design.occasion === 'other' ? design.occasionOther || 'Other' : label.occasion(design.occasion)]);
    if (design.shape) items.push(['Shape', label.shape(design.shape)]);
    if (design.size) items.push(['Size', label.size(design.size)]);
    if (design.flavor) items.push(['Flavor', label.flavor(design.flavor)]);
    if (design.frosting) items.push(['Frosting', label.frosting(design.frosting)]);
    if (design.palette) items.push(['Colour', design.palette === 'custom' ? 'Custom' : label.palette(design.palette)]);
    if (design.decorations.length) items.push(['Decor', design.decorations.map(label.decoration).join(', ')]);
    if (design.message.trim()) items.push(['Message', `“${design.message.trim()}”`]);
    if (references.length) items.push(['Photos', String(references.length)]);
    summary.innerHTML = items.length
      ? items.map(([k, v]) => `<li class="summary-chip"><span>${k}</span>${escapeHtml(v)}</li>`).join('')
      : '<li class="summary-chip summary-chip--empty">Your choices will appear here</li>';
  }

  function syncNav(): void {
    const s = STEPS[step]!;
    const maxReach = firstIncompleteStep(design);
    stepLabel.textContent = `Step ${step + 1} of ${STEPS.length}: ${s.short}`;
    progress.style.transform = `scaleX(${(step + 1) / STEPS.length})`;
    dots.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((b, i) => {
      b.disabled = i > maxReach && i > step;
      b.classList.toggle('is-done', i < step || (i !== step && stepError(STEPS[i]!.id, design) === null && i <= maxReach));
      if (i === step) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.setAttribute('aria-label', `Step ${i + 1}: ${STEPS[i]!.short}${i === step ? ' (current)' : ''}`);
    });
    backBtn.hidden = step === 0;
    const isLast = s.id === 'send';
    nextBtn.hidden = isLast;
    const err = stepError(s.id, design);
    const empty = s.id === 'decorations' ? !design.decorations.length : s.id === 'message' ? !design.message.trim() : s.id === 'references' ? !references.length : false;
    nextBtn.textContent = s.optional && empty ? 'Skip' : s.id === 'review' ? 'Continue to WhatsApp' : 'Next';
    nextBtn.classList.toggle('is-waiting', !!err);
    errorEl.textContent = showErrors && err ? err : '';
  }

  function go(target: number, { force = false } = {}): void {
    if (target < 0 || target >= STEPS.length) return;
    if (target > step && !force) {
      const err = stepError(STEPS[step]!.id, design);
      if (err) {
        showErrors = true;
        syncNav();
        markInvalid(STEPS[step]!.id);
        return;
      }
    }
    if (force && target > firstIncompleteStep(design) && target > step) return;
    showErrors = false;
    const from = step;
    step = target;
    form.querySelectorAll<HTMLElement>('[data-step]').forEach((el, i) => {
      el.hidden = i !== step;
    });
    const panel = form.querySelector<HTMLElement>(`[data-step="${STEPS[step]!.id}"]`)!;
    animate(panel, [{ opacity: 0, transform: `translateX(${target >= from ? 18 : -18}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE.out });
    changeNotice.hidden = true;
    sync();
    scheduleSave();
    // Move focus to the new step's heading so keyboard and screen-reader
    // users land at the top of the new content.
    if (from !== target) {
      const heading = panel.querySelector<HTMLElement>('.step__title');
      heading?.focus({ preventScroll: true });
      const top = root.querySelector('.studio__panel')!.getBoundingClientRect().top + window.scrollY - 80;
      if (window.innerWidth < 900 || window.scrollY > top) window.scrollTo({ top: Math.max(0, window.innerWidth < 900 ? top - stageHeight() : top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    const id = STEPS[step]!.id;
    if (id === 'flavor') revealSlice(false);
    if (id === 'review' && !completedOnce) {
      completedOnce = true;
      window.setTimeout(() => void renderer.orbit(), 250);
    } else if (id === 'review' || id === 'send') {
      renderer.sparkle();
    } else {
      renderer.resetAngle();
    }
  }

  function stageHeight(): number {
    const pv = root.querySelector<HTMLElement>('.studio__preview');
    return pv && getComputedStyle(pv).position === 'sticky' ? pv.offsetHeight : 0;
  }

  function markInvalid(id: StepId): void {
    const panel = form.querySelector<HTMLElement>(`[data-step="${id}"]`);
    if (!panel) return;
    const target =
      (id === 'review' && !design.date ? panel.querySelector<HTMLElement>('#date') : null) ??
      (id === 'review' && design.fulfilment === 'delivery' && !design.deliveryArea.trim() ? panel.querySelector<HTMLElement>('#deliveryArea') : null) ??
      panel.querySelector<HTMLElement>('[data-when]:not([hidden]) input:not([type=hidden])') ??
      (id === 'shape' && design.shape && !design.size ? panel.querySelector<HTMLElement>('[data-sizes] input:not(:disabled)') : null) ??
      panel.querySelector<HTMLElement>('input:not(:disabled)');
    target?.focus();
    animate(errorEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-in-out' });
  }

  function renderReview(): void {
    const dl = form.querySelector<HTMLElement>('[data-review]')!;
    const rows: [string, string, StepId][] = [
      ['Occasion', design.occasion === 'other' ? `Other: ${design.occasionOther}` : label.occasion(design.occasion), 'occasion'],
      ['Shape', design.shape === 'custom' ? `Custom: ${design.shapeOther}` : label.shape(design.shape), 'shape'],
      ['Size', label.size(design.size), 'shape'],
      ['Flavor', label.flavor(design.flavor), 'flavor'],
      ['Frosting', label.frosting(design.frosting), 'frosting'],
      ['Colours', themeLabel(design), 'color'],
      ['Decorations', design.decorations.length ? design.decorations.map(label.decoration).join(', ') + (design.topperName ? ` (topper: ${design.topperName})` : '') : 'None', 'decorations'],
      ['Message', design.message.trim() ? `“${design.message.trim()}”` : 'None', 'message'],
      ['Reference photos', references.length ? `${references.length} photo${references.length === 1 ? '' : 's'} to attach in WhatsApp` : 'None', 'references'],
    ];
    dl.innerHTML = rows
      .map(([k, v, s]) => `<div class="review-row"><dt>${k}</dt><dd>${escapeHtml(v || '—')}</dd><button type="button" class="link-btn" data-edit="${s}" aria-label="Edit ${k.toLowerCase()}">Edit</button></div>`)
      .join('');
    dl.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((b) => b.addEventListener('click', () => go(STEPS.findIndex((s) => s.id === b.dataset.edit), { force: true })));
  }

  function renderSend(): void {
    const text = buildDesignMessage(design, references.length);
    form.querySelector<HTMLElement>('[data-wa-text]')!.textContent = text;
    sendLink.href = waLink(text);
    const reminder = form.querySelector<HTMLElement>('[data-ref-reminder]')!;
    reminder.hidden = references.length === 0;
    const count = form.querySelector<HTMLElement>('[data-ref-count]');
    if (count) count.textContent = `${references.length} photo${references.length === 1 ? '' : 's'}`;
  }

  /** Shared-element feel: the chosen option's swatch travels into the cake. */
  let flying: HTMLElement | null = null;
  function flyToPreview(source: HTMLElement): void {
    if (prefersReducedMotion()) return;
    const swatch = source.closest('label')?.querySelector<HTMLElement>('[data-fly]');
    if (!swatch) return;
    flying?.remove();
    const from = swatch.getBoundingClientRect();
    const to = cakeHost.getBoundingClientRect();
    if (!from.width || to.bottom < 0 || to.top > window.innerHeight) return;
    const clone = swatch.cloneNode(true) as HTMLElement;
    clone.classList.add('fly-clone');
    Object.assign(clone.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.append(clone);
    flying = clone;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height * 0.55 - (from.top + from.height / 2);
    const a = clone.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 40}px) scale(.8)`, opacity: 0.9, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 },
      ],
      { duration: 620, easing: 'cubic-bezier(.4,0,.2,1)' },
    );
    a.onfinish = () => {
      clone.remove();
      if (flying === clone) flying = null;
    };
  }

  /* ---------------- First paint ---------------- */
  form.querySelectorAll<HTMLElement>('[data-step]').forEach((el, i) => (el.hidden = i !== step));
  renderReferences();
  sync({ instant: true });
  if (STEPS[step]?.id === 'flavor') revealSlice(false);
}

function readPrefill(params: URLSearchParams): Partial<Design> | null {
  const out: Partial<Design> = {};
  const shape = params.get('shape');
  if (shape === 'round' || shape === 'square' || shape === 'heart') out.shape = shape;
  const size = params.get('size');
  if (size && size in SIZES) out.size = size as Design['size'];
  const frosting = params.get('frosting');
  if (frosting && ['cream', 'buttercream', 'fondant', 'buttercream-fondant', 'fudge'].includes(frosting)) out.frosting = frosting as Design['frosting'];
  const flavor = params.get('flavor');
  if (flavor && FLAVORS.some((f) => f.id === flavor)) out.flavor = flavor as Design['flavor'];
  return Object.keys(out).length ? out : null;
}
