# seventhree.dev

Landing page for the apps published under `seventhree.dev`. React + TypeScript + Vite,
deployed to GitHub Pages.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build also copies `dist/index.html` to `dist/404.html`. GitHub Pages serves
`404.html` for unknown paths, which is what makes client-side routes such as
`/apps/hwa-dungeon-chrome` work on a direct visit or refresh.

## Adding an app

Everything on the site is generated from `src/domain/appCatalog.ts`. Add an entry
there and both the home page card and its detail page appear automatically. Set
`download` once the app is published to add a download button.

## Logo and HDR assets

The vector master is `design/logo-options/05c-iso-specular.svg`, also used directly
as `public/favicon.svg`. Alternative concepts and their design notes live alongside
it in `design/logo-options/`.

`public/logo-73.jpg` (header) and `public/og-image.jpg` (link previews) are
**Ultra HDR gain-map JPEGs**. Each carries an ordinary SDR image plus a gain map
describing how much brighter each pixel should render, so the white speculars glow
on an HDR display in Chrome while every other viewer sees the plain base image.

CSS cannot produce this effect: Chrome supports `dynamic-range-limit` but not the
`rec2100` colour spaces, so CSS colours cannot exceed SDR white. The brightness has
to come from the image encoding, which is why the mark is a raster rather than
inline SVG. The header CSS sets `dynamic-range-limit: no-limit` so Chrome applies
the gain map at full headroom instead of tone-mapping it down.

The mark's background is baked to `--color-background` (`#0d1117`) because JPEG has
no alpha — if that variable changes, regenerate the asset.

Regenerating (requires `librsvg`, `imagemagick` and `libultrahdr` from Homebrew):

```bash
rsvg-convert -w 256 -h 256 -b '#0d1117' design/logo-options/05c-iso-specular.svg -o /tmp/mark.png
node scripts/make-hdr-asset.mjs /tmp/mark.png 256 256 public/logo-73.jpg
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `dist/` to GitHub Pages.

One-time setup in the GitHub repository:

1. **Settings → Pages → Build and deployment → Source**: select `GitHub Actions`.
2. **Settings → Pages → Custom domain**: enter `seventhree.dev` and save.
3. Wait for the DNS check to pass, then tick **Enforce HTTPS**.

`public/CNAME` keeps the custom domain configured across deployments.

## DNS

At Namecheap, point the apex of `seventhree.dev` at GitHub Pages:

| Type | Name | Value           |
| ---- | ---- | --------------- |
| A    | `@`  | `185.199.108.153` |
| A    | `@`  | `185.199.109.153` |
| A    | `@`  | `185.199.110.153` |
| A    | `@`  | `185.199.111.153` |

Add `CNAME www → pollingermaxi.github.io.` so `www.seventhree.dev` redirects
to the apex domain.

`73.com.uy` is served by a separate repository that redirects to this one.

Note that `.dev` is on the HSTS preload list: browsers refuse plain HTTP for it, so
the domain is unreachable until GitHub finishes issuing the certificate.

DNS propagation plus GitHub's certificate issuance usually takes from a few
minutes up to a few hours.
