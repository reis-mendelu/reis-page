# Android tester onboarding on reis-navod.cz

**Status:** approved 2026-09-16, not yet implemented.
**Blocked until:** 2026-09-18 12:03 UTC — see "Timing gate".

## Goal

A student who wants reIS on Android can become a Play closed-test tester from
reis-navod.cz in two taps, with no involvement from us. An Instagram post links to it
with "link in bio".

## The decision: no subpage

Dominik first asked for a subpage. We are **not** building one, because the page already
has an Android branch and it is currently a dead end:

```js
'phone-android':  { cs: { title: 'reIS pro Android', cta: 'Připravujeme',
                          note: 'Na aplikaci pro Android pracujeme…', steps: [] } }
'tablet-android': { …identical… }
STORE = { …, android: null }
```

A subpage would leave that dead end in place and split the funnel. Filling it *is* the
reis-navod pattern, and it means every Android visitor — not just people arriving from
Instagram — gets the right answer.

## What the user does (the flow being documented)

1. Join `https://groups.google.com/g/reis-testers` — a Google Group, "anyone can join",
   no approval needed.
2. Open `https://play.google.com/apps/testing/cz.reis.app` → "Become a tester".
3. Install reIS from Play and sign in with the university account.

**The failure mode that must be in `note`:** both steps must use the *same* Google
account — the one signed into the Play Store on the phone. Otherwise step 2 reports
"you're not a tester". Order matters too: group first, Play second.

## Changes to `index.html`

All line numbers are as of commit `48da262`.

### 1. `STORE.android` (line ~365)
`null` → `'https://play.google.com/apps/testing/cz.reis.app'`

### 2. `TUT['phone-android']` (lines 424–427) — replace wholesale

```js
'phone-android': {
  cs: { title: 'reIS pro Android — testovací verze',
        cta: 'Přidat se do skupiny testerů',
        cta2: 'Stát se testerem v Google Play',
        note: 'Použij v obou krocích stejný účet Google — ten, který máš přihlášený v Obchodě Play. Jinak Play napíše, že testerem nejsi.',
        steps: [
          'Přidej se do skupiny testerů. Stačí kliknout na „Join group“ — nikdo to neschvaluje.',
          'Otevři druhý odkaz a klikni na „Become a tester“.',
          'Stáhni reIS z Obchodu Play a přihlas se svým univerzitním účtem.'
        ], done: 'Hotovo — další aktualizace už ti přijdou samy.' },
  en: { title: 'reIS for Android — test version',
        cta: 'Join the testers group',
        cta2: 'Become a tester on Google Play',
        note: 'Use the same Google account for both steps — the one signed in to the Play Store on your phone. Otherwise Play will say you are not a tester.',
        steps: [
          'Join the testers group. Just hit “Join group” — nobody has to approve it.',
          'Open the second link and tap “Become a tester”.',
          'Install reIS from Play and sign in with your university account.'
        ], done: 'Done — future updates arrive on their own.' }
},
```

### 3. `TUT['tablet-android']` (lines 432–435)

Same copy, plus `shots: 'phone-android'` so it reuses the phone screenshots rather than
duplicating them. **This override already exists** — `desktop-edge` uses
`shots: 'desktop-chrome'` (line 393), and `renderVals` reads
`this.TUT[tutKey].shots || tutKey` (line ~660).

### 4. A second CTA — the one genuine template change

The pattern assumes **one** link per entry (`tut.cta` + `STORE[browser]`, rendered at
lines 204 and 211), and `{{ step.text }}` is emitted as **text, not HTML**, so a link
cannot be inlined into a step. This flow needs two.

Add an optional `cta2` + `GROUP_URL`:

- `GROUP_URL = 'https://groups.google.com/g/reis-testers'` next to `STORE`
- in `renderVals`: `cta2Url`, and `cta2Style` that hides the button when `tut.cta2` is absent
- in the template: a second button below the existing one, styled as secondary
  (`--surface-primary` background rather than `--color-primary`), so the *group* link is
  visually step 1 and the Play link step 2

Optional entries must stay optional — every other TUT entry has no `cta2` and must render
exactly as it does today.

### 5. Deep link (currently absent)

There is no URL-param handling anywhere (`grep URLSearchParams` → nothing). Add, in
`componentDidMount`:

```js
const q = new URLSearchParams(location.search);
const d = q.get('device'), b = q.get('browser');
if (d && this.AVAIL[d] && (!b || this.AVAIL[d].includes(b))) this.setState({ device: d, browser: b || null });
```

So **`reis-navod.cz/?device=phone&browser=android`** lands straight on the steps. That is
the link-in-bio URL — without it, people must tap through the device picker first.

Validate against `AVAIL` as above; never set state from an unvalidated param.

## Screenshots

Convention, already implemented and automatic:

```
screenshots/<device>-<browser>-<step>.png     →  screenshots/phone-android-1.png … -3.png
```

