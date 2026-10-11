# UI reference and polish

Part of LostLink. Main file: [../AGENTS.md](../AGENTS.md). Behavior: [rules.md](rules.md).

## UI reference (copy it)

The `context/` folder contains screenshots of the UI. Copy them as exactly as you can:
- Layout, spacing, colors, fonts, icons, borders, shadows, and component shapes
- Navbar, dashboard cards, filters, forms, badges, and modals as shown

Rules:
1. The images decide how things look. The files in `docs/` decide how things behave.
2. If an image shows a feature that is not in these files, ask before building it.
3. If a screen has no image, reuse the same components, colors, and spacing from the images that exist. Do not invent a new style.
4. Do not redesign or "improve" the visuals.
5. Take the category list and campus location list from the images where they appear.

## Polish checklist

- **Unified Scale Standard (Login Page Benchmark):** The login page (`AuthShell.astro`) is the gold standard for sizing, scale, typography, and spacing across the entire system.
  - **Scale & Sizing:** All pages (especially the dashboard) must feel as spacious, large, and substantial as the login page.
  - **Typography:** Body text should be `0.9375rem`–`1rem` (never cramped sub-12px micro-text except for tags). Headings use generous Fraunces serif clamps (`2.25rem`–`4rem`).
  - **Controls:** Inputs, search bars, and action buttons maintain `min-h-[3rem]` to `min-h-[3.5rem]` height with comfortable padding. Pill buttons use `min-h-[2.5rem]`–`min-h-[2.75rem]` with `px-4.5`–`px-5`.
  - **Spacing & Radius:** Use `rounded-card` (1.75rem), generous card padding (`p-7` to `p-10`), and wide page gutters (`px-5 sm:px-10 lg:px-14`).
- One design system. Define color, spacing, radius, and type tokens once and reuse them.
- Every screen has a loading state (skeletons for lists), an empty state, an error state, and success feedback.
- Accessibility to WCAG 2.2 AA: real labels on all fields, visible focus rings, full keyboard use, color contrast, alt text on item photos, `aria-live` for toasts.
- **Fluid Responsive Adaptation (Phone, Tablet, iPad, PC):**
  - **Phone (320px–639px):** 1-column feed grid for maximum readability, full-width mobile search bar below header, stacked hero CTA cards with thumb-friendly full-width buttons (`w-full`), modals constrained to `max-h-[90dvh]` with smooth vertical scrolling.
  - **Tablet & iPad (640px–1023px):** 2 to 3 column card reflow (`sm:grid-cols-2 md:grid-cols-3`), inline navbar controls, side-by-side action cards.
  - **Desktop & PC (1024px+):** 4-column campus feed grid, top search pill, desktop navigation links, large display typography.
  - Touch targets minimum 44 px on all viewports without horizontal overflow.
- Respect `prefers-reduced-motion`. Keep animations short and subtle.
- Performance: use Astro's image handling, lazy load images, ship little JavaScript. Target Lighthouse 90+ on a phone profile.
- Friendly 404 and 500 pages. Favicon, page titles, and meta descriptions on every page.
- Consistent copy: short, plain, same wording for the same action everywhere.
- Form UX: inline errors next to the field, keep typed values after an error, disable submit while processing.
- Photos & Media:
  - **Upload Limit:** 1 to 3 photos allowed per report (accepts PNG, JPG, WebP up to 5 MB).
  - **Validation Rules:**
    - **Found Reports:** At least 1 photo is strictly required (min 1, max 3) to prevent unverified submissions.
    - **Lost Reports:** Photos are optional (0 to 3) since students may not possess reference pictures.
  - **Client Compression:** Auto-resizes high-resolution camera images to 1200px max and compresses to JPEG 0.85 via canvas for fast loading without quality loss.
  - **Slidable Feed Carousel:** Cards in "Latest on campus" display multi-image items with a slidable carousel (prev/next controls, touch swipe, position counter). Single photos display full card image; items with zero photos use colored tint illustrations.
