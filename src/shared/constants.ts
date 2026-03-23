/** Game configuration values — no magic numbers in game logic */

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

/** Real seconds per game day — 600s (10 min) for testing, target 900s for production */
export const DAY_DURATION_SECONDS = 600;

/** Game clock runs from 08:00 to 20:00 (12 game hours per day) */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 20;

/** Timer color thresholds in remaining real seconds.
 *  Amber = last 5 game hours, Red = last 3 real minutes */
export const TIMER_AMBER_THRESHOLD = 300;
export const TIMER_RED_THRESHOLD = 180;

/** Convert remaining real seconds to a game clock string (HH:MM) */
export function formatGameTime(timeRemaining: number): string {
  const elapsed = Math.max(0, DAY_DURATION_SECONDS - timeRemaining);
  const fraction = elapsed / DAY_DURATION_SECONDS;
  const totalGameMinutes = fraction * (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const gameHour = DAY_START_HOUR + Math.floor(totalGameMinutes / 60);
  const gameMinute = Math.floor(totalGameMinutes % 60);
  return `${gameHour.toString().padStart(2, '0')}:${gameMinute.toString().padStart(2, '0')}`;
}

/** Radar sensor range in grid cells */
export const SENSOR_RANGE = 2;

/** How long radar echoes remain visible in milliseconds */
export const ECHO_FADE_MS = 8000;

/** Seconds between entity path advances */
export const ENTITY_MOVE_INTERVAL = 20;

/** Format remaining real seconds as MM:SS countdown for the desk timer display */
export function formatCountdown(timeRemaining: number): string {
  const clamped = Math.max(0, Math.ceil(timeRemaining));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/** Radio frequency bounds */
export const RADIO_FREQ_MIN = 88.0;
export const RADIO_FREQ_MAX = 108.0;
export const RADIO_FREQ_STEP = 0.1;
