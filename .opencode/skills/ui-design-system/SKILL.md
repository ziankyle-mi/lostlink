---
name: UI Design System
description: Build or restyle ANY LostLink screen or component so it looks native. Use for every UI task - new pages, new components, new feature UI, modals, cards, tables, badges, forms, sidebars. Encodes the exact design language from the screenshots and the live code: real class recipes to copy, screen anatomy, spacing scale, copy voice, and an extension rule so a new feature matches with zero drift.
---

# LostLink UI design system

This is the design contract. Any new UI must be built from the recipes below.
The screenshots in `context/` decide how things look; `docs/rules.md` decides
how things behave. Do not redesign, do not "improve", do not invent. Extend.

## Step 0: Before writing any markup

1. Open the matching screenshot (map below). No screenshot for the new screen?
   Open the closest one and reuse its frame and rhythm.
2. Open the closest existing component (inventory below) and copy its class
   strings. The recipes in this skill are the same strings, collected.
3. Open `src/styles/global.css`. Tokens are the design. A raw hex means you
   missed a token or need a new one (ask the owner).

## Screenshot map

| File | Decides |
| --- | --- |
| `context/studdashboard.png` | The dashboard: ticker, navbar, filter pills, hero, card grid, footer |
| `context/dashboard.jpg` | Login/register: brand header, quote panel, white card, trust badges |
| `context/createnewacc.png` | Register: two-column, role pills, terms checkbox |
| `context/overview1admin.png` | Admin top: eyebrow date, "Overview", metric cards, claims table |
| `context/overview2admin.png` | Admin bottom: intake list, activity list, sidebar, lime callout |
| `context/original-nav-crop.png`, `nav-zoomed-8x.png` | Navbar brand lockup |
| `context/dlsau logo.*`, `lostlink-logo.jpg`, `lostlink-badge.png`, `favicon.svg` | Brand assets in `public/`. Never recolor |

## Tokens (single source: `src/styles/global.css`)

**Color**
| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#f5f1e6` | Page bg, warm cream. Also the "unread" tint in popovers |
| `surface`/`card-tint` | `#ffffff` | Cards, modals, inputs, tables |
| `ink`/`forest-900` | `#082e1a` | Body text, headings, toast bg, dark card text |
| `forest-700` | `#164f38` | Primary buttons, active pills, admin sidebar, ticker, focus ring, links |
| `forest-600` | `#17503a` | Hover variant |
| `lime` | `#d8ef8c` | Accent bg: LOST badge, active sidebar item, metric card 3, callout, avatar, CTA on dark |
| `sage-700` | `#413e39` | Secondary text |
| `sage-600`/`placeholder` | `#818181` | Placeholder, muted |
| `sage-400`/`line` | `#dadada` | Borders, dividers |
| `sage-200` | `#e3e9e0` | Tint fills |
| `danger` | `#9b2c1f` | Errors, remove-post, sign-out, unread dot |

Raw values that appear in code and are sanctioned (use exactly these, do not
invent new ones): `#ece5d6` (search pill + filter bar bg), `#134631` and
`#2d6e4f` (dark-surface borders on forest), `#24694b` (sidebar divider),
`#dcecd2` (ticker text), `#1e5c41` and `#c2dc6d` (action-card watermarks),
`#9fd4a8` (auth glow). Stone-300/400/500/600/900 Tailwind grays are used for
muted text and hairline borders on white cards.

**Type**
| Token | Use |
| --- | --- |
| `--font-sans` DM Sans | All UI text, body, buttons, labels |
| `--font-serif` Fraunces | Display headings, big numbers, the wordmark, the date on cards, watermarks |

Body minimum `0.9375rem`. Never sub-12px except tiny tags. Display headings use
serif + `font-black` + a clamp (see recipes). The wordmark is always serif with
"Link" italic: `Lost<span class="italic font-black">Link</span>`.

