/** Markup for each studio step. Options are native radios and checkboxes. */
import { DECORATIONS, FLAVORS, FROSTINGS, MAX_REFERENCES, MESSAGE_MAX, OCCASIONS, PALETTES, SHAPES, SIZES, TOPPER_NAME_MAX } from '../data/bakery';
import { escapeHtml as e } from '../lib/dom';
import { STEPS, type StepId } from './design';
import { DECORATION_ICONS, OCCASION_ICONS, shapeIcon } from './icons';

const FROSTING_SWATCH: Record<string, string> = {
  cream: 'radial-gradient(circle at 35% 30%, #fffdf8, #f3e6d3)',
  buttercream: 'repeating-linear-gradient(0deg, #f6e7d6 0 5px, #fbf1e5 5px 7px)',
  fondant: 'linear-gradient(110deg, #f4ebe0 20%, #fffaf3 45%, #ecdfcf 80%)',
  'buttercream-fondant': 'radial-gradient(circle at 30% 30%, #f7eadb 0 18%, transparent 19%), radial-gradient(circle at 70% 30%, #f7eadb 0 18%, transparent 19%), linear-gradient(110deg, #f1e6d8, #fffaf3 50%, #e9dccb)',
  fudge: 'linear-gradient(115deg, #2c130b 10%, #6b3a29 35%, #3b1c10 55%, #24100a)',
};

function head(id: StepId, lead: string): string {
  const i = STEPS.findIndex((s) => s.id === id);
  const step = STEPS[i]!;
  return `<header class="step__head">
    ${step.optional ? '<p class="step__eyebrow">Optional</p>' : ''}
    <h2 class="step__title" id="step-${id}-title" tabindex="-1">${e(step.title)}</h2>
    <p class="step__lead">${lead}</p>
  </header>`;
}

function reason(name: string, value: string): string {
  return `<span class="option-card__reason" id="reason-${name}-${value}" data-reason="${name}:${value}" hidden></span>`;
}

function occasionStep(): string {
  return `${head('occasion', 'What are we celebrating? We set the mood of your cake around it.')}
  <div class="option-grid option-grid--occasion" role="radiogroup" aria-labelledby="step-occasion-title">
    ${OCCASIONS.map(
      (o) => `<label class="option-card option-card--icon">
        <input type="radio" name="occasion" value="${o.id}" class="option-input" />
        <span class="option-card__icon" data-fly>${OCCASION_ICONS[o.id]}</span>
        <span class="option-card__label">${e(o.label)}</span>
        <span class="option-card__blurb">${e(o.blurb)}</span>
      </label>`,
    ).join('')}
  </div>
  <div class="field step__extra" data-when="occasion=other" hidden>
    <label for="occasionOther">What's the occasion?</label>
    <input class="input" id="occasionOther" name="occasionOther" maxlength="60" autocomplete="off" placeholder="e.g. Graduation, Eid, Housewarming" />
  </div>`;
}

function shapeStep(): string {
  return `${head('shape', 'Pick a shape, then a size. We only list sizes we can bake for that shape.')}
  <div class="option-grid option-grid--shape" role="radiogroup" aria-labelledby="step-shape-title">
    ${SHAPES.map(
      (s) => `<label class="option-card option-card--shape">
        <input type="radio" name="shape" value="${s.id}" class="option-input" />
        <span class="option-card__icon option-card__icon--lg" data-fly>${shapeIcon(s.id)}</span>
        <span class="option-card__label">${e(s.label)}</span>
        <span class="option-card__blurb">${e(s.blurb)}</span>
      </label>`,
    ).join('')}
  </div>
  <div class="field step__extra" data-when="shape=custom" hidden>
    <label for="shapeOther">Describe the shape</label>
    <input class="input" id="shapeOther" name="shapeOther" maxlength="80" autocomplete="off" placeholder="e.g. Number 5, a book, a star" />
    <p class="hint">The preview shows a round cake. We'll discuss your shape on WhatsApp.</p>
  </div>
  <fieldset class="size-set" data-sizes>
    <legend class="label">Size</legend>
    <div class="segmented" role="radiogroup" aria-label="Size">
      ${Object.values(SIZES)
        .map(
          (s) => `<label class="segment" data-size="${s.id}">
          <input type="radio" name="size" value="${s.id}" class="option-input" />
          <span class="segment__label">${e(s.label)}</span>
          <span class="segment__note">${e(s.note)}</span>
        </label>`,
        )
        .join('')}
    </div>
    <p class="hint" data-size-hint>Choose a shape to see its sizes.</p>
  </fieldset>`;
}

