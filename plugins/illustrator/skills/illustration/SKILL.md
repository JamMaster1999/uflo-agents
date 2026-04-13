---
name: illustration
description: Create minimalistic, production-grade illustrations for documentation, changelogs, and marketing. Trigger whenever the user asks for an illustration, diagram, comparison, annotated visual, or any graphic to accompany docs, changelogs, or marketing copy.
---

# Illustration

Refined, minimalistic HTML/CSS/SVG illustrations for documentation. One insight per illustration, compressed into a visual a reader grasps in under three seconds.

## Resources

- **Shared stylesheet**: `${CLAUDE_PLUGIN_ROOT}/resources/base.css` — design tokens, shared components, dark-mode palette. **Read this before writing any markup.** Link it from the CDN; never copy it locally:
  ```html
  <link rel="stylesheet" href="https://uflo-agents.netlify.app/plugins/illustrator/resources/base.css">
  ```
- **Glass lens system**: `${CLAUDE_PLUGIN_ROOT}/resources/glass-lens.*`, `glass-toolbox.*`, `liquidGL.js` — composable magnifying-glass effect. See Common Patterns below.
- **Screenshot script**: `${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.js` — captures light + dark PNG/WebP of an HTML file.
- **Runtime deps**: `${CLAUDE_PLUGIN_DATA}/node_modules` — Playwright and sharp, installed by the plugin's SessionStart hook.

## Workflow

### 0. Load Supporting Skill

If this is a fresh illustration (not iterating on an existing one), invoke the `frontend-design:frontend-design` skill via the Skill tool before building. It provides general frontend craft guidance that complements the rules below. Skip this step when the user is asking for tweaks to an already-built illustration.

### 1. Clarify the Concept

Write the illustration as a single sentence — what insight it compresses. If you can't, you don't have a concept yet. Push back on vague briefs before any markup. If the brief contains multiple insights, split into separate illustrations and ask which to build first.

### 2. Read the Design System

Read `${CLAUDE_PLUGIN_ROOT}/resources/base.css` in full. Identify reusable tokens and components before writing anything new.

### 3. Build the Illustration

Create `images/illustrations/<kebab-name>/index.html` (unless the user specifies otherwise). Scope one-off styles to an inline `<style>` block. Follow all design rules in this document.

**Icons.** Use the HugeIcons MCP tools when an icon is needed:
- `mcp__plugin_illustrator_hugeicons__search_icons` to find candidates by keyword.
- `mcp__plugin_illustrator_hugeicons__preview_icon` on the top 3–5 to compare visually.
- `mcp__plugin_illustrator_hugeicons__get_icon_svg` to retrieve the chosen icon as a `<symbol>` + `<use>` pair.

Hand-draw instead when: the shape is trivial (checkmark, arrow, X), the visual is unique to this concept, HugeIcons returns nothing relevant, or the library style clashes with the composition.

### 4. Screenshot Both Themes

```bash
CLAUDE_PLUGIN_DATA="${CLAUDE_PLUGIN_DATA}" node "${CLAUDE_PLUGIN_ROOT}/scripts/screenshot.js" <path-to-folder> --scale 6 --padding 0 --theme both --transparent --format webp
```

This writes `light.webp` and `dark.webp` next to `index.html`.

### 5. Self-Review Loop

Read both screenshots and check every point below. Fix, re-screenshot, and review again until nothing can be improved:

- **Requirements coverage.** Can you point to a visible element for every point in the brief?
- **Clarity.** Could someone unfamiliar with the context grasp the message in a few seconds?
- **Realism.** If the illustration depicts a real artifact, does the mockup match how that thing actually looks?
- **Visual weight.** Squint — anything too heavy, too thin, too cramped, or too sparse?
- **Dark mode correctness.** Do tokens render correctly in both themes? No silent hex leaks?
- **Anti-patterns.** Any from the list at the bottom of this document?

### 6. Hand Off

Show the final screenshots and report:
- Absolute path to the illustration.
- The one-sentence concept.
- Which shared tokens/components you reused.
- Any local extensions and why.
- Any `base.css` promotion candidates with justification.
- Anything you'd revisit with more time.

### 7. Manual Iteration

After hand-off, the user views the HTML directly in a browser. Make requested changes and wait — do **not** re-screenshot unless asked.

---

## Design Thinking

- **One insight.** If you can't state it in one sentence, break it into separate illustrations.
- **Concrete over abstract, when it fits.** A physical metaphor — paper, a magnifier, a highlighted region — reads faster than labeled boxes. Diagrams of state or flow are fine when that's literally the concept.
- **One focal point.** One hero element; everything else supports it. Two things competing for attention means the reader gets neither.
- **What to leave out.** Every element has to earn its place.

## Reuse, Extend, Promote

