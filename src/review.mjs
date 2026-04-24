import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import { nowIso } from './time.mjs';

const scheduler = fsrs();

export function serializeCard(card) {
  return {
    ...card,
    due: card.due ? new Date(card.due).toISOString() : null,
    last_review: card.last_review ? new Date(card.last_review).toISOString() : null
  };
}

export function hydrateCard(card) {
  if (!card || typeof card !== 'object' || !('stability' in card) || !('difficulty' in card)) {
    return createEmptyCard(new Date());
  }
  return {
    ...card,
    due: card?.due ? new Date(card.due) : new Date(),
    last_review: card?.last_review ? new Date(card.last_review) : null
  };
}

export function makeFsrsCard() {
  return serializeCard(createEmptyCard(new Date()));
}

export function ratingFromGrade(grade) {
  if (grade === 1) return Rating.Again;
  if (grade === 2) return Rating.Hard;
  if (grade === 4) return Rating.Easy;
  return Rating.Good;
}

export function applyReview(item, passed) {
  return applyReviewGrade(item, passed ? 3 : 1);
}

export function applyReviewGrade(item, grade) {
  const card = hydrateCard(item.fsrsCard ?? makeFsrsCard());
  const rating = ratingFromGrade(grade);
  const result = scheduler.next(card, new Date(), rating);
  item.fsrsCard = serializeCard(result.card);
  item.reviewLog = [...(item.reviewLog ?? []), { ...result.log, review: new Date(result.log.review).toISOString() }];
  item.due = item.fsrsCard.due;
  item.updatedAt = nowIso();
}