**Shape / depth**
| Token | Use |
| --- | --- |
| `rounded-card` 1.75rem | Big cards, modals, page panels |
| `rounded-control` 0.75rem | Inputs, buttons in forms |
| `rounded-full` | All pills, badges, avatars, search, filter bar (desktop) |
| `rounded-2xl` | Dropdown menus, popovers, sidebar nav items, ticker-adjacent panels |
| `rounded-3xl` | Metric cards, hero action cards, admin section cards |
| `rounded-xl` | Small chips, menu items, item icons |
| `shadow-card` | Elevated/hover card, auth white card |
| `shadow-2xs` | Resting card, pills, small controls |
| `shadow-xs` | Metric cards, badges |
| `shadow-xl` | Popovers, dropdowns, admin sidebar |

**Reusable component classes (already in global.css, use them):**
`.eyebrow`, `.label`, `.field`, `.btn-primary`, `.help-pill`, `.caption`,
`.notice`, `.field-error`, `.watermark`, `.skeleton-card`, `.skeleton-pulse`,
`.copy-ref-btn`, `.ll-toast`, `.animate-ticker`.

## Page frame (every page)

```
px-4 sm:px-10 lg:px-14            page gutter (auth pages)
mx-auto w-full max-w-7xl px-4 sm:px-10 lg:px-14   content width (dashboard/admin)
```
Body bg is `canvas`. Auth pages: `min-h-dvh flex flex-col`. Content pages sit
under `StudentNavbar` (student) or `AdminSidebar` (admin).

## Screen anatomy (what each screen is made of)

**Student dashboard (`/`)** — `StudentNavbar` > `FilterBar` > `HeroFeed` >
`DashboardGrid` > `DashboardFooter`, modals mounted at page root.

**Admin (`/admin`)** — ticker + `AdminSidebar` (fixed right column) > main:
eyebrow date + `Overview` serif heading + search + `AdminMetrics` > white
section cards (`ClaimsVerificationTable`, `IntakeQueue`, `RecentActivity`).

**Auth (`/login`, `/register`, ...)** — `AuthShell`: header (brand + help
pill) > `lg:grid-cols-2` (green quote panel + white card) > `SiteFooter`.

**Info (`/privacy`, `/terms`, `/help`)** — `InfoPage`: one centered
`max-w-3xl` white card, no green panel, smart back link.

**Item page (`/item/[id]`)** — standalone: gallery, badges, ref code, claim
form. Reuses card and modal recipes.

**Profile (`/profile`)** — account card + report/claim lists with status
badges and empty states.

## Recipes (copy these class strings verbatim)

### Ticker (top of student + admin pages)
```html
<div class="relative w-full overflow-hidden bg-[#164f38] py-2 sm:py-2.5 text-white">
  <div class="animate-ticker flex items-center whitespace-nowrap text-xs sm:text-[0.8125rem] font-medium tracking-wide text-[#dcecd2]">
    <span class="inline-flex items-center gap-4 sm:gap-5 px-6">
      <span>Message one</span>
      <span class="text-[9px] text-[#d8ef8c]" aria-hidden="true">▼</span>
      ...
    </span>
    <span class="inline-flex items-center gap-4 sm:gap-5 px-6" aria-hidden="true">...duplicate...</span>
  </div>
</div>
```
Duplicate the sequence once for the seamless marquee. Lime `▼` separators.

### Navbar
- Wrapper: `<header class="w-full bg-canvas border-b border-line/80">`
- Inner: `mx-auto max-w-7xl px-4 py-3.5 sm:px-10 sm:py-5 lg:px-14`
- Brand: badge img `size-9 sm:size-11 rounded-xl shadow-2xs` + serif wordmark
  `font-serif text-xl sm:text-[1.75rem] lg:text-[2.1rem] font-bold tracking-tight text-forest-900`
