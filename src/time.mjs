import { LOCAL_TIMEZONE } from './config.mjs';

export const DEFAULT_DAY_BOUNDARY = '0000';

export function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

export function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeDayBoundary(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}$/.test(text)) return null;
  const hour = Number.parseInt(text.slice(0, 2), 10);
  const minute = Number.parseInt(text.slice(2), 10);
  if (hour > 23 || minute > 59) return null;
  return text;
}

export function dayBoundaryFor(db) {
  return normalizeDayBoundary(db?.app?.dayBoundary) ?? DEFAULT_DAY_BOUNDARY;
}

export function formatDayBoundary(boundary) {
  const normalized = normalizeDayBoundary(boundary) ?? DEFAULT_DAY_BOUNDARY;
  return `${normalized.slice(0, 2)}:${normalized.slice(2)}`;
}

function boundaryMinutes(boundary = DEFAULT_DAY_BOUNDARY) {
  const normalized = normalizeDayBoundary(boundary) ?? DEFAULT_DAY_BOUNDARY;
  return Number.parseInt(normalized.slice(0, 2), 10) * 60 + Number.parseInt(normalized.slice(2), 10);
}

export function todayKey(boundary = DEFAULT_DAY_BOUNDARY) {
  return localDateKey(new Date(), boundary);
}

export function localDateKey(date, boundary = DEFAULT_DAY_BOUNDARY) {
  const shifted = new Date(new Date(date).getTime() - boundaryMinutes(boundary) * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(shifted);
}

export function compareLocalDate(date, reference = new Date(), boundary = DEFAULT_DAY_BOUNDARY) {
  const dateKey = localDateKey(date, boundary);
  const referenceKey = localDateKey(reference, boundary);
  return dateKey.localeCompare(referenceKey);
}
