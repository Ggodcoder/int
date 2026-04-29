# Int CLI

## Purpose / 사용 목적

Int CLI is a local command-line workspace for reading, organizing, reviewing, and drilling knowledge.
It lets you build structured material with roots, branches, leaves, notes, and flash cards, then move through reading material with `que` and review due flash cards with `review`.

Int CLI는 로컬 명령줄에서 지식을 정리하고 복습하기 위한 앱입니다.
root, branch, leaf, note, flash card 구조로 자료를 만들고, `que`로 읽기 자료를 진행하며 `review`로 due 플래시카드를 복습할 수 있습니다.

Each root is an independent collection. Queue progress, flash card scheduling, and drill progress are separated per root.

각 root는 독립된 컬렉션입니다. queue 진행 상황, 플래시카드 스케줄, drill 진행 상황은 root별로 분리됩니다.

## Run / 실행

On Windows, use the installer/updater script. It stops a running Int CLI, removes stale global npm shims/folders, installs from GitHub, and runs a smoke check.

Windows에서는 설치/업데이트 스크립트를 권장합니다. 실행 중인 Int CLI를 종료하고, 꼬인 전역 npm shim/folder를 정리한 뒤 GitHub에서 설치하고 smoke check를 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm ('https://raw.githubusercontent.com/Ggodcoder/int/main/scripts/install-windows.ps1?cb=' + [guid]::NewGuid()))"
```

On macOS, use the installer/updater script. It removes stale global npm shims/folders, installs from GitHub, and runs a smoke check.

macOS에서도 설치/업데이트 스크립트를 권장합니다. 꼬인 전역 npm shim/folder를 정리한 뒤 GitHub에서 설치하고 smoke check를 실행합니다.

```bash
curl -fsSL "https://raw.githubusercontent.com/Ggodcoder/int/main/scripts/install-macos.sh?cb=$(date +%s)" | bash
```

Manual npm install is also available:

수동 npm 설치도 가능합니다.

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

Creation prompts use `type>`. For branches, leaves, and notes, `type>` repeats so you can keep adding items in a flow. Press empty Enter or `Esc` to finish. Multiple items can still be created at once with `//`.

생성 프롬프트는 `type>`를 사용합니다. branch, leaf, note는 `type>`가 반복되어 흐름식으로 계속 추가할 수 있습니다. 빈 Enter 또는 `Esc`로 종료합니다. `//`로 여러 항목을 한 번에 만드는 방식도 그대로 지원합니다.

```text
type> item 1 // item 2 // item 3
type> item 4
type>
```

Commands / 명령어:

```text
new root
set root
new branch    b, ㅠ
new leaf      l, ㅣ
new note      n, ㅜ
edit
edit n
import web
save link
import pdf
new image     i, ㅑ
open image
basic
cloze
```

`basic` creates a flash card with `Q?` and `A?`.
`cloze` creates a masked flash card from the current note text.
Branches, leaves, and notes can be created under any knowledge item. Basic and cloze flash cards are created under notes. Image-occlusion flash cards are created from images attached to branches, leaves, or notes.

`basic`은 `Q?`, `A?` 입력으로 플래시카드를 만듭니다.
`cloze`는 현재 note 본문에서 특정 텍스트를 마스킹한 플래시카드를 만듭니다.
branch, leaf, note는 어떤 지식 항목 아래에서도 만들 수 있습니다. basic/cloze 플래시카드는 note 아래에서 만들고, 이미지 오클루전 플래시카드는 branch, leaf, note에 첨부된 이미지에서 생성합니다.

Press `Esc` during follow-up prompts to cancel.

후속 프롬프트에서는 `Esc`로 취소할 수 있습니다.

## Images / 이미지

Use `new image`, `i`, or `ㅑ` to attach one clipboard image to the branch, leaf, or note you are currently viewing. Int waits at `image>`; capture or copy an image, then press Enter once to save it. On Windows and macOS, Int uses the OS clipboard path for captured images.

`new image`, `i`, `ㅑ`를 사용하면 현재 보고 있는 branch, leaf, note에 클립보드 이미지를 1회 첨부합니다. Int가 `image>`에서 기다리면 이미지를 캡처하거나 복사한 뒤 Enter를 한 번 눌러 저장합니다. Windows와 macOS에서는 OS별 클립보드 경로를 사용합니다.

```text
new image
i
ㅑ
open image
i1 / ㅑ1
```

Attached images are not child list items. They belong to the current item and can be opened all at once with `open image`, or one by one with `i1`, `i2`, `ㅑ1`, and so on.
Inside the image window, use `Occlusion` to draw mask boxes and `Save` to create one image-occlusion flash card per mask.
Attached images are shown in a separate `Images` list on the item screen.

