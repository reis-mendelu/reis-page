# Screenshot Lightbox — Design

**Date:** 2026-06-16
**Status:** Approved (design)
**File touched:** `index.html` (single-file static site, custom DC component framework)

## Problem

The tutorial step screenshots render inline at card width (`index.html:210`). On a
laptop and especially on phones they are small, and the user cannot get a closer
look at the UI detail they illustrate. We want clicking a screenshot to enlarge
it — "large, but without breaking the user's mental workflow," i.e. the user must
stay on the same page and return to exactly where they were.

## Approach (and why)

A **click-to-open lightbox overlay**, chosen over native fullscreen and
open-in-new-tab. Research basis:

- **Preserves context.** NN/G's overlay analysis: overlays work best for
  *user-initiated* actions that "maintain the context of the current screen."
  The user clicks, sees the enlarged image on top of the paused page, and
  dismisses back to the same scroll position. Fullscreen (OS takeover) and
  new-tab (navigation) both break that continuity.
- **Backdrop dim, not pitch black.** An *extremely* dark backdrop makes users
  feel they navigated away. Use a strong-but-partial dim (~80%) plus a subtle
  blur so it clearly reads as "page paused, still here."
- **Dismissal: offer all three, don't rely on backdrop-click alone.** NN/G warns
  users should not be expected to *assume* clicking outside closes the overlay.
  Provide an explicit × button and Esc as the obvious exits, with backdrop-click
  as a bonus.
- **Mobile is where lightboxes fail** — pinch-zoom commonly makes the page behind
  drift. We avoid that class of bug by scoping mobile to fit-to-screen only and
  locking body scroll while open.

## Behavior spec

### Trigger
- Clicking any tutorial step screenshot (`<img>` at `index.html:210`) opens the
  lightbox for that image.
- On hover (desktop) the image shows a zoom/pointer cursor so the affordance is
  discoverable.

### Maximized view
- The screenshot scales to **~90% of the viewport** (both width and height),
  preserving aspect ratio, **capped at the image's natural resolution** so it
  never upscales into blur.
- Centered on a dimmed backdrop. The page stays mounted underneath — no
  navigation, no scroll jump.

### Backdrop
- ~80% dark (`rgba(0,0,0,.8)` range) with a subtle `backdrop-filter: blur`.
- Reads clearly as an overlay over the paused page, not a new page.

### Dismiss (all three return to the same scroll position)
1. **× close button**, top-right, always on-screen.
2. **Esc** key.
3. **Click on the dimmed backdrop** (clicking the image itself does not close).
- Body scroll is **locked** while the lightbox is open and **restored** on close,
  so the page does not drift behind the overlay.

### Mobile (phones)
- The lightbox **does** work on phones: the screenshot enlarges to fill the phone
  screen — substantially larger than the inline card thumbnail.
- **Fit-to-screen only** — no pinch-to-zoom-beyond-fit (deliberately excluded to
  avoid the page-drift bug class and extra dependencies).
- × close button stays on-screen; body scroll locked.

### Scope
- Applies to all tutorial step screenshots (desktop + phone sets) since all
  benefit from a closer look.

## Implementation notes (fits existing DC framework)

The component is a single `DCLogic` class in `index.html` with state via
`setState`, handlers exposed from `renderVals()`, conditional blocks via `sc-if`,
and lists via `sc-for`. The lightbox slots into these patterns with **no new
dependencies**:

1. **State:** add `lightbox: null` to `state` (holds the src of the open image,
   or `null` when closed).
2. **Open handler:** in the `tutSteps` map (`index.html:605`), give each step an
   `openShot: () => this.openLightbox(path)` and wire it to the `<img>` via
   `onClick`. Add the zoom cursor to the image style.
3. **Close handler:** `closeLightbox()` sets `lightbox: null`. Wire to × button,
   backdrop click, and an Esc key listener (added on open, removed on close).
4. **Overlay markup:** an `sc-if value="{{ hasLightbox }}"` block rendering the
   backdrop + centered `<img>` + × button, with the sizing/backdrop styles above.
5. **Scroll lock:** toggle `document.body` overflow (or equivalent) in
   open/close.

## Out of scope (YAGNI)

- Pinch-to-zoom beyond fit-to-screen.
- Next/prev navigation between screenshots inside the lightbox.
- Captions, zoom controls, thumbnails strip, slideshow.
- Animated open/close beyond a minimal fade (kept minimal; respect reduced-motion
  if added).

## Testing

- Desktop: click each screenshot → enlarges centered, dimmed backdrop; Esc,
  ×, and backdrop-click each close and restore scroll position. Clicking the
  image does not close.
- Large image: never upscales past natural resolution (no blur).
- Phone viewport: screenshot enlarges to fill screen; page behind does not drift;
  × reachable; close restores position.
- Keyboard: Esc closes; focus is not lost behind the overlay.
