/**
 * Luffy Focus — Luffy Mascot + Speech Bubble Component
 */

// Luffy messages for different states
const MESSAGES = {
  idle: "Let's get to work, Captain!",
  working: "Keep going! You've got this!",
  resting: "Take a break, nakama!",
  paused: "Ready to continue?",
  done: "Well done, Captain!",
};

// Simple pixel-art Luffy as inline SVG (8-bit straw hat face)
const LUFFY_SPRITE_IDLE = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="crispEdges">
  <rect width="64" height="64" fill="#f7f9ff"/>
  <rect x="8" y="26" width="48" height="8" fill="#fcbc0b"/>
  <rect x="8" y="26" width="48" height="2" fill="#7a5900"/>
  <rect x="20" y="12" width="24" height="16" fill="#fcbc0b"/>
  <rect x="20" y="26" width="24" height="2" fill="#7a5900"/>
  <rect x="20" y="22" width="24" height="6" fill="#e41000"/>
  <rect x="20" y="34" width="24" height="18" fill="#ffcc99"/>
  <rect x="26" y="38" width="6" height="6" fill="#181c20"/>
  <rect x="34" y="38" width="6" height="6" fill="#181c20"/>
  <rect x="26" y="46" width="14" height="4" fill="#181c20"/>
  <rect x="28" y="44" width="10" height="4" fill="#181c20"/>
  <rect x="16" y="32" width="6" height="6" fill="#181c20"/>
  <rect x="20" y="30" width="4" height="6" fill="#181c20"/>
  <rect x="40" y="30" width="4" height="4" fill="#181c20"/>
  <rect x="42" y="32" width="6" height="8" fill="#181c20"/>
</svg>
`)}`;

/**
 * Create/update the Luffy mascot section.
 * @param {HTMLElement} container - Parent element to render into
 * @param {string} state - Timer state (idle, working, resting, paused, done)
 * @returns {HTMLElement} The mascot section element
 */
export function renderLuffy(container, state = 'idle') {
  container.innerHTML = '';

  const section = document.createElement('section');
  section.className = 'flex gap-md items-end mt-sm';
  section.style.cssText = 'align-items: flex-end;';

  // Sprite container
  const spriteBox = document.createElement('div');
  spriteBox.className = 'pixel-border';
  spriteBox.style.cssText = 'width: 64px; height: 64px; flex-shrink: 0; background: var(--color-surface-variant); display: flex; align-items: center; justify-content: center; overflow: hidden;';

  const img = document.createElement('img');
  img.src = LUFFY_SPRITE_IDLE;
  img.alt = 'Pixel Luffy';
  img.style.cssText = 'width: 64px; height: 64px; image-rendering: pixelated;';
  if (state === 'working' || state === 'resting') {
    img.classList.add('animate-bob');
  }
  spriteBox.appendChild(img);

  // Speech bubble
  const balloon = document.createElement('div');
  balloon.className = 'pixel-balloon';
  balloon.style.cssText = 'flex: 1;';
  balloon.innerHTML = `<p class="text-body-base">${MESSAGES[state] || MESSAGES.idle}</p>`;

  section.appendChild(spriteBox);
  section.appendChild(balloon);
  container.appendChild(section);

  return section;
}

/** Update the Luffy message based on state */
export function updateLuffyMessage(state) {
  const balloon = document.querySelector('.pixel-balloon p');
  if (balloon) {
    balloon.textContent = MESSAGES[state] || MESSAGES.idle;
  }

  const img = document.querySelector('.pixel-balloon')?.previousElementSibling?.querySelector('img');
  if (img) {
    img.classList.toggle('animate-bob', state === 'working' || state === 'resting');
  }
}
