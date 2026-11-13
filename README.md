# Mapart Atelier — GitHub Pages Gallery

A dark, responsive storefront-style gallery for showcasing in-game map art. It is a static site: plain HTML, CSS, JavaScript, and JSON, with no build step, database, external image host, or JavaScript framework required.

## What is included

- **Public gallery (`index.html`)** — responsive landing page, hero feature, catalogue cards, search, category filters, sorting, artwork detail modal, commissions section, order/contact information, and FAQ.
- **Catalogue manager (`admin.html`)** — add, edit, and delete artwork entries; upload an image directly from your computer; preview it; and export the updated catalogue as `maparts.json`.
- **Embedded images** — each image is stored inside `data/maparts.json` as a base64 data URI. No image URL or external image hosting is used.
- **Editable settings (`data/site-config.json`)** — shop name and Discord/contact link.
- **Starter artwork** — four original pixel-art examples are included so the layout is populated on first launch. Replace them with your own in-game screenshots/mapart.

## Publish with GitHub Pages

1. Create a new repository on GitHub.
2. Upload the **contents** of this folder to the repository root. `index.html` should be at the top level, not inside another nested folder.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your default branch (usually `main`) and the `/ (root)` folder, then save.
6. After GitHub Pages publishes the site, open the provided URL. The gallery is the home page; the manager is at `/admin.html`.

No compilation or package installation is needed.

## Add or update map art

### Using the catalogue manager

1. Open your published site and go to **Manage collection**, or visit `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/admin.html`.
2. Fill in the title, source, size, price, category, and availability.
3. Choose the image file from your computer. PNG, JPG, WEBP, and GIF are supported (up to 5 MB per image).
4. Preview the image and save the entry. Use **Edit** or **Delete** beside an existing catalogue entry to change it.
5. When finished, click **Download maparts.json**.
6. In your GitHub repository, replace `data/maparts.json` with the downloaded file and commit/push the change. GitHub Pages will publish the new catalogue after the repository update.

The manager can also import an existing `maparts.json`, which is useful when you have a local copy to continue editing.

### Why does it download a JSON file instead of saving automatically?

GitHub Pages serves static files. A page running on GitHub Pages cannot write changes back into the repository, so the manager prepares the updated catalogue in your browser and downloads it for you to commit. This keeps the site simple and avoids requiring a server, database, GitHub personal access token, or separate image host.

## Add artwork by editing the JSON directly

Each artwork is one object in the array in `data/maparts.json`:

```json
{
  "id": "moonlit-sakura",
  "title": "Moonlit Sakura",
  "source": "The Lantern District",
  "size": "2 × 2 maps",
  "price": "48 diamonds",
  "category": "Landscapes",
  "status": "Available",
  "description": "A quiet cherry tree beneath a pale moon.",
  "imageData": "data:image/png;base64,PASTE_BASE64_IMAGE_DATA_HERE",
  "featured": true
}
```

The easiest option is the catalogue manager: it converts the selected image into the `imageData` value automatically. If you edit the JSON by hand, use a base64 **data URI** (not a normal web URL). Keep the JSON valid and use a unique `id` for every piece. Set `featured` to `true` on at most one item if you want it to appear in the hero feature.

### Image size tips

Base64 adds roughly one-third to an image's file size. For a fast-loading GitHub Pages site, use optimized PNG or WEBP files and keep each image reasonably small. Since the gallery enlarges the original file in its preview, use a version with enough detail for viewers to inspect.

## Change the site name and contact link

Edit `data/site-config.json`:

```json
{
  "shopName": "Mapart Atelier",
  "serverName": "Your server",
  "discordUrl": "https://discord.com",
  "currencyLabel": "diamonds",
  "contactLabel": "Contact us on Discord"
}
```

Replace the example name and `discordUrl` with your own. The sample Discord URL is only a placeholder; use your actual invite or contact link.

## Preview on your computer

Because the gallery fetches JSON files, open it through a local web server instead of double-clicking `index.html`:

```bash
# Run this from the repository folder
python3 -m http.server 8000
```

Then open `http://localhost:8000` for the gallery or `http://localhost:8000/admin.html` for the manager.

## Repository structure

```text
mapart-gallery/
├── index.html
├── admin.html
├── data/
│   ├── maparts.json
│   └── site-config.json
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   └── js/
│       ├── app.js
│       └── admin.js
├── .nojekyll
└── README.md
```

## Notes

- All artwork images in the starter catalogue are original demo pixel art, not screenshots from your server.
- There is no checkout or automatic in-game delivery integration. The contact links are intended to start a conversation where you can confirm availability and arrange the trade.
- The catalogue manager is not password-protected. It does not directly edit your GitHub repository, but anyone who can open the page can create and download their own catalogue draft. Keep repository write access and commits under your control.
