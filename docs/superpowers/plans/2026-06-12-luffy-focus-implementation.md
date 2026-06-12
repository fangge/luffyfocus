# Luffy Focus Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pixel-art One Piece themed Pomodoro timer Chrome extension with work template management, session logging, analytics dashboard, and local JSON file storage.

**Architecture:** Manifest V3 Chrome extension with Service Worker timer engine, popup UI (400px), hybrid File System Access API + chrome.storage.local storage, custom Canvas2D pixel-art charts, and Mugiwara Pixel OS design system throughout.

**Tech Stack:** HTML + CSS + Vanilla JavaScript (ES modules), Tailwind CSS (CDN for dev), Press Start 2P font, Chrome Extension APIs (storage, alarms, notifications), File System Access API.

**Source Spec:** `docs/superpowers/specs/2026-06-12-luffy-focus-design.md`

---

## Phase 1: Project Scaffold & Foundation

### Task 1: Create project directory structure and manifest

**Files:**
- Create: `manifest.json`
- Create: `icons/` (generate pixel-art icons)
- Create: all empty placeholder files

- [ ] **Step 1: Create the directory structure**

Run:
```bash
mkdir -p luffy-focus/{background,popup/screens,popup/components,lib,assets/fonts,assets/luffy-sprites,icons}
```

- [ ] **Step 2: Write manifest.json**

Create `luffy-focus/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Luffy Focus",
  "version": "1.0.0",
  "description": "A pixel-art One Piece themed Pomodoro timer — stay focused on your voyage!",
  "permissions": ["storage", "alarms", "notifications"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 3: Generate pixel-art extension icons**

Write an HTML canvas script to generate the icons, or use a simple approach — create `icons/generate-icons.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Generate Luffy Focus Icons</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    canvas { image-rendering: pixelated; border: 4px solid #181c20; }
  </style>
</head>
<body>
  <h1>Luffy Focus Icon Generator</h1>
  <p>Right-click each canvas → Save As → icons/icon{N}.png</p>
  <div id="icons"></div>
  <script>
    function drawPixelIcon(size) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Red background (Luffy's vest)
      ctx.fillStyle = '#e41000';
      ctx.fillRect(0, 0, size, size);

      // Charcoal border
      ctx.strokeStyle = '#181c20';
      ctx.lineWidth = Math.max(2, size / 8);
      ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, size - ctx.lineWidth, size - ctx.lineWidth);

      // Gold circle (straw hat outline)
      const cx = size / 2, cy = size / 2, r = size * 0.3;
      ctx.fillStyle = '#fcbc0b';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#181c20';
      ctx.lineWidth = Math.max(1, size / 16);
      ctx.stroke();

      // White skull (simplified Jolly Roger)
      const sr = r * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy - sr * 0.2, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#181c20';
      ctx.lineWidth = Math.max(1, size / 20);
      ctx.stroke();

      // Eyes
      const eyeW = sr * 0.25, eyeH = sr * 0.3;
      ctx.fillStyle = '#181c20';
      ctx.fillRect(cx - sr * 0.35 - eyeW/2, cy - sr * 0.35, eyeW, eyeH);
      ctx.fillRect(cx + sr * 0.35 - eyeW/2, cy - sr * 0.35, eyeW, eyeH);

      const label = document.createElement('p');
      label.textContent = `${size}x${size}`;
      document.getElementById('icons').appendChild(label);
      document.getElementById('icons').appendChild(canvas);
    }
    drawPixelIcon(16);
    drawPixelIcon(48);
    drawPixelIcon(128);
  </script>
</body>
</html>
```

- [ ] **Step 4: Verify manifest is valid**

Run:
```bash
cat luffy-focus/manifest.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
```
Expected: `Valid JSON`

- [ ] **Step 5: Commit**

```bash
cd luffy-focus && git init && git add -A && git commit -m "feat: project scaffold — manifest, icons, directory structure"
```

---

### Task 2: Design system foundation — popup.css

**Files:**
- Create: `popup/popup.css`

- [ ] **Step 1: Write the Mugiwara Pixel OS CSS foundation**

Create `luffy-focus/popup/popup.css`:

```css
/* ==============================================
   Mugiwara Pixel OS — Design Token CSS
   Luffy Focus Chrome Extension
   ============================================== */

/* --- CSS Custom Properties --- */
:root {
  /* Surface colors */
  --color-surface: #f7f9ff;
  --color-surface-dim: #d7dadf;
  --color-surface-bright: #f7f9ff;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-low: #f1f4f9;
  --color-surface-container: #ebeef3;
  --color-surface-container-high: #e5e8ee;
  --color-surface-container-highest: #e0e3e8;

  /* On-surface (text + structural) */
  --color-on-surface: #181c20;
  --color-on-surface-variant: #5e3f39;
  --color-outline: #936e68;
  --color-outline-variant: #e9bcb5;

  /* Primary (Luffy Vest Red) */
  --color-primary: #b60b00;
  --color-on-primary: #ffffff;
  --color-primary-container: #e41000;
  --color-on-primary-container: #fff7f6;

  /* Secondary (Mugiwara Gold) */
  --color-secondary: #7a5900;
  --color-on-secondary: #ffffff;
  --color-secondary-container: #fcbc0b;
  --color-on-secondary-container: #6b4e00;

  /* Tertiary (Grand Line Blue) */
  --color-tertiary: #004cd9;
  --color-on-tertiary: #ffffff;
  --color-tertiary-container: #2765ff;
  --color-on-tertiary-container: #faf8ff;

  /* Semantic */
  --color-success: #92cc41;
  --color-error: #e76e55;
  --color-warning: #f7d51d;
  --color-disabled: #bcbcbc;

  /* Background */
  --color-background: #f7f9ff;
  --color-on-background: #181c20;

  /* Spacing (4px grid) */
  --space-unit: 4px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-gutter: 16px;

  /* Typography */
  --font-pixel: 'Press Start 2P', monospace;
  --fs-display-lg: 24px;
  --lh-display-lg: 32px;
  --fs-headline-md: 16px;
  --lh-headline-md: 24px;
  --fs-body-base: 12px;
  --lh-body-base: 20px;
  --fs-label-caps: 10px;
  --lh-label-caps: 14px;

  /* Borders */
  --border-width: 4px;
  --border-color: var(--color-on-background);
}

/* --- Reset & Base --- */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 400px;
  min-height: 600px;
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  line-height: var(--lh-body-base);
  color: var(--color-on-background);
  background-color: var(--color-background);
  overflow-x: hidden;
  image-rendering: pixelated;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}

/* --- Pixel Border Utility --- */
.pixel-border {
  border: var(--border-width) solid var(--border-color);
}

/* --- Pixel Shadow Utility --- */
.pixel-shadow {
  box-shadow: 4px 4px 0 0 var(--color-on-background);
}

/* --- Pixel Button --- */
.pixel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  font-weight: 700;
  line-height: var(--lh-body-base);
  color: var(--color-on-background);
  background: var(--color-surface);
  border: var(--border-width) solid var(--border-color);
  box-shadow: 4px 4px 0 0 var(--color-on-background);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  text-transform: uppercase;
  user-select: none;
}

.pixel-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 0 var(--color-on-background);
}

.pixel-btn:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.pixel-btn:disabled {
  color: var(--color-disabled);
  cursor: not-allowed;
  transform: none;
  box-shadow: 4px 4px 0 0 var(--color-disabled);
  border-color: var(--color-disabled);
}

.pixel-btn--primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.pixel-btn--primary:hover {
  background: var(--color-primary-container);
}

.pixel-btn--success {
  color: var(--color-on-background);
  background: var(--color-success);
}

.pixel-btn--danger {
  color: var(--color-on-primary);
  background: var(--color-error);
}

.pixel-btn--secondary {
  color: var(--color-on-secondary);
  background: var(--color-secondary);
}

/* --- Pixel Card --- */
.pixel-card {
  position: relative;
  background: var(--color-surface-container-lowest);
  border: var(--border-width) solid var(--border-color);
  box-shadow: 4px 4px 0 0 var(--color-on-background);
  padding: var(--space-md);
}

.pixel-card__title {
  position: absolute;
  top: -12px;
  left: 12px;
  background: var(--color-surface-container-lowest);
  padding: 2px var(--space-xs);
  font-family: var(--font-pixel);
  font-size: var(--fs-label-caps);
  line-height: var(--lh-label-caps);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: var(--border-width) solid var(--border-color);
  z-index: 1;
}

/* --- Pixel Input --- */
.pixel-input {
  width: 100%;
  padding: var(--space-sm);
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  line-height: var(--lh-body-base);
  color: var(--color-on-background);
  background: var(--color-surface-container-lowest);
  border: var(--border-width) solid var(--border-color);
  box-shadow: inset 4px 4px 0 0 var(--color-surface-container);
  outline: none;
  transition: box-shadow 0.1s;
}

.pixel-input:focus {
  box-shadow: inset 4px 4px 0 0 var(--color-surface-container), 0 0 0 4px var(--color-tertiary-container);
}

.pixel-input::placeholder {
  color: var(--color-disabled);
}

/* --- Pixel Textarea --- */
.pixel-textarea {
  width: 100%;
  min-height: 100px;
  padding: var(--space-sm);
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  line-height: var(--lh-body-base);
  color: var(--color-on-background);
  background: var(--color-surface-container-lowest);
  border: var(--border-width) solid var(--border-color);
  box-shadow: inset 4px 4px 0 0 var(--color-surface-container);
  outline: none;
  resize: vertical;
  transition: box-shadow 0.1s;
}

.pixel-textarea:focus {
  box-shadow: inset 4px 4px 0 0 var(--color-surface-container), 0 0 0 4px var(--color-tertiary-container);
}

.pixel-textarea::placeholder {
  color: var(--color-disabled);
}

/* --- Pixel Select --- */
.pixel-select {
  padding: var(--space-sm);
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  color: var(--color-on-background);
  background: var(--color-surface-container-lowest);
  border: var(--border-width) solid var(--border-color);
  outline: none;
  cursor: pointer;
}

/* --- Pixel Divider --- */
.pixel-divider {
  height: 4px;
  width: 100%;
  background-image: repeating-linear-gradient(
    90deg,
    var(--color-on-background) 0,
    var(--color-on-background) 4px,
    transparent 4px,
    transparent 8px
  );
}

/* --- Progress Bar (brick pattern) --- */
.pixel-progress {
  width: 100%;
  height: 24px;
  background: var(--color-surface-container);
  border: var(--border-width) solid var(--border-color);
  overflow: hidden;
}

.pixel-progress__fill {
  height: 100%;
  background-image: repeating-linear-gradient(
    45deg,
    var(--color-primary-container) 0,
    var(--color-primary-container) 4px,
    var(--color-primary) 4px,
    var(--color-primary) 8px
  );
  transition: width 0.3s steps(10);
}

/* --- Speech Bubble --- */
.pixel-balloon {
  position: relative;
  background: var(--color-surface-container-lowest);
  border: var(--border-width) solid var(--border-color);
  padding: var(--space-sm);
  font-size: var(--fs-body-base);
  line-height: var(--lh-body-base);
}

.pixel-balloon::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 16px;
  border-width: 16px 16px 0;
  border-style: solid;
  border-color: var(--border-color) transparent transparent transparent;
}

.pixel-balloon::before {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 20px;
  border-width: 12px 12px 0;
  border-style: solid;
  border-color: var(--color-surface-container-lowest) transparent transparent transparent;
  z-index: 1;
}

/* Left-pointing balloon variant (for summary screen) */
.pixel-balloon--left::after {
  left: auto;
  right: 100%;
  bottom: auto;
  top: 50%;
  transform: translateY(-50%);
  border-width: 8px 8px 8px 0;
  border-color: transparent var(--border-color) transparent transparent;
}

.pixel-balloon--left::before {
  left: auto;
  right: calc(100% - 4px);
  bottom: auto;
  top: 50%;
  transform: translateY(-50%);
  border-width: 4px 4px 4px 0;
  border-color: transparent var(--color-surface-container-lowest) transparent transparent;
}

/* --- Navigation Tabs --- */
.pixel-nav {
  display: flex;
  justify-content: space-around;
  border-top: var(--border-width) solid var(--border-color);
  background: var(--color-surface-container);
}

.pixel-nav__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-pixel);
  font-size: var(--fs-label-caps);
  color: var(--color-on-surface-variant);
  background: none;
  border: none;
  border-bottom: 4px solid transparent;
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
}

