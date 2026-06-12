# Luffy Focus Chrome Extension — Design Specification

**Date:** 2026-06-12
**Status:** Approved
**Design System:** Mugiwara Pixel OS (8-bit / NES retro gaming aesthetic)

---

## 1. Project Overview

Luffy Focus is a productivity Chrome extension combining a Pomodoro timer with work template management, session logging, and analytics — all wrapped in a pixel-art One Piece / Luffy theme. The extension operates as a browser action popup (400px wide), with a background service worker handling timer persistence.

### Core Value Proposition

- **Gamified Focus:** Pixel-art Luffy mascot provides contextual motivation messages
- **Flexibility:** Customizable work templates with per-day scheduling
- **Insightful Tracking:** "Voyage Logs" dashboard with pixel-art charts and session history

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────┐
│                 Service Worker                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Timer    │ │ chrome.  │ │ Notifications    │ │
│  │ Engine   │ │ alarms   │ │ + Badge          │ │
│  └────┬─────┘ └──────────┘ └──────────────────┘ │
│       │                                            │
│       │ chrome.runtime.sendMessage / onMessage    │
└───────┼────────────────────────────────────────────┘
        │
┌───────┼────────────────────────────────────────────┐
│       ▼              Popup (400px)                  │
│  ┌──────────────────────────────────────────────┐ │
│  │              popup.js (Router)                │ │
│  │  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │ │
│  │  │ Timer  │ │Templat.│ │Stats │ │Summary │  │ │
│  │  │ Screen │ │ Screen │ │Screen│ │ Screen │  │ │
│  │  └────────┘ └────────┘ └──────┘ └────────┘  │ │
│  │  ┌──────────────────────────────────────┐    │ │
│  │  │      Shared Components (nav, etc)     │    │ │
│  │  └──────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────┘ │
│       │                                            │
│       │ Read/Write                                 │
│       ▼                                            │
│  ┌──────────────────────────────────────────────┐ │
│  │              lib/storage.js                    │ │
│  │  File System Access API (primary JSON file)   │ │
│  │  + chrome.storage.local (handle cache)        │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### 2.2 Communication Flow

1. **Popup opens** → requests current state from service worker via `chrome.runtime.sendMessage`
2. **User starts timer** → popup sends START command to service worker
3. **Service worker** → starts timer tick (setInterval), updates badge, tracks end time
4. **Timer ends** → service worker fires `chrome.notifications.create`, sets badge
5. **Popup re-opens** → reads latest state from service worker
6. **All data persistence** → routed through `lib/storage.js` (shared between popup and SW)

---

## 3. File Structure

```
luffy-focus/
├── manifest.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── service-worker.js        # Timer engine, alarms, badge, notifications, IPC
├── popup/
│   ├── popup.html               # Shell HTML with font loading
│   ├── popup.css                # Mugiwara Pixel OS design token CSS
│   ├── popup.js                 # App init, screen router, storage init
│   ├── screens/
│   │   ├── timer.js             # Timer screen rendering + interaction
│   │   ├── templates.js         # Template list, CRUD form, day selector
│   │   ├── stats.js             # Summary cards, Canvas chart, session log list
│   │   └── summary.js           # Session-end reflection dialog
│   └── components/
│       ├── nav.js               # Bottom tab bar (Timer / Templates / Stats)
│       ├── luffy.js             # Mascot sprite + speech bubble renderer
│       ├── progress.js          # Pixel-brick pattern progress bar
│       └── chart.js             # Custom Canvas2D pixel-art chart renderer
├── lib/
│   ├── storage.js               # Hybrid File API + chrome.storage abstraction
│   ├── timer-engine.js          # Timer state machine (idle → work → rest → done)
│   ├── templates.js             # Template CRUD operations + active template logic
│   ├── stats.js                 # Aggregation, streak calculation, XP formula
│   └── notifications.js         # Chrome notification helpers + sound
└── assets/
    ├── luffy-sprites/           # Pixel-art Luffy sprite sheet images
    └── fonts/                   # Press Start 2P (self-hosted, .woff2)
```

---

## 4. Data Model

### 4.1 JSON File Schema (`luffy-focus-data.json`)

