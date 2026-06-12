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