첨부 이미지는 하위 list 항목이 아닙니다. 현재 항목에 속하며 `open image`로 한 번에 열거나 `i1`, `i2`, `ㅑ1`처럼 하나씩 열 수 있습니다.
이미지 창에서 `Occlusion`을 눌러 마스크 박스를 그리고 `Save`하면 마스크 1개당 이미지 오클루전 플래시카드 1개가 생성됩니다.
첨부 이미지는 항목 화면의 별도 `Images` 목록으로 표시됩니다.

```text
del i1
del i1:3
del i1 // i3
sort i1 top
sort i1 bottom
sort i1 i2:i3
```

`del i1` deletes attached image 1 from the current item. Deleting an image also removes image-occlusion cards made from that image. `sort i1 ...` reorders the current item's image list and persists after restart.
When an image-occlusion flash card appears in review or drill, Int opens the image review window masked. Press Space in that window to reveal, then grade it. Review uses `1`-`4` FSRS ratings. Drill uses `1` Fail and `2` Pass. Opening an image-occlusion card from a normal list shows only the masked image without review controls.

`del i1`은 현재 항목에 첨부된 1번 이미지를 삭제합니다. 이미지를 삭제하면 해당 이미지로 만든 이미지 오클루전 카드도 함께 삭제됩니다. `sort i1 ...`은 현재 항목의 이미지 목록 순서를 바꾸며 앱 재시작 후에도 유지됩니다.
이미지 오클루전 플래시카드가 review 또는 drill에서 나타나면 마스킹된 이미지 리뷰 창이 자동으로 열립니다. 창에서 Space로 공개한 뒤 평가합니다. review는 `1`-`4` FSRS 평가를 사용하고, drill은 `1` Fail, `2` Pass를 사용합니다. 일반 list에서 이미지 오클루전 카드를 열면 리뷰 컨트롤 없이 마스킹된 이미지만 보여줍니다.

## Edit Items / 항목 수정

Use `edit` to edit the current item, or `edit n` to edit listed child item `n`.

`edit`은 현재 항목을 수정하고, `edit n`은 현재 목록의 `n`번 자식 항목을 수정합니다.

```text
edit
edit 2
```

Int opens a small Save/Cancel edit window. On Windows, it prefers an installed Chrome or Edge app window and falls back to bundled Playwright Chromium if needed. On macOS/Linux, it uses the bundled Chromium app window.

Int는 Save/Cancel 버튼이 있는 작은 수정 창을 엽니다. Windows에서는 설치된 Chrome 또는 Edge 앱 창을 우선 사용하고, 필요하면 Playwright Chromium으로 대체합니다. macOS/Linux에서는 번들 Chromium 앱 창을 사용합니다.

Editable formats / 수정 형식:

```text
root, branch, leaf       title
note                     title and body together
web, pdf                 title
basic flashcard          Q: ... / A: ...
cloze flashcard          {{c1::text}} markup
```

Basic flash card:

Basic 플래시카드:

```text
Q: question text
A: answer text
```

Cloze flash card:

Cloze 플래시카드:

```text
{{c1::masked text}} is part of this sentence.
```

Cloze edits must include a `{{c1::...}}` marker. Editing flash card content does not reset FSRS scheduling or review history.

cloze 수정에는 `{{c1::...}}` 마커가 필요합니다. 플래시카드 내용을 수정해도 FSRS 스케줄이나 리뷰 기록은 초기화되지 않습니다.

## Web Import / 웹 가져오기

Use `import web` inside a branch to save a URL as a PDF-backed web item.

branch 안에서 `import web`을 입력하면 URL을 PDF로 저장한 web 항목을 만들 수 있습니다.

```text
import web
type> https://example.com
```

The generated PDFs are stored under the app data imports folder.

생성된 PDF는 앱 데이터의 imports 폴더 아래에 저장됩니다.

Use `save link` inside a branch to save a URL-only web item without PDF capture.

branch 안에서 `save link`를 입력하면 PDF 캡처 없이 URL만 web 항목으로 저장합니다.

```text
save link
type> https://example.com
```

## PDF Import / PDF 가져오기

Use `import pdf` inside a branch to open a file picker and save the selected PDF as a PDF item.

branch 안에서 `import pdf`를 입력하면 파일 선택창이 열리고, 선택한 PDF를 PDF 항목으로 저장합니다.

```text
import pdf
```

Imported PDFs are copied into the app data imports folder and can be opened with `open`.

가져온 PDF는 앱 데이터의 imports 폴더로 복사되며 `open`으로 열 수 있습니다.

## Navigate / 이동

Child lists are numbered independently inside each field. Use a field prefix plus the number to enter a child item. Exact title entry still works.

하위 목록은 각 필드 안에서 독립적으로 번호가 매겨집니다. 자식 항목에 진입할 때는 필드 접두어와 번호를 함께 입력합니다. 정확한 제목 입력도 계속 지원합니다.

```text
b1 / ㅠ1    enter branch 1
l1 / ㅣ1    enter leaf 1
n1 / ㅜ1    enter note 1
f1 / ㄹ1    enter flashcard 1
w1          enter web item 1
p1          enter PDF item 1
```

