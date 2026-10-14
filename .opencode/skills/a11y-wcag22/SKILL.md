---
name: Accessibility WCAG 2.2 AA
description: Check or fix accessibility in LostLink. Use when adding a form, modal, interactive island, status badge, or when running the polish pass. Covers focus, labels, contrast, keyboard, and motion.
---

# Accessibility for LostLink (WCAG 2.2 AA)

Target: every screen is usable with a keyboard alone, readable by a screen
reader, and legible in bright light on a phone. Run this checklist on any new
UI and during the step-10 polish pass.

## Forms (login, register, report, claim)

- Every input has a real `<label for>` or `aria-label`. Placeholder is not a
  label. `PasswordField.astro` and `ReportModal.astro` are the references.
- Errors use `aria-invalid="true"` on the field and `aria-describedby` pointing
  at the `.field-error` text. The styling hook already exists in
  `global.css`: `.field[aria-invalid="true"]`.
- Required fields are marked in text, not only by an asterisk color.
- Keep typed values after a failed submit. Never clear the form on error.
- Submit buttons disable and set `aria-busy="true"` while processing, so a
  screen reader hears the state change.

## Modals (ReportModal, ItemClaimModal, AdminRemoveModal)

- Open: move focus into the modal (first input or the heading).
- Trap Tab inside the modal. Escape closes it.
- Close: return focus to the element that opened it.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the title.
- Background content is `aria-hidden` or `inert` while open.
- Scroll guard: `max-h-[90dvh] overflow-y-auto` so content is reachable at
  200% zoom.

## Lists, cards, and dynamic content

- Item cards are clickable `<article>`s; the inner "View details" link must be
  a real link so keyboard users can reach `/item/[id]` directly.
- After a filter or search, announce the count: `aria-live="polite"` on the
  result counter (`Showing N of M`). The FilterBar counter already does this
  pattern.
- New cards added by JS (quick report prepend) land in DOM order that makes
  sense to a screen reader.
- Every list has an empty state in text ("No matching items found") with a
  clear-filters action.

## Status and color

- Status is text first: `Pending`, `Approved`, `Claimed`, `Resolved`,
  `Rejected`. The badge color supports the text, never replaces it.
- Type badges read `LOST` / `FOUND` as text, not just green vs lime.
- Contrast on the tokens: forest-900 (#082e1a) on canvas (#f5f1e6) and white
  pass AA comfortably. Lime (#d8ef8c) is a background only, with forest-900
  text on it. Do not put forest-700 text on forest-700 backgrounds.
- Focus ring: `:focus-visible` uses a 2px forest-700 outline with 2px offset
  (set globally in `global.css`). Do not remove it. If a custom control needs a
  different ring, keep it 2px+ and visible on both white and canvas.

## Keyboard and touch

- All actions reachable by Tab in a logical order. No positive `tabindex`.
- Icon-only buttons (slider prev/next, copy ref, remove post) carry
  `aria-label` and a `title`. `ItemCard.astro` is the reference.
- Touch targets >= 44px, including slider arrows and copy buttons. The current
  `size-8` controls need extra hit area on touch; keep the visual size but add
  padding if a target is tight.

## Motion

- `prefers-reduced-motion` is clamped globally in `global.css`. New animations
  must be short and subtle; the ticker is the documented exception.
- Skeleton shimmer, card hover lift, and toast slide all have reduced-motion
  fallbacks. Reuse `.skeleton-pulse`, `.ll-toast`, and the card hover pattern
  rather than writing new keyframes.

## Images

- Item photos: alt is `"{item name} - Photo {n}"` for gallery images, and a
  description for the primary photo.
- Decorative art (watermarks, glows, brand sparkle) gets `aria-hidden="true"`.
- Logos that are links get an accessible name; the DLSAU seal links with
  `target="_blank" rel="noopener"` and says so for screen readers.

## Quick audit script

1. Unplug the mouse. Tab through one full flow: login -> report -> submit.
2. Open every modal with the keyboard. Escape closes each.
3. Turn on voiceover or use the browser's accessibility tree on one item card
   and one badge.
4. Set the browser to 200% zoom. Nothing overlaps or clips.
5. Toggle "reduce motion" in the OS. No infinite animation except the ticker.

Report findings as: screen, element, WCAG criterion (e.g. 1.3.1, 2.4.7, 4.1.3),
fix. Fix blockers before moving on.
