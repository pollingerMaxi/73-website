# 73 — logomark concepts

Five distinct directions for the `73` mark, plus three finished blue-and-white
variants of the selected direction. Every file is a self-contained
`viewBox="0 0 256 256"` SVG: no `<text>`, no font references, no external
assets, no scripts. Both numerals are explicit path geometry.

> **Status:** concept 05 (iso-extrude) was selected. The three deliverable
> variants are `05a`, `05b` and `05c` — see
> [Selected direction](#selected-direction-blue-and-white-iso-variants) at the
> bottom, which also carries the HDR/CSS contract. Concepts 01–05 are kept as
> the original exploration.

## Conventions shared by all five files

**Colour.** Every coloured element carries an sRGB hex attribute plus a
`color(display-p3 …)` inline style. Browsers without P3 support use the
attribute; wide-gamut displays get the more saturated P3 value.

```html
<path fill="#4f8cff" style="fill: color(display-p3 0.28 0.54 1)" />
<stop offset="0" stop-color="#ffffff" style="stop-color: color(display-p3 1 1 1)" />
```

**Shine.** Each concept has explicit specular elements carrying
`class="shine"` and a unique `id`. Their P3 values sit at or near the gamut
edge (`1 1 1`, `0.74 0.96 1`) so they gain the most headroom when pushed into
HDR. Target them with `.shine` collectively, or by id individually.

**IDs.** Every `id` is prefixed with the concept slug
(`chamfer-cut-…`, `terminal-block-…`, …). Verified: no collisions across the
five files, so all five can be inlined into a single HTML page. Confirmed
rendering in Chrome with all five inlined together, and in librsvg (which
exercises the sRGB fallback path).

**Numeral system.** Concepts 01, 02 and 05 share one drawn numeral pair: an
88×160 cell, 26-unit stem weight, and a 12-unit 45° chamfer on the outer
corners. Concepts 03 and 04 use their own construction, because a bitmap and
a routed trace want different skeletons.

---

## 01 — `01-chamfer-cut.svg`

**Idea.** Heavy geometric numerals built on a strict modular grid, then sliced
by a 45° kerf — one per numeral, both on the same axis. The cut splits each
glyph into a lit upper face and a cooler lower face, so the mark reads as a
machined solid rather than a flat fill. The slice angle is exactly the 45° of
the corner chamfers, which is what keeps it from looking like decoration
laid on top.

**Code/tech reference.** Machining and CNC kerf language, and the `/` as the
most structural character in a developer's day — path separator, division,
line comment. The whole glyph system is drawn on 2-unit grid increments, the
way a monospace glyph is fitted to a fixed cell.

**Shine.** `#chamfer-cut-shine-kerf-lip-{seven,three}` (hot specular lip along
the top wall of each cut), `#chamfer-cut-shine-kerf-bounce-*` (cyan bounce off
the lower wall), `#chamfer-cut-shine-crown-*` (edge light along the top
contours).

**Caveats.** The kerf is 9 units wide, so it is roughly one pixel at 32px and
sub-pixel at 16px — it survives as a tonal break rather than a visible cut,
which is by design, but it means the concept's whole idea disappears at
favicon size. Works well on white (the lower face stays dark enough to hold
the silhouette).

---

## 02 — `02-terminal-block.svg`

**Idea.** A dark rounded tile with `73` set in it and a solid cursor block
parked after the numerals, as if the shell just finished printing the prompt.
The tile silhouette does the work at small sizes; the cursor is the only
colour in the mark, which makes it the natural focal point and the natural
place to put the sheen.

**Code/tech reference.** The terminal block cursor — the filled character cell
that a TTY leaves sitting at the insertion point. The tile is proportioned like
an app icon, which is on-brief given the site catalogues a Chrome extension and
an Android app.

**Shine.** `#terminal-block-shine-cursor-glow` (blurred bloom behind the
cursor), `#terminal-block-shine-cursor-specular` (gloss down the cursor face),
`#terminal-block-shine-topedge` (rim light on the top of the tile),
`#terminal-block-shine-gloss` (broad diagonal gloss over the panel).

**Caveats.** The strongest all-rounder of the five — it is the only concept
whose silhouette is a solid shape, so it is the most reliable favicon and the
only one that reads perfectly on white without qualification. The trade-off is
that it is the least distinctive as a *mark*: dark rounded tile with white
characters is well-trodden territory. Also note it can never be a
single-colour mark; it needs its container.

---

## 03 — `03-pixel-matrix.svg`

**Idea.** Both numerals rendered as a 5×10 bitmap on an 11×10 dot grid, with
every unlit cell left in place at 8.5% opacity so the full matrix is visible
behind the glyphs. A hue ramp runs across the grid (cyan → blue → violet) and a
diagonal scan band brightens the dots it crosses, so the panel looks addressed
rather than printed.

**Code/tech reference.** Low-res bitmap fonts and dot-matrix / LED panel
displays — the unlit cells are the giveaway, the same way a real matrix panel
shows its whole grid regardless of what is lit.

**Shine.** `#pixel-matrix-shine-scan` (white dots masked to a diagonal band),
`#pixel-matrix-shine-bloom` (blurred copy of the same band).

**Caveats.** Weakest at 16px — the 21-unit pitch lands on roughly 1.3 device
pixels, so the dots alias into mush and the unlit grid adds a haze that
softens the silhouette. Usable at 32px, good from 48px up. It is also the
weakest of the five on white: the cyan end of the ramp plus the white scan band
leave the upper-left of the 7 very low contrast. Treat this as a dark-mode
concept and supply a separate favicon if you ship it.

---

## 04 — `04-circuit-trace.svg`

**Idea.** The numerals are routed rather than drawn — a 22-unit trace with
mitred corners, 45° dogleg turns through the 3's waist, and annular via pads
punched at every trace terminus. Faint unrelated routes run off the edges of
the board behind the mark to place it on a PCB rather than in space.

**Code/tech reference.** PCB routing conventions: fixed trace width, 45°
direction changes rather than right angles, and drilled via pads (real
annuli — the hole is masked out, not painted in, so it works on any
background).

**Shine.** `#circuit-trace-shine-glow` (blurred cyan glow under the traces),
`#circuit-trace-shine-specular` (a narrow bright stroke running the length of
the routes, brightest across the middle diagonal).

**Caveats.** The most detailed concept, so it loses the most at 16px: vias
close up, the background routes turn to noise, and the glow dominates. The
silhouette does hold. On white it is noticeably weaker than on dark — the acid
green end of the ramp has little contrast against paper, and the specular band
bleaches the 7's shoulder. If this direction wins, draw a simplified
single-weight version for small sizes.

---

## 05 — `05-iso-extrude.svg`

**Idea.** The numerals are tilted off the picture plane and extruded toward the
lower right in 26 stacked layers that darken with depth, giving a real prism
rather than a drop shadow. The face carries a cyan-to-blue ramp, and a hard key
line runs along the upper-left contours where the light hits the top edge.

**Code/tech reference.** Isometric/axonometric projection — the visual language
of build-pipeline and infrastructure diagrams, and of dev-tool brands that want
to signal "system" rather than "app".

**Shine.** `#iso-extrude-shine-sweep` (gloss sweep across the face),
`#iso-extrude-shine-keyline-{a,b}` (hard specular edge along the top-left
contours, faded out toward the lower right by a gradient mask).

**Caveats.** Holds up at small sizes better than expected, because the
extrusion widens the effective silhouette — but at 16px the depth collapses
into a blur and it reads as a slightly smudged flat mark, so the concept's
whole point is lost at favicon size. It survives on white (the deep violet
extrusion carries the contrast), though the cyan face edge gets thin. It is
also the hardest of the five to reproduce in a single flat colour.

---

## Quick comparison

| | 256px | 32px | 16px | on white | single-colour version possible |
|---|---|---|---|---|---|
| 01 chamfer-cut | strong | strong | good (cut lost) | yes | yes |
| 02 terminal-block | strong | strong | strong | yes | no (needs the tile) |
| 03 pixel-matrix | strong | fair | weak | weak | yes |
| 04 circuit-trace | strong | fair | weak | fair | yes, redrawn |
| 05 iso-extrude | strong | good | fair | yes | hard |

If you want one mark that does everything without a separate small-size
drawing, it is 02. If you want the most distinctive mark and are willing to
ship a simplified favicon alongside it, it is 01 or 04.

---

# Selected direction: blue-and-white iso variants

Concept 05 won on form, so the construction is unchanged: same numeral paths,
same `skewY(-11)` tilt, same 26-layer extrusion sweeping toward the lower
right. What changed is the surface.

**Palette.** Violet and cyan are gone. The mark now runs deep navy → site
accent `#4f8cff` → white, and **white is reserved for the speculars**, so the
highlights are always the brightest thing in the artwork. The extrusion
darkens into navy rather than violet. This is deliberate for HDR: near-white
highlights have the headroom to gain brightness, saturated violet and cyan do
not.

**No outer glow.** There is not a single `<filter>` in any of the three files —
no halo, aura or bloom. Every highlight is light landing on the geometry.

**How the highlights are built.** The key line is not a stroke. It is
`face MINUS face translated by (d, d)`, which leaves a constant-width band on
exactly those edges whose normal faces the light — the physically correct set
of lit edges, and a crisp shape rather than a soft wash. A negative offset
gives the same band on the down-right edges, which is the catch light where
the face meets the extrusion in `05c`. Falloff comes from a gradient inside
the mask, so the shine shape itself keeps a **solid** fill that CSS can reach.

## The three variants

| | face | speculars | feel |
|---|---|---|---|
| `05a-iso-keyline.svg` | solid `#3a72dd` | key line only | restrained, graphic, most legible small |
| `05b-iso-face-ramp.svg` | 3-stop ramp, sky → accent → navy | key line + one gloss sweep | the balanced middle |
| `05c-iso-specular.svg` | 5-stop ramp, sky → accent → deep navy | graded key line + wide gloss + hot streak + catch light on the face/extrusion seam | glassiest, most events |

`05a` is the safest at 16–32px and the easiest to reproduce flat. `05c` has the
most to lose at small sizes — the streak and catch light disappear below about
32px, though the silhouette and key line still carry it. All three hold on
white; the deep navy extrusion is what keeps the contrast there.

## HDR / CSS contract — read before wiring up the `.shine` override

Verified in Chrome by inlining all three and applying
`.shine { fill: …; stop-color: … }`: all 14 shine elements flip, and nothing
else in the artwork moves.

**1. Solid-filled specular shapes carry `class="shine"` — override with `fill`.**

| id | variant |
|---|---|
| `iso-keyline-shine-key-seven` / `-three` | 05a |
| `iso-face-ramp-shine-key-seven` / `-three` | 05b |
| `iso-specular-shine-key-seven` / `-three` | 05c |
| `iso-specular-shine-catch-seven` / `-three` | 05c (seam catch light, `#dce9ff`) |

**2. Gradient highlights carry `class="shine"` on the `<stop>` elements —
override with `stop-color`.** These live in `#iso-face-ramp-gloss`,
`#iso-specular-gloss` and `#iso-specular-streak`. Only the stops that actually
carry the highlight are classed; the transparent falloff stops are left alone
so the shape of the sweep survives the override.

**3. Do NOT put a `fill` override on the gradient band shapes.** The rects
`#iso-face-ramp-shine-gloss`, `#iso-specular-shine-gloss` and
`#iso-specular-shine-streak` are filled with `url(#…)`. They are deliberately
**not** classed `shine`, they carry `class="…-spec-band"` instead. This is the
one real trap here: an early version had `class="shine"` on them, and
`.shine { fill: … }` replaced the gradient reference with a flat colour, turning
each gloss sweep into a solid opaque slab across the face. Target them by id if
you need them, never with a blanket `fill` rule.

**4. Specificity.** The P3 upgrade for shine elements lives in a `<style>`
block inside each SVG, wrapped in `:where(…)`, which contributes **zero**
specificity. A plain `.shine` selector there would have tied with your rule and
won on source order once inlined (the SVG's `<style>` sits later in the
document than anything in `<head>`); an inline `style` attribute would have
beaten it outright. With `:where()` your rule always wins, while the sRGB
presentation attribute still covers browsers without `color(display-p3 …)`.
Confirmed: zero inline `style` attributes on shine elements in all three files.

**5. Scope your selector.** Concepts 01–05 were built before this contract and
still carry `class="shine"` on gradient-filled and `fill="none"` stroked
elements. A page-wide `.shine { fill: … }` will visibly break them — it will
flatten 01's kerf lips and 05's sweep, and it will fill 05's stroke-only key
lines solid. If the preview page shows all eight together, scope the rule, e.g.
`.hdr .shine { … }` with `hdr` only on the three variant wrappers. Say the word
if you would rather I bring the original five onto the same contract.
