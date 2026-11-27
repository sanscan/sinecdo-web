# Sinecdo Foundations v1.0.0

Phase 1.1, 2026-11-27. Shared CSS foundations for the existing website, Quest and future Creator Partners. This is a controlled token migration, not the homepage redesign or the full interactive component library.

## Sources and precedence

- Figma master: https://www.figma.com/design/60zlnPJ1kmX4meinJ9GPNB?node-id=2-104
- Source extraction: local variables, text-style variation settings and effect styles read from the master on 2026-11-27. Figma was not modified.
- Project canon: https://docs.google.com/document/d/1uxPpdSsEqodE_0uIUfYCwMAJytBrtVApgRyHqXz1ofs/edit
- Existing web behavior reference: commit `e8eeb59a7cf5196071f1fd292fcced6470f6b48d`.

The current Figma source defines the canonical values. Existing page-specific behavior is deliberately retained through clearly named compatibility tokens, rather than silently changing an approved page during a foundational refactor.

## Files and load order

`tokens.css` declares namespaced `--sc-*` custom properties only. It does not apply element selectors, replace font loading, reset controls, enable animations or affect forms/analytics.

`/typography.css` imports the tokens after its existing font import and maps the legacy home variables to them. This covers ES/EN/IT home and privacy pages. `/styles.css` keeps its previous declarations as compatibility fallbacks during the incremental migration.

`quiz-bridge.css` imports the same tokens and maps Quest's existing variable vocabulary. `/quest/index.html` loads it after `quest.css` and before `capture.css`. Quest's existing layout, breakpoints and control geometry are unchanged.

New pages should import `tokens.css` directly and use namespaced tokens. Do not import the home or Quiz compatibility bridge merely to obtain colors.

```css
@import url('/assets/design-system/tokens.css?v=20261127-1');

.product-panel {
  color: var(--sc-text-body);
  background: var(--sc-bg-surface);
  border: 1px solid var(--sc-border-default);
  border-radius: var(--sc-radius-card);
  padding: var(--sc-space-24);
}
```

## Mapping

| Figma source | CSS family | Unit conversion |
| --- | --- | --- |
| Primitives and Sinecdo / Color | `--sc-graphite-*`, `--sc-bg-*`, `--sc-text-*`, `--sc-border-*` | RGB(A) values retained; tiny float imprecision rounded |
| Sinecdo / Spacing | `--sc-space-*` | pixels |
| Sinecdo / Shape | `--sc-radius-*` | pixels |
| Typography variables and named text styles | `--sc-font-*`, `--sc-weight-*`, `--sc-size-*`, `--sc-leading-*`, `--sc-tracking-*` | tracking percent / 100 = em; leading percent / 100 = unitless |
| Sinecdo / Layout | `--sc-container-*`, `--sc-header-*`, `--sc-section-*`, field/button height | pixels |
| Sinecdo / Motion | `--sc-motion-*`, `--sc-ease-*`, `--sc-cursor-*` | Figma seconds to CSS milliseconds |
| Sinecdo / Iconography | `--sc-icon-*` | pixel size; unitless SVG stroke |
| Named effect styles | `--sc-effect-*` | equivalent CSS box-shadow values |

Canonical type: Inter 760 for the wordmark, DM Sans 300/400/700/780 for body/UI/strong/display, JetBrains Mono for technical labels. Additional label/button/option weights are taken from named Figma styles.

The Figma specimen sizes (H1 88, H2 64, quote 68) are reference tokens, not unconditional web font sizes. Existing fluid type scales remain in their page styles until the visible UI slice. Do not replace responsive web rules with fixed Figma preview dimensions.

## Known differences deliberately preserved

- **`--ink` collision:** Figma's aqua-ink is `#10201c`, while Quest's legacy `--ink` means the page background `#121514`. Use `--sc-text-on-aqua` for the former; the Quiz bridge preserves the latter.
- Home H1 currently uses `-.045em`, while canonical H1 tracking is `-.055em`. `--sc-legacy-home-h1-tracking` preserves the current home. The canonical value remains available separately.
- Quest surface `#1b201e`, muted `#adb4ae`, border alpha `.16` and warm `#e8ad97` are retained as explicit `--sc-legacy-quiz-*` values. They are observed web compatibility values, not invented Figma tokens.
- Home body/lead leading, button weight and component sizing remain unchanged. Migration of component states is a later slice.
- Figma `color/surface/card` currently resolves to opaque white and `color/surface/aqua-glow` to opaque aqua. They are preserved as `--sc-source-card-surface` / `--sc-source-aqua-glow`, **not** applied as blanket card fills or shadows. Use semantic dark surfaces and named effect tokens.
- Home breakpoints remain 980/720px. Quest retains its current 1000/760/600/380px rules. CSS custom properties are not used as media-query breakpoint expressions.

## Motion and accessibility

Timings, curves, cursors and effects are available for subsequent components. No specular sweep, card animation, global custom cursor or reveal behavior is activated by this phase.

`prefers-reduced-motion: reduce` sets new motion timings and lift to zero and exposes `--sc-reduced-motion: 1`. Existing reduced-motion behavior remains intact. Consumers must also disable non-essential looping animations rather than relying only on duration tokens.

## Validation

`node qa/design-system-foundations.cjs` tests seven routes at 390/720/980/1440px in Chromium. It checks asset loading, resolved tokens, overflow, script errors and reduced-motion tokens. It compares rendered geometry and selected computed styles against the pre-migration typography. Home ES/EN/IT and Quest additionally get before/after full-page PNG comparisons at 390/1440px.

The reference typography is read from the baseline commit using `git show`; checkout history is required. The reference Quiz has its bridge disabled. Tests use the same page code, viewport and mocked network for both renders. External services and font CDN are blocked, so these tests do not replace a real-browser review with production fonts or a full staging E2E test.

Outputs: `qa-output/foundations/foundations-qa.json`, before/after PNGs and a computed-style diff when a comparison fails. Existing B2B/Quiz/GA4 regression and staging isolation tests still run separately.

The strict before/after equality assertion is scoped to this no-visual-change migration. When starting the approved visible redesign, update that test's baseline/scope explicitly rather than disabling all regression checks.

## Release constraints

Work only in `feat/sinecdo-web-refresh-20261126`. It auto-deploys to the existing Hostinger staging website, with Git destination `public_html/site`. Do not alter the outer server rules, staging isolation, `main`, production or the separate personal website.

PR #3 remains Draft. Production publication requires separate authorization. Creator Partners, UI state implementation and the full homepage redesign are not completed by this foundations slice.
