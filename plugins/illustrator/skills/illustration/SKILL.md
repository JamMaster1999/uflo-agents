---
name: illustration
description: Create minimalistic, production-grade illustrations for documentation, changelogs, and marketing. Use this skill when prose or screenshots fall short and a diagram, comparison, or annotated visual would communicate a concept more clearly.
---

This skill guides creation of refined, minimalistic illustrations for docs, release notes, and similar long-form contexts. Output is standalone HTML/CSS/SVG.

The user provides the concept — what insight the illustration should compress into a visual — and may include context about the surrounding doc, the audience, or constraints.

## Design Thinking

Before any markup, commit to the concept and the composition:

- **One insight.** Write the illustration as a single sentence. If you can't, you don't have a concept yet — you have a pile of ideas. Break them into separate illustrations.
- **Concrete over abstract, when it fits.** A physical metaphor — paper, a magnifier, a highlighted region, a real line between two real things — reads faster than labeled boxes. Diagrams of state or flow are the right answer when that's literally the concept; just make sure the form is working for you, not against you.
- **One focal point.** Every illustration has a hierarchy — one hero element, everything else supports it. When two things compete for attention, the reader gets neither.
- **What to leave out.** Minimalism is not a style, it's a rejection. Every element you're tempted to add has to earn its place.

**CRITICAL**: An illustration in documentation is not decoration. It is a visual compression of an idea the reader should grok in under three seconds. Every pixel that doesn't help that compression works against you.

## Reuse, Extend, Promote

This is the meta-rule that governs every aesthetic decision below.

`${CLAUDE_PLUGIN_ROOT}/resources/base.css` holds the tokens and shared components every illustration starts from — colors, shadows, radii, text sizes, badges, labels, dividers, layout primitives. They exist so illustrations in the same doc feel related.

- **Reuse first.** Read `${CLAUDE_PLUGIN_ROOT}/resources/base.css` before writing anything. If a token or component fits, use it. Don't reinvent a badge, and don't pick a hex that's already a token.
- **Extend when you need to.** Illustrations vary wildly — a comparison needs nothing like a timeline needs nothing like a data flow. When the shared system can't give you what the concept needs, write scoped styles in the illustration's own `<style>` block. Local CSS custom properties are fine and encouraged for one-off values, because they still participate in dark mode.
- **Promote when the extension generalizes.** If you find yourself writing the same scoped style across two illustrations, or you build something that's obviously broader than the illustration you're in, surface it in your response as a promotion candidate so the shared base can be updated in the plugin source. The shared file grows over time; that's the point.

## Illustration Aesthetics Guidelines

- **Never hardcode hex.** Every color must come from a token or a locally-declared CSS custom property. Inline hex breaks dark mode silently. This is the one non-negotiable rule.
- **Color has meaning.** The semantic palette marks emphasis (`--success`, `--danger`, etc.); neutrals carry everything else. Use color deliberately — if you color three things, three things had better deserve emphasis. Plenty of illustrations legitimately use more color (a palette demo, a chart, a legend, a process flow with distinct stages) — let the concept decide, not impulse.
- **Typography.** Reach for the text-size tokens first; they're calibrated for the system. When a composition calls for something different (a caption inside a card, a number on a page, a tiny label on a diagram, a huge hero number), scope it to the illustration. If the same extra size shows up across multiple illustrations, promote it.
- **Breathe.** Generous negative space reads as confident; crammed layouts read as uncertain. Err on more whitespace than you think you need.
- **Depth.** `--shadow-card` and `--shadow-float` cover most needs. When an illustration wants something specific — an inner shadow, a soft glow, a colored lift — write it deliberately, and remember every shadow is weight on the composition.
- **Proportions must be accurate.** If the illustration zooms into a detail that's 14% clipped, show it as 14% clipped — not "about a seventh." Readers feel sloppy math even when they can't articulate it. Calculate, don't eyeball.

## SVG Rules

- **Dedupe with `<symbol>` + `<use>`.** Any repeated SVG content — icons, patterns, repeated shapes — goes in a hidden `<defs>` block at the top of `<body>`, referenced via `<use href="#id">`. Never duplicate.
- **No hex in SVG attributes.** `fill="#22c55e"` and `stroke="#ef4444"` break dark mode because SVG attributes can't reference CSS custom properties. Use a CSS class (`.foo { fill: var(--ink); }`) or `currentColor` with `color:` set on a parent.
- **Icons that sit next to text scale with it.** Set `width: 1em; height: 1em` in CSS and drop `width`/`height` attributes from the SVG. The icon now tracks font-size automatically. (Illustration-scale SVGs that aren't inline with text can size however the composition needs.)
- **Inline style is a valid escape hatch.** For one-off elements, `style="fill: var(--x)"` works directly on an SVG node. Classes are cleaner when the same rule applies to many elements.

## Modern CSS Techniques Worth Knowing

These aren't required — they're in your toolkit.

- **`backdrop-filter: blur()`** plus a tinted translucent overlay produces an "obscured / unreadable / corrupted" effect that's often more elegant than hatched, dashed, or iconographic alternatives.
- **`color-mix(in srgb, var(--token) 22%, transparent)`** produces tinted translucency that adapts to dark mode automatically. Prefer it over hand-picked `rgba()` literals, which are frozen in light mode.
- **The clip-zone pattern.** When you need a visible gap between a border and a hard clipping edge, `overflow: hidden` alone doesn't work — it clips at the padding box. Wrap the oversized content in an inner div with its own `overflow: hidden`, and you get physical clipping with whatever padding you want around it.

## Common Patterns

- **Comparison layout.** The most common illustration type is a "correct vs wrong" side-by-side using `.container > .panel + .divider + .panel` with `.badge.success` / `.badge.danger` at the top and `.label.success` / `.label.danger` below. These components are all in `base.css`.
- **Glass lens.** When you need to call attention to a small detail (a point value, a page number, a QR code), the plugin ships a glass lens system that renders a magnifying-glass effect over a specific region. Add the CSS in `<head>` and the JS at the end of `<body>`:
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
  Position each `<div class="glass-lens">` with `top`/`left` inline styles to place the lens over the target element. Add `margin-top` to `.label` when lenses extend below the page to avoid overlap with the description text.

## Anti-patterns

- Hardcoded hex anywhere (CSS, SVG attributes, `rgba()` literals) — silently breaks dark mode
- Duplicating SVG content instead of `<symbol>` + `<use>`
- Drawing arrows or connectors with stacked `<div>`s and `border` tricks instead of a single SVG path
- Baking domain-specific labels into class names (`.my-illustration-correct`) instead of using generic modifiers like `.success` / `.danger`
- Adding color without a reason — every accent should be carrying meaning
- Cramming two concepts into one illustration — two insights, two illustrations
- Reinventing a shared component because you didn't read `${CLAUDE_PLUGIN_ROOT}/resources/base.css` first
- Writing a new style that's obviously reusable and leaving it scoped to one illustration — promote it

Remember: the best illustration is the one the reader doesn't have to think about. If they have to puzzle out what you're showing them, you've over-designed it.
