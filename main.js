"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ColumnsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var CFG_TITLE_PROP = "titleProperty";
var CFG_COL_WIDTH = "columnWidth";
var CFG_OPEN_BEHAVIOR = "openBehavior";
var CFG_WRAP_TITLE = "wrapTitle";
var CFG_WRAP_VALUES = "wrapValues";
var CFG_DATE_FORMAT_D = "dateFormatDate";
var CFG_DATE_FORMAT_DT = "dateFormatDatetime";
var CFG_DATE_LOCALE = "dateLocale";
var CFG_BOLD_TITLE = "boldTitle";
var CFG_CHIP_GRID = "chipGrid";
var CFG_CHIP_FONT_SIZE = "chipFontSize";
var ColumnsPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerBasesView("columns", {
      name: "Columns",
      icon: "columns-3",
      factory: (ctrl, el) => new ColumnsView(ctrl, el, this),
      options: () => ColumnsView.getViewOptions()
    });
  }
};
var ColumnsView = class extends import_obsidian.BasesView {
  constructor(controller, scrollEl, plugin) {
    super(controller);
    this.type = "columns";
    this.activeFilters = /* @__PURE__ */ new Set();
    this.andMode = false;
    this.scrollEl = scrollEl;
    this.plugin = plugin;
    this.containerEl = scrollEl.createDiv({ cls: "columns-container" });
  }
  onload() {
    this.render();
  }
  onunload() {
  }
  getDisplayText() {
    return "Columns";
  }
  focus() {
    this.containerEl.focus({ preventScroll: true });
  }
  onDataUpdated() {
    this.render();
  }
  // -----------------------------------------------------------------------
  //  View options (gear menu)
  // -----------------------------------------------------------------------
  static getViewOptions() {
    return [
      {
        key: CFG_OPEN_BEHAVIOR,
        type: "dropdown",
        displayName: "Open card in",
        default: "tab",
        options: {
          active: "Active pane",
          modal: "Floating modal",
          tab: "New tab"
        }
      },
      {
        displayName: "Card title property",
        type: "property",
        key: CFG_TITLE_PROP,
        placeholder: "File name"
      },
      {
        key: CFG_BOLD_TITLE,
        type: "toggle",
        displayName: "Bold card titles",
        default: true
      },
      {
        key: CFG_WRAP_TITLE,
        type: "toggle",
        displayName: "Wrap card titles",
        default: false
      },
      {
        key: CFG_WRAP_VALUES,
        type: "toggle",
        displayName: "Wrap multi-line values",
        default: false
      },
      {
        key: CFG_CHIP_GRID,
        type: "toggle",
        displayName: "Chip grid layout",
        default: false
      },
      {
        key: CFG_CHIP_FONT_SIZE,
        type: "slider",
        displayName: "Chip font size (px)",
        default: 12,
        min: 9,
        max: 16,
        step: 1
      },
      {
        key: CFG_DATE_FORMAT_D,
        type: "text",
        displayName: "Date format",
        placeholder: "Relative \u2014 e.g. DD-MM-YYYY"
      },
      {
        key: CFG_DATE_FORMAT_DT,
        type: "text",
        displayName: "Date & time format",
        placeholder: "Relative \u2014 e.g. DD-MM-YYYY HH:mm"
      },
      {
        key: CFG_DATE_LOCALE,
        type: "text",
        displayName: "Locale",
        placeholder: "en, ru, de, fr, es, ja, zh-cn..."
      },
      {
        key: CFG_COL_WIDTH,
        type: "slider",
        displayName: "Column width (px)",
        default: 300,
        min: 150,
        max: 500,
        step: 10
      }
    ];
  }
  // -----------------------------------------------------------------------
  //  Config helpers
  // -----------------------------------------------------------------------
  cfg(key, fallback) {
    const v = this.config?.get(key);
    return v ?? fallback;
  }
  propKey(key) {
    const raw = this.config?.get(key);
    if (typeof raw === "string") {
      const parsed = (0, import_obsidian.parsePropertyId)(raw);
      return parsed?.name ?? raw;
    }
    const id = this.config?.getAsPropertyId(key);
    if (id) {
      const parsed = (0, import_obsidian.parsePropertyId)(id);
      return parsed?.name ?? null;
    }
    return null;
  }
  getColumnProperty() {
    const cfg = this.config;
    const raw = cfg?.groupBy?.property;
    if (raw) {
      const parsed = (0, import_obsidian.parsePropertyId)(raw);
      return parsed?.name ?? raw;
    }
    if (cfg?.groupBy !== void 0) return null;
    return "tags";
  }
  getTitleProperty() {
    const fromProp = this.propKey(CFG_TITLE_PROP);
    return fromProp ?? null;
  }
  getTitlePropertyId() {
    const raw = this.config?.get(CFG_TITLE_PROP);
    if (typeof raw === "string") return raw;
    const id = this.config?.getAsPropertyId(CFG_TITLE_PROP);
    return id ?? null;
  }
  getColumnWidth() {
    const v = this.cfg(CFG_COL_WIDTH, 300);
    return v >= 150 && v <= 500 ? v : 300;
  }
  getOpenBehavior() {
    const v = this.cfg(CFG_OPEN_BEHAVIOR, "tab");
    return ["active", "modal", "tab"].includes(v) ? v : "tab";
  }
  /** Collect column values from a file's frontmatter. */
  getColumnValues(file, prop) {
    const cache = this.app.metadataCache.getFileCache(file);
    const raw = cache?.frontmatter?.[prop];
    if (Array.isArray(raw)) return raw.filter((v) => typeof v === "string");
    if (typeof raw === "string") return [raw];
    if (typeof raw === "number") return [String(raw)];
    return [];
  }
  /** Get visible properties from the Properties button. */
  getVisiblePropertyIds() {
    const props = this.config?.getOrder() ?? [];
    const columnProp = this.getColumnProperty();
    const titlePropName = this.getTitleProperty();
    const titlePropId = this.getTitlePropertyId();
    return props.filter((id) => {
      const parsed = (0, import_obsidian.parsePropertyId)(id);
      if (!parsed) return false;
      if (parsed.name === columnProp) return false;
      if (titlePropName && parsed.name === titlePropName) return false;
      if (titlePropId && id === titlePropId) return false;
      return true;
    });
  }
  // -----------------------------------------------------------------------
  //  Rendering
  // -----------------------------------------------------------------------
  render() {
    this.containerEl.empty();
    const entries = this.data?.data ?? [];
    if (entries.length === 0) {
      const emptyEl = this.containerEl.createDiv({ cls: "columns-empty" });
      emptyEl.textContent = "No files found.";
      return;
    }
    const columnProp = this.getColumnProperty();
    const columnMap = /* @__PURE__ */ new Map();
    const noValueEntries = [];
    if (!columnProp) {
      const allTag = this.getDisplayText();
      columnMap.set(allTag, [...entries]);
    } else {
      for (const entry of entries) {
        const file = entry.file;
        if (!(file instanceof import_obsidian.TFile)) continue;
        const values = this.getColumnValues(file, columnProp);
        if (values.length === 0) {
          noValueEntries.push(entry);
        } else {
          for (const v of values) {
            if (!columnMap.has(v)) columnMap.set(v, []);
            columnMap.get(v).push(entry);
          }
        }
      }
    }
    const fileTags = /* @__PURE__ */ new Map();
    for (const [colValue, colEntries] of columnMap) {
      for (const entry of colEntries) {
        const p = entry.file?.path;
        if (!p) continue;
        if (!fileTags.has(p)) fileTags.set(p, []);
        fileTags.get(p).push(colValue);
      }
    }
    const applyFilters = (paths) => {
      if (this.activeFilters.size === 0) return paths;
      if (this.andMode) {
        return paths.filter(
          (p) => Array.from(this.activeFilters).every((t) => fileTags.get(p)?.includes(t))
        );
      }
      return paths.filter(
        (p) => Array.from(this.activeFilters).some((t) => fileTags.get(p)?.includes(t))
      );
    };
    this.renderFilterBar(columnMap);
    let colNames = Array.from(columnMap.keys()).sort();
    if (this.activeFilters.size > 0) {
      colNames = colNames.filter((name) => this.activeFilters.has(name));
    }
    if (noValueEntries.length > 0) colNames.push("(No value)");
    const colWidth = this.getColumnWidth();
    const visibleProps = this.getVisiblePropertyIds();
    const boardEl = this.containerEl.createDiv({ cls: "columns-board" });
    for (const colName of colNames) {
      let colEntries;
      if (colName === "(No value)") {
        const paths = noValueEntries.map((e) => e.file?.path ?? "");
        const filteredPaths = applyFilters(paths);
        colEntries = noValueEntries.filter(
          (e) => e.file?.path && filteredPaths.includes(e.file.path)
        );
      } else {
        const raw = columnMap.get(colName);
        const paths = raw.map((e) => e.file?.path ?? "");
        const filteredPaths = applyFilters(paths);
        colEntries = raw.filter(
          (e) => e.file?.path && filteredPaths.includes(e.file.path)
        );
      }
      if (colEntries.length === 0) continue;
      this.renderColumn(boardEl, colName, colEntries, colWidth, visibleProps);
    }
  }
  // -----------------------------------------------------------------------
  //  Filter bar
  // -----------------------------------------------------------------------
  renderFilterBar(columnMap) {
    const tags = Array.from(columnMap.keys()).sort();
    if (tags.length === 0 && this.activeFilters.size === 0) return;
    const barEl = this.containerEl.createDiv({ cls: "columns-filter-bar" });
    const modeBtn = barEl.createSpan({ cls: "columns-mode-btn" });
    modeBtn.textContent = this.andMode ? "AND" : "OR";
    modeBtn.addEventListener("click", () => {
      this.andMode = !this.andMode;
      this.render();
    });
    const allPill = barEl.createSpan({
      cls: "columns-filter-pill" + (this.activeFilters.size === 0 ? " is-active" : "")
    });
    allPill.textContent = "All";
    const clearFilters = () => {
      this.activeFilters.clear();
      this.render();
    };
    allPill.addEventListener("click", clearFilters);
    allPill.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      clearFilters();
    });
    for (const tag of tags) {
      const pill = barEl.createSpan({
        cls: "columns-filter-pill" + (this.activeFilters.has(tag) ? " is-active" : "")
      });
      pill.textContent = tag;
      pill.addEventListener("click", (e) => {
        if (e.ctrlKey || e.metaKey) {
          if (this.activeFilters.has(tag)) {
            this.activeFilters.delete(tag);
          } else {
            this.activeFilters.add(tag);
          }
        } else {
          this.activeFilters.clear();
          this.activeFilters.add(tag);
        }
        this.render();
      });
      pill.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (this.activeFilters.has(tag)) {
          this.activeFilters.delete(tag);
        } else {
          this.activeFilters.add(tag);
        }
        this.render();
      });
    }
  }
  // -----------------------------------------------------------------------
  //  Column & Card
  // -----------------------------------------------------------------------
  renderColumn(boardEl, name, entries, width, visibleProps) {
    const colEl = boardEl.createDiv({ cls: "columns-column" });
    colEl.style.flexBasis = width + "px";
    const headerEl = colEl.createDiv({ cls: "columns-column-header" });
    const titleSpan = headerEl.createSpan({ cls: "columns-column-title" });
    titleSpan.textContent = name;
    const countSpan = headerEl.createSpan({ cls: "columns-column-count" });
    countSpan.textContent = String(entries.length);
    const cardsEl = colEl.createDiv({ cls: "columns-cards" });
    for (const entry of entries) {
      this.renderCard(cardsEl, entry, visibleProps);
    }
  }
  renderCard(cardsEl, entry, visibleProps) {
    const file = entry.file;
    if (!(file instanceof import_obsidian.TFile)) return;
    const cardEl = cardsEl.createDiv({ cls: "columns-card" });
    const titlePropId = this.getTitlePropertyId();
    const title = titlePropId ? entry.getValue(titlePropId)?.toString() ?? file.basename : file.name;
    const titleEl = cardEl.createDiv({ cls: "columns-card-title" });
    if (!this.cfg(CFG_BOLD_TITLE, true)) titleEl.addClass("is-normal-weight");
    if (this.cfg(CFG_WRAP_TITLE, false)) titleEl.addClass("is-wrap");
    titleEl.textContent = title;
    const wrapValues = this.cfg(CFG_WRAP_VALUES, false);
    const chipGrid = this.cfg(CFG_CHIP_GRID, false);
    const chipFontSize = this.cfg(CFG_CHIP_FONT_SIZE, 12);
    const chipsEl = cardEl.createDiv({ cls: chipGrid ? "columns-chips-grid" : "columns-chips" });
    chipsEl.style.fontSize = chipFontSize + "px";
    for (const propId of visibleProps) {
      const val = entry.getValue(propId);
      if (val == null || val instanceof import_obsidian.NullValue) continue;
      const chip = chipsEl.createDiv({ cls: "columns-card-chip" });
      if (wrapValues) chip.addClass("is-wrap");
      const parsed = (0, import_obsidian.parsePropertyId)(propId);
      const label = this.config?.getDisplayName(propId) ?? parsed?.name ?? propId;
      const labelEl = chip.createDiv({ cls: "columns-card-chip-label" });
      labelEl.textContent = label;
      this.renderChipValue(chip, val, file);
    }
    cardEl.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        const leaf = this.app.workspace.getLeaf(true);
        leaf.openFile(file);
      } else {
        this.openFile(file);
      }
    });
    cardEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new import_obsidian.Menu();
      this.app.workspace.trigger("file-menu", menu, file, "columns-cards");
      menu.showAtPosition({ x: e.clientX, y: e.clientY });
    });
  }
  /** Render a chip value based on its Obsidian Value type. */
  renderChipValue(chip, val, sourceFile) {
    if (val instanceof import_obsidian.BooleanValue) {
      const iconEl = chip.createSpan({ cls: "columns-chip-boolean" });
      (0, import_obsidian.setIcon)(iconEl, val.toString() === "true" ? "square-check-big" : "square");
      return;
    }
    if (val instanceof import_obsidian.DateValue) {
      const fmtD = this.cfg(CFG_DATE_FORMAT_D, "");
      const fmtDT = this.cfg(CFG_DATE_FORMAT_DT, "");
      const locale = this.cfg(CFG_DATE_LOCALE, "");
      const raw = val.toString();
      const hasTime = raw.includes(":") || raw.includes("T");
      const fmt = hasTime && fmtDT ? fmtDT : !hasTime && fmtD ? fmtD : "";
      const m = locale ? (0, import_obsidian.moment)(raw).locale(locale) : (0, import_obsidian.moment)(raw);
      const text2 = fmt ? m.format(fmt) : m.isValid() ? m.fromNow() : val.relative();
      const textEl = chip.createSpan({ cls: "columns-chip-text" });
      textEl.textContent = text2;
      return;
    }
    if (val instanceof import_obsidian.LinkValue) {
      const linkEl = chip.createEl("a", { cls: "columns-chip-link" });
      const raw = val.toString();
      const match = raw.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
      const linkTarget = match ? match[1] : raw;
      linkEl.textContent = match ? match[2] || linkTarget.split("/").pop()?.replace(/\.md$/, "") || raw : raw;
      linkEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const resolved = this.app.metadataCache.getFirstLinkpathDest(linkTarget, sourceFile.path);
        if (resolved && resolved instanceof import_obsidian.TFile) {
          this.openFile(resolved);
        }
      });
      return;
    }
    if (val instanceof import_obsidian.ListValue) {
      const row = chip.createDiv({ cls: "columns-chip-tag-row" });
      const len = val.length();
      for (let i = 0; i < len; i++) {
        const item = val.get(i);
        if (!item || item instanceof import_obsidian.NullValue || !item.isTruthy()) continue;
        const pill = row.createSpan({ cls: "columns-chip-tag" });
        if (item instanceof import_obsidian.LinkValue) {
          const raw = item.toString();
          const m = raw.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
          const target = m ? m[1] : raw;
          pill.textContent = m ? m[2] || target.split("/").pop()?.replace(/\.md$/, "") || raw : raw;
          pill.style.cursor = "pointer";
          pill.addEventListener("click", (e) => {
            e.stopPropagation();
            const resolved = this.app.metadataCache.getFirstLinkpathDest(target, sourceFile.path);
            if (resolved && resolved instanceof import_obsidian.TFile) this.openFile(resolved);
          });
        } else {
          pill.textContent = item.toString();
        }
      }
      return;
    }
    const text = val.toString();
    const urlMatch = text.match(/^(https?:\/\/[^\s]+)$/);
    if (urlMatch) {
      const linkEl = chip.createEl("a", { cls: "columns-chip-link", href: urlMatch[1] });
      linkEl.target = "_blank";
      linkEl.textContent = text;
      linkEl.addEventListener("click", (e) => e.stopPropagation());
    } else {
      const textEl = chip.createSpan({ cls: "columns-chip-text" });
      textEl.textContent = text;
    }
  }
  // -----------------------------------------------------------------------
  //  Open file
  // -----------------------------------------------------------------------
  openFile(file) {
    const behavior = this.getOpenBehavior();
    let open = null;
    this.app.workspace.iterateAllLeaves((l) => {
      const leafFile = l.view?.file;
      const leafPath = typeof leafFile === "string" ? leafFile : typeof leafFile?.path === "string" ? leafFile.path : void 0;
      if (leafPath === file.path) open = l;
    });
    if (open) {
      this.app.workspace.setActiveLeaf(open, { focus: true });
      return;
    }
    switch (behavior) {
      case "active": {
        this.app.workspace.getLeaf(false).openFile(file);
        break;
      }
      case "modal": {
        new FilePreviewModal(this.app, file).open();
        break;
      }
      case "tab": {
        this.app.workspace.getLeaf(true).openFile(file);
        break;
      }
    }
  }
};
var FilePreviewModal = class extends import_obsidian.Modal {
  constructor(app, file) {
    super(app);
    this.file = file;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("columns-modal-content");
    contentEl.createEl("h2", { text: this.file.basename });
    const contentDiv = contentEl.createDiv({ cls: "columns-modal-body" });
    this.app.vault.read(this.file).then((text) => {
      import_obsidian.MarkdownRenderer.render(this.app, text, contentDiv, this.file.path, this);
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
