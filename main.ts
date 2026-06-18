import {
  Plugin,
  BasesView,
  BasesAllOptions,
  BasesEntry,
  QueryController,
  HoverParent,
  HoverPopover,
  TFile,
  WorkspaceLeaf,
  Menu,
  Modal,
  MarkdownRenderer,
  App,
  parsePropertyId,
} from "obsidian";

// ---------------------------------------------------------------------------
//  Config keys
// ---------------------------------------------------------------------------

const CFG_SOURCE_FOLDER = "sourceFolder";
const CFG_COLUMN_PROP = "columnProperty";
const CFG_TITLE_PROP = "titleProperty";
const CFG_COL_WIDTH = "columnWidth";
const CFG_OPEN_BEHAVIOR = "openBehavior";

const PRIORITY_PROPS = [
  "categories",
  "tags",
  "type",
  "status",
  "genre",
  "topic",
];

// ---------------------------------------------------------------------------
//  Plugin
// ---------------------------------------------------------------------------

export default class ColumnsPlugin extends Plugin {
  async onload() {
    this.registerBasesView("columns", {
      name: "Columns",
      icon: "columns-3",
      factory: (ctrl: QueryController, el: HTMLElement) =>
        new ColumnsView(ctrl, el, this),
      options: () => ColumnsView.getViewOptions(),
    });
  }
}

// ---------------------------------------------------------------------------
//  Columns View
// ---------------------------------------------------------------------------

class ColumnsView extends BasesView implements HoverParent {
  type = "columns";
  hoverPopover: HoverPopover | null = null;
  scrollEl: HTMLElement;
  containerEl: HTMLElement;
  plugin: ColumnsPlugin;

  activeFilters: Set<string> = new Set();
  andMode = true;

  constructor(
    controller: QueryController,
    scrollEl: HTMLElement,
    plugin: ColumnsPlugin,
  ) {
    super(controller);
    this.scrollEl = scrollEl;
    this.plugin = plugin;
    this.containerEl = scrollEl.createDiv({ cls: "columns-container" });
  }

  onload(): void {
    this.render();
  }

  onunload(): void {}

  getDisplayText(): string {
    return "Columns";
  }

  focus(): void {
    this.containerEl.focus({ preventScroll: true });
  }

  onDataUpdated(): void {
    this.render();
  }

  // -----------------------------------------------------------------------
  //  View options (gear menu)
  // -----------------------------------------------------------------------

