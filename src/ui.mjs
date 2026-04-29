import { createRequire } from 'node:module';
import { ancestorsOf, itemById, pdfDisplayName, sortedRoots, statsForRoot, titleOf, typeLabel, webDisplayName } from './items.mjs';
import { cursorFor, isDueFlashcard, listForContext, queueForContext } from './queue.mjs';
import { activityStats, yearlyActivity } from './activity.mjs';
import { ANSI, muted, visibleLength, yellow } from './tui/theme.mjs';
import { centerAnsi, truncate } from './tui/layout.mjs';
import { printLines } from './tui/renderer.mjs';
import { screenSession } from './tui/session.mjs';
import { imageDisplayName, imagesOf } from './images.mjs';

const require = createRequire(import.meta.url);
const { version: APP_VERSION } = require('../package.json');
const DEVELOPER = 'Jay';
const CYAN = ANSI.cyan;
const RESET = ANSI.reset;

export function pathLabel(db, contextId, partLength = Infinity, highlightCurrent = false) {
  const path = ancestorsOf(db, contextId);
  return path
    .map((item, index) => {
      const isCurrent = index === path.length - 1;
      const highlight = highlightCurrent && isCurrent;
      const title = item.type === 'flashcard' && isCurrent
        ? flashcardLine(item, { revealed: true, baseColor: highlight ? CYAN : '' })
        : truncate(titleOf(item), partLength);
      if (!highlight) return title;
      if (item.type === 'flashcard') return title;
      return `${CYAN}${title}${RESET}`;
    })
    .join(' > ');
}

export function multilinePathLabel(db, contextId, partLength = Infinity, highlightCurrent = false) {
  const path = ancestorsOf(db, contextId);
  if (path.length <= 1) return pathLabel(db, contextId, partLength, highlightCurrent);
  const parents = path.slice(0, -1).map((item) => truncate(titleOf(item), partLength)).join(' > ');
  const current = path[path.length - 1];
  const title = current.type === 'flashcard'
    ? flashcardLine(current, { revealed: true, baseColor: highlightCurrent ? CYAN : '' })
    : truncate(titleOf(current), partLength);
  const renderedCurrent = highlightCurrent && current.type !== 'flashcard' ? `${CYAN}${title}${RESET}` : title;
  return `${parents} >\n\n${renderedCurrent}`;
}

function withBaseColor(text, baseColor) {
  return baseColor ? `${baseColor}${text}${RESET}` : text;
}

function answerText(text, baseColor) {
  return baseColor ? `${yellow(text)}${baseColor}` : yellow(text);
}

export function flashcardLine(item, { revealed = true, baseColor = '' } = {}) {
  if (item.cardType === 'basic') {
    const answer = answerText(revealed ? item.answer : '[...]', baseColor);
    return withBaseColor(`${item.question} / ${answer}`, baseColor);
  }

  if (item.cardType === 'image-occlusion') {
    const mask = answerText(revealed ? 'revealed' : '[...]', baseColor);
    return withBaseColor(`${item.prompt ?? 'Image occlusion'} / ${mask}`, baseColor);
  }

  if (item.maskedText?.includes('{{c1::...}}')) {
    const replacement = answerText(revealed ? item.clozeText : '[...]', baseColor);
    return withBaseColor(item.maskedText.split('{{c1::...}}').join(replacement), baseColor);
  }

  const answer = answerText(revealed ? item.clozeText : '[...]', baseColor);
  return withBaseColor(`${item.maskedText} / A: ${answer}`, baseColor);
}

function listCountFor(db, item) {
  const rootId = item.type === 'root' ? item.id : item.rootId;
  return listForContext(db, rootId, item.id).length;
}

const LIST_SECTIONS = [
  ['branch', 'Branches'],
  ['leaf', 'Leaves'],
  ['note', 'Notes'],
  ['web', 'Web'],
  ['pdf', 'PDFs'],
  ['flashcard', 'Flashcards']
];

function listSectionFor(item) {
  if (item.type === 'flashcard') return 'flashcard';
  return item.type;
}

function listItemLine(db, item, index) {
  const duePrefix = !item.excluded && isDueFlashcard(item, db.app.dayBoundary) ? '*' : ' ';
  const title = item.type === 'flashcard' ? flashcardLine(item, { revealed: true }) : titleOf(item);
  const suffix = item.excluded ? ' <done>' : '';
  const line = `  ${index + 1}. ${duePrefix}[${typeLabel(item)}] ${title} (${listCountFor(db, item)})${suffix}`;
  return item.excluded ? muted(line) : line;
}

function groupedListLines(db, list) {
  const lines = [];
  for (const [section, label] of LIST_SECTIONS) {
    const entries = list
      .map((item) => ({ item }))
      .filter((entry) => listSectionFor(entry.item) === section);
    if (entries.length === 0) continue;
    if (lines.length > 0) lines.push('');
    lines.push(label);
    entries.forEach((entry, index) => {
      lines.push(listItemLine(db, entry.item, index));
    });
  }
  return lines;
}