- Nav links: `text-[0.9375rem] font-semibold text-forest-900/80 hover:text-forest-900`
- Admin pill: `rounded-full bg-[#164f38] px-3.5 py-1 text-xs font-bold text-[#d8ef8c]` with a lime dot
- Search: `min-h-[3rem] rounded-full bg-[#ece5d6] pl-5 pr-11 focus:bg-white focus:ring-2 focus:ring-forest-700/25 shadow-2xs`, magnifier svg `absolute right-4 size-5`
- Bell: `size-10 sm:size-11 rounded-full border border-line bg-white shadow-2xs`, danger dot `size-2.5 rounded-full bg-[#9b2c1f]`
- Post button: `min-h-11 rounded-full bg-forest-700 px-6 text-[0.9375rem] font-bold text-white hover:bg-forest-900 active:scale-95`
- Avatar: `size-10 sm:size-11 rounded-full bg-[#d8ef8c] border border-lime-600/30 font-black text-forest-900`
- Popovers/dropdowns: `absolute right-0 top-14 w-64/w-80 rounded-2xl border border-line bg-white p-4 shadow-xl`

### Filter bar
```html
<div class="relative flex flex-wrap items-center justify-between gap-2.5 rounded-2xl sm:rounded-full bg-[#ece5d6] p-2 sm:p-2.5 shadow-2xs border border-stone-300/50">
```
- Active pill: `filter-type-btn min-h-11 rounded-full bg-forest-700 px-4 sm:px-6 py-2 text-[0.9375rem] font-bold text-white shadow-2xs`
- Inactive pill: `min-h-11 rounded-full px-4.5 sm:px-5 py-2 font-semibold text-forest-900/80 hover:bg-white/40 hover:text-forest-900`
- Dropdown pill: `min-h-11 rounded-full border border-stone-200/90 bg-white px-4.5 sm:px-5 py-2 font-semibold text-forest-900 shadow-2xs hover:bg-stone-50` + chevron `size-3.5`
- Dropdown menu: `absolute left-0 top-13 z-40 min-w-[210px] rounded-2xl border border-line bg-white p-2 shadow-xl`, items `rounded-xl px-3.5 py-2.5 text-sm font-medium hover:bg-[#f5f1e6]`

### Hero (eyebrow + display heading + sub)
```html
<p class="text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-forest-900/70">CAMPUS FEED</p>
<h1 class="mt-2 font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[5.5rem] font-black tracking-tight text-forest-900 leading-[1.03]">Lost<span class="italic font-serif font-black">&</span>Found</h1>
<p class="mx-auto mt-3 sm:mt-4 max-w-lg text-sm sm:text-lg md:text-xl leading-relaxed text-forest-900/80">Sub line.</p>
```
Smaller section headings use
`font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-black text-forest-900 leading-tight`.

### Hero action cards (pair, dark + lime)
```html
<div class="relative overflow-hidden rounded-3xl bg-[#164f38] p-6 sm:p-10 lg:p-12 text-white shadow-sm flex flex-col justify-between min-h-[280px] sm:min-h-[340px]">
  <ActionCardsWatermark class="absolute -right-6 -top-6 h-[125%] w-auto max-w-[50%] pointer-events-none select-none text-[#1e5c41] opacity-60" />
  <span class="inline-flex items-center rounded-full border border-white/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">I FOUND SOMETHING</span>
  <h2 class="mt-4 sm:mt-5 font-serif text-2xl sm:text-4xl lg:text-[2.65rem] font-bold leading-tight">Found an item?<br><span class="text-[#d8ef8c]">Post it here.</span></h2>
  <p class="mt-2.5 max-w-sm text-base lg:text-[1.0625rem] text-white/80 leading-relaxed">...</p>
  <button class="inline-flex min-h-[3.25rem] items-center gap-2 rounded-full bg-[#d8ef8c] px-6 py-3 font-bold text-forest-900 hover:bg-[#c9e376] active:scale-95 w-full sm:w-auto">Post a found item <span aria-hidden="true">→</span></button>
</div>
```
Lime twin: swap to `bg-[#d8ef8c] text-forest-900`, watermark `text-[#c2dc6d] opacity-55`,
eyebrow `border-forest-900/30`, CTA `bg-forest-700 text-white hover:bg-forest-900`.
CTA on lime uses `bg-forest-700 text-white`; CTA on forest uses `bg-[#d8ef8c] text-forest-900`.

