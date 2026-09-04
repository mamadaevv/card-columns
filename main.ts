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

const CFG_CARD_WIDTH = "cardWidth";
const CFG_OPEN_BEHAVIOR = "openBehavior";
const CFG_WRAP_TITLE = "wrapTitle";
const CFG_DATE_FORMAT_D = "dateFormatDate";
const CFG_DATE_FORMAT_DT = "dateFormatDatetime";
const CFG_DATE_LOCALE = "dateLocale";
const CFG_BOLD_TITLE = "boldTitle";
const CFG_CHIP_GRID = "chipGrid";
const CFG_CHIP_FONT_SIZE = "chipFontSize";
const CFG_TITLE_FONT_SIZE = "titleFontSize";
const CFG_WRAP_VALUES = "wrapValues";
const CFG_FILTER_HEIGHT = "filterHeight";
const CFG_COLUMNS_PER_GROUP = "columnsPerGroup";
const CFG_ZEBRA_STRIPING = "zebraStriping";
const CFG_MASONRY = "masonry";
const CFG_DRAG_DROP = "dragDrop";
const CFG_COLUMN_ORDER = "columnOrder";

// Cover settings
const CFG_SHOW_COVER = "showCover";
const CFG_COVER_SOURCE = "coverSourceProperty";
/** Legacy key (string dropdown: "none" | "first-image" | "property") — migrated once. */
const CFG_LEGACY_COVER_SOURCE = "coverSource";
const CFG_COVER_MIGRATED = "coverMigrated";
const CFG_COVER_STYLE = "coverStyle";
const CFG_COVER_ASPECT = "coverAspect";
const CFG_COVER_ORIENTATION = "coverOrientation";
const CFG_COVER_FIT = "coverFit";
const CFG_COVER_POSITION = "coverPosition";

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
  splitLeafRight: WorkspaceLeaf | null = null;
  splitLeafDown: WorkspaceLeaf | null = null;
  suppressNextClick = false;
  /** Scroll position to restore after the next render. Set by drag & drop
   *  so a re-render triggered by processFrontMatter doesn't snap the
   *  board back to scrollLeft=0. */
  pendingScrollLeft: number | null = null;

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
    // Release the saved scroll position as soon as the user scrolls
    // manually — otherwise the first scroll input would be cancelled by
    // a stale restoration. Bound once to scrollEl (not to cards), so the
    // listener survives every render() rebuild of the inner DOM.
    const release = () => {
      this.pendingScrollLeft = null;
    };
    this.scrollEl.addEventListener("wheel", release, { passive: true });
    this.scrollEl.addEventListener("pointerdown", release);
    this.scrollEl.addEventListener("touchstart", release, { passive: true });
    this.scrollEl.addEventListener("keydown", (e) => {
      // Arrow / Page keys scroll the view — treat as user scroll input
      if (["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"]
        .includes(e.key)) release();
    });
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
        type: "group",
        displayName: "General",
        items: [
          {
            key: CFG_OPEN_BEHAVIOR,
            type: "dropdown",
            displayName: "Open card in",
            default: "modal",
            options: {
              active: "Active pane",
              modal: "Floating modal",
              tab: "New tab",
              "split-right": "Split right",
              "split-down": "Split down",
            },
          },
          {
            key: CFG_CARD_WIDTH,
            type: "slider",
            displayName: "Card width (px)",
            default: 300,
            min: 150,
            max: 700,
            step: 10,
          },
          {
            key: CFG_COLUMNS_PER_GROUP,
            type: "slider",
            displayName: "Columns per group",
            default: 1,
            min: 1,
            max: 6,
            step: 1,
          },
          {
            key: CFG_ZEBRA_STRIPING,
            type: "toggle",
            displayName: "Zebra striping (alternate column background)",
            default: false,
          },
          {
            key: CFG_MASONRY,
            type: "toggle",
            displayName: "Masonry layout (cards fill gaps vertically)",
            default: false,
          },
          {
            key: CFG_DRAG_DROP,
            type: "toggle",
            displayName: "Drag & drop cards between columns",
            default: true,
          },
          {
            key: CFG_COLUMN_ORDER,
            type: "text",
            displayName: "Column list (comma-separated, leave empty for auto)",
            placeholder: "Todo, InProgress, Done",
            default: "",
          },
        ],
      },
      {
        type: "group",
        displayName: "Title",
        items: [
          {
            key: CFG_WRAP_TITLE,
            type: "toggle",
            displayName: "Wrap card titles",
            default: true,
          },
          {
            key: CFG_BOLD_TITLE,
            type: "toggle",
            displayName: "Bold card titles",
            default: true,
          },
          {
            key: CFG_TITLE_FONT_SIZE,
            type: "slider",
            displayName: "Font size (px)",
            default: 14,
            min: 11,
            max: 20,
            step: 1,
          },
        ],
      },
      {
        type: "group",
        displayName: "Properties",
        items: [
          {
            key: CFG_CHIP_GRID,
            type: "dropdown",
            displayName: "Layout",
            default: "stack",
            options: {
              stack: "Stack",
              grid: "Grid",
            },
          },
          {
            key: CFG_WRAP_VALUES,
            type: "toggle",
            displayName: "Wrap multi-line values",
            default: true,
          },
          {
            key: CFG_CHIP_FONT_SIZE,
            type: "slider",
            displayName: "Font size (px)",
            default: 12,
            min: 9,
            max: 18,
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
        ],
      },
      {
        type: "group",
        displayName: "Cover",
        items: [
          {
            key: CFG_SHOW_COVER,
            type: "toggle",
            displayName: "Show cover",
            default: false,
          },
          {
            key: CFG_COVER_SOURCE,
            type: "property",
            displayName: "Source",
            placeholder: "First image in note",
          },
          {
            key: CFG_COVER_STYLE,
            type: "dropdown",
            displayName: "Style",
            default: "borderless",
            options: {
              borderless: "Borderless",
              bordered: "Bordered",
            },
          },
          {
            key: CFG_COVER_ASPECT,
            type: "dropdown",
            displayName: "Aspect ratio",
            default: "auto",
            options: {
              auto: "Auto (natural ratio)",
              "1:1": "1:1",
              "3:2": "3:2",
              "4:3": "4:3",
              "16:9": "16:9",
            },
          },
          {
            key: CFG_COVER_ORIENTATION,
            type: "dropdown",
            displayName: "Orientation",
            default: "landscape",
            options: {
              landscape: "Landscape",
              portrait: "Portrait",
            },
          },
          {
            key: CFG_COVER_FIT,
            type: "dropdown",
            displayName: "Image fit",
            default: "cover",
            options: {
              cover: "Cover (crop edges)",
              contain: "Contain (fit whole)",
              "scale-down": "Scale down (original size, max fit)",
            },
          },
          {
            key: CFG_COVER_POSITION,
            type: "dropdown",
            displayName: "Position in card",
            default: "above-title",
            options: {
              "above-title": "Above title",
              "below-title": "Below title",
              "after-all": "After all properties",
            },
          },
        ],
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

  /** One-time migration from the pre-0.8.1 coverSource dropdown to the
   *  Show cover toggle + Source property pair. Idempotent via marker key. */
  private migrateCoverConfig(): void {
    if (this.cfg<boolean>(CFG_COVER_MIGRATED, false)) return;
    const legacy = this.config?.get(CFG_LEGACY_COVER_SOURCE);
    if (typeof legacy === "string") {
      if (legacy === "property") {
        // Old code read the hardcoded "cover" frontmatter property
        this.config?.set(CFG_SHOW_COVER, true);
        this.config?.set(CFG_COVER_SOURCE, "note.cover");
      } else if (legacy === "first-image") {
        // Cover on, source property empty → first-image fallback
        this.config?.set(CFG_SHOW_COVER, true);
      }
      // legacy === "none" → showCover stays false
    }
    this.config?.set(CFG_COVER_MIGRATED, true);
    // No recursive render() here — migrateCoverConfig() runs at the top of
    // render(), so the rest of the same render() pass already applies the
    // migrated values. A nested render() breaks the Bases view lifecycle
    // (the .base file fails to open).
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

  /** First visible property = card title (like native Cards view). */
  private getTitlePropertyId(): string | null {
    const order = this.config?.getOrder();
    if (!order || order.length === 0) return null;
    const parsed = parsePropertyId(order[0]);
    return parsed ? order[0] : null;
  }

  private getCardWidth(): number {
    const v = this.cfg<number>(CFG_CARD_WIDTH, 300);
    return v >= 150 && v <= 700 ? v : 300;
  }

  private getOpenBehavior(): string {
    const v = this.cfg(CFG_OPEN_BEHAVIOR, "modal");
    return ["active", "modal", "tab", "split-right", "split-down"].includes(v) ? v : "modal";
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

  /**
   * Move a card from `oldValue` to `newValue` in the frontmatter property
   * driving the column grouping. Both operations happen in a single
   * `processFrontMatter` transaction:
   *   1) remove `oldValue` from the property's value list (if present)
   *   2) append `newValue` to the list ONLY if it isn't already there
   * The value is stored as a scalar when it has exactly one entry, or as
   * a YAML list when it has multiple — matching how Obsidian normally
   * writes frontmatter and how `getColumnValues` reads it back.
   */
  private async moveCardToColumn(
    filePath: string,
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    // No-op when dropping a card into the same column it came from
    if (oldValue === newValue) return;

    const prop = this.getColumnProperty();
    if (!prop) return;

    const af = this.app.vault.getAbstractFileByPath(filePath);
    if (!(af instanceof TFile)) return;
    const file = af;

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const cur = fm[prop];

      // Normalize current value into an array of strings
      let arr: string[];
      if (Array.isArray(cur)) {
        arr = cur.filter((v): v is string => typeof v === "string");
      } else if (cur === null || cur === undefined || cur === "") {
        arr = [];
      } else {
        arr = [String(cur)];
      }

      // 1) Drop the old value (always — the user is moving the card)
      if (oldValue) {
        arr = arr.filter((v) => v !== oldValue);
      }

      // 2) Add the new value only if it isn't already there
      if (newValue && !arr.includes(newValue)) {
        arr.push(newValue);
      }

      // Persist: scalar when 1 entry, list when multiple
      if (arr.length === 0) {
        delete fm[prop];
      } else if (arr.length === 1) {
        fm[prop] = arr[0];
      } else {
        fm[prop] = arr;
      }
    });
  }

  /** Get visible properties from the Properties button. */
  private getVisiblePropertyIds(): string[] {
    const props = this.config?.getOrder() ?? [];
    const titlePropId = this.getTitlePropertyId();
    return props.filter((id) => {
      const parsed = parsePropertyId(id);
      if (!parsed) return false;
      // Skip first property — it's used as the card title
      if (titlePropId && id === titlePropId) return false;
      return true;
    });
  }

  // -----------------------------------------------------------------------
  //  Cover
  // -----------------------------------------------------------------------

  /** Resolve cover image URL for a file, or null if none found.
   *  Source priority: selected property (any frontmatter property holding
   *  a path/[[link]] to an image) → fallback: first image in note. */
  private getCoverUrl(file: TFile): string | null {
    // If the file itself is an image, it IS the cover
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.path)) {
      return this.app.vault.getResourcePath(file);
    }

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return null;

    let coverPath: string | null = null;

    // 1) Selected cover source property (any property, not hardcoded)
    const coverPropId = this.config?.getAsPropertyId(CFG_COVER_SOURCE);
    const coverPropName = coverPropId ? parsePropertyId(coverPropId)?.name ?? null : null;
    if (coverPropName) {
      const raw = cache.frontmatter?.[coverPropName];
      if (typeof raw === "string" && raw.trim()) {
        coverPath = raw.trim().replace(/^\[\[|\]\]$/g, "");
      }
    }

    // 2) Fallback: first image embed in the note
    if (!coverPath) {
      const embeds = cache.embeds;
      if (embeds && embeds.length > 0) {
        for (const embed of embeds) {
          if (embed.link && /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(embed.link)) {
            coverPath = embed.link;
            break;
          }
        }
      }
    }

    if (!coverPath) return null;

    // Resolve to an actual resource URL
    // Handle both explicit vault paths and relative-from-file paths
    const resolved = this.app.metadataCache.getFirstLinkpathDest(coverPath, file.path);
    if (resolved && resolved instanceof TFile) {
      return this.app.vault.getResourcePath(resolved);
    }

    // Fallback: try as direct vault path
    const direct = this.app.vault.getAbstractFileByPath(coverPath);
    if (direct instanceof TFile) {
      return this.app.vault.getResourcePath(direct);
    }

    return null;
  }

  // -----------------------------------------------------------------------
  //  Rendering
  // -----------------------------------------------------------------------

  render(): void {
    this.migrateCoverConfig();

    // Snapshot the current scroll position of the .columns-board before
    // we tear it down. scrollEl is NOT the scrolling element — the
    // .columns-board inside it is (display: flex, overflow-x: auto).
    // Capturing scrollEl.scrollLeft always returned 0 because nothing
    // actually scrolls there.
    const oldBoard = this.containerEl.querySelector<HTMLElement>(".columns-board");
    const beforeScrollLeft = oldBoard?.scrollLeft ?? 0;
    const beforeScrollWidth = oldBoard?.scrollWidth ?? 0;
    const beforeClientWidth = oldBoard?.clientWidth ?? 0;

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

    // Build column display list — only show columns matching selected tags
    let colNames: string[];

    // Custom column list (comma-separated) — when set, fixes the set and
    // the order of columns. Empty columns are rendered so the user has
    // a stable kanban-style board layout.
    const customRaw = this.cfg<string>(CFG_COLUMN_ORDER, "").trim();
    if (customRaw) {
      colNames = customRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      // De-duplicate while preserving the user's order
      colNames = Array.from(new Set(colNames));
    } else {
      colNames = Array.from(columnMap.keys()).sort();
    }
    if (this.activeFilters.size > 0) {
      colNames = colNames.filter((name) => this.activeFilters.has(name));
    }
    if (noValueEntries.length > 0 && !colNames.includes("(No value)")) {
      colNames.push("(No value)");
    }

    const cardWidth = this.getCardWidth();
    const visibleProps = this.getVisiblePropertyIds();
    const boardEl = this.containerEl.createDiv({ cls: "columns-board" });
    const isZebra = this.cfg<boolean>(CFG_ZEBRA_STRIPING, false);
    const isMasonry = this.cfg<boolean>(CFG_MASONRY, false);

    const isCustomList = !!customRaw;
    for (let colIdx = 0; colIdx < colNames.length; colIdx++) {
      const colName = colNames[colIdx];
      let colEntries: BasesEntry[];
      if (colName === "(No value)") {
        const paths = noValueEntries.map((e) => e.file?.path ?? "");
        const filteredPaths = applyFilters(paths);
        colEntries = noValueEntries.filter(
          (e) => e.file?.path && filteredPaths.includes(e.file.path),
        );
      } else {
        const raw = columnMap.get(colName) ?? [];
        const paths = raw.map((e) => e.file?.path ?? "");
        const filteredPaths = applyFilters(paths);
        colEntries = raw.filter(
          (e) => e.file?.path && filteredPaths.includes(e.file.path),
        );
      }

      const columnsPerGroup = this.cfg<number>(CFG_COLUMNS_PER_GROUP, 1);

      // Hide empty columns only in auto mode. In custom mode, an empty
      // column from the user's list is a valid kanban lane.
      if (colEntries.length === 0 && !isCustomList) continue;

      this.renderColumn(boardEl, colName, colEntries, cardWidth, visibleProps, columnsPerGroup, isZebra, colIdx, isMasonry);
    }

    // Restore the scroll position we captured at the top of render().
    // requestAnimationFrame ensures the new board is laid out — without it
    // the browser clamps scrollLeft to the (still-zero) scrollWidth and
    // Restore the scroll position we captured at the top of render().
    // Use proportional scroll (ratio) so a board that grew or shrank
    // after the rebuild keeps the user looking at the same area
    // instead of snapping to 0 or to the absolute old position.
    const oldMax = Math.max(0, beforeScrollWidth - beforeClientWidth);
    const ratio = oldMax > 0 ? beforeScrollLeft / oldMax : 0;

    if (beforeScrollLeft > 0 && ratio > 0) {
      const restore = () => {
        const newBoard = this.containerEl.querySelector<HTMLElement>(".columns-board");
        if (!newBoard) return;
        const newScrollWidth = newBoard.scrollWidth;
        const newClientWidth = newBoard.clientWidth;
        const newMax = Math.max(0, newScrollWidth - newClientWidth);
        const target = Math.round(ratio * newMax);
        const was = newBoard.scrollLeft;
        newBoard.scrollLeft = Math.max(0, Math.min(target, newMax));
      };
      requestAnimationFrame(() => requestAnimationFrame(restore));
      setTimeout(restore, 50);
      setTimeout(restore, 200);
    }

    // Layout snapshot — helps diagnose vertical jump / re-render flicker
    const board = this.containerEl.querySelector(".columns-board") as HTMLElement | null;
    if (board) {
      const colHeights = Array.from(board.querySelectorAll<HTMLElement>(".columns-column"))
        .map((c) => c.offsetHeight);
      void colHeights;
    }
  }

  // -----------------------------------------------------------------------
  //  Filter bar
  // -----------------------------------------------------------------------

  private renderFilterBar(columnMap: Map<string, BasesEntry[]>): void {
    const tags = Array.from(columnMap.keys()).sort();
    if (tags.length === 0 && this.activeFilters.size === 0) return;

    const barEl = this.containerEl.createDiv({ cls: "columns-filter-bar" });
    const savedH = this.cfg(CFG_FILTER_HEIGHT, 120);
    barEl.style.maxHeight = savedH + "px";
    barEl.style.minHeight = "40px";

    // Resize overlay — 16px strip at bottom, catches all clicks
    const resizeOverlay = barEl.createDiv({ cls: "columns-filter-resize-overlay" });
    let startY = 0, startH = 0;
    const onMove = (e: MouseEvent) => {
      const h = Math.max(40, startH + (e.clientY - startY));
      barEl.style.maxHeight = h + "px";
    };
    const onUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const h = Math.max(40, startH + (e.clientY - startY));
      this.config?.set(CFG_FILTER_HEIGHT, h);
    };
    resizeOverlay.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startY = e.clientY;
      startH = barEl.clientHeight;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

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

  // -----------------------------------------------------------------------
  //  Column & Card
  // -----------------------------------------------------------------------

  private renderColumn(
    boardEl: HTMLElement,
    name: string,
    entries: BasesEntry[],
    cardWidth: number,
    visibleProps: string[],
    columnsPerGroup: number,
    isZebra: boolean,
    colIdx: number,
    isMasonry: boolean,
  ): void {
    // Width math: an empty custom-list lane should look the same as a
    // column with one card. Use Math.max(1, ...) so the drop target is
    // the same width as a populated single-card column.
    const actualCols = Math.max(1, Math.min(entries.length, columnsPerGroup));
    const colEl = boardEl.createDiv({ cls: "columns-column" });
    const gapTotal = (actualCols - 1) * 12;
    const paddingOverhead = 45; // 24 column pad + 16 cards pad + 1 border-right + 4 safety
    const colWidth = cardWidth * actualCols + gapTotal + paddingOverhead;
    if (columnsPerGroup > 1) {
      colEl.classList.add("is-multi-column");
      colEl.style.flexBasis = colWidth + "px";
      colEl.style.maxWidth = colWidth + "px";
    } else {
      colEl.style.flexBasis = colWidth + "px";
      colEl.style.maxWidth = colWidth + "px";
    }

    if (isZebra && colIdx % 2 === 0) {
      colEl.classList.add("is-zebra-even");
    }

    const headerEl = colEl.createDiv({ cls: "columns-column-header" });
    const titleSpan = headerEl.createSpan({ cls: "columns-column-title" });
    titleSpan.textContent = name;
    const countSpan = headerEl.createSpan({ cls: "columns-column-count" });
    countSpan.textContent = String(entries.length);

    // Drag & drop — wire up drop zone on the whole column
    const dragDropEnabled = this.cfg<boolean>(CFG_DRAG_DROP, true);
    if (dragDropEnabled) {
      colEl.addEventListener("dragover", (e) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        // Only accept our own drag type
        if (Array.from(dt.types).indexOf("text/x-columns-file") < 0) return;
        e.preventDefault();
        dt.dropEffect = "move";
        colEl.classList.add("is-drop-target");
      });
      colEl.addEventListener("dragleave", (e) => {
        // dragleave fires when entering a child — only clear if leaving colEl entirely
        if (!colEl.contains(e.relatedTarget as Node | null)) {
          colEl.classList.remove("is-drop-target");
        }
      });
      colEl.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        const filePath = dt.getData("text/x-columns-file");
        const sourceCol = dt.getData("text/x-columns-source");
        if (!filePath) return;
        e.preventDefault();
        colEl.classList.remove("is-drop-target");
        // Suppress the click that browsers fire right after a successful drop
        this.suppressNextClick = true;
        // Remember the scroll position NOW. processFrontMatter triggers
        // metadataCache → onDataUpdated → render() which rebuilds the
        // board from scratch. Without this snapshot the new board resets
        // to scrollLeft=0 and the view snaps back to the left edge.
        this.pendingScrollLeft = this.scrollEl.scrollLeft;
        void this.moveCardToColumn(filePath, sourceCol, name);
      });
    }

    let cardsEl: HTMLElement;
    if (columnsPerGroup > 1) {
      // Scroll wrapper keeps header outside the scroll container
      const scrollWrapper = colEl.createDiv({ cls: "columns-cards-scroll" });
      cardsEl = scrollWrapper.createDiv({ cls: "columns-cards" });
      cardsEl.classList.add("is-multi-column");
      if (isMasonry && actualCols > 1) {
        cardsEl.classList.add("is-masonry");
        cardsEl.style.columnCount = String(actualCols);
        cardsEl.style.columnGap = "12px";
      } else {
        cardsEl.style.gridTemplateColumns = `repeat(${actualCols}, ${cardWidth}px)`;
      }
    } else {
      cardsEl = colEl.createDiv({ cls: "columns-cards" });
    }

    for (const entry of entries) {
      this.renderCard(cardsEl, entry, visibleProps, name, dragDropEnabled);
    }
  }

  private renderCard(
    cardsEl: HTMLElement,
    entry: BasesEntry,
    visibleProps: string[],
    columnName: string,
    dragDropEnabled: boolean,
  ): void {
    const file = entry.file;
    if (!(file instanceof TFile)) return;

    const cardEl = cardsEl.createDiv({ cls: "columns-card" });

    // ── Drag & drop: make card draggable, set payload ───────────────
    if (dragDropEnabled) {
      cardEl.draggable = true;
      cardEl.addEventListener("dragstart", (e) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        dt.setData("text/x-columns-file", file.path);
        dt.setData("text/x-columns-source", columnName);
        dt.effectAllowed = "move";
        // Custom drag image — the card itself, slightly faded
        try {
          dt.setDragImage(cardEl, 20, 20);
        } catch {
          /* some browsers reject setDragImage during certain drag flows */
        }
        cardEl.classList.add("is-dragging");
      });
      cardEl.addEventListener("dragend", () => {
        cardEl.classList.remove("is-dragging");
      });
    }

    // ── Cover ────────────────────────────────────────────────────────
    const hasCover = this.cfg<boolean>(CFG_SHOW_COVER, false);
    let coverEl: HTMLElement | null = null;
    let coverUrl: string | null = null;

    if (hasCover) {
      coverUrl = this.getCoverUrl(file);
    }

    if (hasCover) {
      const coverStyle = this.cfg<string>(CFG_COVER_STYLE, "borderless");
      const coverAspect = this.cfg<string>(CFG_COVER_ASPECT, "auto");
      const coverOrientation = this.cfg<string>(CFG_COVER_ORIENTATION, "landscape");
      const coverFit = this.cfg<string>(CFG_COVER_FIT, "cover");
      const coverPosition = this.cfg<string>(CFG_COVER_POSITION, "above-title");

      coverEl = cardEl.createDiv({ cls: "columns-card-cover" });
      coverEl.classList.add(`is-${coverStyle}`);
      coverEl.classList.add(`is-${coverPosition}`);

      if (coverAspect === "auto") {
        coverEl.classList.add("is-auto");
        // orientation is ignored in auto mode
      } else {
        coverEl.classList.add(`is-${coverOrientation}`);
        const [w, h] = coverAspect.split(":").map(Number);
        if (coverOrientation === "portrait") {
          coverEl.style.aspectRatio = `${h} / ${w}`;
        } else {
          coverEl.style.aspectRatio = `${w} / ${h}`;
        }
      }

      if (coverUrl) {
        const img = coverEl.createEl("img", { cls: "columns-card-cover-img" });
        img.src = coverUrl;
        img.style.objectFit = coverFit;
      } else {
        coverEl.classList.add("is-placeholder");
      }

      // If cover is the only element (no properties at all), mark as cover-only
      const orderLen = (this.config?.getOrder() ?? []).length;
      if (orderLen === 0) {
        cardEl.classList.add("is-cover-only");
      }
    }

    // Title — always shown unless cover-only mode
    const isCoverOnly = hasCover && (this.config?.getOrder() ?? []).length === 0;
    let titleEl: HTMLElement | null = null;
    let chipsEl: HTMLElement | null = null;

    if (!isCoverOnly) {
      const titlePropId = this.getTitlePropertyId();
      const title = titlePropId
        ? entry.getValue(titlePropId as any)?.toString() ?? file.name
        : file.name;
      titleEl = cardEl.createDiv({ cls: "columns-card-title" });
      if (!this.cfg(CFG_BOLD_TITLE, true)) titleEl.addClass("is-normal-weight");
      if (this.cfg(CFG_WRAP_TITLE, true)) titleEl.addClass("is-wrap");
      titleEl.style.setProperty("--title-fs", this.cfg(CFG_TITLE_FONT_SIZE, 14) + "px");
      titleEl.textContent = title;
      const coverPosition = this.cfg<string>(CFG_COVER_POSITION, "above-title");
      if (visibleProps.length > 0 && coverPosition !== "below-title") titleEl.style.marginBottom = "16px";
    }

    // Visible property chips
    if (visibleProps.length > 0) {
    const isGrid = this.cfg(CFG_CHIP_GRID, "stack") === "grid";
    const chipFontSize = this.cfg(CFG_CHIP_FONT_SIZE, 12);
    const wrapValues = this.cfg(CFG_WRAP_VALUES, true);
    chipsEl = cardEl.createDiv({ cls: isGrid ? "columns-chips-grid" : "columns-chips" });
    chipsEl.style.setProperty("--chip-fs", chipFontSize + "px");
    if (!wrapValues) chipsEl.addClass("is-clip");
    for (const propId of visibleProps) {
      const val = entry.getValue(propId);
      const chip = chipsEl.createDiv({ cls: "columns-card-chip" });
      const parsed = parsePropertyId(propId);
      const label = this.config?.getDisplayName(propId) ?? parsed?.name ?? propId;
      const isTagProp = parsed?.name === "tags";
      const labelEl = chip.createDiv({ cls: "columns-card-chip-label" });
      labelEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      if (val == null || val instanceof NullValue) {
        const dash = chip.createSpan({ cls: "columns-chip-text" });
        dash.textContent = "–";
      } else {
        // file.backlinks, file.embeds, file.outlinks — each link on its own line
        if (parsed?.name === "backlinks" || parsed?.name === "embeds" || parsed?.name === "outlinks") {
          if (val instanceof ListValue) {
            const len = val.length();
            for (let i = 0; i < len; i++) {
              const item = val.get(i);
              if (!item || item instanceof NullValue || !item.isTruthy()) continue;
              const raw = item.toString();
              const m = raw.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
              const target = m ? m[1] : raw;
              const linkEl = chip.createEl("a", { cls: "columns-chip-link-block" });
              linkEl.textContent = m
                ? m[2] || target.split("/").pop()?.replace(/\.md$/, "") || raw
                : raw;
              linkEl.addEventListener("click", (e) => {
                e.stopPropagation();
                const resolved = this.app.metadataCache.getFirstLinkpathDest(target, file.path);
                if (resolved && resolved instanceof TFile) this.openFile(resolved);
              });
            }
          }
        } else {
          this.renderChipValue(chip, val, file, isTagProp);
        }
      }
      }
      }

      // ── Reorder cover to correct position ───────────────────────────
    if (coverEl) {
      const coverPosition = this.cfg<string>(CFG_COVER_POSITION, "above-title");
      if (coverPosition === "below-title") {
        if (titleEl) cardEl.insertBefore(coverEl, titleEl.nextSibling);
      } else if (coverPosition === "after-all") {
        const last = chipsEl || titleEl;
        if (last && last.nextSibling) {
          cardEl.insertBefore(coverEl, last.nextSibling);
        } else if (!last) {
          // No title or chips — cover is the only child, nothing to reorder
        } else {
          cardEl.appendChild(coverEl);
        }
      }
      // above-title: coverEl is already the first child — nothing to do
    }

    // Click events...

    cardEl.addEventListener("click", (e) => {
      // Browsers fire a synthetic click right after a successful drop —
      // skip it so the file doesn't open immediately after a drag-move.
      if (this.suppressNextClick) {
        this.suppressNextClick = false;
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+click — open in background
        const behavior = this.getOpenBehavior();
        if (behavior === "split-right" || behavior === "split-down") {
          // Check if split leaf is alive first
          const leafField = behavior === "split-right" ? "splitLeafRight" : "splitLeafDown";
          const splitLeaf = (this as any)[leafField] as WorkspaceLeaf | null;
          const leafAlive = splitLeaf?.view != null;
          if (leafAlive) {
            // Open in a new tab inside the existing split leaf
            this.app.workspace.setActiveLeaf(splitLeaf, { focus: false });
            const leaf = this.app.workspace.getLeaf(true);
            leaf.openFile(file);
          } else {
            // Split gone — fall back to new tab
            const leaf = this.app.workspace.getLeaf(true);
            leaf.openFile(file);
          }
        } else {
          const leaf = this.app.workspace.getLeaf(true);
          leaf.openFile(file);
        }
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
  private renderChipValue(chip: HTMLElement, val: Value, sourceFile: TFile, isTagProp = false): void {
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
      const pillCls = isTagProp ? "columns-chip-tag" : "columns-chip-list-item";
      const len = val.length();
      for (let i = 0; i < len; i++) {
        const item = val.get(i);
        if (!item || item instanceof NullValue || !item.isTruthy()) continue;
        const pill = row.createSpan({ cls: pillCls });
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
      case "split-right": {
        this.openInSplit(file, "split-right");
        break;
      }
      case "split-down": {
        this.openInSplit(file, "split-down");
        break;
      }
    }
  }

  private openInSplit(file: TFile, direction: "split-right" | "split-down"): void {
    const isRight = direction === "split-right";
    const leafField = isRight ? "splitLeafRight" : "splitLeafDown";
    const splitLeaf = this[leafField] as WorkspaceLeaf | null;
    const dir = isRight ? "vertical" : "horizontal";

    // Check if existing split leaf is still alive
    let found = false;
    if (splitLeaf?.view) {
      this.app.workspace.iterateAllLeaves((l) => {
        if (l === splitLeaf) found = true;
      });
    }

    if (found) {
      splitLeaf.openFile(file);
    } else {
      const newLeaf = this.app.workspace.getLeaf("split", dir);
      newLeaf.openFile(file);
      (this as any)[leafField] = newLeaf;
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

    const file = this.file;

    // Handle non-md files (images, etc.)
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.path)) {
      const img = contentEl.createEl("img", { cls: "columns-modal-img" });
      img.src = this.app.vault.getResourcePath(file);
      img.style.maxWidth = "100%";
      img.style.display = "block";
      img.style.margin = "0 auto";
    } else if (!file.path.endsWith(".md")) {
      // Non-md, non-image — show basic info
      contentEl.createEl("p", { text: "Cannot preview this file type." });
    } else {
      // Markdown file — full rendering
      contentEl.createEl("h2", { text: file.basename });

      const contentDiv = contentEl.createDiv({ cls: "columns-modal-body" });

      const footer = contentEl.createDiv({ cls: "modal-footer" });
      const openBtn = footer.createEl("button", {
        cls: "mod-cta",
        text: "Open",
      });
      openBtn.addEventListener("click", () => {
        this.app.workspace.getLeaf(true).openFile(file);
        this.close();
      });

      this.app.vault.read(file).then((text) => {
        MarkdownRenderer.render(this.app, text, contentDiv, file.path, this);
      });

      // Open internal links in a new modal
      contentDiv.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const linkEl = target.closest("a.internal-link");
        if (!linkEl) return;
        e.preventDefault();
        const href = linkEl.getAttribute("href");
        if (!href) return;
        const resolved = this.app.metadataCache.getFirstLinkpathDest(href, file.path);
        if (resolved && resolved instanceof TFile) {
          this.close();
          new FilePreviewModal(this.app, resolved).open();
        }
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