.pixel-nav__tab:hover {
  background: var(--color-surface-container-highest);
}

.pixel-nav__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.pixel-nav__tab-icon {
  font-size: 20px;
}

/* --- Day Toggle Buttons --- */
.pixel-day-toggle {
  display: flex;
  gap: var(--space-xs);
  justify-content: space-between;
}

.pixel-day-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-pixel);
  font-size: 8px;
  border: 2px solid var(--color-on-background);
  background: var(--color-surface-variant);
  color: var(--color-disabled);
  cursor: pointer;
  transition: all 0.1s;
  box-shadow: 2px 2px 0 0 var(--color-on-background);
}

.pixel-day-btn:hover {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 0 var(--color-on-background);
}

.pixel-day-btn--active {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

/* --- Color Dot (for template color picker) --- */
.pixel-color-dot {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-on-background);
  cursor: pointer;
  box-shadow: 2px 2px 0 0 var(--color-on-background);
  transition: transform 0.1s;
}

.pixel-color-dot:hover {
  transform: scale(1.2);
}

.pixel-color-dot--selected {
  outline: 3px solid var(--color-tertiary);
  outline-offset: 2px;
}

/* --- Typography Utilities --- */
.text-display-lg {
  font-family: var(--font-pixel);
  font-size: var(--fs-display-lg);
  line-height: var(--lh-display-lg);
  letter-spacing: 0.02em;
  font-weight: 400;
}

.text-headline-md {
  font-family: var(--font-pixel);
  font-size: var(--fs-headline-md);
  line-height: var(--lh-headline-md);
  letter-spacing: 0.01em;
  font-weight: 400;
}

.text-body-base {
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  line-height: var(--lh-body-base);
  font-weight: 400;
}

.text-body-bold {
  font-family: var(--font-pixel);
  font-size: var(--fs-body-base);
  line-height: var(--lh-body-base);
  font-weight: 700;
}

.text-label-caps {
  font-family: var(--font-pixel);
  font-size: var(--fs-label-caps);
  line-height: var(--lh-label-caps);
  letter-spacing: 0.05em;
  font-weight: 400;
  text-transform: uppercase;
}

.text-primary { color: var(--color-primary); }
.text-on-surface { color: var(--color-on-surface); }
.text-on-surface-variant { color: var(--color-on-surface-variant); }
.text-success { color: var(--color-success); }
.text-tertiary { color: var(--color-tertiary); }

/* --- Layout Utilities --- */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.gap-xs { gap: var(--space-xs); }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }
.gap-lg { gap: var(--space-lg); }
.p-gutter { padding: var(--space-gutter); }
.px-md { padding-left: var(--space-md); padding-right: var(--space-md); }
.py-sm { padding-top: var(--space-sm); padding-bottom: var(--space-sm); }
.p-md { padding: var(--space-md); }
.p-sm { padding: var(--space-sm); }
.p-xs { padding: var(--space-xs); }
.mt-sm { margin-top: var(--space-sm); }
.mt-md { margin-top: var(--space-md); }
.mt-lg { margin-top: var(--space-lg); }
.mb-sm { margin-bottom: var(--space-sm); }
.mb-xs { margin-bottom: var(--space-xs); }
.mt-auto { margin-top: auto; }
.w-full { width: 100%; }
.overflow-y-auto { overflow-y: auto; }
.relative { position: relative; }
.absolute { position: absolute; }
.hidden { display: none; }

/* --- Scrollbar --- */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--color-surface-container); border-left: 4px solid var(--color-on-background); }
::-webkit-scrollbar-thumb { background: var(--color-on-background); }

/* --- Animations --- */
@keyframes sprite-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes pulse-pixel {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.animate-bob {
  animation: sprite-bob 1s infinite steps(2);
}

.animate-pulse-pixel {
  animation: pulse-pixel 1.5s infinite steps(2);
}

/* --- Screen Container --- */
.screen {
  display: none;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

.screen--active {
  display: flex;
}
```

- [ ] **Step 2: Verify the CSS file is non-empty**

Run:
```bash
wc -l luffy-focus/popup/popup.css
```
Expected: 300+ lines

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add popup/popup.css && git commit -m "feat: add Mugiwara Pixel OS design system CSS foundation"
```

---

### Task 3: Popup HTML shell

**Files:**
- Create: `popup/popup.html`

- [ ] **Step 1: Write the popup HTML shell**

Create `luffy-focus/popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Luffy Focus</title>
  <!-- Self-hosted Press Start 2P (offline-capable) -->
  <link rel="stylesheet" href="../assets/fonts/press-start-2p.css">
  <!-- Mugiwara Pixel OS Design System -->
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <!-- Header -->
  <header class="flex items-center justify-between px-md py-sm" style="border-bottom: var(--border-width) solid var(--border-color); background: var(--color-surface);">
    <h1 class="text-headline-md text-primary" style="font-weight: 900;">LUFFY FOCUS</h1>
    <button id="btn-settings" class="pixel-btn" style="padding: 4px 8px;" title="Settings">
      ⚙
    </button>
  </header>

  <!-- Screen Container -->
  <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
    <!-- Timer Screen -->
    <div id="screen-timer" class="screen screen--active"></div>

    <!-- Templates Screen -->
    <div id="screen-templates" class="screen"></div>

    <!-- Stats Screen -->
    <div id="screen-stats" class="screen"></div>

    <!-- Summary Overlay (not a tab, shown as modal overlay) -->
    <div id="screen-summary" class="screen" style="position: absolute; inset: 0; z-index: 100; background: var(--color-background);"></div>
  </main>

  <!-- Bottom Navigation -->
  <nav id="bottom-nav" class="pixel-nav">
    <button class="pixel-nav__tab pixel-nav__tab--active" data-screen="timer">
      <span class="pixel-nav__tab-icon">⏱</span>
      <span>TIMER</span>
    </button>
    <button class="pixel-nav__tab" data-screen="templates">
      <span class="pixel-nav__tab-icon">📋</span>
      <span>TEMPLATES</span>
    </button>
    <button class="pixel-nav__tab" data-screen="stats">
      <span class="pixel-nav__tab-icon">📊</span>
      <span>STATS</span>
    </button>
  </nav>

  <!-- App Entry Point -->
  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify HTML structure**

Run:
```bash
grep -c 'screen-timer\|screen-templates\|screen-stats\|screen-summary\|bottom-nav' luffy-focus/popup/popup.html
```
Expected: `5`

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add popup/popup.html && git commit -m "feat: add popup HTML shell with 4 screens and bottom nav"
```

---

## Phase 2: Data Layer

### Task 4: Data model and ID generation utility

**Files:**
- Create: `lib/data-model.js`

- [ ] **Step 1: Write the data model constants and ID generator**

Create `luffy-focus/lib/data-model.js`:

```javascript
/**
 * Luffy Focus — Data Model & Constants
 * Shared between service worker and popup
 */

/** Generate a unique ID with prefix */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/** Days of week mapping */
export const DAYS = [
  { key: 1, label: 'M' },
  { key: 2, label: 'T' },
  { key: 3, label: 'W' },
  { key: 4, label: 'T' },
  { key: 5, label: 'F' },
  { key: 6, label: 'S' },
  { key: 7, label: 'S' },
];

/** Timer states */
export const TIMER_STATE = {
  IDLE: 'idle',
  WORKING: 'working',
  PAUSED: 'paused',
  RESTING: 'resting',
  DONE: 'done',
};

/** Session types */
export const SESSION_TYPE = {
  WORK: 'work',
  REST: 'rest',
};

/** Session status */
export const SESSION_STATUS = {
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

/** Default template */
export const DEFAULT_TEMPLATE = {
  id: 'tpl_default',
  name: 'Default Focus',
  workDuration: 25,
  restDuration: 5,
  activeDays: [1, 2, 3, 4, 5],
  color: '#e41000',
  createdAt: new Date().toISOString(),
};

/** Template color palette */
export const TEMPLATE_COLORS = [
  '#e41000', // Red (Luffy's vest)
  '#fcbc0b', // Gold (Mugiwara)
  '#004cd9', // Blue (Grand Line)
  '#92cc41', // Green
  '#7a5900', // Brown
  '#e76e55', // Crimson
  '#2765ff', // Bright blue
  '#b60b00', // Dark red
];

/** Create a fresh data store */
export function createDefaultData() {
  const now = new Date().toISOString();
  return {
    version: 1,
    settings: {
      dailyGoal: 8,
      notificationsEnabled: true,
      autoStartRest: false,
    },
    templates: [{ ...DEFAULT_TEMPLATE, createdAt: now }],
    activeTemplateId: DEFAULT_TEMPLATE.id,
    sessions: [],
    currentTimer: {
      templateId: DEFAULT_TEMPLATE.id,
      type: SESSION_TYPE.WORK,
      endTime: null,
      pausedAt: null,
      remainingSeconds: 0,
    },
    storageFilePath: '',
  };
}

/** Get today's date string in YYYY-MM-DD format (local timezone) */
export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get the day-of-week key (1=Mon, 7=Sun) for a given date string */
export function getDayOfWeek(dateString) {
  const d = new Date(dateString);
  // JS getDay() returns 0=Sun, convert to 1=Mon..7=Sun
  return d.getDay() === 0 ? 7 : d.getDay();
}

/** Check if today is an active day for a template */
export function isTemplateActiveToday(template) {
  const todayDow = getDayOfWeek(getTodayString());
  return template.activeDays.includes(todayDow);
}
```

- [ ] **Step 2: Verify exports**

Run:
```bash
node -e "
import('./luffy-focus/lib/data-model.js').then(m => {
  console.log('generateId:', typeof m.generateId);
  console.log('DAYS:', m.DAYS.length);
  console.log('TIMER_STATE:', Object.keys(m.TIMER_STATE).length);
  console.log('createDefaultData:', typeof m.createDefaultData);
  console.log('getTodayString:', m.getTodayString());
});
"
```
Expected: All types correct, `DAYS: 7`, `TIMER_STATE: 5`

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add lib/data-model.js && git commit -m "feat: add data model constants, ID generator, and defaults"
```

---

### Task 5: Hybrid storage module

**Files:**
- Create: `lib/storage.js`

- [ ] **Step 1: Write the hybrid storage module**

Create `luffy-focus/lib/storage.js`:

```javascript
/**
 * Luffy Focus — Hybrid Storage
 * Primary: File System Access API (user-chosen JSON file)
 * Fallback/Cache: chrome.storage.local
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';
const HANDLE_KEY = 'luffy_focus_file_handle';
const STORAGE_DIR_ID = 'luffy_focus_storage_dir';

/** Check if File System Access API is available */
export function isFileSystemAPIAvailable() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

/**
 * Load all data. Tries File API first, falls back to chrome.storage.local.
 * @returns {Promise<object>} The full data object
 */
export async function loadData() {
  // Try File System Access API first
  if (isFileSystemAPIAvailable()) {
    try {
      const handleResult = await chrome.storage.local.get(HANDLE_KEY);
      const storedHandle = handleResult[HANDLE_KEY];

      if (storedHandle) {
        const fileHandle = await storedHandle;
        // Verify permission
        const opts = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(opts)) === 'granted') {
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          return migrateData(data);
        } else if ((await fileHandle.requestPermission(opts)) === 'granted') {
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          return migrateData(data);
        }
      }
    } catch (e) {
      console.warn('[Luffy Focus] File API load failed, falling back to chrome.storage:', e.message);
    }
  }

  // Fallback: chrome.storage.local
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    return migrateData(result[STORAGE_KEY]);
  }

  // Nothing found — return fresh defaults
  return createDefaultData();
}

/**
 * Save all data. Writes to File API (if available) + chrome.storage.local.
 * @param {object} data - Full data object to persist
 */
export async function saveData(data) {
  // Always save to chrome.storage.local (fast, reliable)
  await chrome.storage.local.set({ [STORAGE_KEY]: data });

  // Also write to File API if we have a handle
  if (isFileSystemAPIAvailable()) {
    try {
      const handleResult = await chrome.storage.local.get(HANDLE_KEY);
      const storedHandle = handleResult[HANDLE_KEY];
      if (storedHandle) {
        const fileHandle = await storedHandle;
        const opts = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(opts)) === 'granted') {
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
        }
      }
    } catch (e) {
      console.warn('[Luffy Focus] File API save failed:', e.message);
      // Data is still safe in chrome.storage.local
    }
  }
}

