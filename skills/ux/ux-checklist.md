# UX review checklist

Written by Claude on 2026-10-12 from Nielsen's 10 usability heuristics and WCAG 2.2 Level A and AA success criteria. It is a checklist for finding problems in code and specs. It is not proof a problem exists. Each hit needs evidence (file:line and snippet) before it is reported.

Static review only: you read code and specs, you do not run the app. Anything that needs a real click-through goes to the human as a manual check.

Out of lane (hand off, do not rate): colors, contrast ratios, typography, spacing and visual consistency belong to the UI design reviewer. Vulnerabilities belong to the security reviewer. Code quality belongs to the code reviewer.

## 1. Journey completeness (against `specs/APP_FLOW.md`)
- Every screen in APP_FLOW has a route or component in the code. List any that is missing.
- Every journey can be traced from entry to success in the code. Note any step with no handler.
- Every journey has a failure path, a cancel path and a way back. No dead ends.
- Navigation items match APP_FLOW. The current location is indicated. Names are the same everywhere.
- Acceptance criteria in `PRD.md` and `IMPLEMENTATION_PLAN.md` that touch the user are met.

## 2. Screen states
- Loading state on every screen or component that fetches data.
- Empty state with a clear next step, not a blank area.
- Error state with a plain message and a retry or recovery action.
- Success feedback after actions that change data.
- Offline or slow-network behavior where the spec mentions it.

## 3. Forms
- Every control has a visible label tied to it in code (WCAG 3.3.2, 1.3.1, 4.1.2). Placeholder text alone is not a label.
- Required fields are marked. Input types and autocomplete values fit the field (1.3.5).
- Validation errors appear next to the field, name the problem and suggest a fix (3.3.1, 3.3.3).
- Input is kept after an error. Nothing the user typed is lost.
- Destructive, financial or data-changing submits ask for confirmation or can be undone (3.3.4).
- No re-asking for information already given in the same flow (3.3.7).
- Submit controls are disabled only with a visible reason.

## 4. Keyboard and focus
- Every action reachable with a mouse is reachable with a keyboard (2.1.1). Custom controls handle Enter and Space.
- No keyboard trap, including in modals and menus (2.1.2). Escape closes overlays.
- Focus order follows reading order (2.4.3). Focus moves into a modal on open and back on close.
- Focus indicator is not removed (`outline: none` with no replacement) (2.4.7). Focus is not hidden behind sticky bars (2.4.11).
- A skip link or landmark structure lets users bypass repeated navigation (2.4.1).

## 5. Structure and semantics
- Real elements for real jobs: `button` for actions, `a` for navigation, `label`, `table`, lists. No clickable `div` with no role or key handling (4.1.2).
- One `h1` per page and headings in order (1.3.1, 2.4.6). Each page has a title (2.4.2). The page language is set (3.1.1).
- Images that carry meaning have alt text. Decorative images have empty alt (1.1.1).
- Icon-only buttons have an accessible name. The visible label matches the accessible name (2.5.3).
- Link text makes sense alone, not "click here" (2.4.4).
- Information is not carried by color alone (1.4.1).

## 6. Feedback and status
- Status changes (saved, error, loading finished) are announced with a live region or equivalent (4.1.3).
- Long operations show progress or a spinner with text.
- No change of context on focus or on input without warning (3.2.1, 3.2.2).
- Timeouts can be extended or are announced (2.2.1). Auto-playing motion can be paused (2.2.2). No flashing content (2.3.1).
- Help, when offered, sits in the same place on every page (3.2.6).

## 7. Touch, pointer and motion
- Targets are at least 24 by 24 CSS pixels (2.5.8). Use 44 pixels if the spec says so.
- Drag is never the only way to do something (2.5.7).
- Hover-only content can also be reached by focus, and can be dismissed (1.4.13).
- Layout reflows at narrow widths without sideways scrolling, and text can be resized (1.4.4, 1.4.10).
- `prefers-reduced-motion` is respected where the app animates.

## 8. Authentication flows
- Login and recovery do not rely on remembering or retyping a puzzle or code. Paste and password managers work (3.3.8).
- Error messages on login do not leak whether an account exists, and still tell the user what to do.

## 9. Copy
- Plain language. The same term for the same thing everywhere (Nielsen 2, 4).
- Error text never shows stack traces, codes or raw exception messages.
- Buttons say what they do ("Save invoice", not "Submit").
- Empty and error messages are polite and say what to do next.

## 10. Nielsen's 10 heuristics (final pass)
1. Visibility of system status
2. Match between the system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose and recover from errors
10. Help and documentation

## Not checkable from code and specs (hand to the human)
- Real screen reader behavior, real keyboard walk-through, real touch use.
- Whether copy and flows feel clear to a first-time user.
- Behavior on real devices and slow networks.
