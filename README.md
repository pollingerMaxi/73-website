# 73.com.uy

Landing page for the apps published under `73.com.uy`. React + TypeScript + Vite,
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

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `dist/` to GitHub Pages.

One-time setup in the GitHub repository:

1. **Settings → Pages → Build and deployment → Source**: select `GitHub Actions`.
2. **Settings → Pages → Custom domain**: enter `73.com.uy` and save.
3. Wait for the DNS check to pass, then tick **Enforce HTTPS**.

`public/CNAME` keeps the custom domain configured across deployments.

## DNS

At the registrar for `73.com.uy`, point the apex domain at GitHub Pages:

| Type | Name | Value           |
| ---- | ---- | --------------- |
| A    | `@`  | `185.199.108.153` |
| A    | `@`  | `185.199.109.153` |
| A    | `@`  | `185.199.110.153` |
| A    | `@`  | `185.199.111.153` |

Optionally add `CNAME www → <username>.github.io.` so `www.73.com.uy` redirects
to the apex domain.

DNS propagation plus GitHub's certificate issuance usually takes from a few
minutes up to a few hours.
