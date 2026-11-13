# Frihavn — Map Art Collection

A colourful, responsive GitHub Pages catalogue for Frihavn's in-game map art. It is a static site made with HTML, CSS, JavaScript, and JSON. There is no database, admin page, image-hosting service, or build step.

## Publish on GitHub Pages

1. Create a GitHub repository for the site.
2. Upload the **contents** of this folder to the repository root. Keep `index.html` at the root level.
3. Open **Settings → Pages** in the repository.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your `main` branch and `/ (root)`, then save.
6. Open the GitHub Pages URL once deployment finishes.

## Add a new map art

Images are stored as normal files in the repository. There are no image URLs, external image hosts, or base64 strings to handle.

1. Open the `assets/images/` folder in your GitHub repository.
2. Choose **Add file → Upload files** and upload your image (PNG, JPG, WEBP, or GIF).
3. Copy the image's repository path, for example `assets/images/my-new-mapart.png`.
4. Open `data/maparts.json` and add a new object to the array. Include the title, source, size, price, category, image path, and a unique ID. Example:

```json
{
  "id": "moon-garden",
  "title": "Moon Garden",
  "source": "Frihavn Workshop",
  "size": "2 × 2 maps",
  "price": "48 diamonds",
  "category": "Fantasy",
  "image": "assets/images/moon-garden.png",
  "featured": false
}
```

5. Commit the image and JSON changes. GitHub Pages will publish the update automatically after the commit deploys.

To replace an artwork image, upload the new file to `assets/images/` and update that entry's `image` value in `data/maparts.json`. To remove an artwork, delete its object from the JSON file (and optionally delete its image file from the repository).

**Important:** The website itself does not contain an editor or collection manager. GitHub Pages is static, so catalogue changes are made directly in the repository and published by a commit.

## Change the Discord link

Edit `data/site-config.json` and replace the example Discord URL with the actual Frihavn invite or contact link:

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

Then open `http://localhost:8000`. The site uses `fetch()` to read its JSON catalogue, so use a local web server instead of opening `index.html` directly from your file manager.

## Repository structure

```text
frihavn-mapart/
├── index.html
├── README.md
├── .nojekyll
├── data/
│   ├── maparts.json
│   └── site-config.json
└── assets/
    ├── css/
    │   └── styles.css
    ├── images/
    │   ├── frihavn-mark.svg
    │   └── [your map art image files]
    └── js/
        └── app.js
```

## Notes

- The included four map art images are demo entries. Replace them and their details with your actual in-game pieces.
- The Discord URL in `data/site-config.json` is a placeholder until you add your invite.
- Artwork images are loaded from local paths in the GitHub repository. Keep the image filename and the `image` value in `data/maparts.json` exactly in sync.
- No checkout or automatic in-game delivery integration is included. The contact button opens the configured Discord link.
