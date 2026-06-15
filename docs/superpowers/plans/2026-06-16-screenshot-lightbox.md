# Screenshot Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking any tutorial step screenshot opens it enlarged in a dismissible lightbox overlay that keeps the user on the same page.

**Architecture:** The site is a single `index.html` driven by a custom DC component framework that compiles the `<x-dc>` template to React (via `support.js`). We add a `lightbox` state field holding the open image's src, an `openLightbox`/`closeLightbox` method pair (with body-scroll lock and an Esc key listener), per-step `openShot` click handlers, and a `position:fixed` overlay rendered with an `sc-if` block. No new dependencies.

**Tech Stack:** HTML + custom DC framework (React under the hood) in `support.js`, plain inline CSS. No JS test runner exists; this is a static single-page site, so verification is behavioral in a browser, not unit tests.

---

## File Structure

- **Modify:** `index.html`
  - `state = { ... }` (line ~240): add `lightbox: null`.
  - Class methods (near `restart()`, line ~424): add `openLightbox(src)` and `closeLightbox()`.
  - `renderVals()` return object (line ~555): expose `hasLightbox`, `lightboxImg`, `closeLightbox`.
  - `tutSteps` map (line ~605-622): append `;cursor:zoom-in` to the visible `imgStyle` branches and add `openShot` to each step object.
  - Step `<img>` (line ~210): add `onClick="{{ step.openShot }}"`.
  - New overlay markup: an `sc-if` block placed just before the `</div>` that closes `.reis-col` (line ~235).

There is one file. Keep all edits within it, matching the existing inline-style convention.

---

### Task 1: Add lightbox state and open/close methods

**Files:**
- Modify: `index.html` (state line ~240, methods near line ~424)

- [ ] **Step 1: Add the `lightbox` state field**

Find (line ~240):

```javascript
  state = { lang: 'cs', device: null, browser: null, shots: {}, dims: {} };
```

Replace with:

```javascript
  state = { lang: 'cs', device: null, browser: null, shots: {}, dims: {}, lightbox: null };
```

- [ ] **Step 2: Add `openLightbox` and `closeLightbox` methods**

Find the `restart()` method (line ~424):

```javascript
  restart() { this.setState({ device: null, browser: null }); }
```

Insert immediately AFTER it:

```javascript

  openLightbox(src) {
    if (!src) return;
    this.setState({ lightbox: src });
    document.body.style.overflow = 'hidden';
    this._onLightboxKey = (e) => { if (e.key === 'Escape') this.closeLightbox(); };
    document.addEventListener('keydown', this._onLightboxKey);
  }

  closeLightbox() {
    if (!this.state.lightbox) return;
    this.setState({ lightbox: null });
    document.body.style.overflow = '';
    if (this._onLightboxKey) {
      document.removeEventListener('keydown', this._onLightboxKey);
      this._onLightboxKey = null;
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add lightbox state and open/close methods"
```

---

### Task 2: Expose lightbox values and per-step open handler in renderVals

**Files:**
- Modify: `index.html` (`renderVals()` lines ~555-622)

- [ ] **Step 1: Add the `cursor:zoom-in` affordance to visible images**

Find (line ~611-615):

```javascript
        const imgStyle = has
          ? (portrait
              ? 'max-width:220px;width:100%;height:auto;display:block;border-radius:12px;margin:0 auto'
              : 'width:100%;height:auto;display:block;border-radius:12px')
          : 'display:none';
```

Replace with:

```javascript
        const imgStyle = has
          ? (portrait
              ? 'max-width:220px;width:100%;height:auto;display:block;border-radius:12px;margin:0 auto;cursor:zoom-in'
              : 'width:100%;height:auto;display:block;border-radius:12px;cursor:zoom-in')
          : 'display:none';
```

- [ ] **Step 2: Add `openShot` to each step object**

Find (line ~621):

```javascript
        return { n: String(i + 1), text: s, img: has ? path : '', imgStyle, containerStyle, placeholderStyle, dotStyle };
```

Replace with:

```javascript
        return { n: String(i + 1), text: s, img: has ? path : '', imgStyle, containerStyle, placeholderStyle, dotStyle, openShot: () => this.openLightbox(has ? path : '') };
```

- [ ] **Step 3: Expose lightbox values and close handler in the renderVals return object**

Find (line ~624-626):

```javascript
      hasStore, noStore: !hasStore,
      storeUrl: hasStore ? this.STORE[browser] : '#',
      hasNote, noNote: !hasNote
```

Replace with:

```javascript
      hasStore, noStore: !hasStore,
      storeUrl: hasStore ? this.STORE[browser] : '#',
      hasNote, noNote: !hasNote,
      hasLightbox: !!this.state.lightbox,
      lightboxImg: this.state.lightbox || '',
      closeLightbox: () => this.closeLightbox()
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: wire per-step open handler and lightbox values into renderVals"
```

---

### Task 3: Add the image click handler and overlay markup

**Files:**
- Modify: `index.html` (step `<img>` line ~210, overlay before line ~235)

- [ ] **Step 1: Make the step image open the lightbox on click**

Find (line ~210):

```html
                <img src="{{ step.img }}" style="{{ step.imgStyle }}" alt="" loading="lazy">
```

Replace with:

```html
                <img src="{{ step.img }}" style="{{ step.imgStyle }}" alt="" loading="lazy" onClick="{{ step.openShot }}">
```

- [ ] **Step 2: Add the lightbox overlay block**