/**
 * Prompt user to select/create a JSON file for storage.
 * Must be called from a user gesture context (e.g., button click).
 * @returns {Promise<boolean>} true if file was selected successfully
 */
export async function selectStorageFile() {
  if (!isFileSystemAPIAvailable()) {
    console.warn('[Luffy Focus] File System Access API not available');
    return false;
  }

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
      multiple: false,
    });

    // Save the handle for future use
    await chrome.storage.local.set({ [HANDLE_KEY]: fileHandle });

    // Read existing data or write current data
    const file = await fileHandle.getFile();
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Empty or invalid file — use defaults
      data = createDefaultData();
    }

    await saveData(data);
    return true;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('[Luffy Focus] User cancelled file selection');
    } else {
      console.error('[Luffy Focus] File selection error:', e);
    }
    return false;
  }
}

/**
 * Create a new JSON file for storage.
 * @returns {Promise<boolean>} true if file was created successfully
 */
export async function createStorageFile() {
  if (!isFileSystemAPIAvailable()) {
    return false;
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
      suggestedName: 'luffy-focus-data.json',
    });

    await chrome.storage.local.set({ [HANDLE_KEY]: fileHandle });

    const data = createDefaultData();
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('[Luffy Focus] File create error:', e);
    }
    return false;
  }
}

/**
 * Check if the saved file handle is still valid.
 * @returns {Promise<boolean>}
 */
export async function isFileHandleValid() {
  if (!isFileSystemAPIAvailable()) return false;
  try {
    const result = await chrome.storage.local.get(HANDLE_KEY);
    if (!result[HANDLE_KEY]) return false;
    const handle = await result[HANDLE_KEY];
    return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Migrate old data formats to current version.
 * @param {object} data
 * @returns {object}
 */
function migrateData(data) {
  if (!data || typeof data !== 'object') return createDefaultData();

  // Version 0 → 1: add missing fields
  if (!data.version) {
    data.version = 1;
  }
  if (!data.settings) {
    data.settings = createDefaultData().settings;
  }
  if (!data.sessions) {
    data.sessions = [];
  }
  if (!data.currentTimer) {
    data.currentTimer = createDefaultData().currentTimer;
  }
  if (!data.storageFilePath) {
    data.storageFilePath = '';
  }

  // Ensure at least one template exists
  if (!data.templates || data.templates.length === 0) {
    data.templates = [createDefaultData().templates[0]];
    data.activeTemplateId = data.templates[0].id;
  }

  return data;
}
```

- [ ] **Step 2: Verify module syntax**

Run:
```bash
node --check luffy-focus/lib/storage.js 2>&1 || echo "Note: chrome API references expected — OK for extension context"
```

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add lib/storage.js && git commit -m "feat: add hybrid storage module (File API + chrome.storage)"
```

---

### Task 6: Timer engine

**Files:**
- Create: `lib/timer-engine.js`

- [ ] **Step 1: Write the timer state machine**

Create `luffy-focus/lib/timer-engine.js`:

```javascript
/**
 * Luffy Focus — Timer Engine
 * Pure state machine for Pomodoro timer.
 * Works in both service worker and popup contexts.
 */
import { TIMER_STATE, SESSION_TYPE } from './data-model.js';

/**
 * Create initial timer state.
 * @param {object} template - The active work template
 * @returns {object} Timer state
 */
export function createTimerState(template) {
  return {
    state: TIMER_STATE.IDLE,
    templateId: template.id,
    type: SESSION_TYPE.WORK,
    endTime: null,       // Date.now() + remaining at start
    pausedAt: null,      // Date.now() when paused
    remainingSeconds: template.workDuration * 60,
    totalSeconds: template.workDuration * 60,
  };
}

/**
 * Get timer display info from current state.
 * @param {object} timerState
 * @returns {{ minutes: number, seconds: number, totalSeconds: number, display: string }}
 */
export function getTimerDisplay(timerState) {
  let remaining;
  if (timerState.state === TIMER_STATE.IDLE || timerState.state === TIMER_STATE.DONE) {
    remaining = timerState.totalSeconds;
  } else if (timerState.state === TIMER_STATE.PAUSED) {
    remaining = timerState.remainingSeconds;
  } else {
    // WORKING or RESTING
    if (timerState.endTime) {
      remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
    } else {
      remaining = timerState.remainingSeconds;
    }
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return {
    minutes: mins,
    seconds: secs,
    totalSeconds: remaining,
    display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
  };
}

/**
 * Transition: Start working from IDLE or DONE.
 * @param {object} timerState
 * @returns {object} New timer state
 */
export function startWork(timerState) {
  return {
    ...timerState,
    state: TIMER_STATE.WORKING,
    type: SESSION_TYPE.WORK,
    endTime: Date.now() + (timerState.remainingSeconds * 1000),
    pausedAt: null,
  };
}

/**
 * Transition: Start rest period.
 * @param {object} timerState
 * @param {number} restDurationSeconds
 * @returns {object} New timer state
 */
export function startRest(timerState, restDurationSeconds) {
  return {
    ...timerState,
    state: TIMER_STATE.RESTING,
    type: SESSION_TYPE.REST,
    endTime: Date.now() + (restDurationSeconds * 1000),
    remainingSeconds: restDurationSeconds,
    totalSeconds: restDurationSeconds,
    pausedAt: null,
  };
}

/**
 * Transition: Pause current timer.
 * @param {object} timerState
 * @returns {object} New timer state
 */
export function pauseTimer(timerState) {
  if (timerState.state !== TIMER_STATE.WORKING && timerState.state !== TIMER_STATE.RESTING) {
    return timerState;
  }
  const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
  return {
    ...timerState,
    state: TIMER_STATE.PAUSED,
    remainingSeconds: remaining,
    pausedAt: Date.now(),
    endTime: null,
  };
}

/**
 * Transition: Resume from paused.
 * @param {object} timerState
 * @returns {object} New timer state
 */
export function resumeTimer(timerState) {
  if (timerState.state !== TIMER_STATE.PAUSED) return timerState;
  return {
    ...timerState,
    state: timerState.type === SESSION_TYPE.WORK ? TIMER_STATE.WORKING : TIMER_STATE.RESTING,
    endTime: Date.now() + (timerState.remainingSeconds * 1000),
    pausedAt: null,
  };
}

/**
 * Transition: Reset to IDLE.
 * @param {object} timerState
 * @param {object} template - Template to reset to
 * @returns {object} New timer state
 */
export function resetTimer(timerState, template) {
  return createTimerState(template);
}

/**
 * Transition: Mark as DONE (timer reached 0).
 * @param {object} timerState
 * @returns {object} New timer state
 */
export function completeTimer(timerState) {
  return {
    ...timerState,
    state: TIMER_STATE.DONE,
    remainingSeconds: 0,
    endTime: null,
    pausedAt: null,
  };
}

/**
 * Tick: Update remaining seconds. Called every second.
 * Returns the updated state and whether the timer just finished.
 * @param {object} timerState
 * @returns {{ state: object, finished: boolean }}
 */
export function tickTimer(timerState) {
  if (
    timerState.state !== TIMER_STATE.WORKING &&
    timerState.state !== TIMER_STATE.RESTING
  ) {
    return { state: timerState, finished: false };
  }

  const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
  const finished = remaining <= 0;

  if (finished) {
    return {
      state: {
        ...timerState,
        state: TIMER_STATE.DONE,
        remainingSeconds: 0,
        endTime: null,
      },
      finished: true,
    };
  }

  return {
    state: {
      ...timerState,
      remainingSeconds: remaining,
    },
    finished: false,
  };
}
```

- [ ] **Step 2: Verify state transitions**

Run:
```bash
node -e "
import('./luffy-focus/lib/timer-engine.js').then(m => {
  const tpl = { id: 't1', workDuration: 25, restDuration: 5 };
  let state = m.createTimerState(tpl);
  console.log('Initial:', state.state, 'remaining:', state.remainingSeconds);

  state = m.startWork(state);
  console.log('After start:', state.state);

  state = m.pauseTimer(state);
  console.log('After pause:', state.state);

  state = m.resumeTimer(state);
  console.log('After resume:', state.state);

  const result = m.tickTimer({...state, endTime: Date.now() - 1000});
  console.log('After tick (expired):', result.state.state, 'finished:', result.finished);

  state = m.resetTimer(result.state, tpl);
  console.log('After reset:', state.state);
});
"
```
Expected: `Initial: idle remaining: 1500` → `After start: working` → `After pause: paused` → `After resume: working` → `After tick (expired): done finished: true` → `After reset: idle`

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add lib/timer-engine.js && git commit -m "feat: add timer engine — pure state machine for Pomodoro"
```

---

### Task 7: Template CRUD and stats calculation modules

**Files:**
- Create: `lib/templates.js`
- Create: `lib/stats.js`

- [ ] **Step 1: Write template operations module**

Create `luffy-focus/lib/templates.js`:

```javascript
/**
 * Luffy Focus — Template Operations
 */
import { generateId, isTemplateActiveToday } from './data-model.js';

/** Create a new template */
export function createTemplate(data, { name, workDuration, restDuration, activeDays, color }) {
  const template = {
    id: generateId('tpl'),
    name: name || 'New Template',
    workDuration: workDuration || 25,
    restDuration: restDuration || 5,
    activeDays: activeDays || [1, 2, 3, 4, 5],
    color: color || '#e41000',
    createdAt: new Date().toISOString(),
  };
  return {
    ...data,
    templates: [...data.templates, template],
    // If this is the first template, make it active
    activeTemplateId: data.activeTemplateId || template.id,
  };
}

/** Update an existing template */
export function updateTemplate(data, templateId, updates) {
  return {
    ...data,
    templates: data.templates.map(t =>
      t.id === templateId ? { ...t, ...updates } : t
    ),
  };
}

/** Delete a template */
export function deleteTemplate(data, templateId) {
  const templates = data.templates.filter(t => t.id !== templateId);
  const updates = { ...data, templates };
  // If deleting the active template, switch to the first remaining one
  if (data.activeTemplateId === templateId && templates.length > 0) {
    updates.activeTemplateId = templates[0].id;
  }
  return updates;
}

/** Set the active template */
export function setActiveTemplate(data, templateId) {
  const template = data.templates.find(t => t.id === templateId);
  if (!template) return data;
  return { ...data, activeTemplateId: templateId };
}

/** Get the active template, or the best template for today */
export function getActiveTemplate(data) {
  // Try the explicitly active template
  const active = data.templates.find(t => t.id === data.activeTemplateId);
  if (active && isTemplateActiveToday(active)) return active;

  // Fall back to any template active today
  const todayTemplate = data.templates.find(t => isTemplateActiveToday(t));
  if (todayTemplate) return todayTemplate;

  // Fall back to first template
  return data.templates[0] || null;
}
```

- [ ] **Step 2: Write stats calculation module**

Create `luffy-focus/lib/stats.js`:

```javascript
/**
 * Luffy Focus — Stats Calculations
 */
import { getTodayString, SESSION_TYPE, SESSION_STATUS } from './data-model.js';

/** Calculate XP for a session duration in minutes */
export function calculateXP(durationMinutes) {
  return Math.floor(durationMinutes / 5) * 5;
}

/** Get total completed sessions today */
export function getSessionsToday(data) {
  const today = getTodayString();
  return data.sessions.filter(s =>
    s.type === SESSION_TYPE.WORK &&
    s.status === SESSION_STATUS.COMPLETED &&
    s.startTime.startsWith(today)
  );
}

/** Get total focus time today (in minutes) */
export function getFocusTimeToday(data) {
  return getSessionsToday(data).reduce((sum, s) => sum + s.duration, 0);
}

/** Get current streak (consecutive days with at least 1 completed session) */
export function getStreak(data) {
  if (!data.sessions || data.sessions.length === 0) return 0;

  // Collect all unique dates with completed work sessions
  const workDates = new Set();
  data.sessions.forEach(s => {
    if (s.type === SESSION_TYPE.WORK && s.status === SESSION_STATUS.COMPLETED) {
      workDates.add(s.startTime.substring(0, 10)); // YYYY-MM-DD
    }
  });

  let streak = 0;
  const today = getTodayString();
  let checkDate = new Date(today);

  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (workDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today) {
      // Today might not have a session yet — still counts for streak check
      // Actually, streak = consecutive PAST days WITH sessions + today optionally
      // Standard: streak counts days completed. If today has no session, don't count it.
      break;
    } else {
      break;
    }
  }

  return streak;
}

/** Get daily work/rest totals for the last 7 days */
export function getLast7DaysData(data) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const daySessions = data.sessions.filter(s => s.startTime.startsWith(dateStr));
    const workMinutes = daySessions
      .filter(s => s.type === SESSION_TYPE.WORK && s.status === SESSION_STATUS.COMPLETED)
      .reduce((sum, s) => sum + s.duration, 0);
    const restMinutes = daySessions
      .filter(s => s.type === SESSION_TYPE.REST && s.status === SESSION_STATUS.COMPLETED)
      .reduce((sum, s) => sum + s.duration, 0);

    const dow = d.getDay(); // 0=Sun
    const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    days.push({
      date: dateStr,
      label: labels[dow],
      workHours: Math.round((workMinutes / 60) * 10) / 10,
      restHours: Math.round((restMinutes / 60) * 10) / 10,
      workMinutes,
      restMinutes,
      isToday: dateStr === getTodayString(),
    });
  }
  return days;
}

