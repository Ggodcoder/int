import { LOCAL_TIMEZONE } from './config.mjs';
import { dayBoundaryFor, localDateKey } from './time.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(date = new Date(), boundary = '0000') {
  return localDateKey(date, boundary);
}

function calendarDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function hourKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: LOCAL_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }).format(date);
}

function yearOf(date = new Date(), boundary = '0000') {
  return Number.parseInt(dayKey(date, boundary).slice(0, 4), 10);
}

function dateAtKstNoon(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 3, 0, 0));
}

function dailyCount(db, key) {
  const value = db.app.cardActivity?.[key];
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return Object.values(value).reduce((sum, count) => sum + count, 0);
}

export function recordActivity(db, date = new Date(), count = 1) {
  db.app.cardActivity ??= {};
  const key = dayKey(date, dayBoundaryFor(db));
  const hour = hourKey(date);
  db.app.cardActivity[key] ??= {};
  db.app.cardActivity[key][hour] = (db.app.cardActivity[key][hour] ?? 0) + count;
}

export function yearlyActivity(db, date = new Date()) {
  const boundary = dayBoundaryFor(db);
  const year = yearOf(date, boundary);
  const first = dateAtKstNoon(year, 0, 1);
  const last = dateAtKstNoon(year, 11, 31);
  const days = [];
  for (let current = first; current <= last; current = new Date(current.getTime() + DAY_MS)) {
    const key = calendarDayKey(current);
    days.push({
      key,
      count: dailyCount(db, key),
      day: current.getUTCDay()
    });
  }
  return { year, days };
}

export function activityStats(db, date = new Date()) {
  const { days } = yearlyActivity(db, date);
  const today = dayKey(date, dayBoundaryFor(db));
  const elapsed = days.filter((day) => day.key <= today);
  const total = elapsed.reduce((sum, day) => sum + day.count, 0);
  const learnedDays = elapsed.filter((day) => day.count > 0).length;
  const dailyAverage = learnedDays > 0 ? Math.round(total / learnedDays) : 0;
  const daysLearned = elapsed.length > 0 ? Math.round((learnedDays / elapsed.length) * 100) : 0;

  let longestStreak = 0;
  let streak = 0;
  for (const day of elapsed) {
    if (day.count > 0) {
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  let currentStreak = 0;
  for (let index = elapsed.length - 1; index >= 0; index -= 1) {
    if (elapsed[index].count <= 0) break;
    currentStreak += 1;
  }

  return { dailyAverage, daysLearned, longestStreak, currentStreak };
}
