# Art sources

Sources live here, never in `public/`. `npm run images` turns them into the
web images the game loads (`public/resources/images/{name}@1x.webp` and `@2x.webp`).

- `legacy/`: the 22 images the game shipped with. Kept until the new set replaces them.
- `source/`: the new images (docs/06-art.md). A file here wins over a legacy file of the same name.
