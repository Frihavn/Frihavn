# Frihavn — Map Art Collection

A static, responsive GitHub Pages catalogue for Frihavn's in-game map art. It uses HTML, CSS, JavaScript, and a JSON catalogue. There is no database, admin page, online image host, or build step.

## Publish / update on GitHub Pages

1. Keep `index.html` at the repository root.
2. Copy the updated repository files into your existing GitHub repository. **Merge the files rather than deleting the whole `assets/images/` folder first**, so image files already in your repository are preserved.
3. Check that every image path in `data/maparts.json` points to a file in `assets/images/` (filenames are case-sensitive on GitHub Pages).
4. Commit the changes. GitHub Pages will redeploy the static site.

## Current catalogue

`data/maparts.json` now contains the four pieces supplied for Frihavn:

- Legolas — Lord of the Rings — 1 × 2 maps — 8 diamonds — featured
- Kirby — Kirby — 1 × 2 maps — 8 diamonds — featured
- Fox Spirit Shrine — Whispering Woods — 1 × 1 maps — 4 diamonds — not featured; Made to order
- Koi in Still Water — The Lantern District — 1 × 1 maps — 4 diamonds — featured

The JSON retains the supplied descriptions, sources, status values, image paths, and tags.

**Image files to preserve:** the catalogue references `assets/images/legolasmaprt.png` and `assets/images/kirbymapart.png`. Those two PNG binaries were not present in the working folder available for this update, so they are not included in this ZIP. If they are already in your GitHub repository, leave them in `assets/images/`. Otherwise, upload your original files with those exact filenames before publishing. `fox-spirit-shrine.png` and `koi-in-still-water.png` are included in this package.

## Add or edit a piece

1. Upload the image file into `assets/images/` in the GitHub repository.
2. Add or edit its object in `data/maparts.json`.
3. Commit the image and JSON changes together.

Example:

```json
{
  "id": "moon-garden",
  "title": "Moon Garden",
  "source": "Frihavn Workshop",
  "size": "2 × 2 maps",
  "price": "48 diamonds",
  "status": "Available",
  "description": "A moonlit garden scene.",
  "featured": true,
  "image": "assets/images/moon-garden.png",
  "tags": ["Fantasy", "Japanese", "Landscapes"],
  "badges": ["New", "Limited"]
}
```

### Featured carousel

Set `"featured": true` to include a piece in the featured carousel. Set it to `false` to keep it out of the carousel entirely. The carousel has three positions: previous featured piece on the left, current featured piece in the middle, and next featured piece on the right. It cycles through featured entries only and wraps back to the beginning. The central slide displays the artwork's name and price.

### Filter tags and title badges

- `tags` generates the catalogue filter chips. The filter list is populated automatically from all tags used in the JSON.
- `badges` adds short labels beside the title, such as `New`, `Pre-order`, or `Limited`. Badges do not become filter chips.
- `status` is retained as catalogue information. Any status other than `Available` is also shown as a small title badge (for example, `Made to order`).

### Image sizing

Artwork is displayed with `object-fit: contain` inside a padded image frame. The image scales up to use the largest available dimension while retaining its exact source aspect ratio. Portrait, square, and landscape artwork are not cropped. This works for 1:1, 1:2, 5:3, and other ratios; the source image ratio does not need to be specified separately in the JSON.

## Discord link

Edit `data/site-config.json` and replace the placeholder with Frihavn's invite:

```json
{
  "shopName": "Frihavn",
  "discordUrl": "https://discord.gg/YOUR-INVITE"
}
```

## Preview locally

Run this from the repository folder:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Do not open `index.html` directly from the file manager; the catalogue uses `fetch()` to read its JSON file and needs a local web server.

## Repository layout

```text
frihavn-mapart/
├── index.html
├── README.md
├── LICENSE
├── .nojekyll
├── data/
│   ├── maparts.json
│   └── site-config.json
└── assets/
    ├── css/styles.css
    ├── js/app.js
    └── images/
        ├── frihavn-mark.svg
        ├── fox-spirit-shrine.png
        ├── koi-in-still-water.png
        ├── legolasmaprt.png      # keep/add your original file
        └── kirbymapart.png       # keep/add your original file
```

The website is static. Changes are made in the repository and published when GitHub Pages redeploys.