```json
{
  "version": 1,
  "settings": {
    "dailyGoal": 8,
    "notificationsEnabled": true,
    "autoStartRest": false
  },
  "templates": [
    {
      "id": "tpl_001",
      "name": "Coding Sprint",
      "workDuration": 45,
      "restDuration": 10,
      "activeDays": [1, 2, 3, 4, 5],
      "color": "#e41000",
      "createdAt": "2026-06-12T08:00:00Z"
    }
  ],
  "activeTemplateId": "tpl_001",
  "sessions": [
    {
      "id": "sess_001",
      "templateId": "tpl_001",
      "type": "work",
      "status": "completed",
      "startTime": "2026-06-12T09:00:00Z",
      "endTime": "2026-06-12T09:45:00Z",
      "duration": 45,
      "summary": "Fixed the login page authentication bug"
    }
  ],
  "currentTimer": {
    "templateId": "tpl_001",
    "type": "work",
    "endTime": null,
    "pausedAt": null,
    "remainingSeconds": 0
  },
  "storageFilePath": ""
}
```

### 4.2 Storage Strategy

- **Primary:** File System Access API writes to user-chosen JSON file. The `FileSystemFileHandle` is persisted in `chrome.storage.local` for automatic reconnection.
- **Fallback on handle loss:** Prompt user to re-select the file. All data is cached in `chrome.storage.local` so nothing is lost.
- **Write timing:** Save after every session completion, template change, or settings update. Debounced saves during active timer to avoid excessive disk writes.
- **Schema migration:** `version` field enables forward-compatible schema changes.

---

## 5. Screen Specifications

### 5.1 Timer Screen (Default Tab)

**Purpose:** Primary Pomodoro interface — start/pause/reset focus sessions.

**Layout (top to bottom):**
- Header: "LUFFY FOCUS" title + settings gear icon
- Pomodoro card: 48px countdown display (`MM:SS`), "FOCUS TIME" or "REST TIME" label, bordered container with title interrupting top border
- Mascot section: Pixel Luffy sprite (64×64) + speech bubble with contextual message
  - Idle: "Let's get to work, Captain!"
  - Working: "Keep going! You've got this!"
  - Resting: "Take a break, nakama!"
  - Done: "Well done, Captain!"
- Controls: START/PAUSE button (primary red, full width), RESET button (secondary, full width)
- Daily goal progress: label showing "X/Y SESSIONS", pixel-brick pattern progress bar

**States:**
- Idle: START enabled, RESET disabled
- Running: PAUSE enabled, countdown ticking, Luffy working sprite
- Paused: RESUME enabled, countdown frozen
- Rest mode: Same controls but "REST TIME" label, different Luffy message

### 5.2 Templates Screen

**Purpose:** Create, edit, delete, and switch between work templates.

**Layout:**
- Header: "WORK TEMPLATES" title
- Template cards list: each card shows name, work/rest durations, day-of-week selector grid
- Active template highlighted with primary border/color
- Tap a card to set as active template
- "ADD NEW TEMPLATE" button at bottom (primary red)
- Edit mode: inline form or slide-in panel

**Template Card:**
- Title chip interrupting top border (matching template color)
- Work/Rest duration display with icon
- Day selector: 7 blocky squares (M T W T F S S), active days filled with template color, inactive days grey
- Edit/Delete actions (icon buttons)

**Template Form Fields:**
- Template Name (text input)
- Work Duration (number, minutes, min 1, max 120)
- Rest Duration (number, minutes, min 1, max 60)
- Active Days (7 toggle buttons)
- Color picker (preset palette from design system)

### 5.3 Statistics Screen (Voyage Logs)

**Purpose:** Visualize productivity data with charts and session history.

**Layout:**
- Header: "VOYAGE LOGS" with icon
- 3 Summary Cards (horizontal grid):
  - Sessions Today (number + fire icon)
  - Total Focus Time (hours + hourglass icon)
  - Current Streak (days + star icon, gold background)
- 7-Day Work vs Rest Chart:
  - Custom Canvas2D bar chart
  - X-axis: Mon-Sun labels
  - Y-axis: hours (0h, 4h, 8h)
  - Dual bars per day: Work (red brick pattern) + Rest (green brick pattern)
  - Hover tooltip showing exact hours
  - Legend below chart
- Today's Log List:
  - Chronological session entries
  - Each entry: icon, title, time range, duration/XP
  - Work sessions show green "+XP" badge
  - Rest sessions show dashed border style

**XP Formula:** `XP = floor(work_duration_minutes / 5) * 5` (5 XP per 5 minutes of focus)

**Streak Calculation:** Count of consecutive days (including today) with at least 1 completed work session.

### 5.4 Session Summary Screen (Modal Overlay)

**Purpose:** Prompt user to reflect after completing a work session.

**Trigger:** Automatically shown in popup when a work session timer reaches 0. If popup is closed, clicking the notification opens the popup to this screen.

