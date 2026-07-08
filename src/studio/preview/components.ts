/*
 * Browser renderers for the 11 MDX components — faithful ports of the .astro
 * output so the Studio preview shows the REAL component, not a placeholder.
 * The published site's scoped styles don't apply here, so the matching CSS is
 * in components.css (scoped under .mdx-preview). Container components
 * (Callout, Tldr) receive already-rendered children HTML; leaf components
 * build from evaluated props. Verdict is intentionally unsupported (it is
 * frontmatter-driven and must never render inline).
 */
import katex from "katex";

const CONTAINER = new Set(["Callout", "Tldr"]);

export function isContainer(name: string): boolean {
  return CONTAINER.has(name);
}

export function isKnownComponent(name: string): boolean {
  return name in RENDERERS;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tex(source: string): string {
  try {
    return katex.renderToString(String(source), { displayMode: true, throwOnError: false });
  } catch {
    return esc(source);
  }
}

function numeric(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[^\d.eE+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const WIDTH_RE = /^\d+(\.\d+)?(%|px|rem|em|vw|ch)$/;

/** A Figure `width` prop is honoured only if it is a whitelisted CSS length. */
export function safeFigureWidth(width: unknown): string | undefined {
  if (typeof width !== "string") return undefined;
  const w = width.trim();
  return WIDTH_RE.test(w) ? w : undefined;
}

export function figureAlign(align: unknown): "center" | "right" | "left" | undefined {
  return align === "center" || align === "right" || align === "left" ? align : undefined;
}

/* The one source of truth for a Figure's inline style, shared by the Studio
 * preview port (this file), the Studio editor block (MdxLeaf), and mirrored in
 * Figure.astro — so the editing surface, the preview, and the published page
 * are pixel-identical ("所见即所发布"). */
export function figureStyle(width: unknown, align: unknown): string {
  const w = safeFigureWidth(width);
  const a = figureAlign(align);
  const parts: string[] = [];
  if (w) parts.push(`width: ${w}`);
  if (a === "center") parts.push("margin-inline: auto");
  else if (a === "right") parts.push("margin-left: auto; margin-right: 0");
  return parts.join("; ");
}

type Props = Record<string, unknown>;
type Renderer = (props: Props, childrenHtml: string) => string;

const RENDERERS: Record<string, Renderer> = {
  Callout(props, children) {
    const type = String(props.type ?? "note");
    const defaults: Record<string, string> = { exam: "exam-trap", definition: "def" };
    const label = String(props.title ?? defaults[type] ?? type).toLowerCase();
    return `<aside class="callout callout-${esc(type)}"><p class="callout-label">// ${esc(label)}</p>${children}</aside>`;
  },

  Tldr(props, children) {
    const label = String(props.label ?? "tldr");
    return `<aside class="tldr"><p class="tldr-prompt" aria-hidden="true"><span class="prompt">$</span> ${esc(label)}</p><div class="tldr-body">${children}</div></aside>`;
  },

  Critique(props) {
    const weaknesses = Array.isArray(props.weaknesses) ? props.weaknesses : [];
    const improvements = Array.isArray(props.improvements) ? props.improvements : [];
    const list = (items: unknown[], sign: string, cls: string) =>
      `<ul class="diff-list">${items
        .map(
          (item) =>
            `<li class="${cls}"><span class="diff-sign" aria-hidden="true">${sign}</span>${esc(item)}</li>`
        )
        .join("")}</ul>`;
    let inner = "";
    if (weaknesses.length) inner += `<section aria-label="Weaknesses"><p class="critique-label">weaknesses</p>${list(weaknesses, "-", "diff-minus")}</section>`;
    if (improvements.length) inner += `<section aria-label="Possible improvements"><p class="critique-label">improvements</p>${list(improvements, "+", "diff-plus")}</section>`;
    return `<div class="critique">${inner}</div>`;
  },

  WhenMatrix(props) {
    const helps = Array.isArray(props.helps) ? props.helps : [];
    const hurts = Array.isArray(props.hurts) ? props.hurts : [];
    const helpsLabel = String(props.helpsLabel ?? "helps when");
    const hurtsLabel = String(props.hurtsLabel ?? "hurts when");
    const col = (label: string, labelCls: string, items: unknown[], mark: string, markCls: string) =>
      `<section aria-label="${esc(label)}"><p class="matrix-label ${labelCls}">${esc(label)}</p><ul>${items
        .map((item) => `<li><span class="mark ${markCls}" aria-hidden="true">${mark}</span>${esc(item)}</li>`)
        .join("")}</ul></section>`;
    return `<div class="when-matrix">${col(helpsLabel, "label-helps", helps, "✓", "mark-helps")}${col(hurtsLabel, "label-hurts", hurts, "✗", "mark-hurts")}</div>`;
  },

  KeyTakeaways(props) {
    const id = String(props.id ?? "key-takeaways");
    const items = Array.isArray(props.items) ? props.items : [];
    return `<section class="takeaways" aria-labelledby="${esc(id)}"><h2 id="${esc(id)}">Key Takeaways</h2><ul>${items
      .map((item) => `<li>${esc(item)}</li>`)
      .join("")}</ul></section>`;
  },

  Bench(props) {
    const columns = Array.isArray(props.columns) ? (props.columns as unknown[]) : [];
    const rows = Array.isArray(props.rows) ? (props.rows as Props[]) : [];
    const better = Array.isArray(props.better) ? (props.better as unknown[]) : [];
    const winners = columns.map((_, columnIndex) => {
      const rule = better[columnIndex];
      if (!rule) return -1;
      let bestRow = -1;
      let bestValue: number | undefined;
      rows.forEach((row, rowIndex) => {
        const cells = Array.isArray(row.cells) ? row.cells : [];
        const value = numeric(cells[columnIndex]);
        if (value === undefined) return;
        if (bestValue === undefined || (rule === "max" ? value > bestValue : value < bestValue)) {
          bestValue = value;
          bestRow = rowIndex;
        }
      });
      return bestRow;
    });
    const head = `<tr><th scope="col">method</th>${columns.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr>`;
    const body = rows
      .map((row) => {
        const cells = Array.isArray(row.cells) ? row.cells : [];
        const tds = cells
          .map((cell, columnIndex) => `<td class="${winners[columnIndex] === rows.indexOf(row) ? "winner" : ""}">${esc(cell)}</td>`)
          .join("");
        return `<tr class="${row.baseline ? "baseline" : ""}"><th scope="row">${esc(row.name)}</th>${tds}</tr>`;
      })
      .join("");
    const caption = props.caption ? `<figcaption>${esc(props.caption)}</figcaption>` : "";
    return `<figure class="bench wide-scroll"><table><thead>${head}</thead><tbody>${body}</tbody></table>${caption}</figure>`;
  },

  FormulaCard(props) {
    const title = String(props.title ?? "formula reference");
    const formulas = Array.isArray(props.formulas) ? (props.formulas as Props[]) : [];
    const rows = formulas
      .map((f) => {
        const note = f.note ? `<p class="formula-note">${esc(f.note)}</p>` : "";
        return `<div class="formula-row"><dt>${esc(f.name)}</dt><dd><div class="formula-math">${tex(String(f.tex ?? ""))}</div>${note}</dd></div>`;
      })
      .join("");
    return `<aside class="formula-card" aria-label="${esc(title)}"><p class="card-label">${esc(title)}</p><dl>${rows}</dl></aside>`;
  },

  Derivation(props) {
    const title = String(props.title ?? "derivation");
    const open = props.open === undefined ? true : Boolean(props.open);
    const steps = Array.isArray(props.steps) ? (props.steps as Props[]) : [];
    const items = steps
      .map((step) => {
        const math = step.math ? `<div class="step-math">${tex(String(step.math))}</div>` : "";
        return `<li><p class="step-text">${esc(step.text)}</p>${math}</li>`;
      })
      .join("");
    return `<details class="derivation"${open ? " open" : ""}><summary>${esc(title)}</summary><ol>${items}</ol></details>`;
  },

  Recall(props) {
    const title = String(props.title ?? "active recall");
    const items = Array.isArray(props.items) ? (props.items as Props[]) : [];
    const body = items
      .map((item) => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`)
      .join("");
    return `<section class="recall" aria-label="${esc(title)}"><p class="recall-label">${esc(title)}</p>${body}</section>`;
  },

  Figure(props) {
    const src = String(props.src ?? "");
    // Base-path aware, matching Figure.astro (relative → /HomePage/…).
    const base = import.meta.env.BASE_URL || "/";
    const resolved = /^(https?:)?\/\//.test(src) || src.startsWith("/") ? src : `${base}${src}`;
    const parts = [esc(props.caption)];
    if (props.source && props.sourceUrl) parts.push(` Source: <a href="${esc(props.sourceUrl)}">${esc(props.source)}</a>.`);
    else if (props.source) parts.push(` Source: ${esc(props.source)}.`);
    const style = figureStyle(props.width, props.align);
    const styleAttr = style ? ` style="${esc(style)}"` : "";
    return `<figure${styleAttr}><img src="${esc(resolved)}" alt="${esc(props.alt)}" loading="lazy" /><figcaption>${parts.join("")}</figcaption></figure>`;
  }
};

/** Render a known component to HTML, or null if unknown/unsupported (→ placeholder). */
export function renderComponent(name: string, props: Props, childrenHtml: string): string | null {
  const renderer = RENDERERS[name];
  if (!renderer) return null;
  return renderer(props, childrenHtml);
}