- **Reuse first.** If a token or component in `base.css` fits, use it. Don't reinvent a badge or pick a hex that's already a token.
- **Extend when needed.** Write scoped styles in the illustration's own `<style>` block. Local CSS custom properties are fine — they still participate in dark mode.
- **Promote when it generalizes.** If you write the same scoped style across two illustrations, or build something obviously broader than one illustration, flag it in the hand-off report as a `base.css` promotion candidate.

Keep the bar high — `base.css` should stay lean. If you can't name a concrete second illustration that would use a pattern, it doesn't belong in `base.css` yet.

## Design Rules

### Color

- **Never hardcode hex.** Every color comes from a token or a locally-declared CSS custom property. Inline hex breaks dark mode silently. This is non-negotiable.
- **Color has meaning.** Semantic palette (`--success`, `--danger`, etc.) marks emphasis; neutrals carry everything else. If you color three things, three things had better deserve emphasis. More color is fine when the concept demands it (palette demos, charts, legends, multi-stage flows) — let the concept decide.

### Typography

Reach for text-size tokens first. When a composition needs something different (a caption inside a card, a tiny label, a huge hero number), scope it to the illustration. Promote if the same extra size recurs.

### Space and Depth

- **Breathe.** Generous negative space reads as confident. Err on more whitespace than you think you need.
- **Shadows.** `--shadow-card` and `--shadow-float` cover most needs. Write specific shadows deliberately — each one adds weight.

### Proportions

If the illustration zooms into a detail that's 14% clipped, show it as 14% clipped — not "about a seventh." Calculate, don't eyeball.

## SVG Rules

- **Dedupe with `<symbol>` + `<use>`.** Repeated SVG content goes in a hidden `<defs>` block, referenced via `<use href="#id">`. Never duplicate.
- **No hex in SVG attributes.** `fill="#22c55e"` breaks dark mode. Use a CSS class (`.foo { fill: var(--ink); }`) or `currentColor` with `color:` set on a parent.
- **Inline icons scale with text.** Set `width: 1em; height: 1em` in CSS, drop `width`/`height` attributes. Illustration-scale SVGs can size however the composition needs.
- **Inline style is a valid escape hatch.** `style="fill: var(--x)"` works on SVG nodes. Classes are cleaner when the same rule applies to many elements.
- **HugeIcons styles.** Supports `stroke-rounded` (default, line icons) and `solid-rounded` (filled). Icons inherit `currentColor`.

## CSS Techniques Worth Knowing

Not required — available in the toolkit:

- **`backdrop-filter: blur()`** plus a tinted translucent overlay for an "obscured / unreadable" effect — often more elegant than hatched or dashed alternatives.
- **`color-mix(in srgb, var(--token) 22%, transparent)`** for tinted translucency that adapts to dark mode. Prefer over hand-picked `rgba()` literals.
- **The clip-zone pattern.** When you need a visible gap between a border and a hard clipping edge: wrap oversized content in an inner div with its own `overflow: hidden`, giving physical clipping with padding around it.

## Common Patterns

- **Comparison layout.** "Correct vs wrong" side-by-side: `.container > .panel + .divider + .panel` with `.badge.success` / `.badge.danger` at top and `.label.success` / `.label.danger` below. All components are in `base.css`.
- **Glass lens.** Magnifying-glass effect over a specific region. Add CSS in `<head>`, JS at end of `<body>`:
  ```html
  <!-- head -->
  <link rel="stylesheet" href="https://uflo-agents.netlify.app/plugins/illustrator/resources/glass-lens.css">
  <link rel="stylesheet" href="https://uflo-agents.netlify.app/plugins/illustrator/resources/glass-toolbox.css">

  <!-- end of body -->
  <div class="glass-lens" style="top: 100px; left: 47px;"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>
  <script src="https://uflo-agents.netlify.app/plugins/illustrator/resources/liquidGL.js" defer></script>
  <script src="https://uflo-agents.netlify.app/plugins/illustrator/resources/glass-toolbox.js" defer></script>
  <script src="https://uflo-agents.netlify.app/plugins/illustrator/resources/glass-lens.js" defer></script>
  ```
  Position each `.glass-lens` with `top`/`left` inline styles. Add `margin-top` to `.label` when lenses extend below the page.

## Anti-Patterns

- Hardcoded hex anywhere (CSS, SVG attributes, `rgba()` literals) — silently breaks dark mode
- Duplicating SVG content instead of `<symbol>` + `<use>`
- Drawing arrows or connectors with stacked `<div>`s and `border` tricks instead of a single SVG path
- Baking domain-specific labels into class names (`.my-illustration-correct`) instead of generic modifiers (`.success` / `.danger`)
- Adding color without a reason
- Cramming two concepts into one illustration
- Reinventing a shared component because you didn't read `base.css` first
- Writing an obviously reusable style and leaving it scoped — promote it

The best illustration is the one the reader doesn't have to think about.