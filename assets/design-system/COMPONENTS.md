# Sinecdo component states — Phase 1.2

Date: 2026-11-27. Source: the Sinecdo master Figma file `60zlnPJ1kmX4meinJ9GPNB`, read directly for this implementation.

This is a progressive state layer for existing HTML/CSS/JS, not a React rewrite or a new page layout. It preserves the current copy, assets, base typography, layout, form endpoints and staging guards.

## Source mapping

| Figma component | Node | Web implementation |
| --- | --- | --- |
| Button / Primary | 23:260 | `.button`, `.q-primary`, `.sc-button` states |
| Nav / Link | 25:176 | `.nav-links a:not(.button)`, `.sc-link` |
| Form / Input | 23:264 | `.form-field`, `.q-field`, `.sc-field` |
| Quiz / Option | 28:210 | Native `.q-card` radio selection and focus |
| Card / Interactive | 23:263 | Anchors and buttons with `.card` or `.sc-card` |

Fixed Figma specimen widths are not enforced on responsive controls. This slice applies the state vocabulary to existing markup; it is not a complete reconstruction of every Figma component. Existing SVGs, wordmarks and content are retained. The specular-sweep asset, icon family deployment, ambient motion and new page compositions are separate increments.

## Loading

`components.css` consumes `tokens.css` and has no external requests. Both are imported by `/typography.css` for the three home locales and privacy routes. `quiz-bridge.css` imports the same layers for Quest. The Quiz keeps `--ink` as its page background and keeps its existing layout and type scales.

Existing CSS remains as fallback. State selectors intentionally override legacy state rules, including `.form-actions .button:disabled`, without changing idle geometry. Do not remove the legacy sheet wholesale.

## Existing components

- Buttons: 220 ms token-based feedback, 2 px lift on a fine pointer, pressed response, solid keyboard outline plus a restrained shadow, and native disabled/busy presentation.
- Navigation: one aqua underline on hover or keyboard focus. No pseudo-element collision with the wordmark.
- Inputs: aqua focus, terracotta error border after user interaction, and separate disabled appearance. Existing native validation and application status messages remain in charge of behavior.
- Quiz: native radios and labels remain accessible; checked options use the master aqua-soft surface and visible focus.
- Informational cards are not made clickable. Only actual anchors/buttons receive interactive card elevation and a pointer cursor.
- On the aqua diagnostic panel, the keyboard outline uses dark ink to stay distinguishable from the panel.

## Opt-in primitives for subsequent pages

Use `.sc-button` for a real `<button type="button">` or `<a href="...">`. Add `.sc-button--secondary` for the secondary surface. Labels must remain real text. Size grows with wrapped copy; do not impose a fixed width.

Use `.sc-field` around a native label and input/select/textarea. Link helper and error messages with `aria-describedby`; set `aria-invalid="true"` only after validation. CSS provides `.sc-field-help` and `.sc-field-error`, not a validation engine. Browsers supporting `:user-invalid` also receive interaction-aware error styling.

Use `.sc-card` on a container for an informational card or on an anchor/button for a genuinely actionable card. Do not add a fake `role="button"` to a static card just for its hover effect.

Use `.sc-link` for inline links; retain real navigation semantics.

## Disabled and busy are different

Prefer native `disabled` on buttons and form controls. The disabled cursor is `not-allowed`. Set `aria-busy="true"` while an actual operation is pending to request the `wait` cursor. This CSS layer does not infer or change application request state.

`aria-disabled="true"` on an anchor only communicates and styles the state; it does not block activation. Consumers must remove its `href` or prevent activation and manage focus deliberately. Never treat CSS as an authorization or submission guard.

## Accessibility and movement

Fine-pointer hover is progressive enhancement. Touch does not inherit the old sticky button lift. Reduced motion disables displacement and transitions in this layer. Forced colors uses a system focus outline. Existing consent and data-capture logic is unchanged.

Do not represent this as a complete WCAG audit. The CI checks Chromium; manual review with real fonts, other browser engines, assistive technology and actual staging is still part of release approval.

## Tests

`qa/design-system-components.cjs` exercises home ES/EN/IT in 390/720/980/1440 px, Quiz selection in ES/EN/IT, keyboard focus, valid/invalid/disabled input states, disabled buttons, pointer/touch behavior, reduced motion and reusable primitives. It writes `qa-output/components/components-qa.json` and screenshots.

All external/API calls are blocked locally. Tests do not write to the real CRM, send email or produce production analytics. The existing 37-check analytics/capture regression, responsive/isolation suite and foundations comparison remain enabled.

A green CI result validates the tested checkout. It is not proof that Hostinger serves that SHA. Verify served assets and interactions on the staging URL before approving production.

## Release boundary

Work branch: `feat/sinecdo-web-refresh-20261126`. PR #3 remains Draft. No merge or production publication is authorized by this phase. The staging deployment target stays `public_html/site`; server rules and the public-without-password access approved by the owner are unchanged.