```text
root / home    return to the current root
back           move to the parent item
open           open the current PDF/web item with the default app
where          show the current context
clear          clear screen and show the start view
help           show help
quit / exit/q  exit
```

Help is shown as pages sized to the current terminal height. Press Enter at `help>` to move to the next page, or `q` to close and return to the previous frame. If an unknown command is shown, pressing blank Enter once restores the previous frame.

help는 현재 터미널 높이에 맞춘 페이지로 표시됩니다. `help>`에서 Enter를 누르면 다음 페이지로 이동하고, `q`를 누르면 닫고 이전 화면으로 돌아갑니다. 알 수 없는 명령 안내가 표시된 상태에서는 빈 Enter를 한 번 누르면 이전 화면 프레임으로 돌아갑니다.

Lists show each item's type and child count. Branch, leaf, note, web/PDF, and flashcard items are grouped under separate headers.

목록에는 항목 종류와 자식 항목 수가 표시됩니다. branch, leaf, note, web/PDF, flashcard 항목은 각각 별도 헤더 아래에 묶여 표시됩니다.

```text
1. [branch] Chapter 1 (3)
```

## Queue / 큐 학습

Use `que` inside a root to enter or resume that root's reading queue.

root에 진입한 뒤 `que`를 입력하면 해당 root의 읽기 queue에 진입하거나 마지막 위치로 복귀합니다.

```text
que
] / next
[ / prev
d
reset
pass / fail
```

`d` marks the selected/current non-flashcard item as done. Done items are removed from queue flow, but they remain visible in normal lists with muted text and `<done>`. Flash cards do not appear in `que`; use `review` for due flash cards.

`d`는 선택된/current 비 플래시카드 항목을 done 처리합니다. done 항목은 queue 흐름에서는 제외되지만, 일반 list에는 톤 다운된 텍스트와 `<done>` 표시로 남습니다. 플래시카드는 `que`에 나타나지 않으며, due 플래시카드는 `review`에서 복습합니다.

Use `reset` on a done item to restore it to normal queue flow.

done 항목에서 `reset`을 입력하면 일반 항목으로 복귀되어 queue 대상에 다시 포함됩니다.

## Review / 플래시카드 리뷰

Use `review` inside a root to review due flash cards for that root.

root에 진입한 뒤 `review`를 입력하면 해당 root의 due 플래시카드를 복습합니다.

```text
review
] / next
[ / prev
```

In review, cards are masked as `[...]`; press Space to reveal, then rate:

review에서는 카드가 `[...]`로 마스킹됩니다. Space로 공개한 뒤 평가합니다.

```text
1 Again
2 Hard
3 Good
4 Easy
```

FSRS scheduling is applied to flash card reviews.
Regular review cards due on the current learning day are shown regardless of the exact due time.
Learning and relearning cards still respect their exact due time.

플래시카드 리뷰에는 FSRS 스케줄이 적용됩니다.
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

Deleting an item also deletes its children and attached image files.
The same `del` commands work on the home root list, where they delete roots and all of their items.

부모 항목을 삭제하면 자식 항목과 첨부 이미지 파일도 함께 삭제됩니다.
홈 화면의 root 목록에서도 같은 `del` 명령을 사용할 수 있으며, root와 모든 하위 항목이 함께 삭제됩니다.

```text
del b1
del b1:3
del b1 // n2 // f1
del i1
del i1:3
```

Use the same field prefixes as navigation. Images use the `i` / `ㅑ` field prefix.

진입과 같은 필드 접두어를 사용합니다. 이미지는 `i` / `ㅑ` 필드 접두어를 사용합니다.

## Sort / 순서 변경

Lists are ordered oldest-first by default, regardless of item type.
Use `sort` to manually reorder the current list. The changed order is saved and restored after restart.

list는 기본적으로 항목 종류와 상관없이 생성 오래된 순으로 표시됩니다.
`sort`로 현재 list의 순서를 직접 바꿀 수 있으며, 변경된 순서는 앱 종료 후에도 유지됩니다.

```text
sort b1 b2:b3
sort b1 top
sort b1 bottom
sort i1 top
sort i1 i2:i3
```

`sort b1 b2:b3` moves branch `1` between branches `2` and `3`. `sort i1 i2:i3` does the same inside the image list. Sorting is field-local, so source and target must use the same field.

`sort b1 b2:b3`는 branch `1`을 branch `2`와 `3` 사이로 이동합니다. `sort i1 i2:i3`는 이미지 목록 안에서 같은 방식으로 동작합니다. 정렬은 필드 내부에서만 동작하므로 source와 target은 같은 필드를 사용해야 합니다.

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

Third-party notices are listed in `THIRD_PARTY_NOTICES.md`.

서드파티 라이선스 표기는 `THIRD_PARTY_NOTICES.md`에 정리되어 있습니다.