Find the closing of the footer and the `.reis-col` div (line ~231-235):

```html
    <!-- FOOTER -->
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.07);text-align:center">
      <div style="font-family:var(--font-ui);font-weight:600;font-size:13px;color:var(--content-secondary)">{{ t.footer }}</div>
    </div>

  </div>
```

Replace with (inserts the overlay between the footer and the `.reis-col` close):

```html
    <!-- FOOTER -->
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.07);text-align:center">
      <div style="font-family:var(--font-ui);font-weight:600;font-size:13px;color:var(--content-secondary)">{{ t.footer }}</div>
    </div>

    <!-- LIGHTBOX OVERLAY -->
    <sc-if value="{{ hasLightbox }}" hint-placeholder-val="{{ false }}">
      <div style="position:fixed;inset:0;z-index:1000">
        <div onClick="{{ closeLightbox }}" style="position:absolute;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:5vmin;pointer-events:none">
          <img src="{{ lightboxImg }}" alt="" style="max-width:90vw;max-height:90vh;width:auto;height:auto;border-radius:12px;box-shadow:0 16px 50px rgba(0,0,0,.55);pointer-events:auto">
        </div>
        <button onClick="{{ closeLightbox }}" aria-label="Close" style="position:fixed;top:16px;right:16px;width:40px;height:40px;border-radius:9999px;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1001">×</button>
      </div>
    </sc-if>

  </div>
```

**Why this structure:** the dimmed backdrop is its own absolute layer carrying the close handler. The image sits in a separate centering layer with `pointer-events:none`, while the image itself re-enables `pointer-events:auto`. Result: clicking the image does nothing (no handler, no bubbling to the backdrop), while clicking anywhere around it passes through to the backdrop and closes — satisfying "image-click does not close, backdrop-click closes" without needing `stopPropagation`. The × button sits above everything with its own close handler.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add click-to-open screenshot lightbox overlay"
```

---

### Task 4: Browser verification (desktop)

**Files:** none (behavioral verification)

- [ ] **Step 1: Serve the site locally**

Run from the repo root:

```bash
python3 -m http.server 8000
```

Expected: `Serving HTTP on :: port 8000`. Leave it running (background).

- [ ] **Step 2: Open and drive the page**

Navigate a browser to `http://localhost:8000/`. Then:
1. Click the **Počítač** (desktop) device card.
2. Click the **Chrome** browser card (it has real screenshots: `screenshots/desktop-chrome-1..3.png`).
3. Confirm the tutorial step screenshots render inline, and each shows a **zoom-in cursor** on hover.

- [ ] **Step 3: Verify the lightbox behavior**

Check each of these, one at a time:
- Click a screenshot → it opens **enlarged and centered** on a **dark, blurred backdrop**; the page does not scroll-jump.
- The enlarged image is at most ~90% of the viewport and is **not upscaled past its natural resolution** (no blur on `desktop-chrome-1.png`, which is 2880px wide — it will be viewport-bound, sharp).
- **Click the image itself** → it does **not** close.
- **Click the dark area** around the image → it **closes**, returning to the same scroll position.
- Reopen, press **Esc** → it closes.
- Reopen, click the **× button** (top-right) → it closes.
- While open, confirm the page **behind does not scroll** (body scroll locked); after closing, the page scrolls normally again.

Expected: all behaviors pass. If clicking the image closes the lightbox, the `pointer-events` layering in Task 3 Step 2 was altered — re-check it.

- [ ] **Step 4: No code change — nothing to commit**

This task is verification only.

---

### Task 5: Browser verification (mobile / small phone)

**Files:** none (behavioral verification)

- [ ] **Step 1: Switch to a phone viewport**

With the local server still running and the browser on `http://localhost:8000/`, set the viewport to a small phone size (e.g. 390×844, iPhone-class) using the browser's device toolbar or a window resize.

- [ ] **Step 2: Drive the phone tutorial**

1. Click the **Telefon** (phone) device card.
2. Click the **Firefox** browser card (it has real screenshots: `screenshots/phone-firefox-1..3.png`).
3. Confirm the (portrait) screenshots render inline in the card.

- [ ] **Step 3: Verify phone lightbox behavior**

- Tap a screenshot → it **enlarges to fill the phone screen** (noticeably larger than the inline thumbnail), centered on the dark backdrop.
- The **× button stays on-screen** (top-right).
- The page **behind does not drift/scroll** while the lightbox is open.
- Tap the dark area → closes and returns to the same position; tap ×  → closes.
- Confirm there is **no pinch-to-zoom beyond fit** (intentionally out of scope) and that the absence does not break panning of the page after close.

Expected: all behaviors pass.

- [ ] **Step 4: Stop the local server**

Stop the `python3 -m http.server 8000` process.

- [ ] **Step 5: No code change — nothing to commit**

This task is verification only.

---

## Notes for the implementer

- **One file, React under the hood.** `onClick="{{ handler }}"` maps to a React `onClick` prop (`support.js` line ~300), so it works on `<img>`, `<div>`, and `<button>` alike. `setState` re-renders the component subtree; the `document.body` scroll lock and the `keydown` listener live outside React and are managed imperatively in the open/close methods.
- **Why no unit tests:** there is no JS test runner in this repo and the DC component is not exported for isolated testing. Verification is behavioral, per Tasks 4-5, which is the honest test surface for this static site.
- **Deploy:** pushing to `main` auto-deploys (GitHub → Vercel); no manual deploy step.
