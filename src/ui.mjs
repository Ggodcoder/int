import { ancestorsOf, itemById, statsForRoot, titleOf, typeLabel } from './items.mjs';
import { cursorFor, isDueFlashcard, queueForContext } from './queue.mjs';
import { activityStats, yearlyActivity } from './activity.mjs';

const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const PROMPT_BG = '\x1b[48;5;236m';

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

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
  return baseColor ? `${YELLOW}${text}${RESET}${baseColor}` : `${YELLOW}${text}${RESET}`;
}

export function flashcardLine(item, { revealed = true, baseColor = '' } = {}) {
  if (item.cardType === 'basic') {
    const answer = answerText(revealed ? item.answer : '[...]', baseColor);
    return withBaseColor(`${item.question} / ${answer}`, baseColor);
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
  return queueForContext(db, rootId, item.id).length;
}

export function printHelp() {
  console.log(`
Commands
  new root       create root titles with type> title1 // title2
  set root       show roots, then choose by number or title
  number/title   enter a listed root or child item

Create
  new branch     create branches under the current root/branch (b, ㅠ)
  new leaf       create leaves under the current branch/leaf (l, ㅣ)
  new note       create notes under the current leaf/note (n, ㅜ)
  basic          create a basic flash card under the current note
  cloze          create a cloze flash card from the current note body

Queue
  que            enter or resume the current root queue flow
  ] / next       move to the next queue item
  [ / prev       move to the previous queue item
  d              exclude the selected/current queue item forever
  pass / fail    review the selected flash card outside que/drill
  1-4            rate revealed flash cards in que

Drill
  drill          round drill all flash cards in the current root
  1 / 2          pass/fail revealed flash cards in drill

Delete
  del n          delete one listed item
  del n:m        delete a range of listed items
  del n // m     delete several listed items

Navigation
  root / home    return to the current root
  back           move to the parent item
  where          show the current context
  clear          clear screen and show the start view

Settings
  set time       set the learning day boundary with 0000-2359
  help           show this help
  Esc            cancel follow-up prompts
  quit / exit/q  exit

Licenses
  int-cli        personal/local project
  ts-fsrs 5.3.2 MIT License
`.trim());
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

function visibleLength(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function centerAnsi(text, width) {
  const padding = Math.max(0, Math.floor((width - visibleLength(text)) / 2));
  return `${' '.repeat(padding)}${text}`;
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

export function printIntro(db, output = process.stdout) {
  const logo = [
    '    ██╗███╗   ██╗████████╗',
    '    ██║████╗  ██║╚══██╔══╝',
    '    ██║██╔██╗ ██║   ██║   ',
    '    ██║██║╚██╗██║   ██║   ',
    '    ██║██║ ╚████║   ██║   ',
    '    ╚═╝╚═╝  ╚═══╝   ╚═╝   ',
    '    Type help for commands.'
  ];
  const heat = heatmapLines(db);
  const width = Math.max(...logo.map((line) => line.length));
  const terminalWidth = output.columns ?? 0;
  const heatWidth = 60;
  const requiredWidth = width + 4 + heatWidth;
  if (terminalWidth > 0 && terminalWidth < requiredWidth) {
    console.log(logo.join('\n'));
    return;
  }
  const rows = Math.max(logo.length, heat.length);
  for (let index = 0; index < rows; index += 1) {
    const left = logo[index] ?? '';
    const right = heat[index] ?? '';
    console.log(`${left.padEnd(width + 4)}${right}`);
  }
}

export function printStartView(db, output = process.stdout) {
  console.log('');
  printIntro(db, output);
  if (db.roots.length > 0) {
    console.log('');
    printRoots(db);
  }
}

export function printRoots(db) {
  if (db.roots.length === 0) {
    console.log('No roots yet. Use "new root".');
    return;
  }
  console.log('Roots');
  db.roots.forEach((root, index) => console.log(`  ${index + 1}. ${root.title} (${listCountFor(db, root)})`));
}

export function printFlashcard(item) {
  console.log(flashcardLine(item, { revealed: true }));
  const due = item.fsrsCard?.due ? new Date(item.fsrsCard.due).toLocaleString() : 'now';
  console.log(`Due: ${due}`);
}

export function printStudyFlashcard(item, { revealed = false, mode = 'queue' } = {}) {
  console.log(`[${typeLabel(item)}] ${flashcardLine(item, { revealed })}`);
  if (!revealed) console.log('Press Space to reveal.');
  else if (mode === 'drill') console.log('Result: 1 Pass | 2 Fail');
  else console.log('Rate: 1 Again | 2 Hard | 3 Good | 4 Easy');
}

export function printContext(db, contextId) {
  const context = itemById(db, contextId);
  if (!context) {
    console.log('No active context. Use "new root" or "set root".');
    return;
  }
  const rootId = context.type === 'root' ? context.id : context.rootId;
  const queue = queueForContext(db, rootId, contextId);
  cursorFor(db, rootId, contextId, queue.length);

  console.log(`[${typeLabel(context)}] ${multilinePathLabel(db, contextId, Infinity, true)}`);
  if (context.type === 'root') {
    const stats = statsForRoot(db, context.id);
    console.log('');
    console.log(`Branches ${stats.branches} | Notes ${stats.notes} | Flashcards ${stats.flashcards}`);
  }

  if (context.type === 'flashcard') {
    return;
  }

  console.log('');

  if (queue.length === 0) {
    console.log('  empty');
    return;
  }

  queue.forEach((item, index) => {
    const duePrefix = isDueFlashcard(item, db.app.dayBoundary) ? '*' : ' ';
    const title = item.type === 'flashcard' ? flashcardLine(item, { revealed: true }) : titleOf(item);
    console.log(`  ${index + 1}. ${duePrefix}[${typeLabel(item)}] ${title} (${listCountFor(db, item)})`);
  });
}

export function pathPrompt(db, contextId) {
  return 'int';
}

export function promptLine(db, contextId, output = process.stdout) {
  const prompt = `${pathPrompt(db, contextId)}> `;
  const columns = output.columns ?? 0;
  if (columns <= prompt.length) return `${PROMPT_BG}${prompt}`;
  return `${PROMPT_BG}${' '.repeat(columns)}\r${prompt}`;
}

export function resetStyle() {
  return RESET;
}