**Layout:**
- Header: "LOG ENTRY" + close button
- Celebration section: Luffy sprite + "WELL DONE, CAPTAIN!" speech bubble (animated pulse)
- Stats box: Duration (read-only, large blue number), Task type (read-only, badge showing template name)
- Text area: "LOG YOUR WORK" label, multiline input for user's reflection summary
- Footer actions: DISCARD button (grey) + SAVE LOG button (green)

**Behavior:**
- Save: Creates a session record with the summary text, dismisses overlay, returns to timer screen
- Discard: Creates a session record without summary (or marks as abandoned based on settings), dismisses overlay

---

## 6. Design System Compliance

All UI must follow the **Mugiwara Pixel OS** design system as defined in `DESIGN.md`:

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| primary | `#b60b00` | CTAs, active states |
| primary-container | `#e41000` | Button hover, accents |
| secondary | `#7a5900` | Highlights, achievements |
| secondary-container | `#fcbc0b` | Gold accents, active tab |
| tertiary | `#004cd9` | Links, focus indicators |
| on-background | `#181c20` | Text, borders (charcoal, NOT #000) |
| success-green | `#92cc41` | Completion, positive actions |
| error-crimson | `#e76e55` | Destructive actions |
| warning-yellow | `#f7d51d` | Streak card |
| surface | `#f7f9ff` | Card backgrounds |
| background | `#f7f9ff` | Page background |

### Typography
- **Font:** Press Start 2P (self-hosted .woff2 for offline)
- **Display (24px/32px):** Timer countdown
- **Headline (16px/24px):** Screen titles
- **Body (12px/20px):** Content text
- **Label (10px/14px):** Metadata, captions

### Spacing
- Grid unit: 4px
- Gutter: 16px (inner popup margin)
- All values must be multiples of 4px

### Visual Rules
- **Borders:** 4px solid `#181c20` on all containers
- **Shadows:** 4px × 4px offset, `#181c20`, no blur
- **Hover:** translate 2px right + down, shadow shrinks to 2px
- **Active/Pressed:** translate 4px right + down, shadow disappears
- **Dividers:** 4px dotted pattern (alternating charcoal/transparent)
- **Corners:** 0px radius (sharp). Use stepped corners via SVG border-image if a retro-rounded look is needed
- **Progress bars:** Diagonal 45° stripe pattern at 8px × 8px tile
- **No gradients, no border-radius, no blur shadows**

---

## 7. Technical Decisions

### 7.1 Why Service Worker Timer
- Timer must survive popup close (user will close popup during 25+ min sessions)
- `chrome.alarms` provides wake-up guarantees even if SW is terminated
- Sub-minute precision via `setInterval` in the SW while active
- Badge updates and notifications originate from SW

### 7.2 Why Custom Charts (not Chart.js)
- Pixel-art aesthetic requires 4px-aligned rendering, pixel-brick fills, no antialiasing
- Chart.js renders to Canvas with smooth antialiasing by default; overriding is fragile
- Custom Canvas2D renderer gives full control over every pixel
- Only 2 chart types needed (bar chart + possibly a trend line)

### 7.3 Why Hybrid Storage
- Matches user requirement: "local JSON file at user-chosen path"
- File System Access API is the only Chrome API that allows persistent read/write to user-visible files
- chrome.storage.local caches the file handle for seamless reconnection
- No data loss on handle expiry (data is in chrome.storage.local, user just re-selects the file)

### 7.4 No Build Step
- Vanilla JS ES modules work natively in Chrome extensions (MV3)
- Tailwind via CDN during development; consider bundling for production
- Press Start 2P self-hosted as .woff2 to work offline

---

## 8. Permissions

```json
{
  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ]
}
```

- `storage`: chrome.storage.local for handle cache and settings
- `alarms`: Periodic timer ticks and session end triggers
- `notifications`: Alert user when work/rest session ends
- No `tabs`, `activeTab`, or host permissions needed (self-contained popup)

---

## 9. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| File handle lost (browser restart) | Prompt user to re-select JSON file; restore from chrome.storage.local cache |
| Service worker terminated mid-timer | On wake, calculate remaining time from stored `endTime` timestamp |
| Popup closed during session | Timer continues in SW; badge shows status; notification on end |
| No active template | Prompt user to create one; use default 25min work / 5min rest |
| JSON file corrupted | Validate on load; offer reset or manual fix |
| Storage quota exceeded | chrome.storage.local has ~10MB; JSON files via File API have no limit |

---

## 10. Future Considerations (Out of Scope for V1)

- Sound effects (8-bit chiptune alarm)
- Crew/Friends feature (social accountability)
- Dark mode variant
- Browser tab blocking during focus sessions
- Integration with task management tools
- XP leveling system with ranks/titles
- Multiple language support (chrome.i18n)