### Item card (the workhorse)
```html
<article class="item-card group relative flex flex-col justify-between overflow-hidden rounded-card border border-line/80 bg-white shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-card cursor-pointer">
  <div class="relative flex h-48 sm:h-52 lg:h-56 w-full items-center justify-center overflow-hidden" style="background-color: {tint};">
    <!-- status badge -->
    <span class="absolute left-4 top-4 z-20 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-forest-700 text-white shadow-xs">FOUND</span>
    <!-- or LOST: bg-[#d8ef8c] text-forest-900 border border-lime-600/30 -->
    <!-- photo or ItemIllustration when no photo -->
  </div>
  <div class="flex flex-1 flex-col justify-between bg-white p-5 sm:p-6">
    <p class="text-xs font-bold uppercase tracking-wider text-stone-500">{category}</p>
    <h3 class="mt-1 text-base sm:text-lg lg:text-xl font-bold tracking-tight text-forest-900 line-clamp-1">{name}</h3>
    <div class="mt-5 flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-medium leading-none text-stone-400">{prefix}</p>
        <p class="mt-1.5 text-sm sm:text-base font-bold text-forest-900 line-clamp-1">{location}</p>
      </div>
      <p class="font-serif text-xl sm:text-2xl font-black leading-none text-forest-900">{date}</p>
    </div>
    <a href="/item/{id}" class="mt-4 flex items-center justify-between border-t border-line/60 pt-4 text-sm font-bold text-forest-900 group-hover:text-forest-700">
      <span>{actionLabel}</span><span class="transition-transform group-hover:translate-x-1.5" aria-hidden="true">→</span>
    </a>
  </div>
</article>
```
Grid: `grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6 lg:gap-7`.
Photo slider when 1–3 images (`.card-slider` / `.slider-track`, prev/next
`size-8 rounded-full bg-black/60 text-white`); zero photos → tinted
`ItemIllustration`.

### Section card (white panel on canvas — admin, profile, item page)
```html
<section class="rounded-3xl bg-white border border-stone-200/60 shadow-xs p-6 sm:p-8">
  <h2 class="font-serif text-2xl sm:text-3xl font-black text-forest-900 leading-tight">Heading</h2>
  <p class="mt-1 text-sm text-stone-500">Sub line.</p>
  <!-- content -->
</section>
```
Top-right text link: `text-sm font-bold text-forest-900 underline underline-offset-4 hover:text-forest-700`.

### Metric card (admin KPI row)
```html
<div class="rounded-3xl bg-white p-6 sm:p-7 border border-stone-200/60 shadow-xs flex flex-col justify-between">
  <p class="text-sm font-medium text-stone-600">Label</p>
  <div class="mt-4">
    <p class="font-serif text-4xl sm:text-5xl font-black text-forest-900 tracking-tight leading-none">128</p>
    <p class="mt-3 text-xs text-stone-500 font-medium">+12 this week</p>
  </div>
</div>
```
Card 3 lime: `bg-[#d8ef8c] text-forest-900`, label `font-bold`, note `text-forest-800 font-semibold`.
Card 4 dark: `bg-[#164f38] text-white`, label `text-stone-200`, note `text-stone-200`.
Row: `grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5`.

