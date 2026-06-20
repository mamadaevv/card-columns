import {
  Plugin,
  BasesView,
  BasesAllOptions,
  BasesEntry,
  Value,
  NullValue,
  BooleanValue,
  DateValue,
  LinkValue,
  ListValue,
  QueryController,
  TFile,
  WorkspaceLeaf,
  Menu,
  Modal,
  MarkdownRenderer,
  App,
  setIcon,
  parsePropertyId,
  moment,
} from "obsidian";

// ---------------------------------------------------------------------------
//  Config keys
// ---------------------------------------------------------------------------

const CFG_TITLE_PROP = "titleProperty";
const CFG_COL_WIDTH = "columnWidth";
const CFG_OPEN_BEHAVIOR = "openBehavior";
const CFG_WRAP_TITLE = "wrapTitle";
const CFG_DATE_FORMAT_D = "dateFormatDate";
const CFG_DATE_FORMAT_DT = "dateFormatDatetime";
const CFG_DATE_LOCALE = "dateLocale";
const CFG_BOLD_TITLE = "boldTitle";
const CFG_CHIP_GRID = "chipGrid";
const CFG_CHIP_FONT_SIZE = "chipFontSize";
const CFG_WRAP_VALUES = "wrapValues";

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
  andMode = false;

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
        key: CFG_OPEN_BEHAVIOR,
        type: "dropdown",
        displayName: "Open card in",
        default: "tab",
        options: {
          active: "Active pane",
          modal: "Floating modal",
          tab: "New tab",
        },
      },
      {
        displayName: "Card title property",
        type: "property",
        key: CFG_TITLE_PROP,
        placeholder: "File name",
      },
      {
        key: CFG_BOLD_TITLE,
        type: "toggle",
        displayName: "Bold card titles",
        default: true,
      },
      {
        key: CFG_WRAP_TITLE,
        type: "toggle",
        displayName: "Wrap card titles",
        default: false,
      },
      {
        key: CFG_WRAP_VALUES,
        type: "toggle",
        displayName: "Wrap multi-line values",
        default: false,
      },
      {
        key: CFG_CHIP_GRID,
        type: "toggle",
        displayName: "Chip grid layout",
        default: false,
      },
      {
        key: CFG_CHIP_FONT_SIZE,
        type: "slider",
        displayName: "Chip font size (px)",
        default: 12,
        min: 9,
        max: 12,
        step: 1,
      },
      {
        key: CFG_DATE_FORMAT_D,
        type: "text",
        displayName: "Date format",
        placeholder: "Relative — e.g. DD-MM-YYYY",
      },
      {
        key: CFG_DATE_FORMAT_DT,
        type: "text",
        displayName: "Date & time format",
        placeholder: "Relative — e.g. DD-MM-YYYY HH:mm",
      },
      {
        key: CFG_DATE_LOCALE,
        type: "text",
        displayName: "Locale",
        placeholder: "en, ru, de, fr, es, ja, zh-cn...",
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
    const raw = this.config?.get(key);
    if (typeof raw === "string") {
      const parsed = parsePropertyId(raw as any);
      return parsed?.name ?? raw;
    }
    const id = this.config?.getAsPropertyId(key);
    if (id) {
      const parsed = parsePropertyId(id);
      return parsed?.name ?? null;
    }
    return null;
  }

  private getColumnProperty(): string | null {
    const cfg = this.config as any;
    const raw: string | undefined = cfg?.groupBy?.property;
    if (raw) {
      const parsed = parsePropertyId(raw as any);
      return parsed?.name ?? raw;
    }
    // If groupBy is explicitly configured but empty (no property selected), show no grouping
    if (cfg?.groupBy !== undefined) return null;
    // Default: file.tags
    return "tags";
  }

  private getTitleProperty(): string | null {
    const fromProp = this.propKey(CFG_TITLE_PROP);
    return fromProp ?? null;
  }

  private getTitlePropertyId(): string | null {
    const raw = this.config?.get(CFG_TITLE_PROP);
    if (typeof raw === "string") return raw;
    const id = this.config?.getAsPropertyId(CFG_TITLE_PROP);
    return id ?? null;
  }

  private getColumnWidth(): number {
    const v = this.cfg<number>(CFG_COL_WIDTH, 300);
    return v >= 150 && v <= 500 ? v : 300;
  }

  private getOpenBehavior(): string {
    const v = this.cfg(CFG_OPEN_BEHAVIOR, "tab");
    return ["active", "modal", "tab"].includes(v) ? v : "tab";
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

  /** Get visible properties from the Properties button. */
  private getVisiblePropertyIds(): string[] {
    const props = this.config?.getOrder() ?? [];
    const columnProp = this.getColumnProperty();
    const titlePropName = this.getTitleProperty();
    const titlePropId = this.getTitlePropertyId();
    return props.filter((id) => {
      const parsed = parsePropertyId(id);
      if (!parsed) return false;
      // Skip column property — already shown as column headers
      if (parsed.name === columnProp) return false;
      // Skip if this property is used as the card title
      if (titlePropName && parsed.name === titlePropName) return false;
      if (titlePropId && id === titlePropId) return false;
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

    const columnProp = this.getColumnProperty();

    // Build column map: value → BasesEntry[]
    const columnMap = new Map<string, BasesEntry[]>();
    const noValueEntries: BasesEntry[] = [];

    if (!columnProp) {
      // No grouping — show all entries in a single column
      const allTag = this.getDisplayText();
      columnMap.set(allTag, [...entries]);
    } else {
      for (const entry of entries) {
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

    // Render settings bar
    this.renderSettingsBar();

    // Build column display list — only show columns matching selected tags
    let colNames = Array.from(columnMap.keys()).sort();
    if (this.activeFilters.size > 0) {
      colNames = colNames.filter((name) => this.activeFilters.has(name));
    }
    if (noValueEntries.length > 0) colNames.push("(No value)");

    const colWidth = this.getColumnWidth();
    const visibleProps = this.getVisiblePropertyIds();
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
      pill.addEventListener("click", (e) => {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+click = toggle (same as right-click)
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

  /** Render inline settings bar (grid, wrap, bold toggles). */
  private renderSettingsBar(): void {
    const barEl = this.containerEl.createDiv({ cls: "columns-settings-bar" });

    // Chip layout dropdown
    const layoutLabel = barEl.createSpan({ cls: "columns-settings-label" });
    layoutLabel.textContent = "Layout:";
    const layoutSelect = barEl.createEl("select");
    const layoutOpts = ["Stack", "Grid"];
    const curLayout = this.cfg(CFG_CHIP_GRID, false) ? "Grid" : "Stack";
    for (const opt of layoutOpts) {
      const option = layoutSelect.createEl("option");
      option.textContent = opt;
      option.value = opt;
      if (opt === curLayout) option.selected = true;
    }
    layoutSelect.addEventListener("change", () => {
      this.config?.set(CFG_CHIP_GRID, layoutSelect.value === "Grid");
      this.render();
    });

    // Wrap toggle
    const wrapBtn = barEl.createSpan({ cls: "columns-mode-btn" });
    wrapBtn.textContent = this.cfg(CFG_WRAP_VALUES, false) ? "Wrap" : "Clip";
    wrapBtn.addEventListener("click", () => {
      this.config?.set(CFG_WRAP_VALUES, !this.cfg(CFG_WRAP_VALUES, false));
      this.render();
    });

    // Bold toggle
    const boldBtn = barEl.createSpan({ cls: "columns-mode-btn" });
    boldBtn.textContent = this.cfg(CFG_BOLD_TITLE, true) ? "Bold" : "Normal";
    boldBtn.addEventListener("click", () => {
      this.config?.set(CFG_BOLD_TITLE, !this.cfg(CFG_BOLD_TITLE, true));
      this.render();
    });
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
    const titlePropId = this.getTitlePropertyId();
    const title = titlePropId
      ? entry.getValue(titlePropId as any)?.toString() ?? file.basename
      : file.name;
    const titleEl = cardEl.createDiv({ cls: "columns-card-title" });
    if (!this.cfg(CFG_BOLD_TITLE, true)) titleEl.addClass("is-normal-weight");
    if (this.cfg(CFG_WRAP_TITLE, false)) titleEl.addClass("is-wrap");
    titleEl.textContent = title;

    // Visible property chips
    const chipGrid = this.cfg(CFG_CHIP_GRID, false);
    const chipFontSize = this.cfg(CFG_CHIP_FONT_SIZE, 12);
    const wrapValues = this.cfg(CFG_WRAP_VALUES, false);
    const chipsEl = cardEl.createDiv({ cls: chipGrid ? "columns-chips-grid" : "columns-chips" });
    chipsEl.style.setProperty("--chip-fs", chipFontSize + "px");
    if (!wrapValues) chipsEl.addClass("is-clip");
    for (const propId of visibleProps) {
      const val = entry.getValue(propId);
      if (val == null || val instanceof NullValue) continue;
      const chip = chipsEl.createDiv({ cls: "columns-card-chip" });
      const parsed = parsePropertyId(propId);
      const label = this.config?.getDisplayName(propId) ?? parsed?.name ?? propId;
      const labelEl = chip.createDiv({ cls: "columns-card-chip-label" });
      labelEl.textContent = label;
      this.renderChipValue(chip, val, file);
    }

    // Click events...

    cardEl.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+click — open in background tab
        const leaf = this.app.workspace.getLeaf(true);
        leaf.openFile(file);
      } else {
        this.openFile(file);
      }
    });

    cardEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new Menu();
      this.app.workspace.trigger("file-menu", menu, file, "columns-cards");
      menu.showAtPosition({ x: e.clientX, y: e.clientY });
    });
  }

  /** Render a chip value based on its Obsidian Value type. */
  private renderChipValue(chip: HTMLElement, val: Value, sourceFile: TFile): void {
    if (val instanceof BooleanValue) {
      const iconEl = chip.createSpan({ cls: "columns-chip-boolean" });
      setIcon(iconEl, val.toString() === "true" ? "square-check-big" : "square");
      return;
    }
    if (val instanceof DateValue) {
      const fmtD: string = this.cfg(CFG_DATE_FORMAT_D, "");
      const fmtDT: string = this.cfg(CFG_DATE_FORMAT_DT, "");
      const locale: string = this.cfg(CFG_DATE_LOCALE, "");
      const raw = val.toString();
      const hasTime = raw.includes(":") || raw.includes("T");
      const fmt: string = hasTime && fmtDT ? fmtDT : !hasTime && fmtD ? fmtD : "";
      const m = locale ? moment(raw).locale(locale) : moment(raw);
      const text = fmt
        ? m.format(fmt)
        : m.isValid()
          ? m.fromNow()
          : val.relative();
      const textEl = chip.createSpan({ cls: "columns-chip-text" });
      textEl.textContent = text;
      return;
    }
    if (val instanceof LinkValue) {
      const linkEl = chip.createEl("a", { cls: "columns-chip-link" });
      const raw = val.toString();
      const match = raw.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
      const linkTarget = match ? match[1] : raw;
      linkEl.textContent = match
        ? match[2] || linkTarget.split("/").pop()?.replace(/\.md$/, "") || raw
        : raw;
      linkEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const resolved = this.app.metadataCache.getFirstLinkpathDest(linkTarget, sourceFile.path);
        if (resolved && resolved instanceof TFile) {
          this.openFile(resolved);
        }
      });
      return;
    }
    if (val instanceof ListValue) {
      const row = chip.createDiv({ cls: "columns-chip-tag-row" });
      const len = val.length();
      for (let i = 0; i < len; i++) {
        const item = val.get(i);
        if (!item || item instanceof NullValue || !item.isTruthy()) continue;
        const pill = row.createSpan({ cls: "columns-chip-tag" });
        // Check if item is a link — render as clickable link tag
        if (item instanceof LinkValue) {
          const raw = item.toString();
          const m = raw.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
          const target = m ? m[1] : raw;
          pill.textContent = m
            ? m[2] || target.split("/").pop()?.replace(/\.md$/, "") || raw
            : raw;
          pill.style.cursor = "pointer";
          pill.addEventListener("click", (e) => {
            e.stopPropagation();
            const resolved = this.app.metadataCache.getFirstLinkpathDest(target, sourceFile.path);
            if (resolved && resolved instanceof TFile) this.openFile(resolved);
          });
        } else {
          pill.textContent = item.toString();
        }
      }
      return;
    }
    // Default: plain text (detect URLs)
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
