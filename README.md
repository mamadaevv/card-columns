# Columns

A kanban-style card view for Obsidian. Group notes by tags or any frontmatter property into columns, with tag filtering and property chips.

## Features

- **Column grouping** — group by `tags`, `status`, `category` or any frontmatter property
- **Tag filtering** — click tags to AND/OR filter across columns
- **Card chips** — view note properties as styled chips (text, tags, links, booleans, dates)
- **Date formatting** — Moment.js format and locale support
- **Grid/Stack layout** — compact inline chips or structured vertical layout
- **Native integration** — uses Obsidian BasesView framework (Sort, Filter, Properties, Search toolbar)

## Usage

1. Create a new .base file (or open an existing database)
2. Click the view switcher and select **Columns**
3. Use **Group by** in the toolbar to pick a property for column grouping
4. Click tag pills to filter, gear menu to configure

## Settings (gear menu)

### General
- Open card in (active pane / floating modal / new tab)
- Column width (px)

### Title
- Card title property
- Wrap card titles
- Bold card titles
- Title font size

### Chips
- Chip layout (Stack / Grid)
- Wrap multi-line values
- Chip font size
- Date format
- Date & time format
- Locale

## Installation

1. Download from Obsidian community plugins (pending)
2. Or manual: copy `main.js`, `manifest.json`, `styles.css` to `obsidian-columns/` in your vault's `.obsidian/plugins/`

## Development

```bash
npm install
npm run build
```

## License

MIT