### Admin sidebar (dark green rail)
```html
<aside class="w-full lg:w-[20.5rem] shrink-0 rounded-[2rem] bg-[#164f38] p-6 sm:p-7 text-white shadow-xl flex flex-col justify-between">
```
- Brand block + divider `border-b border-[#24694b] pb-6`
- Console pill: `rounded-full border border-[#2d6e4f] bg-[#134631] px-3.5 py-1 text-[10px] font-black tracking-[0.2em] uppercase text-[#d8ef8c]`
- Nav item: `flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold`
  - active: `bg-[#d8ef8c] text-[#164f38]`
  - idle: `text-white/85 hover:bg-white/10 hover:text-white`
- Count badge: `rounded-full bg-[#d8ef8c] size-6 text-xs font-black text-[#164f38]` (or plain `text-xs font-semibold text-stone-300`)
- Lime callout: `rounded-2xl bg-[#d8ef8c] p-5 text-forest-900` + underlined link
- User chip: `rounded-2xl bg-white/10 p-4` with lime avatar `size-11 rounded-full bg-[#d8ef8c] text-forest-900 font-black`, role name `font-black`, action `text-xs text-white/70 hover:text-white`

### Table row (claims, inventory, activity)
```html
<div class="flex items-center gap-4 border-b border-stone-200/70 py-4 last:border-0">
  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2e3] text-forest-900">{icon svg size-5}</div>
  <div class="min-w-0 flex-1">
    <p class="truncate text-sm font-bold text-forest-900">{title}</p>
    <p class="truncate text-xs text-stone-500">{sub}</p>
  </div>
  <div class="hidden sm:block">{status chip}</div>
  <a href="..." class="shrink-0 text-sm font-bold text-forest-900 underline underline-offset-4 hover:text-forest-700">Review →</a>
</div>
```
Icon tile bg alternatives seen in code: `bg-[#eef2e3]` (sage), `bg-[#f5f1e6]`
(cream), `bg-stone-100`. Pick one and stay consistent within a table.

### Status / type chips
- FOUND badge: `rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-forest-700 text-white shadow-xs`
- LOST badge: same but `bg-[#d8ef8c] text-forest-900 border border-lime-600/30`
- Status chip (pending/awaiting): `rounded-full bg-[#ece5d6] px-3 py-1 text-xs font-bold text-forest-900`
- Status chip (attention/office): `rounded-full bg-[#d8ef8c] px-3 py-1 text-xs font-bold text-forest-900`
- Status chip (claimed/done, dark): `rounded-full bg-[#164f38] px-3 py-1 text-xs font-bold text-[#d8ef8c]`
- Status text style (bold forest label + muted timestamp under):
  `<p class="text-sm font-bold text-forest-900">At the office now</p><p class="text-xs text-stone-500">Today, 2:10 PM</p>`

### Buttons
- Primary form: `.btn-primary` (already styled).
- Pill CTA (dark): `inline-flex min-h-11 items-center gap-2 rounded-full bg-forest-700 px-6 py-2.5 font-bold text-white hover:bg-forest-900 active:scale-95 shadow-2xs`
- Pill CTA (lime): same but `bg-[#d8ef8c] text-forest-900 hover:bg-[#c9e376]`
- Lime action (confirm/intake): `rounded-full bg-[#d8ef8c] px-4 py-2 text-sm font-bold text-forest-900 border border-lime-600/40 hover:bg-[#c9e376] active:scale-95`
- Quiet text link: `text-sm font-bold text-forest-900 underline underline-offset-4 hover:text-forest-700`
- Destructive: `bg-[#9b2c1f]/10 text-[#9b2c1f] hover:bg-[#9b2c1f]/20` (rose family for admin remove)
- All interactive: `active:scale-95` or `active:scale-96`, `transition-all`/`transition-colors`, `cursor-pointer`.

### Forms
`.label` + `.field` + `.field-error`. Search/inline inputs use the pill style
above instead of `.field`. Password field with toggle: `PasswordField.astro`.
Submit: `SubmitButton.astro` (spinner swap, `aria-busy`). Modals:
`ReportModal.astro` (form in modal, `max-h-[90dvh] overflow-y-auto`).