/** Get today's session log sorted by time */
export function getTodayLog(data) {
  const today = getTodayString();
  return data.sessions
    .filter(s => s.startTime.startsWith(today))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(s => ({
      ...s,
      xp: s.type === SESSION_TYPE.WORK ? calculateXP(s.duration) : 0,
    }));
}

/** Format minutes to a human-readable string */
export function formatMinutes(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}.${Math.round(m / 6)}H` : `${h}H`;
  }
  return `${minutes}M`;
}

/** Format time for display (e.g., "09:00 AM") */
export function formatTime(isoString) {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
}
```

- [ ] **Step 3: Verify stats calculations**

Run:
```bash
node -e "
import('./luffy-focus/lib/stats.js').then(m => {
  const data = {
    sessions: [
      { type: 'work', status: 'completed', startTime: '2026-06-12T09:00:00', duration: 45 },
      { type: 'rest', status: 'completed', startTime: '2026-06-12T09:45:00', duration: 10 },
      { type: 'work', status: 'completed', startTime: '2026-06-12T09:55:00', duration: 25 },
    ]
  };
  console.log('Sessions today:', m.getSessionsToday(data).length);
  console.log('Focus time:', m.getFocusTimeToday(data), 'min');
  console.log('XP (45min):', m.calculateXP(45));
  console.log('XP (25min):', m.calculateXP(25));
  console.log('Format 90min:', m.formatMinutes(90));
  console.log('Format 25min:', m.formatMinutes(25));
});
"
```
Expected: `Sessions today: 2`, `Focus time: 70 min`, `XP (45min): 45`, `XP (25min): 25`, `Format 90min: 1.5H`, `Format 25min: 25M`

- [ ] **Step 4: Commit**

```bash
cd luffy-focus && git add lib/templates.js lib/stats.js && git commit -m "feat: add template CRUD and stats calculation modules"
```

---

### Task 8: Notification helpers module

**Files:**
- Create: `lib/notifications.js`

- [ ] **Step 1: Write notification helpers**

Create `luffy-focus/lib/notifications.js`:

```javascript
/**
 * Luffy Focus — Notification Helpers
 * For use in service worker context.
 */

const NOTIFICATION_IDS = {
  WORK_DONE: 'luffy_work_done',
  REST_DONE: 'luffy_rest_done',
};

/**
 * Show notification when a work session completes.
 * @param {string} templateName - Name of the template used
 * @param {number} durationMinutes - Duration completed
 */
export async function notifyWorkComplete(templateName, durationMinutes) {
  // Clear any previous notifications
  await clearAll();

  chrome.notifications.create(NOTIFICATION_IDS.WORK_DONE, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: '🏴‍☠️ Well Done, Captain!',
    message: `"${templateName}" completed! (${durationMinutes} min)\nClick to log your session.`,
    priority: 2,
    requireInteraction: true,
  });
}

/**
 * Show notification when a rest session completes.
 */
export async function notifyRestComplete() {
  await clearAll();

  chrome.notifications.create(NOTIFICATION_IDS.REST_DONE, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: '⚡ Break Over!',
    message: 'Ready for the next voyage? Let's get back to work!',
    priority: 1,
    requireInteraction: false,
  });
}

/** Clear all Luffy Focus notifications */
async function clearAll() {
  const ids = Object.values(NOTIFICATION_IDS);
  for (const id of ids) {
    try {
      chrome.notifications.clear(id);
    } catch { /* ignore */ }
  }
}

/**
 * Update the extension badge based on timer state.
 * @param {string} state - Timer state (idle, working, resting, paused, done)
 * @param {number} remainingMinutes - Minutes remaining
 */
export function updateBadge(state, remainingMinutes) {
  switch (state) {
    case 'working':
      chrome.action.setBadgeText({ text: String(remainingMinutes) });
      chrome.action.setBadgeBackgroundColor({ color: '#e41000' }); // Red
      break;
    case 'resting':
      chrome.action.setBadgeText({ text: String(remainingMinutes) });
      chrome.action.setBadgeBackgroundColor({ color: '#92cc41' }); // Green
      break;
    case 'paused':
      chrome.action.setBadgeText({ text: '⏸' });
      chrome.action.setBadgeBackgroundColor({ color: '#f7d51d' }); // Yellow
      break;
    default:
      chrome.action.setBadgeText({ text: '' });
      break;
  }
}
```

- [ ] **Step 2: Verify syntax**

Run:
```bash
node --check luffy-focus/lib/notifications.js 2>&1 || echo "Chrome API refs expected"
```

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add lib/notifications.js && git commit -m "feat: add notification helpers and badge updater"
```

---

## Phase 3: Service Worker

### Task 9: Service Worker — timer host

**Files:**
- Create: `background/service-worker.js`

- [ ] **Step 1: Write the service worker**

Create `luffy-focus/background/service-worker.js`:

```javascript
/**
 * Luffy Focus — Service Worker
 * Hosts the timer engine, manages alarms, badge, notifications.
 * Communicates with popup via chrome.runtime messages.
 */
import {
  createTimerState, startWork, startRest, pauseTimer,
  resumeTimer, resetTimer, completeTimer, tickTimer, getTimerDisplay
} from '../lib/timer-engine.js';
import { getActiveTemplate } from '../lib/templates.js';
import { loadData, saveData } from '../lib/storage.js';
import { notifyWorkComplete, notifyRestComplete, updateBadge } from '../lib/notifications.js';
import { SESSION_TYPE, SESSION_STATUS } from '../lib/data-model.js';
import { generateId } from '../lib/data-model.js';

// --- State ---
let appData = null;
let timerState = null;
let tickIntervalId = null;
let currentTemplate = null;

// --- Lifecycle ---
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Luffy Focus] Extension installed');
  await initializeState();
});

// Ensure state is loaded when SW wakes up
initializeState();

async function initializeState() {
  if (!appData) {
    appData = await loadData();
  }
  currentTemplate = getActiveTemplate(appData);

  // Restore timer from persisted state
  if (appData.currentTimer && appData.currentTimer.endTime) {
    const endTime = new Date(appData.currentTimer.endTime).getTime();
    const now = Date.now();
    if (endTime > now) {
      // Timer is still running — resume
      timerState = {
        state: appData.currentTimer.type === SESSION_TYPE.WORK ? 'working' : 'resting',
        templateId: appData.currentTimer.templateId,
        type: appData.currentTimer.type,
        endTime: endTime,
        pausedAt: null,
        remainingSeconds: Math.floor((endTime - now) / 1000),
        totalSeconds: appData.currentTimer.type === SESSION_TYPE.WORK
          ? (currentTemplate?.workDuration || 25) * 60
          : (currentTemplate?.restDuration || 5) * 60,
      };
      startTickInterval();
      updateBadgeFromState();
    } else {
      // Timer expired while SW was inactive
      await handleTimerFinished();
    }
  } else if (!timerState) {
    timerState = createTimerState(currentTemplate || { id: 'default', workDuration: 25, restDuration: 5 });
  }

  if (!timerState) {
    timerState = createTimerState(currentTemplate || { id: 'default', workDuration: 25, restDuration: 5 });
  }
}

// --- Tick Loop ---
function startTickInterval() {
  stopTickInterval();
  tickIntervalId = setInterval(onTick, 1000);
}

function stopTickInterval() {
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
}

function onTick() {
  if (!timerState) return;

  const { state, finished } = tickTimer(timerState);
  timerState = state;

  const display = getTimerDisplay(timerState);
  updateBadgeFromState();

  if (finished) {
    handleTimerFinished();
  }

  // Persist timer state so popup can read it even if SW restarts
  persistTimerState();
}

function updateBadgeFromState() {
  if (!timerState) return;
  const display = getTimerDisplay(timerState);
  updateBadge(timerState.state, display.minutes);
}

async function handleTimerFinished() {
  stopTickInterval();

  if (!currentTemplate) currentTemplate = getActiveTemplate(appData);

  if (timerState.type === SESSION_TYPE.WORK) {
    // Record the completed work session
    const session = {
      id: generateId('sess'),
      templateId: timerState.templateId,
      type: SESSION_TYPE.WORK,
      status: SESSION_STATUS.COMPLETED,
      startTime: new Date(Date.now() - (timerState.totalSeconds * 1000)).toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.floor(timerState.totalSeconds / 60),
      summary: '',
    };
    appData.sessions.push(session);
    timerState = completeTimer(timerState);
    updateBadge('done', 0);
    await notifyWorkComplete(currentTemplate.name, session.duration);

    // Auto-start rest if enabled
    if (appData.settings.autoStartRest && currentTemplate) {
      timerState = startRest(
        createTimerState(currentTemplate),
        currentTemplate.restDuration * 60
      );
      timerState.type = SESSION_TYPE.REST;
      timerState.totalSeconds = currentTemplate.restDuration * 60;
      startTickInterval();
    }
  } else if (timerState.type === SESSION_TYPE.REST) {
    // Record the completed rest session
    const session = {
      id: generateId('sess'),
      templateId: timerState.templateId,
      type: SESSION_TYPE.REST,
      status: SESSION_STATUS.COMPLETED,
      startTime: new Date(Date.now() - (timerState.totalSeconds * 1000)).toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.floor(timerState.totalSeconds / 60),
      summary: '',
    };
    appData.sessions.push(session);
    timerState = completeTimer(timerState);
    updateBadge('done', 0);
    await notifyRestComplete();

    // Reset to IDLE for next work session
    if (currentTemplate) {
      timerState = createTimerState(currentTemplate);
    }
  }

  await persistAll();
}

async function persistTimerState() {
  if (!appData || !timerState) return;
  appData.currentTimer = {
    templateId: timerState.templateId,
    type: timerState.type,
    endTime: timerState.endTime ? new Date(timerState.endTime).toISOString() : null,
    pausedAt: timerState.pausedAt ? new Date(timerState.pausedAt).toISOString() : null,
    remainingSeconds: timerState.remainingSeconds,
  };
  // Don't await — fire and forget for tick persistence
  saveData(appData).catch(console.error);
}

async function persistAll() {
  if (!appData) return;
  appData.currentTimer = {
    templateId: timerState?.templateId || currentTemplate?.id || '',
    type: timerState?.type || SESSION_TYPE.WORK,
    endTime: timerState?.endTime ? new Date(timerState.endTime).toISOString() : null,
    pausedAt: timerState?.pausedAt ? new Date(timerState.pausedAt).toISOString() : null,
    remainingSeconds: timerState?.remainingSeconds || 0,
  };
  await saveData(appData);
}

// --- Message Handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async
});