`componentDidMount` probes each path with an `Image()` and only renders an `<img>` for
files that exist, so **dropping correctly named PNGs in is the whole job — no code
change**. Portrait shots (h > w) are auto-capped at 220px wide.

Annotate with the existing `screenshots/circle.py`, which draws a lime `RGB(121,190,21)`
ellipse — the same as `--color-primary:#79be15`:

```bash
python3 circle.py in.png phone-android-1.png --bbox x0,y0,x1,y1
python3 circle.py in.png phone-android-2.png --auto-blue --erase-lime
```

`--bbox` for text links, `--auto-blue` for solid blue buttons, `--erase-lime` to avoid
stacking rings on a re-run.

## Timing gate

The Play opt-in link only *works* once 5.2.4 is on the Alpha track, and **no bundle can
be uploaded until the upload-key reset lands on 2026-09-18 12:03 UTC**. The track
currently serves 5.0.6 from August.

So: do not publish steps before the build is on the track. Until then the existing
"Připravujeme" copy stays. Sequence is — key reset lands → upload 5.2.4 → publish this
page → Instagram post.

Also still pending: the Alpha track must be switched from **Email list** to the
**Google Group** on its Testers tab. Without that, joining the group grants nothing.

## Out of scope

- A subpage (rejected above).
- Changing the desktop/iOS branches.
- Anything that assumes the app is public on Play — it is a closed test; when it goes
  public these three steps collapse to one and `cta2` can be dropped.

## Resuming after a conversation compaction

Ask Dominik for the **raw screenshots** first — he has them ready. Then: crop/annotate
with `circle.py`, name them `phone-android-{1,2,3}.png`, make the `index.html` edits
above, and open a PR against `main` (this repo has no `test` branch; PR #1 went straight
to `main`).

---

## As built (2026-09-16)

Implemented on `feat/android-tester-onboarding`. Four deviations from the design
above, each forced by something the design did not know:

**1. Four steps, not three.** Dominik's screenshots showed a step the spec had
missed: after "Become a tester", Play does *not* send you to the app — you have
to tap **"download it on Google Play"** on that same page. A closed-test build
does not surface in Play Store search, so a student who goes hunting for reIS
finds nothing. That is now step 3, with its own screenshot.

**2. The links sit under their own screenshot, not stacked at the top.**
Dominik's call, and it is the better one: you read the step, see where the
button is, then tap through. Implemented as an entry-level `stepLinks` array
index-aligned to `steps`, each `{ key, url }` where `key` names the per-language
label (`cta` / `cta2`). `renderVals` attaches `linkUrl` / `linkText` /
`linkStyle` per step, hiding the anchor with `display:none` where there is no
link — the same idiom the file already uses for absent screenshots. An entry
with `stepLinks` suppresses the CTA button above the steps (`hasStepLinks`), so
no link is offered twice. `cta2` therefore exists as the design said, but as a
*label*, not a second stacked button.

**3. The Android picker card had to be un-disabled.** The design only planned to
fill `TUT`, but the Android card at step 2 was a `<div>` with `cardSoonStyle` and
`aria-disabled="true"` — not a button. With `TUT` filled and the card still
disabled, the tutorial was reachable only by deep link. It is now a real
`<button onClick="{{ onAndroid }}">` matching the iOS card, carrying a muted
`testovací verze` / `test version` subtitle so the closed test is signalled
before the tap, not after.

**4. The screenshot probe loop was bounded at three.** `componentDidMount` ran
`for (let i = 1; i <= 3; i++)`, so a fourth screenshot would never have been
found. Now `i <= entry.cs.steps.length`, which generalises rather than
hardcoding four.

Screenshots were cropped to their action region before annotating — at the
220px portrait cap an 864×1277 phone screenshot renders the target a few pixels
tall. Cropping made all four landscape, so they render full width. The crop of
step 1 also drops Google Groups' "You don't have permission to access this
content", which is what an un-joined visitor sees and is not the first thing a
student should read.

Verified on a local static server: deep link lands on the steps, an invalid
`browser` for the chosen `device` is rejected and falls back to the picker, both
links resolve to the right URLs, `tablet-android` reuses the phone screenshots,
`desktop-chrome` is unchanged, CZ and EN both complete, and there is no
horizontal overflow at 375px.

### Merge preconditions — both still open

1. **The Alpha track must serve 5.2.4.** It currently serves **5.0.6** from
   August, which predates #282 and still contains the error telemetry the
   published privacy policy says was removed. The opt-in link *works* today —
   that is not the question. Merging this page before the new bundle is on the
   track points students at a build that contradicts our own policy. No bundle
   can be uploaded until the upload-key reset lands on **2026-09-18 12:03 UTC**.

2. **The Alpha track's Testers tab must be switched from Email list to the
   Google Group** `reis-testers@googlegroups.com`. Until then, joining the group
   grants nothing and step 1 is a dead end. Note that the "You are a tester"
   screenshot does *not* prove this is done — it was taken on an account already
   on the email list.
