// Shared photo-slider behavior for `.card-slider` elements (feed cards and the
// item-detail gallery). Handles:
//   - cursor-side arrow reveal (hover-capable pointers only; CSS in global.css)
//   - mouse drag-to-swipe with the track following the cursor
//   - touch swipe (same 35px horizontal threshold as before)
//   - delegated prev/next button clicks (capture phase, so a click on an arrow
//     never reaches a card's open-modal handler)
//
// Slide state lives on the element as `data-current-idx`; the track transform
// and `.current-slide-idx` badge are kept in sync by `setSlide`.

const DRAG_START_PX = 8;
const DRAG_COMMIT_PX = 48;
const TOUCH_COMMIT_PX = 35;

function trackOf(slider: Element): HTMLElement | null {
  return slider.querySelector<HTMLElement>(".slider-track");
}

function slideCount(slider: HTMLElement): number {
  return parseInt(slider.dataset.imagesCount || "1", 10) || 1;
}

function currentIndex(slider: HTMLElement): number {
  return parseInt(slider.dataset.currentIdx || "0", 10) || 0;
}

/** Move to an absolute slide (wraps around), sync track + badge, notify. */
export function setSlide(slider: HTMLElement, index: number): void {
  const count = slideCount(slider);
  const normalized = ((index % count) + count) % count;
  slider.dataset.currentIdx = String(normalized);
  const track = trackOf(slider);
  if (track) track.style.transform = `translateX(-${normalized * 100}%)`;
  const badge = slider.querySelector(".current-slide-idx");
  if (badge) badge.textContent = String(normalized + 1);
  slider.dispatchEvent(new CustomEvent("ll:slide", { detail: { index: normalized } }));
}

/** Move by ±1 slide (wraps around). */
export function stepSlider(slider: HTMLElement, direction: 1 | -1): void {
  const next = currentIndex(slider) + direction;
  const count = slideCount(slider);
  setSlide(slider, ((next % count) + count) % count);
}

function bindMouseDrag(slider: HTMLElement): void {
  if (slideCount(slider) < 2) return;

  slider.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    // Arrow buttons manage their own clicks.
    if ((e.target as Element).closest(".slider-prev, .slider-next")) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let horizontal = false;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!horizontal) {
        // Vertical intent (page scroll) cancels the drag entirely.
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > DRAG_START_PX) {
          cleanup();
          return;
        }
        if (Math.abs(dx) < DRAG_START_PX) return;
        horizontal = true;
        slider.classList.add("is-dragging", "select-none");
      }
      const track = trackOf(slider);
      if (track) {
        track.style.transform = `translateX(calc(-${currentIndex(slider) * 100}% + ${dx}px))`;
      }
    };

    const onUp = (upEvent: MouseEvent) => {
      cleanup();
      if (!horizontal) return;
      slider.classList.remove("is-dragging", "select-none");
      // A drag (not a click) just ended: let page click handlers know to skip
      // their default action (e.g. the feed card opening its detail modal).
      slider.dataset.dragJustEnded = "1";
      setTimeout(() => {
        delete slider.dataset.dragJustEnded;
      }, 0);
      const dx = upEvent.clientX - startX;
      if (Math.abs(dx) >= DRAG_COMMIT_PX) {
        stepSlider(slider, dx < 0 ? 1 : -1);
      } else {
        setSlide(slider, currentIndex(slider)); // snap back
      }
    };

    function cleanup() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  // Touch swipe (passive; same behavior as the old index.astro handlers).
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  slider.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );

  slider.addEventListener(
    "touchend",
    (e) => {
      if (!touchActive) return;
      touchActive = false;
      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(diffX) > TOUCH_COMMIT_PX && Math.abs(diffX) > Math.abs(diffY)) {
        stepSlider(slider, diffX < 0 ? 1 : -1);
      }
    },
    { passive: true },
  );
}

/** Wire up one slider. Idempotent — safe to call on every slider after DOM changes. */
export function initCardSlider(slider: HTMLElement | null): void {
  if (!slider || slider.dataset.llSliderInit === "1") return;
  slider.dataset.llSliderInit = "1";

  // Cursor-side reveal: mark which half the pointer is over so CSS can show
  // only the matching arrow (see global.css).
  slider.addEventListener("mousemove", (e) => {
    const rect = slider.getBoundingClientRect();
    slider.dataset.side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";
  });
  slider.addEventListener("mouseleave", () => {
    delete slider.dataset.side;
  });

  bindMouseDrag(slider);
  ensureButtonDelegation();
}

/** Wire up every slider under `root` (default: whole document). */
export function initAllCardSliders(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".card-slider").forEach(initCardSlider);
}

let buttonDelegationBound = false;

/**
 * Capture-phase document listener for prev/next buttons, registered once.
 * Capture + stopPropagation keeps a button click from bubbling into card
 * handlers (matching the old index.astro behavior).
 */
function ensureButtonDelegation(): void {
  if (buttonDelegationBound || typeof document === "undefined") return;
  buttonDelegationBound = true;
  document.addEventListener(
    "click",
    (e) => {
      const btn = (e.target as Element | null)?.closest?.(".slider-prev, .slider-next");
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      const slider = btn.closest(".card-slider") as HTMLElement | null;
      if (slider) stepSlider(slider, btn.classList.contains("slider-prev") ? -1 : 1);
    },
    true,
  );
}
