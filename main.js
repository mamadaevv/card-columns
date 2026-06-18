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
var CFG_SOURCE_FOLDER = "sourceFolder";
var CFG_COLUMN_PROP = "columnProperty";
var CFG_TITLE_PROP = "titleProperty";
var CFG_COL_WIDTH = "columnWidth";
var CFG_OPEN_BEHAVIOR = "openBehavior";
var PRIORITY_PROPS = [
  "categories",
  "tags",
  "type",
  "status",
  "genre",
  "topic"
];
var ColumnsPlugin = class extends import_obsidian.Plugin {
  async onload() {
    const svg = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.23694 3.0004C7.20344 3.0004 7.98694 3.7839 7.98694 4.7504V19.2504C7.98694 20.2169 7.20344 21.0004 6.23694 21.0004H3.73694C2.77044 21.0004 1.98694 20.2169 1.98694 19.2504V4.7504C1.98694 3.83223 2.69405 3.07921 3.59341 3.0062L3.73694 3.0004H6.23694ZM20.263 3.0004C21.2295 3.0004 22.013 3.7839 22.013 4.7504V19.2504C22.013 20.2169 21.2295 21.0004 20.263 21.0004H17.763C16.7965 21.0004 16.013 20.2169 16.013 19.2504V4.7504C16.013 3.7839 16.7965 3.0004 17.763 3.0004H20.263ZM13.2369 2.99957C14.2034 2.99957 14.9869 3.78307 14.9869 4.74957V19.2496C14.9869 20.2161 14.2034 20.9996 13.2369 20.9996H10.7369C9.77044 20.9996 8.98694 20.2161 8.98694 19.2496V4.74957C8.98694 3.78307 9.77044 2.99957 10.7369 2.99957H13.2369ZM6.23694 4.5004H3.73694L3.67962 4.50701C3.56917 4.53292 3.48694 4.63206 3.48694 4.7504V19.2504C3.48694 19.3885 3.59887 19.5004 3.73694 19.5004H6.23694C6.37501 19.5004 6.48694 19.3885 6.48694 19.2504V4.7504C6.48694 4.61233 6.37501 4.5004 6.23694 4.5004ZM20.263 4.5004H17.763C17.6249 4.5004 17.513 4.61233 17.513 4.7504V19.2504C17.513 19.3885 17.6249 19.5004 17.763 19.5004H20.263C20.4011 19.5004 20.513 19.3885 20.513 19.2504V4.7504C20.513 4.61233 20.4011 4.5004 20.263 4.5004ZM13.2369 4.49957H10.7369C10.5989 4.49957 10.4869 4.6115 10.4869 4.74957V19.2496C10.4869 19.3876 10.5989 19.4996 10.7369 19.4996H13.2369C13.375 19.4996 13.4869 19.3876 13.4869 19.2496V4.74957C13.4869 4.6115 13.375 4.49957 13.2369 4.49957Z" fill="currentColor"/></svg>`;
    this.registerIcon("columns-view", svg);
    this.registerBasesView("columns", {
      name: "Columns",
      icon: "columns-view",
      factory: (ctrl, el) => new ColumnsView(ctrl, el, this),
      options: () => ColumnsView.getViewOptions()
    });
  }
};
var ColumnsView = class extends import_obsidian.BasesView {
  constructor(controller, scrollEl, plugin) {
    super(controller);
    this.type = "columns";
    this.hoverPopover = null;
    this.activeFilters = /* @__PURE__ */ new Set();
    this.andMode = true;
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
        displayName: "Source folder",
        type: "folder",
        key: CFG_SOURCE_FOLDER,
        placeholder: "Entire vault"
      },
      {
        displayName: "Column property",
        type: "property",
        key: CFG_COLUMN_PROP,
        filter: (prop) => !prop.startsWith("file."),
        placeholder: "Auto-detect"
      },
      {
        displayName: "Card title property",
        type: "property",
        key: CFG_TITLE_PROP,
        placeholder: "File name"
      },
      {
        key: CFG_COL_WIDTH,
        type: "slider",
        displayName: "Column width (px)",
        default: 300,
        min: 150,
        max: 500,
        step: 10
      },
      {
        key: CFG_OPEN_BEHAVIOR,
        type: "dropdown",
        displayName: "Open card in",
        default: "modal",
        options: {
          active: "Active pane",
          modal: "Floating modal",
          tab: "New tab",
          split: "Split to the right"
        }
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
  /** Strip 'note.' prefix from BasesPropertyId to get raw frontmatter key. */
  propKey(key) {
    const id = this.config?.getAsPropertyId(key);
    if (!id) return null;
    const parsed = (0, import_obsidian.parsePropertyId)(id);
    return parsed?.property ?? null;
  }
  getSourceFolder() {
    return this.cfg(CFG_SOURCE_FOLDER, "");
  }
  getColumnProperty() {
    const fromProp = this.propKey(CFG_COLUMN_PROP);
    if (fromProp) return fromProp;
    return this.detectColumnProperty();
  }
  getTitleProperty() {
    const fromProp = this.propKey(CFG_TITLE_PROP);
    return fromProp ?? null;
  }
  getColumnWidth() {
    const v = this.cfg(CFG_COL_WIDTH, 300);
    return v >= 150 && v <= 500 ? v : 300;
  }
  getOpenBehavior() {
    const v = this.cfg(CFG_OPEN_BEHAVIOR, "modal");
    return ["active", "modal", "tab", "split"].includes(v) ? v : "modal";
  }
  /** Resolve when no property selected — find first priority prop in frontmatter. */
  detectColumnProperty() {
    const entries = this.data?.entries ?? [];
    const seen = /* @__PURE__ */ new Set();
    for (const entry of entries) {
      if (seen.size >= 50) break;
      const file = entry.file;
      if (!(file instanceof import_obsidian.TFile) || seen.has(file.path)) continue;
      seen.add(file.path);
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;
      for (const prop of PRIORITY_PROPS) {
        if (prop in cache.frontmatter) {
          return prop;
        }
      }
    }
    return "tags";
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
  // -----------------------------------------------------------------------
  //  Rendering
  // -----------------------------------------------------------------------
  render() {
    this.containerEl.empty();
    const entries = this.data?.entries ?? [];
    if (entries.length === 0) {
      const emptyEl = this.containerEl.createDiv({ cls: "columns-empty" });
      emptyEl.textContent = "No files found. Create a .base file in your vault, configure its query, then switch to Columns view.";
      return;
    }
    const folder = this.getSourceFolder();
    const columnProp = this.getColumnProperty();
    const prefix = folder ? folder.endsWith("/") ? folder : folder + "/" : "";
    const filtered = prefix ? entries.filter(
      (e) => e.file?.path === folder || e.file?.path?.startsWith(prefix)
    ) : entries;
    const columnMap = /* @__PURE__ */ new Map();
    const noValueFiles = [];
    for (const entry of filtered) {
      const file = entry.file;
      if (!(file instanceof import_obsidian.TFile)) continue;
      const values = this.getColumnValues(file, columnProp);
      if (values.length === 0) {
        noValueFiles.push(file);
      } else {
        for (const v of values) {
          if (!columnMap.has(v)) columnMap.set(v, /* @__PURE__ */ new Set());
          columnMap.get(v).add(file.path);
        }
      }
    }
    const fileTags = /* @__PURE__ */ new Map();
    for (const [val, paths] of columnMap) {
      for (const p of paths) {
        if (!fileTags.has(p)) fileTags.set(p, []);
        fileTags.get(p).push(val);
      }
    }
    const applyFilters = (paths, allTags) => {
      if (this.activeFilters.size === 0) return paths;
      if (this.andMode) {
        return paths.filter(
          (p) => allTags.every((t) => this.activeFilters.has(t))
        );
      }
      return paths.filter(
        (p) => allTags.some((t) => this.activeFilters.has(t))
      );
    };
    this.renderFilterBar(columnMap);
    const colNames = Array.from(columnMap.keys()).sort();
    if (noValueFiles.length > 0) colNames.push("(No value)");
    const colWidth = this.getColumnWidth();
    const boardEl = this.containerEl.createDiv({ cls: "columns-board" });
    for (const colName of colNames) {
      let colFiles;
      if (colName === "(No value)") {
        colFiles = applyFilters(
          noValueFiles.map((f) => f.path),
          []
        ).map((p) => noValueFiles.find((f) => f.path === p));
        if (this.activeFilters.size > 0 && this.andMode) continue;
      } else {
        const rawPaths = Array.from(columnMap.get(colName));
        const filteredPaths = applyFilters(rawPaths, rawPaths);
        const entryMap = /* @__PURE__ */ new Map();
        for (const entry of filtered) {
          if (entry.file instanceof import_obsidian.TFile) entryMap.set(entry.file.path, entry.file);
        }
        colFiles = filteredPaths.filter((p) => {
          const vals = fileTags.get(p) ?? [];
          return vals.includes(colName);
        }).map((p) => entryMap.get(p)).filter(Boolean);
        if (this.andMode && this.activeFilters.size > 0) {
          colFiles = colFiles.filter((f) => {
            const tags = fileTags.get(f.path) ?? [];
            return Array.from(this.activeFilters).every((t) => tags.includes(t));
          });
        }
      }
      this.renderColumn(boardEl, colName, colFiles, colWidth);
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
    allPill.addEventListener("click", () => {
      this.activeFilters.clear();
      this.render();
    });
    for (const tag of tags) {
      const pill = barEl.createSpan({
        cls: "columns-filter-pill" + (this.activeFilters.has(tag) ? " is-active" : "")
      });
      pill.textContent = tag;
      pill.addEventListener("click", () => {
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
  renderColumn(boardEl, name, files, width) {
    const colEl = boardEl.createDiv({ cls: "columns-column" });
    colEl.style.flexBasis = width + "px";
    const headerEl = colEl.createDiv({ cls: "columns-column-header" });
    const titleSpan = headerEl.createSpan({ cls: "columns-column-title" });
    titleSpan.textContent = name;
    const countSpan = headerEl.createSpan({ cls: "columns-column-count" });
    countSpan.textContent = String(files.length);
    const cardsEl = colEl.createDiv({ cls: "columns-cards" });
    for (const file of files) {
      this.renderCard(cardsEl, file);
    }
  }
  renderCard(cardsEl, file) {
    const cardEl = cardsEl.createDiv({ cls: "columns-card" });
    const title = this.getCardTitle(file);
    cardEl.textContent = title;
    cardEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openFile(file);
    });
    cardEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new import_obsidian.Menu(this.app);
      this.app.workspace.trigger("file-menu", menu, file, "columns-cards");
      menu.showAtPosition({ x: e.clientX, y: e.clientY });
    });
  }
  getCardTitle(file) {
    const prop = this.getTitleProperty();
    if (!prop) return file.basename;
    const cache = this.app.metadataCache.getFileCache(file);
    const val = cache?.frontmatter?.[prop];
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    return file.basename;
  }
  // -----------------------------------------------------------------------
  //  Open file
  // -----------------------------------------------------------------------
  openFile(file) {
    const behavior = this.getOpenBehavior();
    switch (behavior) {
      case "active": {
        const leaf = this.app.workspace.getLeaf(false);
        leaf.openFile(file);
        break;
      }
      case "modal": {
        new FilePreviewModal(this.app, file).open();
        break;
      }
      case "tab": {
        const leaf = this.app.workspace.getLeaf(true);
        leaf.openFile(file);
        break;
      }
      case "split": {
        const leaf = this.app.workspace.getLeaf("split", "horizontal");
        leaf.openFile(file);
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