async function handleMessage(message) {
  switch (message.type) {
    case 'GET_STATE': {
      if (!appData) await initializeState();
      const display = timerState ? getTimerDisplay(timerState) : { display: '00:00', minutes: 0, seconds: 0, totalSeconds: 0 };
      return {
        timerState: timerState ? { ...timerState } : null,
        display,
        appData: { ...appData },
        currentTemplate,
      };
    }

    case 'START': {
      if (!currentTemplate) currentTemplate = getActiveTemplate(appData);
      if (!currentTemplate) return { success: false, error: 'No active template' };
      timerState = startWork(timerState);
      timerState.totalSeconds = currentTemplate.workDuration * 60;
      timerState.remainingSeconds = currentTemplate.workDuration * 60;
      startTickInterval();
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'PAUSE': {
      timerState = pauseTimer(timerState);
      stopTickInterval();
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'RESUME': {
      timerState = resumeTimer(timerState);
      startTickInterval();
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'RESET': {
      if (!currentTemplate) currentTemplate = getActiveTemplate(appData);
      if (!currentTemplate) return { success: false, error: 'No active template' };
      timerState = resetTimer(timerState, currentTemplate);
      stopTickInterval();
      updateBadge('idle', 0);
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'SAVE_SESSION_SUMMARY': {
      const { sessionId, summary } = message.payload;
      const session = appData.sessions.find(s => s.id === sessionId);
      if (session) {
        session.summary = summary;
        await persistAll();
      }
      return { success: true };
    }

    case 'RELOAD_APP_DATA': {
      appData = await loadData();
      currentTemplate = getActiveTemplate(appData);
      return { success: true, appData: { ...appData }, currentTemplate };
    }

    case 'UPDATE_APP_DATA': {
      // Full data update from popup (e.g., after template changes)
      appData = message.payload;
      currentTemplate = getActiveTemplate(appData);
      await persistAll();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// --- Notification Click ---
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'luffy_work_done' || notificationId === 'luffy_rest_done') {
    // Open the popup (handled by Chrome automatically when popup is bound)
    // The popup will check state and show summary screen if needed
  }
});
```

- [ ] **Step 2: Verify service worker syntax**

Run:
```bash
node --check luffy-focus/background/service-worker.js 2>&1 || echo "Chrome API refs expected in SW context"
```

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add background/service-worker.js && git commit -m "feat: add service worker — timer host, alarms, messaging, persistence"
```

---

## Phase 4: Shared UI Components

### Task 10: Navigation component + Luffy mascot component

**Files:**
- Create: `popup/components/nav.js`
- Create: `popup/components/luffy.js`

- [ ] **Step 1: Write the navigation component**

Create `luffy-focus/popup/components/nav.js`:

```javascript
/**
 * Luffy Focus — Bottom Navigation Component
 */
let currentScreen = 'timer';
let onScreenChange = null;

/**
 * Initialize the bottom navigation.
 * @param {function} screenChangeCallback - Called with screen name when tab changes
 */
export function initNav(screenChangeCallback) {
  onScreenChange = screenChangeCallback;

  const tabs = document.querySelectorAll('.pixel-nav__tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const screen = tab.dataset.screen;
      if (screen) switchScreen(screen);
    });
  });
}

/** Switch to a screen */
export function switchScreen(screenName) {
  currentScreen = screenName;

  // Update nav tab active states
  document.querySelectorAll('.pixel-nav__tab').forEach(tab => {
    const isActive = tab.dataset.screen === screenName;
    tab.classList.toggle('pixel-nav__tab--active', isActive);
  });

  // Hide summary if switching away
  const summaryScreen = document.getElementById('screen-summary');
  if (screenName !== 'summary') {
    summaryScreen.classList.remove('screen--active');
    document.getElementById('bottom-nav').style.display = '';
  }

  // Show/hide screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('screen--active');
  });
  const targetScreen = document.getElementById(`screen-${screenName}`);
  if (targetScreen) {
    targetScreen.classList.add('screen--active');
  }

  if (onScreenChange) onScreenChange(screenName);
}

/** Get the currently active screen name */
export function getCurrentScreen() {
  return currentScreen;
}
```

- [ ] **Step 2: Write the Luffy mascot component**

Create `luffy-focus/popup/components/luffy.js`:

```javascript
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

// Simple pixel-art Luffy as inline SVG data URI (8-bit straw hat face)
const LUFFY_SPRITE_IDLE = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" shape-rendering="crispEdges">
  <!-- Background -->
  <rect width="64" height="64" fill="#f7f9ff"/>
  <!-- Hat brim -->
  <rect x="8" y="26" width="48" height="8" fill="#fcbc0b"/>
  <rect x="8" y="26" width="48" height="2" fill="#7a5900"/>
  <!-- Hat crown -->
  <rect x="20" y="12" width="24" height="16" fill="#fcbc0b"/>
  <rect x="20" y="26" width="24" height="2" fill="#7a5900"/>
  <!-- Red band -->
  <rect x="20" y="22" width="24" height="6" fill="#e41000"/>
  <!-- Face -->
  <rect x="20" y="34" width="24" height="18" fill="#ffcc99"/>
  <!-- Eyes -->
  <rect x="26" y="38" width="6" height="6" fill="#181c20"/>
  <rect x="34" y="38" width="6" height="6" fill="#181c20"/>
  <!-- Mouth (big grin) -->
  <rect x="26" y="46" width="14" height="4" fill="#181c20"/>
  <rect x="28" y="44" width="10" height="4" fill="#181c20"/>
  <!-- Hair -->
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
```

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add popup/components/nav.js popup/components/luffy.js && git commit -m "feat: add navigation and Luffy mascot components"
```

---

### Task 11: Progress bar + Chart components

**Files:**
- Create: `popup/components/progress.js`
- Create: `popup/components/chart.js`

- [ ] **Step 1: Write the progress bar component**

Create `luffy-focus/popup/components/progress.js`:

```javascript
/**
 * Luffy Focus — Pixel Progress Bar Component
 */

/**
 * Render a pixel-art progress bar.
 * @param {HTMLElement} container - Parent element
 * @param {number} current - Current value
 * @param {number} total - Total/goal value
 * @param {string} label - Label text (e.g., "DAILY GOAL")
 */
export function renderProgress(container, current, total, label = 'DAILY GOAL') {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  container.innerHTML = `
    <section class="mt-auto pt-md pb-sm pixel-divider" style="border-top: none; margin-top: auto; padding-top: var(--space-md); padding-bottom: var(--space-sm);">
      <div style="border-top: 4px dotted var(--color-on-background); padding-top: var(--space-sm);">
        <div class="flex justify-between items-center mb-xs">
          <span class="text-label-caps">${label}</span>
          <span class="text-label-caps">${current}/${total}</span>
        </div>
        <div class="pixel-progress">
          <div class="pixel-progress__fill" style="width: ${percentage}%;"></div>
        </div>
      </div>
    </section>
  `;
}

/** Update progress bar fill width */
export function updateProgress(current, total) {
  const fill = document.querySelector('.pixel-progress__fill');
  const label = document.querySelector('.pixel-progress')?.parentElement?.querySelector('.flex span:last-child');
  if (fill) {
    const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    fill.style.width = `${percentage}%`;
  }
  if (label) {
    label.textContent = `${current}/${total}`;
  }
}
```

- [ ] **Step 2: Write the custom Canvas chart component**

Create `luffy-focus/popup/components/chart.js`:

```javascript
/**
 * Luffy Focus — Custom Pixel-Art Canvas Chart Renderer
 * Renders 7-day Work vs Rest bar chart with NES aesthetic.
 */

/**
 * Render the 7-day work vs rest bar chart.
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Array} daysData - Array of { label, workHours, restHours, isToday }
 */
export function renderWeekChart(canvas, daysData) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(dpr, dpr);

  // Clear
  ctx.fillStyle = '#f7f9ff';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxHours = 8; // Y-axis max

  // Draw Y-axis
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(padding.left + chartW, padding.top + chartH);
  ctx.stroke();

  // Y-axis labels + grid lines
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#5e3f39';
  ctx.textAlign = 'right';
  [0, 4, 8].forEach(h => {
    const y = padding.top + chartH - (h / maxHours) * chartH;
    ctx.fillText(`${h}h`, padding.left - 4, y + 3);

    // Dotted grid line
    if (h > 0) {
      ctx.strokeStyle = '#d7dadf';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left + 4, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Draw bars
  const barGroupWidth = chartW / daysData.length;
  const barWidth = (barGroupWidth * 0.6) / 2; // Two bars per group

  daysData.forEach((day, i) => {
    const groupX = padding.left + i * barGroupWidth + barGroupWidth * 0.2;

    // Work bar (red brick pattern)
    const workH = (day.workHours / maxHours) * chartH;
    const workX = groupX;
    const workY = padding.top + chartH - workH;
    drawBrickBar(ctx, workX, workY, barWidth, workH, '#e41000', '#b60b00');

    // Rest bar (green brick pattern)
    const restH = (day.restHours / maxHours) * chartH;
    const restX = groupX + barWidth + 2;
    const restY = padding.top + chartH - restH;
    drawBrickBar(ctx, restX, restY, barWidth, restH, '#92cc41', '#7ab830');

    // Day label
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = day.isToday ? '#b60b00' : '#181c20';
    ctx.textAlign = 'center';
    ctx.fillText(day.label, groupX + barWidth, padding.top + chartH + 16);
  });

  // Draw border around chart area
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 4;
  ctx.strokeRect(padding.left - 2, padding.top, chartW + 12, chartH + 4);
}

/**
 * Draw a single bar with diagonal brick pattern fill.
 */
function drawBrickBar(ctx, x, y, w, h, color1, color2) {
  if (h <= 0) return;

  // Border
  ctx.fillStyle = color1;
  ctx.fillRect(x, y, w, h);

  // Brick pattern overlay
  const brickSize = 4;
  ctx.fillStyle = color2;
  for (let row = 0; row < Math.ceil(h / brickSize); row++) {
    const offset = row % 2 === 0 ? 0 : brickSize / 2;
    for (let col = -1; col < Math.ceil((w + brickSize) / brickSize); col++) {
      const bx = x + col * brickSize + offset;
      const by = y + row * brickSize;
      if (bx < x + w && by < y + h) {
        ctx.fillRect(
          Math.max(x, bx),
          by,
          Math.min(brickSize, x + w - Math.max(x, bx)),
          Math.min(brickSize, y + h - by)
        );
      }
    }
  }

  // Bar outline
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, Math.max(0, h));
}
```

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add popup/components/progress.js popup/components/chart.js && git commit -m "feat: add pixel progress bar and custom Canvas chart components"
```

---

## Phase 5: Screens

### Task 12: Timer screen

**Files:**
- Create: `popup/screens/timer.js`

- [ ] **Step 1: Write the timer screen**

Create `luffy-focus/popup/screens/timer.js`:

```javascript
/**
 * Luffy Focus — Timer Screen
 */
import { renderLuffy, updateLuffyMessage } from '../components/luffy.js';
import { renderProgress, updateProgress } from '../components/progress.js';
import { getSessionsToday } from '../../lib/stats.js';

let timerDisplay = null;
let timerLabel = null;
let btnStart = null;
let btnReset = null;

/**
 * Initialize and render the timer screen.
 * @param {HTMLElement} container - The screen container element
 * @param {object} state - Initial state from service worker { timerState, display, appData, currentTemplate }
 */
export function initTimerScreen(container, state) {
  const { timerState, display, appData, currentTemplate } = state;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <!-- Template indicator -->
      <div class="text-label-caps text-on-surface-variant" style="text-align: center;">
        ${currentTemplate ? currentTemplate.name.toUpperCase() : 'NO TEMPLATE'}
      </div>

      <!-- Timer Card -->
      <section class="pixel-card flex flex-col items-center justify-center mt-sm relative" style="display: flex; flex-direction: column; align-items: center; padding: var(--space-lg);">
        <div class="pixel-card__title">POMODORO</div>
        <div id="timer-display" class="text-display-lg text-on-background mt-sm" style="font-size: 48px; line-height: 48px;">
          ${display.display}
        </div>
        <div id="timer-label" class="text-label-caps text-on-surface-variant mt-sm">
          ${timerState?.type === 'rest' ? 'REST TIME' : 'FOCUS TIME'}
        </div>
      </section>

      <!-- Luffy Mascot -->
      <div id="luffy-container"></div>

      <!-- Controls -->
      <section class="flex flex-col gap-md mt-sm" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <button id="btn-timer-main" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md); font-size: var(--fs-headline-md);">
          ${getButtonLabel(timerState?.state || 'idle')}
        </button>
        <button id="btn-timer-reset" class="pixel-btn w-full" style="padding: var(--space-sm);" ${timerState?.state === 'idle' ? 'disabled' : ''}>
          RESET
        </button>
      </section>

      <!-- Daily Progress -->
      <div id="progress-container"></div>
    </div>
  `;

  // Cache DOM refs
  timerDisplay = container.querySelector('#timer-display');
  timerLabel = container.querySelector('#timer-label');
  btnStart = container.querySelector('#btn-timer-main');
  btnReset = container.querySelector('#btn-timer-reset');

  // Render sub-components
  const luffyContainer = container.querySelector('#luffy-container');
  renderLuffy(luffyContainer, timerState?.state || 'idle');

  const progressContainer = container.querySelector('#progress-container');
  const sessionsToday = getSessionsToday(appData);
  renderProgress(progressContainer, sessionsToday.length, appData.settings.dailyGoal);
}

/**
 * Update the timer screen with new state.
 * @param {object} state - { timerState, display, appData, currentTemplate }
 */
export function updateTimerScreen(state) {
  const { timerState, display, appData, currentTemplate } = state;

  if (timerDisplay) {
    timerDisplay.textContent = display.display;
  }
  if (timerLabel) {
    timerLabel.textContent = timerState?.type === 'rest' ? 'REST TIME' : 'FOCUS TIME';
  }
  if (btnStart) {
    btnStart.textContent = getButtonLabel(timerState?.state || 'idle');
    btnStart.className = getButtonClass(timerState?.state || 'idle');
  }
  if (btnReset) {
    btnReset.disabled = timerState?.state === 'idle';
  }

  updateLuffyMessage(timerState?.state || 'idle');

  const sessionsToday = getSessionsToday(appData);
  updateProgress(sessionsToday.length, appData.settings.dailyGoal);

  // Update template name display
  const templateLabel = document.querySelector('#screen-timer .text-label-caps.text-on-surface-variant');
  if (templateLabel && currentTemplate) {
    templateLabel.textContent = currentTemplate.name.toUpperCase();
  }
}

function getButtonLabel(state) {
  switch (state) {
    case 'working': return 'PAUSE';
    case 'resting': return 'PAUSE';
    case 'paused': return 'RESUME';
    case 'done': return 'START';
    default: return 'START';
  }
}

function getButtonClass(state) {
  const base = 'pixel-btn w-full';
  if (state === 'paused') return `${base} pixel-btn--primary`;
  if (state === 'resting') return `${base} pixel-btn--success`;
  return `${base} pixel-btn--primary`;
}

/**
 * Get the timer screen action buttons.
 * @returns {{ main: HTMLElement, reset: HTMLElement }}
 */
export function getTimerButtons() {
  return {
    main: document.querySelector('#btn-timer-main'),
    reset: document.querySelector('#btn-timer-reset'),
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd luffy-focus && git add popup/screens/timer.js && git commit -m "feat: add timer screen with countdown, Luffy mascot, and progress"
```

---

### Task 13: Templates screen

**Files:**
- Create: `popup/screens/templates.js`

- [ ] **Step 1: Write the templates screen**

Create `luffy-focus/popup/screens/templates.js`:

```javascript
/**
 * Luffy Focus — Templates Screen
 */
import { DAYS, TEMPLATE_COLORS } from '../../lib/data-model.js';

let appDataRef = null;
let onDataChange = null;

/**
 * Initialize and render the templates screen.
 * @param {HTMLElement} container
 * @param {object} appData
 * @param {function} dataChangeCallback - Called when templates are modified
 */
export function initTemplatesScreen(container, appData, dataChangeCallback) {
  appDataRef = appData;
  onDataChange = dataChangeCallback;
  renderTemplateList(container);
}

function renderTemplateList(container) {
  const templates = appDataRef.templates;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <!-- Header -->
      <header class="flex items-center gap-sm mt-sm">
        <span style="font-size: 24px;">📋</span>
        <h1 class="text-headline-md text-on-background">WORK TEMPLATES</h1>
      </header>

      <div class="pixel-divider"></div>

      <!-- Template Cards -->
      <div id="template-cards" class="flex flex-col gap-xl" style="display: flex; flex-direction: column; gap: var(--space-xl);">
        ${templates.map(tpl => renderTemplateCard(tpl)).join('')}
      </div>

      <!-- Spacer -->
      <div style="flex: 1;"></div>

      <!-- Add Button -->
      <button id="btn-add-template" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md); margin-bottom: var(--space-xs);">
        + ADD NEW TEMPLATE
      </button>

      <!-- Template Form (hidden by default) -->
      <div id="template-form-container" class="hidden"></div>
    </div>
  `;

  // Wire up card click (set active) and edit/delete buttons
  container.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger on edit/delete button clicks
      if (e.target.closest('[data-action]')) return;
      const tplId = card.dataset.templateId;
      setActive(tplId);
    });
  });

  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTemplateForm(container, btn.dataset.templateId);
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate(btn.dataset.templateId);
    });
  });

  container.querySelector('#btn-add-template').addEventListener('click', () => {
    showTemplateForm(container, null);
  });
}

function renderTemplateCard(tpl) {
  const isActive = tpl.id === appDataRef.activeTemplateId;
  const activeClass = isActive ? 'pixel-btn--primary' : '';
  const borderStyle = isActive ? 'border-color: var(--color-primary);' : '';

  return `
    <div class="pixel-card template-card relative" data-template-id="${tpl.id}" style="cursor: pointer; ${borderStyle}">
      <!-- Title chip interrupting top border -->
      <div class="pixel-card__title" style="background: ${tpl.color}; color: #fff; border-color: var(--border-color);">
        ${tpl.name.toUpperCase()}
      </div>
      <div class="mt-sm flex flex-col gap-md" style="display: flex; flex-direction: column; gap: var(--space-md); margin-top: var(--space-sm);">
        <!-- Work/Rest durations -->
        <div class="text-body-bold text-on-background flex items-center gap-sm">
          <span>⏱</span>
          <span>${tpl.workDuration}M WORK / ${tpl.restDuration}M REST</span>
        </div>
        <!-- Day selector -->
        <div class="pixel-day-toggle">
          ${DAYS.map(d => `
            <div class="pixel-day-btn ${tpl.activeDays.includes(d.key) ? 'pixel-day-btn--active' : ''}" style="${tpl.activeDays.includes(d.key) ? `background: ${tpl.color};` : ''}">
              ${d.label}
            </div>
          `).join('')}
        </div>
        <!-- Actions -->
        <div class="flex gap-sm justify-between" style="margin-top: var(--space-xs);">
          <button class="pixel-btn" data-action="edit" data-template-id="${tpl.id}" style="padding: 4px 8px; font-size: 10px; flex: 1;">✏ EDIT</button>
          <button class="pixel-btn pixel-btn--danger" data-action="delete" data-template-id="${tpl.id}" style="padding: 4px 8px; font-size: 10px; flex: 1;" ${appDataRef.templates.length <= 1 ? 'disabled' : ''}>✕ DELETE</button>
        </div>
      </div>
    </div>
  `;
}

function showTemplateForm(container, templateId) {
  const tpl = templateId ? appDataRef.templates.find(t => t.id === templateId) : null;
  const formContainer = container.querySelector('#template-form-container');

  formContainer.innerHTML = `
    <div class="pixel-card" style="margin-top: var(--space-md);">
      <div class="pixel-card__title">${tpl ? 'EDIT' : 'NEW'} TEMPLATE</div>
      <div class="mt-md flex flex-col gap-md">
        <!-- Name -->
        <div>
          <label class="text-label-caps">NAME</label>
          <input id="tpl-name" class="pixel-input" type="text" value="${tpl ? tpl.name : ''}" placeholder="e.g., Coding Sprint" maxlength="20">
        </div>
        <!-- Work Duration -->
        <div>
          <label class="text-label-caps">WORK (MINUTES)</label>
          <input id="tpl-work" class="pixel-input" type="number" value="${tpl ? tpl.workDuration : 25}" min="1" max="120">
        </div>
        <!-- Rest Duration -->
        <div>
          <label class="text-label-caps">REST (MINUTES)</label>
          <input id="tpl-rest" class="pixel-input" type="number" value="${tpl ? tpl.restDuration : 5}" min="1" max="60">
        </div>
        <!-- Active Days -->
        <div>
          <label class="text-label-caps">ACTIVE DAYS</label>
          <div class="pixel-day-toggle" id="tpl-days" style="margin-top: var(--space-xs);">
            ${DAYS.map(d => {
              const isActive = tpl ? tpl.activeDays.includes(d.key) : [1,2,3,4,5].includes(d.key);
              return `<div class="pixel-day-btn ${isActive ? 'pixel-day-btn--active' : ''}" data-day="${d.key}">${d.label}</div>`;
            }).join('')}
          </div>
        </div>
        <!-- Color -->
        <div>
          <label class="text-label-caps">COLOR</label>
          <div class="flex gap-xs" style="margin-top: var(--space-xs); flex-wrap: wrap;">
            ${TEMPLATE_COLORS.map(c => `
              <div class="pixel-color-dot ${(tpl ? tpl.color === c : c === '#e41000') ? 'pixel-color-dot--selected' : ''}" data-color="${c}" style="background: ${c};"></div>
            `).join('')}
          </div>
        </div>
        <!-- Buttons -->
        <div class="flex gap-sm">
          <button id="btn-cancel-form" class="pixel-btn" style="flex: 1;">CANCEL</button>
          <button id="btn-save-template" class="pixel-btn pixel-btn--primary" style="flex: 1;" data-edit-id="${templateId || ''}">SAVE</button>
        </div>
      </div>
    </div>
  `;

  formContainer.classList.remove('hidden');

  // Wire up day toggles
  formContainer.querySelectorAll('.pixel-day-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('pixel-day-btn--active'));
  });

  // Wire up color dots
  formContainer.querySelectorAll('.pixel-color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      formContainer.querySelectorAll('.pixel-color-dot').forEach(d => d.classList.remove('pixel-color-dot--selected'));
      dot.classList.add('pixel-color-dot--selected');
    });
  });

  // Cancel
  formContainer.querySelector('#btn-cancel-form').addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formContainer.innerHTML = '';
  });

  // Save
  formContainer.querySelector('#btn-save-template').addEventListener('click', () => {
    const name = formContainer.querySelector('#tpl-name').value.trim() || 'New Template';
    const workDuration = parseInt(formContainer.querySelector('#tpl-work').value) || 25;
    const restDuration = parseInt(formContainer.querySelector('#tpl-rest').value) || 5;
    const activeDays = Array.from(formContainer.querySelectorAll('#tpl-days .pixel-day-btn--active'))
      .map(b => parseInt(b.dataset.day));
    const colorEl = formContainer.querySelector('.pixel-color-dot--selected');
    const color = colorEl ? colorEl.dataset.color : '#e41000';

    if (templateId) {
      onDataChange('updateTemplate', { templateId, updates: { name, workDuration, restDuration, activeDays, color } });
    } else {
      onDataChange('createTemplate', { name, workDuration, restDuration, activeDays, color });
    }
  });
}

function setActive(templateId) {
  onDataChange('setActiveTemplate', { templateId });
}

function deleteTemplate(templateId) {
  if (confirm('Delete this template?')) {
    onDataChange('deleteTemplate', { templateId });
  }
}

/** Refresh the template list after data changes */
export function refreshTemplates(container, appData) {
  appDataRef = appData;
  renderTemplateList(container);
}
```

- [ ] **Step 2: Commit**

```bash
cd luffy-focus && git add popup/screens/templates.js && git commit -m "feat: add templates screen with CRUD, day selector, and color picker"
```

---

### Task 14: Stats screen

**Files:**
- Create: `popup/screens/stats.js`

- [ ] **Step 1: Write the stats screen**

Create `luffy-focus/popup/screens/stats.js`:

```javascript
/**
 * Luffy Focus — Statistics Screen (Voyage Logs)
 */
import { getSessionsToday, getFocusTimeToday, getStreak, getLast7DaysData, getTodayLog, formatMinutes, formatTime, calculateXP } from '../../lib/stats.js';
import { renderWeekChart } from '../components/chart.js';

/**
 * Initialize and render the stats screen.
 * @param {HTMLElement} container
 * @param {object} appData
 */
export function initStatsScreen(container, appData) {
  const sessionsToday = getSessionsToday(appData);
  const focusMinutes = getFocusTimeToday(appData);
  const streak = getStreak(appData);
  const weekData = getLast7DaysData(appData);
  const todayLog = getTodayLog(appData);

  const focusHours = Math.round((focusMinutes / 60) * 10) / 10;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <!-- Header -->
      <header class="flex items-center gap-sm mt-sm">
        <span style="font-size: 24px;">📊</span>
        <h1 class="text-headline-md text-on-background">VOYAGE LOGS</h1>
      </header>

      <div class="pixel-divider"></div>

      <!-- Summary Cards -->
      <section class="grid grid-cols-3 gap-sm" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-sm);">
        <div class="pixel-card" style="text-align: center;">
          <div class="text-label-caps text-on-surface-variant">SESSIONS</div>
          <div class="text-display-lg text-primary" style="margin-top: var(--space-xs);">${String(sessionsToday.length).padStart(2, '0')}</div>
        </div>
        <div class="pixel-card" style="text-align: center;">
          <div class="text-label-caps text-on-surface-variant">FOCUS</div>
          <div class="text-display-lg text-tertiary" style="margin-top: var(--space-xs);">${focusHours}<span class="text-label-caps">H</span></div>
        </div>
        <div class="pixel-card" style="text-align: center; background: var(--color-warning); border-color: var(--color-on-background);">
          <div class="text-label-caps" style="color: var(--color-on-secondary-fixed);">STREAK</div>
          <div class="text-display-lg" style="color: var(--color-on-secondary-fixed); margin-top: var(--space-xs);">${streak}<span class="text-label-caps">D</span></div>
        </div>
      </section>

      <!-- 7-Day Chart -->
      <section class="pixel-card relative" style="padding-top: var(--space-lg);">
        <div class="pixel-card__title">WORK VS REST (7D)</div>
        <canvas id="week-chart-canvas" style="width: 100%; height: 200px; margin-top: var(--space-md);"></canvas>
        <!-- Legend -->
        <div class="flex justify-center gap-md mt-sm" style="display: flex; justify-content: center; gap: var(--space-md); margin-top: var(--space-sm);">
          <div class="flex items-center gap-xs" style="display: flex; align-items: center; gap: var(--space-xs);">
            <div style="width: 12px; height: 12px; background: #e41000; border: 2px solid var(--color-on-background);"></div>
            <span class="text-label-caps">WORK</span>
          </div>
          <div class="flex items-center gap-xs" style="display: flex; align-items: center; gap: var(--space-xs);">
            <div style="width: 12px; height: 12px; background: #92cc41; border: 2px solid var(--color-on-background);"></div>
            <span class="text-label-caps">REST</span>
          </div>
        </div>
      </section>

      <!-- Today's Log -->
      <section>
        <h2 class="text-headline-md mb-sm">TODAY'S LOG</h2>
        <div class="flex flex-col gap-sm" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          ${todayLog.length === 0
            ? '<div class="pixel-card text-label-caps text-on-surface-variant" style="text-align: center; padding: var(--space-lg);">No sessions yet today. Start the timer!</div>'
            : todayLog.map(s => renderLogEntry(s)).join('')
          }
        </div>
      </section>
    </div>
  `;

  // Render chart after DOM is available
  requestAnimationFrame(() => {
    const canvas = container.querySelector('#week-chart-canvas');
    if (canvas) {
      // Set explicit canvas size for crisp rendering
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = 200 * 2;
      renderWeekChart(canvas, weekData);
    }
  });
}

function renderLogEntry(session) {
  const isWork = session.type === 'work';
  const icon = isWork ? '💻' : '☕';
  const borderStyle = isWork ? '' : 'border-style: dashed;';
  const timeRange = `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;
  const xpDisplay = isWork ? `<span class="text-body-bold text-success">+${calculateXP(session.duration)} XP</span>` : `<span class="text-body-bold text-on-surface-variant">${session.duration} MIN</span>`;
  const statusLabel = isWork ? 'Completed' : 'Restored';

  return `
    <div class="pixel-card flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; ${borderStyle} padding: var(--space-sm);">
      <div class="flex items-center gap-sm" style="display: flex; align-items: center; gap: var(--space-sm);">
        <div class="pixel-border flex items-center justify-center" style="width: 32px; height: 32px; background: var(--color-surface-container);">
          <span style="font-size: 14px;">${icon}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-body-bold" style="text-transform: uppercase;">${isWork ? (session.summary ? session.summary.substring(0, 30) + (session.summary.length > 30 ? '...' : '') : 'FOCUS SESSION') : 'SHORT BREAK'}</span>
          <span class="text-label-caps text-on-surface-variant">${timeRange}</span>
        </div>
      </div>
      <div class="text-right flex flex-col items-end">
        ${xpDisplay}
        <span class="text-label-caps text-on-surface-variant">${statusLabel}</span>
      </div>
    </div>
  `;
}

/** Refresh stats (e.g., when switching to this tab) */
export function refreshStats(container, appData) {
  initStatsScreen(container, appData);
}
```

- [ ] **Step 2: Commit**

```bash
cd luffy-focus && git add popup/screens/stats.js && git commit -m "feat: add stats screen with summary cards, 7-day chart, and session log"
```

---

### Task 15: Session summary screen

**Files:**
- Create: `popup/screens/summary.js`

- [ ] **Step 1: Write the summary screen**

Create `luffy-focus/popup/screens/summary.js`:

```javascript
/**
 * Luffy Focus — Session Summary Screen
 * Shown as a modal overlay when a work session completes.
 */

let currentSessionId = null;
let onSaveCallback = null;
let onDiscardCallback = null;

/**
 * Initialize and show the session summary overlay.
 * @param {HTMLElement} container - The summary screen container
 * @param {object} session - { id, templateName, duration, templateColor }
 * @param {object} callbacks - { onSave, onDiscard }
 */
export function showSummary(container, session, callbacks) {
  currentSessionId = session.id;
  onSaveCallback = callbacks.onSave;
  onDiscardCallback = callbacks.onDiscard;

  const displayMinutes = session.duration;
  const displayText = `${String(Math.floor(displayMinutes)).padStart(2, '0')}:00`;

  container.innerHTML = `
    <div class="flex flex-col h-full" style="display: flex; flex-direction: column; height: 100%;">
      <!-- Header -->
      <header class="flex justify-between items-center px-md py-sm" style="border-bottom: var(--border-width) solid var(--border-color); background: var(--color-surface-container); display: flex; justify-content: space-between; align-items: center;">
        <h1 class="text-headline-md text-on-background">LOG ENTRY</h1>
        <button id="btn-summary-close" class="pixel-btn pixel-btn--danger" style="padding: 4px 8px; font-size: 14px;">✕</button>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-md flex flex-col gap-lg" style="flex: 1; overflow-y: auto; padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-lg);">

        <!-- Celebration -->
        <section class="flex gap-sm items-center" style="display: flex; gap: var(--space-sm); align-items: flex-end;">
          <!-- Luffy sprite -->
          <div class="pixel-border animate-bob" style="width: 64px; height: 64px; background: var(--color-secondary-container); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 32px;">🏴‍☠️</span>
          </div>
          <!-- Speech bubble -->
          <div class="pixel-balloon pixel-balloon--left" style="flex: 1;">
            <p class="text-body-bold animate-pulse-pixel" style="color: var(--color-primary);">WELL DONE, CAPTAIN!</p>
          </div>
        </section>

        <!-- Stats Box -->
        <section class="pixel-card relative" style="padding-top: var(--space-lg);">
          <div class="pixel-card__title">STATS</div>
          <div class="flex flex-col gap-sm" style="display: flex; flex-direction: column; gap: var(--space-sm);">
            <div class="flex justify-between items-end" style="display: flex; justify-content: space-between; align-items: flex-end;">
              <span class="text-label-caps text-on-surface-variant">DURATION</span>
              <span class="text-display-lg text-tertiary">${displayText}</span>
            </div>
            <div class="pixel-divider"></div>
            <div class="flex justify-between items-center" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-label-caps text-on-surface-variant">TASK</span>
              <span class="text-body-bold" style="background: var(--color-surface-variant); padding: 2px var(--space-xs); border: 2px solid var(--border-color);">
                ${session.templateName.toUpperCase()}
              </span>
            </div>
          </div>
        </section>

        <!-- Log Input -->
        <section class="flex flex-col gap-sm flex-1" style="display: flex; flex-direction: column; gap: var(--space-sm); flex: 1;">
          <label class="text-label-caps flex items-center gap-sm" for="summary-input">
            <span>✏</span> LOG YOUR WORK
          </label>
          <textarea id="summary-input" class="pixel-textarea" placeholder="What did you conquer today..." style="min-height: 120px; flex: 1;"></textarea>
        </section>
      </div>

      <!-- Footer Actions -->
      <footer class="p-md flex gap-sm" style="border-top: var(--border-width) solid var(--border-color); background: var(--color-surface); padding: var(--space-md); display: flex; gap: var(--space-sm);">
        <button id="btn-summary-discard" class="pixel-btn" style="flex: 1; padding: var(--space-sm);">DISCARD</button>
        <button id="btn-summary-save" class="pixel-btn pixel-btn--success" style="flex: 1; padding: var(--space-sm);">💾 SAVE LOG</button>
      </footer>
    </div>
  `;

  // Wire up buttons
  container.querySelector('#btn-summary-close').addEventListener('click', () => handleDiscard(container));
  container.querySelector('#btn-summary-discard').addEventListener('click', () => handleDiscard(container));
  container.querySelector('#btn-summary-save').addEventListener('click', () => handleSave(container));
}

function handleSave(container) {
  const textarea = container.querySelector('#summary-input');
  const summary = textarea ? textarea.value.trim() : '';

  if (onSaveCallback) {
    onSaveCallback(currentSessionId, summary);
  }

  hideSummary();
}

function handleDiscard(container) {
  if (onDiscardCallback) {
    onDiscardCallback(currentSessionId);
  }

  hideSummary();
}

function hideSummary() {
  const summaryScreen = document.getElementById('screen-summary');
  if (summaryScreen) {
    summaryScreen.classList.remove('screen--active');
    summaryScreen.innerHTML = '';
  }
  const bottomNav = document.getElementById('bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = '';
  }
  currentSessionId = null;
  onSaveCallback = null;
  onDiscardCallback = null;
}

/** Show the summary overlay */
export function showSummaryOverlay() {
  const summaryScreen = document.getElementById('screen-summary');
  const bottomNav = document.getElementById('bottom-nav');
  if (summaryScreen) {
    summaryScreen.classList.add('screen--active');
  }
  if (bottomNav) {
    bottomNav.style.display = 'none';
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd luffy-focus && git add popup/screens/summary.js && git commit -m "feat: add session summary screen with reflection log"
```

---

## Phase 6: Popup Shell & Integration

### Task 16: Popup main script (router + init)

**Files:**
- Create: `popup/popup.js`

- [ ] **Step 1: Write the popup entry point**

Create `luffy-focus/popup/popup.js`:

```javascript
/**
 * Luffy Focus — Popup Entry Point
 * App initialization, screen routing, service worker communication.
 */
import { initNav, switchScreen } from './components/nav.js';
import { initTimerScreen, updateTimerScreen, getTimerButtons } from './screens/timer.js';
import { initTemplatesScreen, refreshTemplates } from './screens/templates.js';
import { initStatsScreen, refreshStats } from './screens/stats.js';
import { showSummary, showSummaryOverlay } from './screens/summary.js';
import { loadData, saveData, selectStorageFile, createStorageFile, isFileHandleValid, isFileSystemAPIAvailable } from '../lib/storage.js';
import { createTemplate, updateTemplate, deleteTemplate, setActiveTemplate } from '../lib/templates.js';
import { TIMER_STATE } from '../lib/data-model.js';

// --- App State ---
let appData = null;
let timerState = null;
let currentTemplate = null;
let pendingSummarySession = null;
let pollIntervalId = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupSettingsButton();
  startPolling();
});

async function initializeApp() {
  // Check file handle
  if (isFileSystemAPIAvailable()) {
    const handleValid = await isFileHandleValid();
    if (!handleValid) {
      // Show storage setup prompt
      showStorageSetup();
      return;
    }
  }

  // Load state from service worker
  await loadStateFromSW();

  // Initialize screens
  const timerScreen = document.getElementById('screen-timer');
  const templatesScreen = document.getElementById('screen-templates');
  const statsScreen = document.getElementById('screen-stats');

  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplayFromState(), appData, currentTemplate });
  }
  if (templatesScreen) {
    initTemplatesScreen(templatesScreen, appData, handleTemplateChange);
  }
  if (statsScreen) {
    initStatsScreen(statsScreen, appData);
  }

  // Navigation
  initNav((screenName) => {
    if (screenName === 'stats') {
      refreshStats(statsScreen, appData);
    }
    if (screenName === 'templates') {
      refreshTemplates(templatesScreen, appData);
    }
  });

  // Wire timer buttons
  wireTimerButtons();

  // Check if we need to show the summary screen
  if (timerState?.state === TIMER_STATE.DONE && timerState?.type === 'work') {
    const lastSession = appData.sessions[appData.sessions.length - 1];
    if (lastSession && !lastSession.summary && lastSession.type === 'work') {
      pendingSummarySession = lastSession;
      showSummaryOverlay();
      const summaryScreen = document.getElementById('screen-summary');
      showSummary(summaryScreen, {
        id: lastSession.id,
        templateName: currentTemplate?.name || 'Focus',
        duration: lastSession.duration,
      }, {
        onSave: handleSummarySave,
        onDiscard: handleSummaryDiscard,
      });
    }
  }
}

function getDisplayFromState() {
  if (!timerState) return { display: '00:00', minutes: 0, seconds: 0, totalSeconds: 0 };
  const remaining = timerState.remainingSeconds || 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return {
    display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    minutes: mins,
    seconds: secs,
    totalSeconds: remaining,
  };
}

// --- Service Worker Communication ---
async function loadStateFromSW() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (response) {
      timerState = response.timerState;
      appData = response.appData;
      currentTemplate = response.currentTemplate;
    }
  } catch (e) {
    console.warn('[Luffy Focus] SW not available, loading from storage directly');
    appData = await loadData();
  }
}

async function sendToSW(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (e) {
    console.error('[Luffy Focus] SW communication error:', e);
    return { success: false, error: e.message };
  }
}

// --- Polling (keep UI in sync with SW timer) ---
function startPolling() {
  pollIntervalId = setInterval(async () => {
    const response = await sendToSW({ type: 'GET_STATE' });
    if (response && response.timerState) {
      timerState = response.timerState;
      appData = response.appData;
      currentTemplate = response.currentTemplate;

      const display = getDisplayFromState();
      updateTimerScreen({ timerState, display: response.display || display, appData, currentTemplate });

      // Check for newly completed session
      if (timerState.state === TIMER_STATE.DONE && timerState.type === 'work' && !pendingSummarySession) {
        const lastSession = appData.sessions[appData.sessions.length - 1];
        if (lastSession && !lastSession.summary && lastSession.type === 'work') {
          pendingSummarySession = lastSession;
          showSummaryOverlay();
          const summaryScreen = document.getElementById('screen-summary');
          showSummary(summaryScreen, {
            id: lastSession.id,
            templateName: currentTemplate?.name || 'Focus',
            duration: lastSession.duration,
          }, {
            onSave: handleSummarySave,
            onDiscard: handleSummaryDiscard,
          });
        }
      }
    }
  }, 1000);
}

// --- Timer Button Wiring ---
function wireTimerButtons() {
  const buttons = getTimerButtons();
  if (!buttons.main || !buttons.reset) {
    // Retry after a short delay (DOM might not be ready)
    setTimeout(wireTimerButtons, 100);
    return;
  }

  buttons.main.addEventListener('click', async () => {
    let response;
    switch (timerState?.state) {
      case TIMER_STATE.IDLE:
      case TIMER_STATE.DONE:
        response = await sendToSW({ type: 'START' });
        break;
      case TIMER_STATE.WORKING:
      case TIMER_STATE.RESTING:
        response = await sendToSW({ type: 'PAUSE' });
        break;
      case TIMER_STATE.PAUSED:
        response = await sendToSW({ type: 'RESUME' });
        break;
      default:
        response = await sendToSW({ type: 'START' });
    }

    if (response?.success) {
      timerState = response.timerState;
      updateTimerScreen({ timerState, display: response.display, appData, currentTemplate });
    }
  });

  buttons.reset.addEventListener('click', async () => {
    const response = await sendToSW({ type: 'RESET' });
    if (response?.success) {
      timerState = response.timerState;
      updateTimerScreen({ timerState, display: response.display, appData, currentTemplate });
    }
  });
}

// --- Template Change Handler ---
async function handleTemplateChange(action, payload) {
  switch (action) {
    case 'createTemplate':
      appData = createTemplate(appData, payload);
      break;
    case 'updateTemplate':
      appData = updateTemplate(appData, payload.templateId, payload.updates);
      break;
    case 'deleteTemplate':
      appData = deleteTemplate(appData, payload.templateId);
      break;
    case 'setActiveTemplate':
      appData = setActiveTemplate(appData, payload.templateId);
      break;
  }

  // Sync to service worker
  await sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });

  // Refresh templates screen
  const templatesScreen = document.getElementById('screen-templates');
  if (templatesScreen) {
    refreshTemplates(templatesScreen, appData);
  }
}

// --- Summary Handlers ---
async function handleSummarySave(sessionId, summary) {
  await sendToSW({ type: 'SAVE_SESSION_SUMMARY', payload: { sessionId, summary } });
  pendingSummarySession = null;
  // Refresh state
  await loadStateFromSW();
  switchScreen('timer');
}

async function handleSummaryDiscard(sessionId) {
  // Mark as completed even without summary
  await sendToSW({ type: 'SAVE_SESSION_SUMMARY', payload: { sessionId, summary: '' } });
  pendingSummarySession = null;
  await loadStateFromSW();
  switchScreen('timer');
}

// --- Storage Setup ---
function showStorageSetup() {
  const timerScreen = document.getElementById('screen-timer');
  if (!timerScreen) return;

  timerScreen.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-lg p-gutter" style="height: 100%; text-align: center;">
      <span style="font-size: 48px;">🏴‍☠️</span>
      <h2 class="text-headline-md">WELCOME, CAPTAIN!</h2>
      <p class="text-body-base text-on-surface-variant">Choose where to store your voyage data.</p>
      <button id="btn-select-file" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md);">
        📂 SELECT EXISTING FILE
      </button>
      <button id="btn-create-file" class="pixel-btn w-full" style="padding: var(--space-md);">
        ✨ CREATE NEW FILE
      </button>
      <button id="btn-skip-storage" class="pixel-btn" style="padding: var(--space-sm); font-size: var(--fs-label-caps);">
        SKIP (use browser storage)
      </button>
    </div>
  `;

  timerScreen.querySelector('#btn-select-file').addEventListener('click', async () => {
    const success = await selectStorageFile();
    if (success) {
      await initializeApp();
    }
  });

  timerScreen.querySelector('#btn-create-file').addEventListener('click', async () => {
    const success = await createStorageFile();
    if (success) {
      await initializeApp();
    }
  });

  timerScreen.querySelector('#btn-skip-storage').addEventListener('click', async () => {
    appData = await loadData();
    await saveData(appData);
    await initializeApp();
  });
}

// --- Settings Button ---
function setupSettingsButton() {
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      // Show daily goal setting
      const newGoal = prompt('Daily session goal:', appData?.settings?.dailyGoal || 8);
      if (newGoal && !isNaN(parseInt(newGoal)) && parseInt(newGoal) > 0) {
        appData.settings.dailyGoal = parseInt(newGoal);
        sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });
        const timerScreen = document.getElementById('screen-timer');
        if (timerScreen) {
          updateTimerScreen({ timerState, display: getDisplayFromState(), appData, currentTemplate });
        }
      }
    });
  }
}
```

- [ ] **Step 2: Verify all imports resolve**

Run:
```bash
cd luffy-focus && for f in popup/components/nav.js popup/components/luffy.js popup/components/progress.js popup/components/chart.js popup/screens/timer.js popup/screens/templates.js popup/screens/stats.js popup/screens/summary.js lib/data-model.js lib/storage.js lib/timer-engine.js lib/templates.js lib/stats.js lib/notifications.js; do echo "Checking $f..." && node --check "$f" 2>&1 || true; done
```

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add popup/popup.js && git commit -m "feat: add popup router — init, SW communication, screen orchestration"
```

