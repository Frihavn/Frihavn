# Frihavn — Mapart Collection

A static GitHub Pages catalogue for Frihavn. This build uses the exact `index.html` structure supplied for the site, keeps the existing blue-and-orange styles, and adds a separate per-mapart photo browser inside the magnified viewer.

## Publish the update

1. Keep `index.html` at the repository root.
2. Merge the updated `index.html`, `assets/css/styles.css`, `assets/js/app.js`, and `data/maparts.json` into your existing repository.
3. Keep your existing artwork images in `assets/images/`—especially `legolasmaprt.png` and `kirbymapart.png`.
4. Commit the changes. GitHub Pages will redeploy the static site.

Do not delete or replace your existing `assets/images/` folder when applying this update. The source artwork files are your own repository assets and should remain in place.

## Add extra photos to a mapart

The `image` field remains the original digital render and always appears first in the enlarged viewer. Add one or more entries to the optional `photos` array for in-game photographs:

```json
{
  "id": "legolas",
  "title": "Legolas",
  "source": "Lord of the Rings",
  "size": "1 × 2 maps",
  "price": "8 diamonds",
  "status": "Available",
  "description": "Legolas aiming a bow",
  "featured": true,
  "image": "assets/images/legolasmaprt.png",
  "tags": ["Portrait"],
  "photos": [
    {
      "image": "assets/images/legolas-ingame-front.png",
      "label": "Front view",
      "caption": "The finished mapart displayed in-game."
    },
    {
      "image": "assets/images/legolas-ingame-wall.png",
      "label": "Wall display",
      "caption": "A wider view of the display wall."
    }
  ]
}
```

### Uploading the image files

1. Open `assets/images/` in your GitHub repository.
2. Choose **Add file → Upload files**.
3. Upload the in-game screenshots, using the exact filenames referenced in `photos`.
4. Commit the new images and the JSON change.

Filenames are case-sensitive. Use local paths beginning with `assets/images/`; external image URLs are not used.

### How the viewer works

- The digital render from `image` is always photo 1.
- Entries in `photos` follow in the order listed in JSON.
- The left/right photo arrows and thumbnail strip change photos of the current mapart only.
- The separate **Browse Other Mapart** controls change to another catalogue piece.
- When a visitor switches mapart, its viewer resets to that piece's digital render.
- The photo controls and strip are hidden when the selected piece has no extra photos.
- Digital mapart renders use crisp pixel scaling; in-game screenshots display normally.

The `photos` property is optional. Existing JSON entries without it continue to work.

## Catalogue fields

- `tags`: populates the catalogue filter chips automatically.
- `badges`: short display labels beside the title, such as `New`, `Pre-order`, or `Limited`.
- `featured: true`: includes the piece in the featured carousel. Only featured entries appear in its center and side positions.
- `photos`: optional array of extra in-game photographs, as described above.

## Discord link

Edit `data/site-config.json` and replace the placeholder invite URL:

```json
{
  "shopName": "Frihavn",
  "discordUrl": "https://discord.gg/YOUR-INVITE"
}
```

## Preview locally

From the repository directory, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Do not open `index.html` directly from the file manager; the catalogue loads JSON with `fetch()` and needs a local web server.

## Repository structure

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
    └── images/  # keep your existing mapart and in-game photo files here
```
