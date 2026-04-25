import { itemById, flashcardsOfRoot } from './items.mjs';
import { nowIso } from './time.mjs';
import { saveDb } from './db.mjs';
import { askDrillResult } from './input.mjs';
import { studyFlashcardLines } from './ui.mjs';
import { recordActivity } from './activity.mjs';
import { screenSession } from './tui/session.mjs';

function startOrResumeDrill(db, rootId) {
  const state = db.app.drill[rootId];
  if (state?.active) return state;
  const cardIds = flashcardsOfRoot(db, rootId).map((card) => card.id);
  const newState = {
    active: true,
    rootId,
    round: 1,
    cardIds,
    failedIds: [],
    index: 0,
    startedAt: nowIso(),
    updatedAt: nowIso()
  };
  db.app.drill[rootId] = newState;
  return newState;
}

function drillCardLines(card, state, { revealed = false } = {}) {
  return [
    `Drill round ${state.round} (${state.index + 1}/${state.cardIds.length})`,
    '',
    ...studyFlashcardLines(card, { revealed, mode: 'drill' })
  ];
}

async function studyDrillCard(rl, db, state) {
  if (state.cardIds.length === 0) {
    screenSession.renderResult('No flash cards in this root.');
    state.active = false;
    return null;
  }
  const card = itemById(db, state.cardIds[state.index]);
  screenSession.renderLines(drillCardLines(card, state, { revealed: false }), {
    kind: 'drill-card',
    round: state.round,
    index: state.index + 1,
    total: state.cardIds.length,
    itemId: card.id,
    revealed: false
  });
  return askDrillResult(rl, () => screenSession.renderLines(drillCardLines(card, state, { revealed: true }), {
    kind: 'drill-card',
    round: state.round,
    index: state.index + 1,
    total: state.cardIds.length,
    itemId: card.id,
    revealed: true
  }));
}

export async function runDrill(rl, db, rootId) {
  const state = startOrResumeDrill(db, rootId);
  while (state.active) {
    const result = await studyDrillCard(rl, db, state);
    if (!state.active) break;
    if (!result) {
      screenSession.renderResult('Drill paused.');
      break;
    }
    recordActivity(db);
    if (result === 'fail') state.failedIds.push(state.cardIds[state.index]);
    state.index += 1;
    if (state.index >= state.cardIds.length) {
      if (state.failedIds.length === 0) {
        screenSession.renderResult(`Round ${state.round} all clear.`);
        db.app.drill[rootId] = { active: false, rootId, completedAt: nowIso() };
        saveDb(db);
        return;
      }
      state.round += 1;
      state.cardIds = [...state.failedIds];
      state.failedIds = [];
      state.index = 0;
      screenSession.renderResult(`Starting round ${state.round}.`);
    }
    state.updatedAt = nowIso();
    saveDb(db);
  }
  state.updatedAt = nowIso();
  saveDb(db);
}