function flavorStep(): string {
  return `${head('flavor', 'What should be inside? Choose a flavor to see a slice.')}
  <div class="option-grid option-grid--list" role="radiogroup" aria-labelledby="step-flavor-title">
    ${FLAVORS.map(
      (f) => `<label class="option-row">
        <input type="radio" name="flavor" value="${f.id}" class="option-input" />
        <span class="option-row__swatch" data-fly style="background: linear-gradient(180deg, ${f.sponge} 0 38%, ${f.filling} 38% 52%, ${f.sponge} 52%)"></span>
        <span class="option-row__text"><span class="option-row__label">${e(f.label)}</span><span class="option-row__blurb">${e(f.description)}</span></span>
        <span class="option-row__check" aria-hidden="true"></span>
      </label>`,
    ).join('')}
  </div>`;
}

function frostingStep(): string {
  return `${head('frosting', 'The finish that wraps your cake. Watch it go on.')}
  <div class="option-grid option-grid--list" role="radiogroup" aria-labelledby="step-frosting-title">
    ${FROSTINGS.map(
      (f) => `<label class="option-row">
        <input type="radio" name="frosting" value="${f.id}" class="option-input" aria-describedby="reason-frosting-${f.id}" />
        <span class="option-row__swatch option-row__swatch--round" data-fly style="background: ${FROSTING_SWATCH[f.id]}"></span>
        <span class="option-row__text"><span class="option-row__label">${e(f.label)}</span><span class="option-row__blurb">${e(f.description)}</span>${reason('frosting', f.id)}</span>
        <span class="option-row__check" aria-hidden="true"></span>
      </label>`,
    ).join('')}
  </div>`;
}

function colorStep(): string {
  return `${head('color', 'Choose a colour story. Your frosting and decorations change to match.')}
  <p class="notice step__fudge-note" data-when="frosting=fudge" hidden>Chocolate fudge stays chocolate brown, so your palette colours the decorations and writing.</p>
  <div class="option-grid option-grid--palette" role="radiogroup" aria-labelledby="step-color-title">
    ${PALETTES.map((p) => {
      const sw = p.id === 'custom' ? `<span class="palette-dots palette-dots--custom" data-fly><span data-custom-dot></span></span>` : `<span class="palette-dots" data-fly><span style="background:${p.frosting}"></span><span style="background:${p.accent}"></span><span style="background:${p.detail}"></span></span>`;
      return `<label class="option-card option-card--palette">
        <input type="radio" name="palette" value="${p.id}" class="option-input" />
        ${sw}
        <span class="option-card__label">${e(p.label)}</span>
      </label>`;
    }).join('')}
  </div>
  <div class="custom-color step__extra" data-when="palette=custom" hidden>
    <div class="field">
      <label for="customColor">Your colour</label>
      <input type="color" class="color-input" id="customColor" name="customColor" />
    </div>
    <div class="field">
      <label for="customColorNote">Describe it (optional)</label>
      <input class="input" id="customColorNote" name="customColorNote" maxlength="60" autocomplete="off" placeholder="e.g. Sage green with gold" />
    </div>
  </div>`;
}

function decorationsStep(): string {
  return `${head('decorations', 'Add the finishing touches. Choose as many as you like, or none.')}
  <div class="option-grid option-grid--decor" aria-labelledby="step-decorations-title" role="group">
    ${DECORATIONS.map(
      (d) => `<label class="option-card option-card--decor">
        <input type="checkbox" name="decorations" value="${d.id}" class="option-input" aria-describedby="reason-decorations-${d.id}" />
        <span class="option-card__icon" data-fly>${DECORATION_ICONS[d.id]}</span>
        <span class="option-card__label">${e(d.label)}</span>
        <span class="option-card__blurb">${e(d.blurb)}</span>
        ${reason('decorations', d.id)}
        <span class="option-card__tick" aria-hidden="true"></span>
      </label>`,
    ).join('')}
  </div>
  <div class="field step__extra" data-when="decorations~name-topper" hidden>
    <label for="topperName">Name for the topper</label>
    <input class="input" id="topperName" name="topperName" maxlength="${TOPPER_NAME_MAX}" autocomplete="off" placeholder="e.g. Ayesha" />
    <p class="hint"><span data-count="topperName">0</span>/${TOPPER_NAME_MAX} characters</p>
  </div>`;
}

function messageStep(): string {
  return `${head('message', 'What would you like written on your cake? We show it exactly as you type it.')}
  <div class="field">
    <label for="message">Message on the cake</label>
    <input class="input input--script" id="message" name="message" maxlength="${MESSAGE_MAX}" autocomplete="off" placeholder="Happy Birthday Ayesha" aria-describedby="message-hint" />
    <p class="hint" id="message-hint"><span data-count="message">0</span>/${MESSAGE_MAX} characters. Leave empty for no message.</p>
  </div>
  <div class="chip-row" aria-label="Examples">
    ${['Happy Birthday', 'Happy Anniversary', 'Congratulations!', 'Welcome Baby'].map((m) => `<button type="button" class="chip" data-example="${e(m)}">${e(m)}</button>`).join('')}
  </div>`;
}

