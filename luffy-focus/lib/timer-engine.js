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
    endTime: null,
    pausedAt: null,
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
 */
export function resetTimer(timerState, template) {
  return createTimerState(template);
}

/**
 * Transition: Mark as DONE (timer reached 0).
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
