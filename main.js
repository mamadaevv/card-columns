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
    this.andMode = true;
    this.scrollEl = scrollEl;
    this.plugin = plugin;
    this.containerEl = scrollEl.createDiv({ cls: "columns-container" });
  }
  onload() {
    let debounceTimer = null;
    this.registerEvent(
      this.app.vault.on("modify", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.render(), 200);
      })
    );
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
          tab: "New tab"
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
    return ["active", "modal", "tab"].includes(v) ? v : "modal";
  }
  detectColumnProperty() {
    const entries = this.data?.data ?? [];
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
  /** Get visible properties from the Properties button. */
  getVisiblePropertyIds() {
    const props = this.config?.getOrder() ?? [];
    return props.filter((id) => {
      const parsed = (0, import_obsidian.parsePropertyId)(id);
      if (!parsed) return false;
      const titleProp = this.getTitleProperty();
      if (titleProp && parsed.name === titleProp) return false;
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
    const folder = this.getSourceFolder();
    const columnProp = this.getColumnProperty();
    const prefix = folder ? folder.endsWith("/") ? folder : folder + "/" : "";
    const filtered = prefix ? entries.filter(
      (e) => e.file?.path === folder || e.file?.path?.startsWith(prefix)
    ) : entries;
    const columnMap = /* @__PURE__ */ new Map();
    const noValueEntries = [];
    for (const entry of filtered) {
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
        this.activeFilters.clear();
        this.activeFilters.add(tag);
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
    const titleEl = cardEl.createDiv({ cls: "columns-card-title" });
    const title = this.getCardTitle(file);
    titleEl.textContent = title;
    for (const propId of visibleProps) {
      const val = entry.getValue(propId);
      if (val == null || val instanceof import_obsidian.NullValue) continue;
      const chip = cardEl.createSpan({ cls: "columns-card-chip" });
      const parsed = (0, import_obsidian.parsePropertyId)(propId);
      const label = parsed?.name ?? propId;
      chip.textContent = `${label}: ${val.toString()}`;
    }
    cardEl.addEventListener("click", (e) => {
      this.openFile(file);
    });
    cardEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new import_obsidian.Menu();
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