function referencesStep(): string {
  return `${head('references', 'Have an inspiration photo? Add it here so you remember to share it with us.')}
  <div class="ref-drop" data-drop>
    <input type="file" id="refInput" accept="image/*" multiple class="visually-hidden" data-ref-input />
    <label for="refInput" class="ref-drop__label">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l4-4 3 3 5-5 4 4M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <span><strong>Choose photos</strong> or drop them here</span>
      <span class="hint">Up to ${MAX_REFERENCES} images</span>
    </label>
  </div>
  <p class="field-error" data-ref-error></p>
  <ul class="ref-gallery" data-ref-gallery aria-label="Your reference photos"></ul>
  <div class="ref-explain">
    <div><span class="ref-explain__tag">Your reference</span><p>Photos you add are inspiration for our bakers. They stay on your device until you attach them in WhatsApp.</p></div>
    <div><span class="ref-explain__tag">Concept preview</span><p>The cake you see here is an illustration of your choices, to help us understand your idea.</p></div>
    <div><span class="ref-explain__tag">Your final cake</span><p>Every cake is handmade, so it will be inspired by your references rather than an exact copy.</p></div>
  </div>`;
}

function reviewStep(): string {
  return `${head('review', 'Here is your cake. Check the details, then tell us when you need it.')}
  <dl class="review-list" data-review></dl>
  <div class="review-form">
    <div class="field">
      <label for="date">Date you need the cake</label>
      <input type="date" class="input" id="date" name="date" aria-describedby="date-hint" />
      <p class="hint" id="date-hint" data-date-hint></p>
    </div>
    <fieldset class="field">
      <legend class="label">Pickup or delivery</legend>
      <div class="segmented segmented--two" role="radiogroup" aria-label="Pickup or delivery">
        <label class="segment"><input type="radio" name="fulfilment" value="pickup" class="option-input" /><span class="segment__label">Self-pickup</span><span class="segment__note">Preferred</span></label>
        <label class="segment"><input type="radio" name="fulfilment" value="delivery" class="option-input" /><span class="segment__label">Delivery</span><span class="segment__note">Charges may apply</span></label>
      </div>
    </fieldset>
    <div class="field" data-when="fulfilment=delivery" hidden>
      <label for="deliveryArea">Delivery area in Lahore</label>
      <input class="input" id="deliveryArea" name="deliveryArea" maxlength="80" autocomplete="address-level3" placeholder="e.g. DHA Phase 5" />
    </div>
    <div class="field">
      <label for="customerName">Your name (optional)</label>
      <input class="input" id="customerName" name="customerName" maxlength="60" autocomplete="name" />
    </div>
    <div class="field">
      <label for="instructions">Special instructions (optional)</label>
      <textarea class="textarea" id="instructions" name="instructions" maxlength="500" placeholder="Allergies, eggless request, a specific colour, anything else"></textarea>
    </div>
  </div>`;
}

function sendStep(): string {
  return `${head('send', 'Your design goes to us as a WhatsApp message. Nothing is confirmed until we reply.')}
  <div class="send">
    <p class="send__title">Let's Bring Your Cake to Life <span aria-hidden="true">🤎</span></p>
    <div class="wa-bubble">
      <p class="wa-bubble__to">To Kaaf sy Cake · 0310 7666604</p>
      <pre class="wa-bubble__text" data-wa-text></pre>
    </div>
    <div class="notice" data-ref-reminder hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l4-4 3 3 5-5 4 4M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <div><strong>Attach your reference photos in WhatsApp.</strong> Photos can't travel inside a link, so after the chat opens, tap the attachment icon and add <span data-ref-count></span> from your gallery.</div>
    </div>
    <div class="send__actions">
      <a class="btn btn-whatsapp btn-lg" data-wa-send target="_blank" rel="noopener" href="https://wa.me/923107666604"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg> Send My Cake Design on WhatsApp</a>
      <button type="button" class="btn btn-ghost" data-copy>Copy message</button>
    </div>
    <p class="send__status" data-send-status role="status"></p>
    <p class="send__fine">Orders are accepted subject to availability. We'll confirm the price and your date on WhatsApp. Self-pickup is preferred; delivery may cost extra.</p>
    <button type="button" class="link-btn" data-start-fresh>Start a new design</button>
  </div>`;
}

const RENDER: Record<StepId, () => string> = {
  occasion: occasionStep,
  shape: shapeStep,
  flavor: flavorStep,
  frosting: frostingStep,
  color: colorStep,
  decorations: decorationsStep,
  message: messageStep,
  references: referencesStep,
  review: reviewStep,
  send: sendStep,
};

export function stepsHtml(): string {
  return STEPS.map((s) => `<section class="step" data-step="${s.id}" aria-labelledby="step-${s.id}-title" hidden>${RENDER[s.id]()}</section>`).join('');
}