export function helpLines() {
  return `
Commands
  new root       create root titles with type> title1 // title2
  set root       show roots, then choose by number or title
  title          enter a listed item by exact title
  b1 / ㅠ1       enter branch 1
  l1 / ㅣ1       enter leaf 1
  n1 / ㅜ1       enter note 1
  f1 / ㄹ1       enter flashcard 1
  i1 / ㅑ1       open image 1
  w1 / p1       enter web item 1 / PDF item 1

Create
  new branch     create branches under any knowledge item (b, ㅠ)
                 type> repeats until empty Enter or Esc; // still creates many
  new leaf       create leaves under any knowledge item (l, ㅣ)
                 type> repeats until empty Enter or Esc; // still creates many
  new note       create notes under any knowledge item (n, ㅜ)
                 type> repeats until empty Enter or Esc; // still creates many
  new image      attach one clipboard image after image> Enter (i, ㅑ)
  edit           edit the current item in a Save/Cancel window
  edit n         edit listed item n in a Save/Cancel window
                 basic uses Q:/A:, cloze uses {{c1::text}}
  import web     import a URL as a PDF under the current branch
  save link      save a URL-only web item under the current branch
  import pdf     import a PDF file under the current branch
  basic          create a basic flash card under the current note
  cloze          create a cloze flash card from the current note body

Queue
  que            enter or resume the current root reading queue flow
  ] / next       move to the next queue item
  [ / prev       move to the previous queue item (previous also works)
  d              mark the selected/current non-flashcard item done
  reset          restore the current done item to the queue
  pass / fail    review the selected flash card outside review/drill

Review
  review         review due flash cards in the current root
  1-4            rate revealed flash cards in review

Drill
  drill          round drill all flash cards in the current root
  1 / 2          pass/fail revealed flash cards in drill
                 image occlusion drill also uses 1 Fail / 2 Pass

Delete
  del b1         delete branch 1
  del b1:3       delete branches 1 through 3
  del b1 // i1   delete several field-scoped entries
  del i1         delete image 1
  del i1:3       delete images 1 through 3
  del on home    delete roots from the root list

Sort
  sort b1 b2:b3  move branch 1 between branches 2 and 3
  sort b1 top    move branch 1 to the top of Branches
  sort b1 bottom move branch 1 to the bottom of Branches
  sort i1 top    move image 1 to the top of Images
  sort i1 i2:i3  move image 1 between images 2 and 3

Navigation
  root / home    return to the current root
  back           move to the parent item
  open           open the current PDF/web item with the default app
  open image     open attached images and create occlusion cards
  where          show the current context
  clear          clear screen and show the start view
  blank Enter    restore the previous frame after unknown command

Settings
  set time       set the learning day boundary with 0000-2359
  help           show this help
  Esc            cancel follow-up prompts
  quit / exit/q  exit

Licenses
  int-cli        personal/local project
  @inquirer/core 11.1.9 MIT License
  playwright 1.59.1 Apache-2.0 License
  ts-fsrs 5.3.2 MIT License
  see THIRD_PARTY_NOTICES.md for full notices
`.trim().split('\n');
}

export function printHelp(meta = {}) {
  screenSession.renderLines(helpLines(), { kind: 'help', ...meta });
}

function heatCell(count, max) {
  if (count <= 0) return { color: 236, char: '■' };
  const ratio = max <= 0 ? 0 : count / max;
  if (ratio < 0.25) return { color: 22, char: '■' };
  if (ratio < 0.5) return { color: 28, char: '■' };
  if (ratio < 0.75) return { color: 34, char: '■' };
  return { color: 46, char: '■' };
}

function renderHeatCells(cells) {
  let output = '';
  let color = null;
  for (const cell of cells) {
    if (cell.color !== color) {
      output += `\x1b[38;5;${cell.color}m`;
      color = cell.color;
    }
    output += cell.char;
  }
  return `${output}${RESET}`;
}

function heatmapLines(db) {
  const { year, days } = yearlyActivity(db);
  const stats = activityStats(db);
  const max = Math.max(1, ...days.map((day) => day.count));
  const firstOffset = days[0]?.day ?? 0;
  const weekCount = Math.ceil((firstOffset + days.length) / 7);
  const rows = Array.from({ length: 7 }, () => Array.from({ length: weekCount }, () => heatCell(0, max)));

  days.forEach((day, index) => {
    const slot = firstOffset + index;
    const week = Math.floor(slot / 7);
    const weekday = slot % 7;
    rows[weekday][week] = heatCell(day.count, max);
  });

  const summary = `${year}   Avg: ${stats.dailyAverage} cards   Long: ${stats.longestStreak}d   Cur: ${stats.currentStreak}d`;

  return [
    ...rows.map((row) => `  ${renderHeatCells(row)}`),
    `  ${centerAnsi(summary, weekCount)}`
  ];
}