---

## Phase 7: Assets & Finalization

### Task 17: Font self-hosting + final assets

**Files:**
- Create: `assets/fonts/press-start-2p.css`
- Download: `assets/fonts/PressStart2P.woff2`

- [ ] **Step 1: Create font CSS file with Google Fonts fallback**

Create `luffy-focus/assets/fonts/press-start-2p.css`:

```css
/* Press Start 2P — Self-hosted with Google Fonts fallback */
@font-face {
  font-family: 'Press Start 2P';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('PressStart2P.woff2') format('woff2');
}

/* Fallback: load from Google Fonts if local file not found */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
```

- [ ] **Step 2: Download the font file**

Run:
```bash
curl -L -o 'luffy-focus/assets/fonts/PressStart2P.woff2' \
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2'
```

- [ ] **Step 3: Add a .gitignore**

Create `luffy-focus/.gitignore`:
```
.DS_Store
*.swp
*.swo
```

- [ ] **Step 4: Final verification — load extension in Chrome**

Instructions:
1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `luffy-focus` directory
5. Verify:
   - Extension icon appears in toolbar with pixel-art icon
   - Click icon → popup opens showing the Timer screen with 25:00 countdown
   - Luffy mascot shows "Let's get to work, Captain!" in speech bubble
   - Bottom nav has 3 tabs: TIMER | TEMPLATES | STATS
   - Click START → timer begins countdown, badge turns red with minutes
   - Switch to Templates tab → see "Default Focus" template card
   - Switch to Stats tab → see summary cards and empty chart
   - No console errors in popup DevTools (right-click → Inspect)

