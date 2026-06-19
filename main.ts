import {
  Plugin,
  BasesView,
  BasesAllOptions,
  BasesEntry,
  QueryController,
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

class ColumnsView extends BasesView {
  type = "columns";
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
    // Re-render when the user closes the settings pane (config may have
    // changed without triggering onDataUpdated)
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.render()),
    );
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

  private propKey(key: string): string | null {
    // Try property-ID API first
    const id = this.config?.getAsPropertyId(key);
    if (id) {
      const parsed = parsePropertyId(id);
      if (parsed?.name) return parsed.name;
    }
    // Fallback: read raw and parse
    const raw = this.config?.get(key);
    if (typeof raw === "string") {
      const parsed = parsePropertyId(raw as any);
      return parsed?.name ?? raw;
    }
    return null;
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
    return ["active", "modal", "tab"].includes(v) ? v : "modal";
  }

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

  /** Get visible properties from the Properties button, skip file props and column prop. */
  private getVisiblePropertyIds(columnProp: string): string[] {
    const props = this.data?.properties ?? [];
    return props.filter((id) => {
      if (id.startsWith("file.")) return false;
      const parsed = parsePropertyId(id);
      if (!parsed) return false;
      if (parsed.name === columnProp) return false;
      const titleProp = this.getTitleProperty();
      if (titleProp && parsed.name === titleProp) return false;
      return true;
    });
  }

  // -----------------------------------------------------------------------
  //  Rendering
  // -----------------------------------------------------------------------

  render(): void {
    this.containerEl.empty();

    const entries = this.data?.data ?? [];

    if (entries.length === 0) {
      const emptyEl = this.containerEl.createDiv({ cls: "columns-empty" });
      emptyEl.textContent = "No files found.";
      return;
    }

    const folder = this.getSourceFolder();
    const columnProp = this.getColumnProperty();

    const prefix = folder ? (folder.endsWith("/") ? folder : folder + "/") : "";
    const filtered = prefix
      ? entries.filter(
          (e) =>
            e.file?.path === folder || e.file?.path?.startsWith(prefix),
        )
      : entries;

    // Build column map: value → BasesEntry[]
    const columnMap = new Map<string, BasesEntry[]>();
    const noValueEntries: BasesEntry[] = [];

    for (const entry of filtered) {
      const file = entry.file;
      if (!(file instanceof TFile)) continue;

      const values = this.getColumnValues(file, columnProp);
      if (values.length === 0) {
        noValueEntries.push(entry);
      } else {
        for (const v of values) {
          if (!columnMap.has(v)) columnMap.set(v, []);
          columnMap.get(v)!.push(entry);
        }
      }
    }

    // Collect all tags for each file (for AND mode)
    const fileTags = new Map<string, string[]>();
    for (const [colValue, colEntries] of columnMap) {
      for (const entry of colEntries) {
        const p = entry.file?.path;
        if (!p) continue;
        if (!fileTags.has(p)) fileTags.set(p, []);
        fileTags.get(p)!.push(colValue);
      }
    }

    // Tag-based filtering
    const applyFilters = (paths: string[]): string[] => {
      if (this.activeFilters.size === 0) return paths;
      if (this.andMode) {
        return paths.filter((p) =>
          Array.from(this.activeFilters).every((t) => fileTags.get(p)?.includes(t)),
        );
      }
      return paths.filter((p) =>
        Array.from(this.activeFilters).some((t) => fileTags.get(p)?.includes(t)),
      );
    };

    // Render filter bar
    this.renderFilterBar(columnMap);

    // Build column display list — only show columns matching selected tags
    let colNames = Array.from(columnMap.keys()).sort();
    if (this.activeFilters.size > 0) {
      colNames = colNames.filter((name) => this.activeFilters.has(name));
    }
    if (noValueEntries.length > 0) colNames.push("(No value)");

    const colWidth = this.getColumnWidth();
    const visibleProps = this.getVisiblePropertyIds(columnProp);
    const boardEl = this.containerEl.createDiv({ cls: "columns-board" });

    for (const colName of colNames) {
      let colEntries: BasesEntry[];
      if (colName === "(No value)") {
        const paths = noValueEntries.map((e) => e.file?.path ?? "");
        const filteredPaths = applyFilters(paths);
        colEntries = noValueEntries.filter(
          (e) => e.file?.path && filteredPaths.includes(e.file.path),
        );
      } else {
        const raw = columnMap.get(colName)!;
        const paths = raw.map((e) => e.file?.path ?? "");
        const filteredPaths = applyFilters(paths);
        colEntries = raw.filter(
          (e) => e.file?.path && filteredPaths.includes(e.file.path),
        );
      }

      if (colEntries.length === 0) continue;

      this.renderColumn(boardEl, colName, colEntries, colWidth, visibleProps);
    }
  }

  // -----------------------------------------------------------------------
  //  Filter bar
  // -----------------------------------------------------------------------

  private renderFilterBar(columnMap: Map<string, BasesEntry[]>): void {
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
        cls:
          "columns-filter-pill" +
          (this.activeFilters.has(tag) ? " is-active" : ""),
      });
      pill.textContent = tag;
      // ЛКМ — выбрать только этот тег
      pill.addEventListener("click", (e) => {
        this.activeFilters.clear();
        this.activeFilters.add(tag);
        this.render();
      });
      // ПКМ — toggle (добавить/убрать)
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

  private renderColumn(
    boardEl: HTMLElement,
    name: string,
    entries: BasesEntry[],
    width: number,
    visibleProps: string[],
  ): void {
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

  private renderCard(
    cardsEl: HTMLElement,
    entry: BasesEntry,
    visibleProps: string[],
  ): void {
    const file = entry.file;
    if (!(file instanceof TFile)) return;

    const cardEl = cardsEl.createDiv({ cls: "columns-card" });

    // Title
    const titleEl = cardEl.createDiv({ cls: "columns-card-title" });
    const title = this.getCardTitle(file);
    titleEl.textContent = title;

    // Visible property chips
    for (const propId of visibleProps) {
      const val = entry.getValue(propId);
      if (val == null) continue;
      const chip = cardEl.createSpan({ cls: "columns-card-chip" });
      const parsed = parsePropertyId(propId);
      const label = parsed?.name ?? propId;
      chip.textContent = `${label}: ${val.toString()}`;
    }

    cardEl.addEventListener("click", (e) => {
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

    // Always check if already open (works across restarts — restored views
    // may hold file as string or object)
    let open: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((l) => {
      const leafFile = (l.view as any)?.file;
      const leafPath =
        typeof leafFile === "string"
          ? leafFile
          : typeof leafFile?.path === "string"
            ? leafFile.path
            : undefined;
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