export function introLines(db, output = process.stdout) {
  const logo = [
    '    ██╗███╗   ██╗████████╗',
    '    ██║████╗  ██║╚══██╔══╝',
    '    ██║██╔██╗ ██║   ██║   ',
    '    ██║██║╚██╗██║   ██║   ',
    '    ██║██║ ╚████║   ██║   ',
    '    ╚═╝╚═╝  ╚═══╝   ╚═╝   ',
    `    version ${APP_VERSION} by ${DEVELOPER}`,
    '    Type help for commands.'
  ];
  const heat = heatmapLines(db);
  const width = Math.max(...logo.map((line) => visibleLength(line)));
  const terminalWidth = output.columns ?? 0;
  const heatWidth = Math.max(...heat.map((line) => visibleLength(line)));
  const requiredWidth = width + 4 + heatWidth;
  if (terminalWidth > 0 && terminalWidth < requiredWidth) {
    return [...logo, '', ...heat];
  }
  const rows = Math.max(logo.length, heat.length);
  const lines = [];
  for (let index = 0; index < rows; index += 1) {
    const left = logo[index] ?? '';
    const right = heat[index] ?? '';
    lines.push(`${left.padEnd(width + 4)}${right}`);
  }
  return lines;
}

export function printIntro(db, output = process.stdout) {
  printLines(introLines(db, output));
}

export function startViewLines(db, output = process.stdout) {
  const lines = ['', ...introLines(db, output), ''];
  if (db.roots.length === 0) {
    return [...lines, 'Create your first root with "new root".', ''];
  }
  return [...lines, ...rootsLines(db), ''];
}

export function printStartView(db, output = process.stdout) {
  printLines(startViewLines(db, output));
}

export function rootsLines(db) {
  if (db.roots.length === 0) {
    return ['No roots yet. Use "new root".'];
  }
  return [
    'Roots',
    ...sortedRoots(db).map((root, index) => `  ${index + 1}. ${root.title} (${listCountFor(db, root)})`)
  ];
}

export function printRoots(db) {
  printLines(rootsLines(db));
}

export function flashcardLines(item) {
  const due = item.fsrsCard?.due ? new Date(item.fsrsCard.due).toLocaleString() : 'now';
  return [flashcardLine(item, { revealed: true }), `Due: ${due}`];
}

export function printFlashcard(item) {
  printLines(flashcardLines(item));
}

export function studyFlashcardLines(item, { revealed = false, mode = 'queue' } = {}) {
  const lines = [`[${typeLabel(item)}] ${flashcardLine(item, { revealed })}`];
  if (!revealed) lines.push('Press Space to reveal.');
  else if (mode === 'drill') lines.push('Result: 1 Pass | 2 Fail');
  else lines.push('Rate: 1 Again | 2 Hard | 3 Good | 4 Easy');
  return lines;
}

export function printStudyFlashcard(item, { revealed = false, mode = 'queue' } = {}) {
  screenSession.renderLines(studyFlashcardLines(item, { revealed, mode }), {
    kind: 'study-flashcard',
    itemId: item.id,
    revealed,
    mode
  });
}

export function contextLines(db, contextId) {
  const context = itemById(db, contextId);
  if (!context) {
    return ['No active context. Use "new root" or "set root".'];
  }
  const rootId = context.type === 'root' ? context.id : context.rootId;
  const list = listForContext(db, rootId, contextId);
  const queue = queueForContext(db, rootId, contextId);
  cursorFor(db, rootId, contextId, queue.length);

  const lines = [`[${typeLabel(context)}] ${multilinePathLabel(db, contextId, Infinity, true)}`];
  if (Array.isArray(context.images) && context.images.length > 0) {
    lines.push('');
    lines.push('Images');
    imagesOf(context).forEach((image, index) => {
      lines.push(`  ${index + 1}. ${imageDisplayName(image)}`);
    });
  }
  if (context.type === 'root') {
    const stats = statsForRoot(db, context.id);
    lines.push('');
    lines.push(
      `Branches ${stats.branches} (${stats.doneBranches}/${stats.branches}) | Notes ${stats.notes} (${stats.doneNotes}/${stats.notes}) | Flashcards ${stats.flashcards}`
    );
  }

  if (context.type === 'note' && context.body) {
    lines.push('');
    lines.push(...context.body.split('\n'));
  }

  if (context.type === 'flashcard') {
    return lines;
  }

  if (context.type === 'web') {
    const name = webDisplayName(context);
    lines.push('');
    if (context.pdfPath) {
      lines.push(`PDF: ${name}`);
    } else {
      lines.push(`URL: ${name}`);
    }
    return lines;
  }

  if (context.type === 'pdf') {
    lines.push('');
    lines.push(`PDF: ${pdfDisplayName(context)}`);
    return lines;
  }

  lines.push('');

  if (list.length === 0) {
    lines.push('  empty');
    return lines;
  }

  lines.push(...groupedListLines(db, list));
  return lines;
}

export function printContext(db, contextId) {
  printLines(contextLines(db, contextId));
}

export function queueProgressLines(current, total) {
  const remaining = Math.max(0, total - Math.max(0, current - 1));
  return [`Remaining: ${remaining}`];
}

export function printQueueProgress(current, total) {
  printLines(queueProgressLines(current, total));
}

export function pathPrompt(db, contextId) {
  return 'int';
}

export function promptLine(db, contextId, output = process.stdout) {
  return `${pathPrompt(db, contextId)}> `;
}

export function resetStyle() {
  return RESET;
}
