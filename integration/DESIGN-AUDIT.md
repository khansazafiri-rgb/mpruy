# MEDCOEL design system audit

Source: connected GitHub, khansazafiri-rgb/mpruy, branch
claude/focused-wozniak-1ayrxa. This is not an assertion about uninspected live
server files. Source URLs use /blob/claude/focused-wozniak-1ayrxa/apps/web/.

| Element | Evidence / value | Anatomy application |
|---|---|---|
| Logo | src/components/Logo.jsx, src/assets/logo-full.webp and logo-mark.webp | Official full logo on desktop, official mark on narrow screens |
| Logo blobs | full 75622c7e565039cadd3a1390df60c1b5e5d8a0d1; mark 8875af58749d2afb0ab731464290433b36adcb57 | Fetched directly from GitHub; no recreated wordmark |
| Body font | Inter, index.html + tailwind.config.js | Self-hosted Inter Variable |
| Headings | Plus Jakarta Sans | Self-hosted Plus Jakarta Sans Variable |
| Hand font | Caveat for decorative notes | Not used in compact atlas controls |
| Accent | --brand 0 112 96 (#007060), --brand-dark #00584E | Active systems, buttons, focus rings |
| Gold | --gold #F8C038 | Keyboard focus on dark viewport |
| Ink | --ink #172B38; --ink-muted #5B6970 | Text and secondary labels |
| Paper | index.css --page #F8F7F3; foundation.css --paper #F6F3EA, --paper-2 #EDE8DA | Ivory shell, warm panels and borders |
| Forest | foundation.css --forest #0A3830, --forest-2 #104C40; mint #C4E4D2 | Quiet dark viewer surface with existing MEDCOEL palette |
| Theme | Audited sources have light base + dark forest surfaces, no dark/light toggle or root theme override | No new global theme selector invented |
| Radius | index.css .btn/.input rounded-xl (12px), .card rounded-2xl (16px); foundation paper-sheet 20px | 10–12px controls; 16–20px viewer/panels |
| Buttons | .btn 44px touch; fine pointer 40px; primary brand/white, secondary surface/line | Same visual hierarchy; study controls adapted for density |
| Cards | .card border-line, quiet shadow; paper-sheet warm surface | Calm sidebar and detail panel; no stickers over model |
| Navigation | AppShell 64px header, full/mark logo, desktop scroll nav + drawer + bottom nav | Study header with return to Lab; proposed main nav entry |
| Spacing | Main px-4, md:py-8; study 24/32px; 4/8px scale | 16–24px panel padding, 6–8px control gaps |
| Responsive | Main sm 640, md 768, lg 1024; study one column below 1024 | Drawers on iPad/mobile; full logo switches to mark under 640 |
| Reusable components | ui.jsx Modal, Field, Segmented, Tabs, Badge, SectionHeader; Logo; AppShell | Retain framework boundary; reuse token semantics rather than mount React over existing DOM |

Audit order: index.css -> experience.css -> styles/foundation.css -> styles/app.css,
matching src/main.jsx. Foundation/app override older background/navigation styles.
Token extraction is in src/styles/medcoel-tokens.css; shell adapter is in
src/styles/medcoel-shell.css. No GLB, renderer, material, selection, camera or
regional-scene engine module was modified in this UI pass.

The local V3 already has automatic selection ghosting. Focus and Fade others
buttons now surface those existing camera/material APIs beside Isolate, Hide,
Fade and Restore. Existing layer controls and global/system search remain.
