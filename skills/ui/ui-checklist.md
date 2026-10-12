# UI design review checklist

Written by Claude on 2026-10-12 from WCAG 2.2 contrast criteria and common design-system review practice. It is a checklist for finding problems in code and specs. It is not proof a problem exists. Each hit needs evidence (file:line and snippet) before it is reported.

Static review only: you read code and specs, you do not run or render the app. Anything that needs real rendering goes to the human as a manual check.

Out of lane (hand off, do not rate): journeys, states, form behavior and keyboard use belong to the UX reviewer. Vulnerabilities belong to the security reviewer. Code quality belongs to the code reviewer.

## 1. Design-token fidelity (against `specs/FRONTEND_GUIDELINES.md`)
- Extract the guideline into a short table first: colors, type families and scale, spacing scale, radii, shadows, breakpoints, component rules.
- Find where tokens are defined in code (CSS variables, theme file, Tailwind config). Compare each value to the guideline. Report mismatches.
- Hardcoded values outside the token file bypass the system. Search the diff for hex, `rgb(`, `hsl(` and raw `px` or `rem` values that are not on the scale.
- Fonts and weights match the guideline. Fallback stacks exist. Fonts load locally or as the spec says.
- Radii, shadows, borders and z-index come from a scale, not one-off numbers.

## 2. Color and contrast
- List every text and background pair in use, in every theme. Compute the ratio from the real color values. Show the numbers.
- Text must reach 4.5:1 (WCAG 1.4.3). Large text (18pt, or 14pt bold, and up) needs 3:1.
- UI component boundaries, icons that carry meaning, focus indicators and chart marks need 3:1 against their neighbors (1.4.11).
- Disabled controls are exempt, but must still look different from enabled ones.
- Error, success and warning colors need their own contrast check on their background.
- Link text needs a visible difference from the surrounding text beyond color, or 3:1 against it.
- Colors that come from gradients, opacity, blend modes or images cannot be computed from code. Put them on the manual list.

Contrast formula (tested: black on white gives 21.0, `#777777` on white gives 4.48):

```python
def lum(h):
    h=h.lstrip('#')
    if len(h)==3: h=''.join(c*2 for c in h)
    r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def ratio(a,b):
    la,lb=lum(a),lum(b)
    return (max(la,lb)+0.05)/(min(la,lb)+0.05)
```

## 3. Typography
- Sizes follow the type scale. Body text is at least 16px unless the spec says otherwise.
- Line height is at least 1.4 for body text. Line length is readable (about 45 to 90 characters).
- Sizes use `rem` or `em`, so users can resize text (1.4.4).
- No fixed heights or `overflow: hidden` that clip text when line height, letter spacing or word spacing are increased (1.4.12).
- Heading levels look different from each other and match the guideline.

## 4. Spacing and layout
- Padding, margins and gaps come from the spacing scale. Flag magic numbers.
- Containers, grids and alignment follow the guideline. Similar elements have the same spacing.
- Breakpoints exist at the values the spec names. Layout rules exist for each.
- Fixed widths, fixed heights and `100vh` that will clip or overflow at narrow or short screens.
- No sideways scrolling at narrow widths from fixed-width elements.

## 5. Components
- Buttons, inputs, cards, tables, modals and menus use the shared component, not a copy.
- Only the variants the guideline defines exist. No near-duplicate components.
- One clear primary action per view. Button hierarchy (primary, secondary, tertiary) is consistent.
- One icon set, one size grid, one stroke style.
- Component spacing, radii and shadows match across the app.

## 6. Interaction-state styling
- Every interactive component has styles for hover, focus-visible, active, disabled, selected and loading, as the guideline requires.
- The focus indicator is visible and reaches 3:1 against its background. `outline: none` has a replacement.
- State changes do not shift layout (no jump on hover or on error).

## 7. Themes
- Every token has a value in every theme the spec requires (light, dark, high contrast).
- No hardcoded color that only works in one theme.
- If the spec says to follow `prefers-color-scheme`, the code does.
- Text placed over images has a scrim or other protection, or goes on the manual list.

## 8. Motion
- Durations and easing come from tokens or the guideline.
- `prefers-reduced-motion` is handled for any animation or transition larger than a color change.
- No layout-shifting animation on load.

## 9. Images and assets
- Images have set dimensions or aspect ratio, so the layout does not jump.
- Responsive image sources and sensible formats where the spec asks.
- Icons are SVG or the spec's format. Brand assets match the guideline.
- No placeholder or stock assets left in shipped screens.

## 10. Design direction
- The styling matches the spec's stated design direction and tone. Judge fidelity to the spec, never personal taste.
- Framework default styling left in place where the guideline defines something else (default fonts, default button looks, default focus rings).
- Placeholder content left in: lorem ipsum, "TODO", sample names, debug banners.
- Emoji used as icons or avatars when the spec does not call for them.

## Not checkable from code and specs (hand to the human)
- How the screens actually render and whether the visual balance works.
- Colors from gradients, opacity, blend modes and images.
- Cross-browser and real-device rendering.
- Comparison against any mockup or screenshot.
