# Columns

A kanban-style card view for Obsidian. Group notes by tags or any frontmatter property into columns, with tag filtering and property chips.

## Demo

<!-- Video 1: Overview -->
**1. Overview**

![Overview](https://github.com/user-attachments/assets/a9bfbb83-79d8-40c0-bc68-7e43bcdc1953)

<!-- Video 2: Setup & Configuration -->
**2. Creating and configuring a view**

[![View configure](https://github.com/user-attachments/assets/1d23aa39-235a-45a7-89a6-e65174823a7e)](https://github.com/user-attachments/assets/1d23aa39-235a-45a7-89a6-e65174823a7e)

<!-- Video 3: Filtering -->
**3. Tag filtering & column navigation**

[![Filter use](https://github.com/user-attachments/assets/d2981eb9-b13a-425e-abab-9324cd0c5f79)](https://github.com/user-attachments/assets/d2981eb9-b13a-425e-abab-9324cd0c5f79)

## Features

- **Column grouping** — group by `tags`, `status`, `category` or any frontmatter property
- **Tag filtering** — click tags to AND/OR filter across columns
- **Property chips** — view note properties as styled chips (text, tags, links, booleans, dates)
- **Date formatting** — Moment.js format and locale support
- **Grid/Stack layout** — compact inline properties or structured vertical layout
- **Native integration** — uses Obsidian BasesView framework (Sort, Filter, Properties, Search toolbar)

## Usage

1. Create a new `.base` file (or open an existing database)
2. Click the view switcher and select **Columns**
3. Click **Group by** in the toolbar → choose a property (e.g. `tags`, `status`) → notes are grouped into columns
4. Filter by clicking tag pills below the toolbar:
   - **Left-click** on a tag → show only notes with that tag (clears other filters)
   - **Left-click another tag** → show notes matching ANY selected tag (OR mode)
   - **Ctrl+Click** or **Right-click** on a tag → toggle that tag without clearing others (add/remove single tag)
   - Click the **OR/AND** button → switch between OR and AND mode for multiple tags
   - Click **All** → clear all filters
5. **Open a card**:
   - **Left-click** → open note (mode set in gear menu: tab / active pane / modal)
   - **Ctrl+Click** → open note in a background tab
6. Open the **gear menu** (⚙) to configure appearance: title style, property chips, date format, layout

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

## Support

If you find this plugin useful, consider supporting its development:

**https://donation.streamiverse.io/mamadaevv**

## License

MIT