  static getViewOptions(): BasesAllOptions[] {
    return [
      {
        displayName: "Source folder",
        type: "folder",
        key: CFG_SOURCE_FOLDER,
        placeholder: "Entire vault",
      },
      {
        displayName: "Column property",
        type: "property",
        key: CFG_COLUMN_PROP,
        filter: (prop: string) => !prop.startsWith("file."),
        placeholder: "Auto-detect",
      },
      {
        displayName: "Card title property",
        type: "property",
        key: CFG_TITLE_PROP,
        placeholder: "File name",
      },
      {
        key: CFG_COL_WIDTH,
        type: "slider",
        displayName: "Column width (px)",
        default: 300,
        min: 150,
        max: 500,
        step: 10,
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
          split: "Split to the right",
        },
      },
    ];
  }

  // -----------------------------------------------------------------------
  //  Config helpers
  // -----------------------------------------------------------------------

  private cfg<T>(key: string, fallback: T): T {
    const v = this.config?.get(key);
    return (v as T) ?? fallback;
  }

  /** Strip 'note.' prefix from BasesPropertyId to get raw frontmatter key. */
  private propKey(key: string): string | null {
    const id = this.config?.getAsPropertyId(key);
    if (!id) return null;
    const parsed = parsePropertyId(id);
    return parsed?.name ?? null;
  }

  private getSourceFolder(): string {
    return this.cfg(CFG_SOURCE_FOLDER, "");
  }

  private getColumnProperty(): string {
    const fromProp = this.propKey(CFG_COLUMN_PROP);
    if (fromProp) return fromProp;
    return this.detectColumnProperty();
  }

  private getTitleProperty(): string | null {
    const fromProp = this.propKey(CFG_TITLE_PROP);
    return fromProp ?? null;
  }

  private getColumnWidth(): number {
    const v = this.cfg<number>(CFG_COL_WIDTH, 300);
    return v >= 150 && v <= 500 ? v : 300;
  }

  private getOpenBehavior(): string {
    const v = this.cfg(CFG_OPEN_BEHAVIOR, "modal");
    return ["active", "modal", "tab", "split"].includes(v) ? v : "modal";
  }

  /** Resolve when no property selected — find first priority prop in frontmatter. */
  private detectColumnProperty(): string {
    const entries = this.data?.data ?? [];
    const seen = new Set<string>();

    for (const entry of entries) {
      if (seen.size >= 50) break;
      const file = entry.file;
      if (!(file instanceof TFile) || seen.has(file.path)) continue;
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
  private getColumnValues(file: TFile, prop: string): string[] {
    const cache = this.app.metadataCache.getFileCache(file);
    const raw = cache?.frontmatter?.[prop];
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
    if (typeof raw === "string") return [raw];
    if (typeof raw === "number") return [String(raw)];
    return [];
  }

  // -----------------------------------------------------------------------
  //  Rendering
  // -----------------------------------------------------------------------

  render(): void {
    this.containerEl.empty();

    const entries = this.data?.data ?? [];

    console.log("[Columns] entries count:", entries.length);

    // If no entries, show a helpful message
    if (entries.length === 0) {
      const emptyEl = this.containerEl.createDiv({ cls: "columns-empty" });
      emptyEl.textContent = "No files found. Create a .base file in your vault, configure its query, then switch to Columns view.";
      return;
    }

    const folder = this.getSourceFolder();
    const columnProp = this.getColumnProperty();

    console.log("[Columns] folder:", folder, "prop:", columnProp);

    // Filter by source folder
    const prefix = folder ? (folder.endsWith("/") ? folder : folder + "/") : "";
    const filtered = prefix
      ? entries.filter(
          (e) =>
            e.file?.path === folder || e.file?.path?.startsWith(prefix),
        )
      : entries;

    console.log("[Columns] filtered count:", filtered.length);

    // Build column map: value → Set<file path>
    const columnMap = new Map<string, Set<string>>();
    const noValueFiles: TFile[] = [];

    for (const entry of filtered) {
      const file = entry.file;
      if (!(file instanceof TFile)) continue;

      const values = this.getColumnValues(file, columnProp);
      if (values.length === 0) {
        noValueFiles.push(file);
      } else {
        for (const v of values) {
          if (!columnMap.has(v)) columnMap.set(v, new Set());
          columnMap.get(v)!.add(file.path);
        }
      }
    }

    console.log("[Columns] columnMap keys:", Array.from(columnMap.keys()));
    console.log("[Columns] noValueFiles:", noValueFiles.length);

    // Collect all tags for each file (for AND mode)
    const fileTags = new Map<string, string[]>();
    for (const [val, paths] of columnMap) {
      for (const p of paths) {
        if (!fileTags.has(p)) fileTags.set(p, []);
        fileTags.get(p)!.push(val);
      }
    }

    // Tag-based filtering
    const applyFilters = (paths: string[], allTags: string[]): string[] => {
      if (this.activeFilters.size === 0) return paths;
      if (this.andMode) {
        return paths.filter((p) =>
          allTags.every((t) => this.activeFilters.has(t)),
        );
      }
      return paths.filter((p) =>
        allTags.some((t) => this.activeFilters.has(t)),
      );
    };

    // Render filter bar
    this.renderFilterBar(columnMap);

    // Build column display list
    const colNames = Array.from(columnMap.keys()).sort();
    if (noValueFiles.length > 0) colNames.push("(No value)");

    const colWidth = this.getColumnWidth();
    const boardEl = this.containerEl.createDiv({ cls: "columns-board" });

    for (const colName of colNames) {
      let colFiles: TFile[];
      if (colName === "(No value)") {
        colFiles = applyFilters(
          noValueFiles.map((f) => f.path),
          [],
        ).map((p) => noValueFiles.find((f) => f.path === p)!);
        if (this.activeFilters.size > 0 && this.andMode) continue;
      } else {
        const rawPaths = Array.from(columnMap.get(colName)!);
        const filteredPaths = applyFilters(rawPaths, rawPaths);
        const entryMap = new Map<string, TFile>();
        for (const entry of filtered) {
          if (entry.file instanceof TFile) entryMap.set(entry.file.path, entry.file);
        }
        colFiles = filteredPaths
          .filter((p) => {
            const vals = fileTags.get(p) ?? [];
            return vals.includes(colName);
          })
          .map((p) => entryMap.get(p)!)
          .filter(Boolean);

        if (this.andMode && this.activeFilters.size > 0) {
          colFiles = colFiles.filter((f) => {
            const tags = fileTags.get(f.path) ?? [];
            return Array.from(this.activeFilters).every((t) => tags.includes(t));
          });
        }
      }

      if (colFiles.length === 0) continue;

      this.renderColumn(boardEl, colName, colFiles, colWidth);
    }
  }

  // -----------------------------------------------------------------------
  //  Filter bar
  // -----------------------------------------------------------------------

  private renderFilterBar(columnMap: Map<string, Set<string>>): void {
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
      cls:
        "columns-filter-pill" +
        (this.activeFilters.size === 0 ? " is-active" : ""),
    });
    allPill.textContent = "All";
    allPill.addEventListener("click", () => {
      this.activeFilters.clear();
      this.render();
    });

    for (const tag of tags) {
      const pill = barEl.createSpan({
        cls:
          "columns-filter-pill" +
          (this.activeFilters.has(tag) ? " is-active" : ""),
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

  private renderColumn(
    boardEl: HTMLElement,
    name: string,
    files: TFile[],
    width: number,
  ): void {
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

  private renderCard(cardsEl: HTMLElement, file: TFile): void {
    const cardEl = cardsEl.createDiv({ cls: "columns-card" });
    const title = this.getCardTitle(file);
    cardEl.textContent = title;

    cardEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openFile(file);
    });

    cardEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new Menu();
      this.app.workspace.trigger("file-menu", menu, file, "columns-cards");
      menu.showAtPosition({ x: e.clientX, y: e.clientY });
    });
  }

  private getCardTitle(file: TFile): string {
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

  private openFile(file: TFile): void {
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
}

// ---------------------------------------------------------------------------
//  File Preview Modal
// ---------------------------------------------------------------------------

class FilePreviewModal extends Modal {
  private file: TFile;

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("columns-modal-content");

    contentEl.createEl("h2", { text: this.file.basename });

    const contentDiv = contentEl.createDiv({ cls: "columns-modal-body" });

    this.app.vault.read(this.file).then((text) => {
      MarkdownRenderer.render(this.app, text, contentDiv, this.file.path, this);
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
