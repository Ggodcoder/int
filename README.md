# Int CLI

## Purpose / 사용 목적

Int CLI is a local command-line workspace for reading, organizing, reviewing, and drilling knowledge.
It lets you build structured material with roots, branches, leaves, notes, and flash cards, then review it through a root-scoped queue.

Int CLI는 로컬 명령줄에서 지식을 정리하고 복습하기 위한 앱입니다.
root, branch, leaf, note, flash card 구조로 자료를 만들고, root별 queue를 통해 이어서 학습할 수 있습니다.

Each root is an independent collection. Queue progress, flash card scheduling, and drill progress are separated per root.

각 root는 독립된 컬렉션입니다. queue 진행 상황, 플래시카드 스케줄, drill 진행 상황은 root별로 분리됩니다.

## Run / 실행

Install from GitHub with npm:

npm으로 GitHub에서 설치할 수 있습니다.

```text
npm install -g github:Ggodcoder/int
```

Then run:

설치 후 실행합니다.

```text
int
```

On launch, Int shows the logo, review heatmap, and root list.

실행하면 로고, 리뷰 히트맵, root 목록이 표시됩니다.

## Create Items / 항목 생성

Creation prompts use `type>`. Multiple items can be created at once with `//`.

생성 프롬프트는 `type>`를 사용합니다. `//`로 여러 항목을 한 번에 만들 수 있습니다.

```text
type> item 1 // item 2 // item 3
```

Commands / 명령어:

```text
new root
set root
new branch    b, ㅠ
new leaf      l, ㅣ
new note      n, ㅜ
basic
cloze
```

`basic` creates a flash card with `Q?` and `A?`.
`cloze` creates a masked flash card from the current note text.

`basic`은 `Q?`, `A?` 입력으로 플래시카드를 만듭니다.
`cloze`는 현재 note 본문에서 특정 텍스트를 마스킹한 플래시카드를 만듭니다.

Press `Esc` during follow-up prompts to cancel.

후속 프롬프트에서는 `Esc`로 취소할 수 있습니다.

## Navigate / 이동

Type a listed number or exact item title to enter it.

목록에 표시된 번호나 항목 이름을 입력하면 해당 항목으로 진입합니다.

```text
root / home    return to the current root
back           move to the parent item
where          show the current context
clear          clear screen and show the start view
help           show help
quit / exit/q  exit
```

Lists show each item's type and child count.

목록에는 항목 종류와 자식 항목 수가 표시됩니다.

```text
1. [branch] Chapter 1 (3)
```

## Queue / 큐 학습

Use `que` inside a root to enter or resume that root's queue.

root에 진입한 뒤 `que`를 입력하면 해당 root의 queue에 진입하거나 마지막 위치로 복귀합니다.

```text
que
] / next
[ / prev
d
pass / fail
```

Flash cards appear before regular items when they are due.
In queue review, cards are masked as `[...]`; press Space to reveal, then rate:

due가 된 플래시카드는 일반 항목보다 먼저 표시됩니다.
queue 복습에서는 카드가 `[...]`로 마스킹됩니다. Space로 공개한 뒤 평가합니다.

```text
1 Again
2 Hard
3 Good
4 Easy
```

FSRS scheduling is applied to queue flash card reviews.
Regular review cards due on the current learning day are shown regardless of the exact due time.
Learning and relearning cards still respect their exact due time.

queue 플래시카드 리뷰에는 FSRS 스케줄이 적용됩니다.
현재 학습일에 도래한 일반 Review 카드는 정확한 시간과 무관하게 표시됩니다.
Learning/Relearning 카드는 정확한 due 시간을 지킵니다.

## Drill / 드릴

`drill` runs a root-wide flash card drill independent of FSRS scheduling.

`drill`은 FSRS 스케줄과 별개로 현재 root의 모든 플래시카드를 반복 훈련합니다.

```text
drill
1 Pass
2 Fail
```

Round 1 shows all current cards. Later rounds show only cards failed in the previous round.
New cards added during an active drill appear from the next new Round 1.

1라운드는 현재 카드 전체를 보여줍니다. 2라운드부터는 전 라운드에서 Fail한 카드만 보여줍니다.
drill 진행 중 새로 추가된 카드는 현재 drill이 all clear된 뒤 다음 1라운드부터 포함됩니다.

## Delete / 삭제

Deleting an item also deletes its children.

부모 항목을 삭제하면 자식 항목도 함께 삭제됩니다.

```text
del n
del n:m
del n // m // ...
```

## Learning Day Time / 학습일 기준 시간

The default learning day starts at `00:00`.
Use `set time` to choose a custom day boundary from `0000` to `2359`.

기본 학습일은 `00:00`에 시작합니다.
`set time`으로 `0000`부터 `2359`까지 원하는 학습일 기준 시간을 설정할 수 있습니다.

```text
set time
type> 0400
```

If set to `0400`, activity before 04:00 belongs to the previous learning day.

`0400`으로 설정하면 새벽 04:00 전 활동은 전날 학습일에 포함됩니다.

This boundary is used for queue sessions, today-due review cards, and the review heatmap.

이 기준은 queue 세션, 오늘 due 카드 판정, 리뷰 히트맵에 함께 적용됩니다.

## Data / 데이터

Data is stored in the current user's app data folder:

데이터는 현재 사용자의 앱 데이터 폴더에 저장됩니다.

```text
Windows: %APPDATA%/Int/int-db.json
macOS:   ~/Library/Application Support/Int/int-db.json
Linux:   ~/.local/share/int/int-db.json
```

Set `INT_DB_FILE` to use a custom database path.

`INT_DB_FILE` 환경변수로 데이터베이스 경로를 직접 지정할 수 있습니다.

## License Notices / 라이선스 표기

```text
int-cli        personal/local project
ts-fsrs 5.3.2 MIT License
```