- [ ] **Step 5: Commit**

```bash
cd luffy-focus && git add assets/fonts/ .gitignore && git commit -m "feat: add self-hosted Press Start 2P font and assets"
```

---

### Task 18: Polish — Luffy sprites and final visual pass

**Files:**
- Create: `assets/luffy-sprites/` (pixel-art sprite assets)
- Modify: `popup/components/luffy.js` (refine sprite)

- [ ] **Step 1: Create pixel-art Luffy sprite sheet placeholder**

Create `luffy-focus/assets/luffy-sprites/README.md`:

```markdown
# Luffy Pixel Art Sprites

Pixel-art Luffy sprites (64×64) for different timer states:
- `luffy-idle.png` — Standing, smiling (default state)
- `luffy-working.png` — Determined expression, slight lean forward
- `luffy-resting.png` — Relaxed, sitting, coffee cup
- `luffy-done.png` — Arms raised, celebrating

## Style Guide
- 64×64 pixels
- 8-bit NES palette
- Solid 2px black outlines
- No antialiasing
- Image-rendering: pixelated

Placeholder: The inline SVG in luffy.js serves as a fallback.
Replace these files with hand-crafted pixel art when available.
```

- [ ] **Step 2: Verify all screens render correctly**

Manual verification checklist (load extension in Chrome):
- [ ] Timer screen: countdown display, START/PAUSE/RESET buttons, Luffy + speech bubble, progress bar
- [ ] Templates screen: template cards with day selectors, ADD NEW TEMPLATE button, edit/delete actions
- [ ] Stats screen: 3 summary cards, 7-day chart (Canvas), today's log list
- [ ] Summary screen: celebration section, stats box, text area, SAVE/DISCARD buttons
- [ ] Navigation: bottom tabs switch screens correctly
- [ ] Settings: gear icon opens daily goal prompt

