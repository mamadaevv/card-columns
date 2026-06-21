# Columns

A kanban-style card view for Obsidian. Group notes by tags or any frontmatter property into columns, with tag filtering and property chips.

## Demo

<!-- Video 1: Overview -->
**1. Overview**
![Overview](https://raw.githubusercontent.com/mamadaevv/obsidian-columns/main/overview.png)

<!-- Video 2: Setup & Configuration -->
**2. Creating and configuring a view**
[![View configure cover](https://raw.githubusercontent.com/mamadaevv/obsidian-columns/main/view%20configure.webp)](https://github.com/mamadaevv/obsidian-columns/blob/main/view%20configure.webm)

<!-- Video 3: Filtering -->
**3. Tag filtering & column navigation**
[![Filter use cover](https://raw.githubusercontent.com/mamadaevv/obsidian-columns/main/filter%20use.webp)](https://github.com/mamadaevv/obsidian-columns/blob/main/filter%20use.webm)

## Features

- **Column grouping** — group by `tags`, `status`, `category` or any frontmatter property
- **Tag filtering** — click tags to AND/OR filter across columns
- **Property chips** — view note properties as styled chips (text, tags, links, booleans, dates)
- **Date formatting** — Moment.js format and locale support
- **Grid/Stack layout** — compact inline properties or structured vertical layout
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
- Wrap card titles
- Bold card titles
- Font size (px)

### Properties
- Layout (Stack / Grid)
- Wrap multi-line values
- Font size (px)
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

## Publishing to Community Plugins

To publish, you'll need:

1. A **public GitHub repository** named `obsidian-columns`
2. The repo must contain: `main.js`, `manifest.json`, `styles.css`, `LICENSE`, `README.md`
3. A **git tag** matching the version in `manifest.json` (e.g. `0.2.0`)
4. Create a PR to [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) adding an entry to `community-plugins.json`

## Support

If you find this plugin useful, consider supporting its development:

**https://donation.streamiverse.io/mamadaevv**

## License

MIT
