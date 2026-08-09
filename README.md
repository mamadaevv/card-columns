# Card Columns

A [Bases](https://help.obsidian.md/bases) view that lays notes out as **cards grouped into columns** — like a Kanban board, driven entirely by your frontmatter. Group by any property (status, assignee, tags…), drag cards between columns to update that property, filter by column values, and show cover images + property chips.

![Card Columns board example — cards grouped into Todo / In Progress / Done columns with a card being dragged and the drop-target column glowing with an accent outline](images/board-example.png)

## Features

- **Column grouping** — notes are bucketed into columns by the value of a chosen property (defaults to `tags`). One note can appear in multiple columns when the property holds a list of values.
- **Custom column order** — fix the set and order of columns with a comma-separated list (`Todo, In Progress, Done`). Empty columns stay visible as stable Kanban lanes.
- **Drag & drop** — drag a card to another column and the plugin rewrites the underlying frontmatter property: it removes the old value and appends the new one (deduped). A single transaction, no plugins or templating required.
  - While dragging, the target column lights up with a thin accent outline + soft inner glow.
  - ![Drag & drop in action — a card hovering over the "Done" column, which shows a faint accent outline and glow](images/drag-drop.gif)
- **Filter bar** — click column values (tags) to filter. Toggle between **AND** and **OR** match modes. Resize the bar by dragging its bottom edge.
- **Cover images** — pick a cover from the first image in the note, a dedicated `cover` property, or the note itself when it is an image. Control aspect ratio, orientation, fit, and position (above title / below title / after all properties).
- **Property chips** — every visible property renders as a chip, typed by Obsidian value type:
  - `BooleanValue` → check / square icon
  - `DateValue` → relative ("2 days ago") or custom format + locale
  - `LinkValue` → clickable internal link
  - `ListValue` (tags / arrays) → pill row
  - URLs → external links; `file.backlinks` / `embeds` / `outlinks` → clickable link lists
- **Open behaviors** — click a card to open it as: active pane, floating modal (renders Markdown live, navigates internal links in-place), new tab, split right, or split down. `Ctrl`/`Cmd`+click opens in the background.
- **Layout options** — card width, columns per group, zebra striping, and masonry (vertical gap-filling) layout.
- **Scroll position preserved** — after a drag-and-drop rebuild the board restores the viewed area proportionally, so it doesn't snap back to the left edge.

## Requirements

- Obsidian **1.8.0+** (requires Bases).
- Desktop or mobile — the plugin is not desktop-only.

## Installation

### Via BRAT (recommended for beta)

1. Install the [BRAT](https://obsidian.md/plugins/brat) plugin.
2. `Add a beta plugin` → paste: `https://github.com/mamadaevv/card-columns`
3. Enable **Card Columns** in Community plugins.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [release](https://github.com/mamadaevv/card-columns/releases).
2. Put them in `<vault>/.obsidian/plugins/card-columns/`.
3. Enable **Card Columns** in Community plugins.

## Usage

Card Columns is a **Bases view**, so it works wherever Bases does.

1. Open a Bases view (e.g. a `*.base` file, or the Bases toggle on a search/all-notes view).
2. Change the view to **Columns** from the view switcher (icon: ![Columns view icon — three vertical columns](images/columns-icon.png)).
3. The board groups notes by the property set in **Group by** (in the Bases config). Leave it empty to group by `tags`.

### Grouping by a property

In the Bases view options, set **Group by → property** to the field you want columns for. For a task board:

```yaml
---
status: In Progress
assignee: Nik
priority: high
---
```

With `Group by = status`, this note lands in the **In Progress** column. Set `status: [In Progress, Blocked]` and it appears in **both** columns.

### Custom column order

In the Columns view settings, set **Column list** to a comma-separated order, e.g. `Todo, In Progress, Done`. Notes whose value isn't listed still show under **(No value)**.

### Drag & drop

Enable **Drag & drop cards between columns** (on by default). Drag a card to another column — the plugin edits the grouped property in that note's frontmatter:

- Value was `Todo` → drop on `Done` → becomes `Done`.
- Value was `Todo` → drop on `In Progress` → becomes `In Progress` (old removed).
- A note already in `Done` dropped again on `Done` → no-op.

Because it writes real frontmatter, the change is visible everywhere (graph, search, other Bases views).

### Filtering

The filter bar above the board lists every column value as a pill.

- Click a pill → show only columns/cards matching it (**OR** mode shows cards in any selected column).
- Click **AND** to require all selected values.
- `Ctrl`/`Cmd`+click or right-click a pill → toggle it without clearing the others.
- **All** clears filters.

## View settings

Open the gear menu in the Bases view header.

| Group | Setting | Default | Notes |
|-------|---------|---------|-------|
| General | Open card in | Floating modal | active / modal / tab / split-right / split-down |
| General | Card width (px) | 300 | 150–700 |
| General | Columns per group | 1 | 1–6 |
| General | Zebra striping | off | alternate column background |
| General | Masonry layout | off | fill vertical gaps |
| General | Drag & drop | on | rewrite frontmatter on drop |
| General | Column list | empty | comma-separated fixed order |
| Title | Wrap card titles | on | |
| Title | Bold card titles | on | |
| Title | Font size (px) | 14 | 11–20 |
| Properties | Layout | Stack | Stack / Grid |
| Properties | Wrap multi-line values | on | |
| Properties | Font size (px) | 12 | 9–18 |
| Properties | Date format | relative | e.g. `DD-MM-YYYY` |
| Properties | Date & time format | relative | e.g. `DD-MM-YYYY HH:mm` |
| Properties | Locale | auto | `en`, `ru`, `de`… |
| Cover | Source | None | None / First image / Cover property |
| Cover | Style | Borderless | Borderless / Bordered |
| Cover | Aspect ratio | Auto | Auto / 1:1 / 3:2 / 4:3 / 16:9 |
| Cover | Orientation | Landscape | Landscape / Portrait |
| Cover | Image fit | Cover | Cover / Contain |
| Cover | Position in card | Above title | Above title / Below title / After all properties |

## Development

```bash
npm install
npm run build      # bundles main.ts -> main.js with esbuild
```

The plugin is written in TypeScript against the Obsidian `obsidian` types and extends `BasesView`.

## License

MIT — see [LICENSE](LICENSE).