### Modal shell
```html
<div class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
  <div role="dialog" aria-modal="true" class="relative w-full max-w-lg rounded-card border border-line bg-white p-6 sm:p-8 shadow-card max-h-[90dvh] overflow-y-auto">
```
Destructive modal uses rose accents and a confirmation step.

### Empty / loading / toast
- Empty: centered, small serif or bold sans title + muted sub + optional
  clear-filters/CTA. See empty states in feed/profile.
- Skeletons: `.skeleton-card` wrapper + `.skeleton-pulse` blocks mirroring the
  real card's shape (image `h-48 sm:h-52 lg:h-56`, then text bars).
- Toasts: `.ll-toast` system in global.css; icons lime (success), red (error),
  blue (info). `aria-live="polite"`.

### Footer
`DashboardFooter` (student pages): thin, canvas bg, `border-t`, serif
copyright left, Privacy/Terms/Help links right. `SiteFooter` (auth/info) is the
taller variant. Reuse the one that matches the page family.

## The extension rule (how to add a new feature with zero drift)

When a feature needs UI that does not exist:

1. **Classify the surface.** Is it a card, a list/table, a form, a modal, a
   sidebar panel, a metric, or a badge? Find that recipe above.
2. **Reuse the recipe's frame.** Same radius family, same padding, same border,
   same shadow. Change only content and the minimum layout the feature needs.
3. **Compose from existing parts.** New admin widget? Start from the section
   card + table row + chip recipes. New student widget? Start from the item
   card + filter pill recipes.
4. **Tokens only.** Every color, size, and radius is a token or a sanctioned
   raw value from the list. If you need something new, stop and ask.
5. **Match the voice.** Short, plain, sentence case, no emoji, no exclamation
   marks, no Title Case on buttons except the ticker's all-caps messages.
   Same wording everywhere: "Post an item", "Report Lost Item", "Claim this
   item", "Review", "Confirm received".
6. **Scale to the benchmark.** The login page sets the sizing standard. Controls
   `min-h-[3rem]`–`min-h-[3.5rem]`, pills `min-h-[2.5rem]`–`min-h-[3.25rem]`,
   card padding `p-5`–`p-10` by importance, gutters `px-4 sm:px-10 lg:px-14`.
   Big numbers and headings are serif and large; never shrink them to "fit".
7. **Mobile first.** Base classes, then `sm:`, `md:`, `lg:`. Grids: 1 → 2 → 3 → 4
   columns. Modals `max-h-[90dvh] overflow-y-auto`. No horizontal overflow at
   320px. Touch targets >= 44px.
8. **Every async surface gets states.** Loading (skeleton or button spinner),
   empty (title + sub), error (`.field-error` or toast), success (toast +
   inline confirmation).

## Hard do-not list

- No gradients on buttons/cards, no sheen sweeps, no float-up hover, no glow
  rings. Owner flagged these as AI-ish. Hover = flat darken or lift, press =
  `scale(0.95)`.
- No frosted glass except the existing modal backdrop.
- No emoji as icon or decoration. Icons are inlined Lucide SVGs (`Icon.astro`).
- No new colors, fonts, radii, or shadows without the owner.
- No two shadows on one element.
- No hardcoded demo numbers; derive from data (`~/data/mockItems` or Supabase).
- No redesigning an existing screen while adding a feature. Scope discipline.
- No sub-12px text. No cramped `p-4` on a hero surface.
- Buttons are never bare text for a primary action; primary actions are pills
  or `.btn-primary`.

## Done check for any UI change

1. Screenshot side-by-side: your screen vs the reference. Same frame, rhythm,
   tokens, voice.
2. `npm run check` clean, `npm test` green.
3. Keyboard: tab order logical, focus ring visible, Escape closes modals,
   focus returns on close.
4. Viewports 375 / 768 / 1280 clean, no overflow, targets >= 44px.
5. States present: loading, empty, error, success.
6. Report which screenshot you matched and which recipes/tokens you reused.