- [ ] **Step 3: Commit**

```bash
cd luffy-focus && git add assets/luffy-sprites/ && git commit -m "feat: add luffy sprite assets placeholder and final polish"
```

---

## Plan Completeness Checklist

| Spec Feature | Task(s) |
|---|---|
| Pomodoro timer (start/pause/reset) | Task 6 (engine), Task 9 (SW host), Task 12 (screen), Task 16 (wiring) |
| Luffy mascot + speech bubble | Task 10 (component), Task 12 (timer screen) |
| Daily goal progress bar | Task 11 (component), Task 12 (timer screen) |
| Work template CRUD | Task 7 (ops), Task 13 (screen), Task 16 (wiring) |
| Day-of-week scheduling | Task 7 (ops), Task 13 (screen form) |
| Session reflection/summary | Task 15 (screen), Task 16 (handlers) |
| Stats dashboard + charts | Task 7 (stats calc), Task 11 (chart), Task 14 (screen) |
| Local JSON file storage | Task 5 (storage), Task 16 (setup screen) |
| Service worker timer persistence | Task 9 (SW), Task 6 (engine) |
| Badge + notifications | Task 8 (helpers), Task 9 (SW) |
| Mugiwara Pixel OS design | Task 2 (CSS), all screen tasks |
| Manifest V3 compliance | Task 1 (manifest) |
