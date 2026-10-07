---
version: alpha
name: "Panta Desk"
description: "A quiet market research desk with cobalt actions, readable evidence and explicit data provenance."
colors:
  primary: "#244EDB"
  primary-hover: "#1738AA"
  ink: "#18283E"
  muted: "#546477"
  background: "#EEF2F7"
  surface: "#FFFFFF"
  border: "#CBD4E1"
  tint: "#E7EDFF"
  warning: "#725000"
  warning-background: "#FFF3CD"
  danger: "#A92530"
  scroll-thumb: "#8C9BB0"
  scroll-track: "#E3E9F1"
  scroll-hover: "#546477"
typography:
  sans:
    fontFamily: '"Segoe UI", Arial, sans-serif'
  display:
    fontFamily: '"Franklin Gothic Medium", "Arial Narrow", sans-serif'
  mono:
    fontFamily: 'Consolas, monospace'
rounded:
  DEFAULT: "0.5rem"
  control: "0.5rem"
  panel: "0.9rem"
spacing:
  unit: "0.75rem"
  workspace-gap: "1.5rem"
  page-max: "1440px"
components:
  button: {}
  card: {}
  input: {}
  select: {}
  research-panel: {}
---

# Panta Desk design system

The reference is a research notebook beside a market terminal: clear questions, small factual labels and room for a person's own judgement. The UI serves English-speaking market researchers on desktop and mobile. It is a product workspace with familiar controls and a compact cobalt wordmark.

This file mirrors implemented variables in `public/styles.css`; it does not generate CSS. Functional ownership and states are in `UX-CONTRACT.md`. There are no third-party UI dependencies.

## Colors and typography

White cards sit on a pale slate canvas. Cobalt identifies actions, selection and focus; the selected button's wording and `aria-pressed` also communicate state. Amber identifies sample or sandbox data. Red is reserved for errors. The muted text color carries secondary labels without fading essential facts. Forced colors restores system scrollbars and uses Highlight for selected borders.

The display face is Franklin Gothic Medium with Arial Narrow fallback. Body copy uses Segoe UI and Arial. Consolas sets dates and numeric values. Headings use compact line height; evidence prose preserves line breaks and wraps long strings. No remote fonts are required.

## Layout and shapes

The maximum page width is 1440px. The desktop workspace uses a 1.5:1 catalog/research split with a 1.5rem gap. At 950px it becomes one column. At 600px headings stack, search uses full width and filters flex. Document scrolling owns the page; no fixed-height form traps the notes. Panels have 0.9rem radius and controls 0.5rem. Borders and tonal surfaces create hierarchy; the selected card has a small inset cobalt marker.

## Components and interaction

Buttons are semantic HTML buttons, with specific verbs and clear solid/outline emphasis. Focus is a 3px cobalt outline. Disabled controls use native `disabled` and a non-interactive cursor. Busy catalog loading reserves message space and exposes `aria-busy`.

Category and status use native selects. Platform-owned popup geometry is deliberately accepted. Their closed controls follow the field tokens. Search has an app-owned clear action, composition guards and local filtering limited to loaded rows. Notes use an auto-growing textarea, local persistence and a live save status. No secrets are entered in the UI.

The only glyphs are the letter P and a decorative comparison symbol, both hidden from assistive technology where redundant. Meaningful controls keep text labels. Motion is limited to a 1px pressed-button shift; reduced motion removes optional transitions. Alerts, prompts and confirm dialogs are not used.

## Data and content

Dates display in UTC and missing values remain explicit. Prices use USDC units; resolved values retain their price source. Live, sandbox and sample provenance travel with the catalog, detail, activity and exported brief. There are no invented charts, probability claims, transactions or inferred resolution sources. Native source links open in a new tab with `noopener noreferrer`.

Use exact wording and distinguish provider evidence from local review. Keep the interface useful on small screens. Avoid decorative dashboards, ornamental charts and labels that imply a forecast or guaranteed payout.
