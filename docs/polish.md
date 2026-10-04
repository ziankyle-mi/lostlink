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

- One design system. Define color, spacing, radius, and type tokens once and reuse them.
- Every screen has a loading state (skeletons for lists), an empty state, an error state, and success feedback.
- Accessibility to WCAG 2.2 AA: real labels on all fields, visible focus rings, full keyboard use, color contrast, alt text on item photos, `aria-live` for toasts.
- Mobile first. Responsive from 360 px wide up. Touch targets at least 44 px.
- Respect `prefers-reduced-motion`. Keep animations short and subtle.
- Performance: use Astro's image handling, lazy load images, ship little JavaScript. Target Lighthouse 90+ on a phone profile.
- Friendly 404 and 500 pages. Favicon, page titles, and meta descriptions on every page.
- Consistent copy: short, plain, same wording for the same action everywhere.
- Form UX: inline errors next to the field, keep typed values after an error, disable submit while processing.
- Photos: accept JPG, PNG, WebP up to 5 MB. Resize on upload.
