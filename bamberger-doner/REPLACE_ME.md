# REPLACE_ME — swapping in the real client data

**You only ever edit ONE file:** [`src/data/content.ts`](./src/data/content.ts)

It is split into clearly-labelled sections. Change the values, run
`npm run build`, and the whole site updates. Nothing else needs touching.

After editing, rebuild:

```bash
npm run build      # regenerates dist/index.html
```

---

## ✅ Checklist — every field to update

### 1. Business (section `business` in content.ts)
- [ ] `name` — business name (currently "Bamberger Döner")
- [ ] `slogan.de` / `slogan.en` / `slogan.tr` — tagline
- [ ] `phoneDisplay` — phone as shown to users
- [ ] `phoneHref` — same number for the call button, format `tel:+49...` (no spaces)
- [ ] `rating` — Google star rating (e.g. `4.7`)
- [ ] `ratingCount` — number of Google reviews (e.g. `480`)
- [ ] `since` — founding year (e.g. `2023`)
- [ ] `instagram` — real Instagram profile URL (currently `#`)
- [ ] `facebook` — real Facebook page URL (currently `#`)

### 2. Opening hours (section `business.hours`)
- [ ] `time` for each block (e.g. `10:30 – 23:00`)
- [ ] `days.de` / `days.en` / `days.tr` labels (e.g. `So – Mi`)
- [ ] `weekdays` — day numbers each block covers (0 = Sun … 6 = Sat)
- [ ] `close` — closing time, drives the live "open now" badge (`23:00` or `00:00`)

### 3. Both shop locations (section `business.locations`)
For **each** of the two shops:
- [ ] `name.de` / `name.en` / `name.tr`
- [ ] `address` (street + number)
- [ ] `city` (postcode + city)
- [ ] `note.de` / `note.en` / `note.tr` — short descriptor line
- [ ] `opened.de` / `opened.en` / `opened.tr` — the little "since …" badge
- [ ] `mapsUrl` — **Google Maps link** ("Route anzeigen" button)
- [ ] `image` — location photo (see Images below)

### 4. Menu items (section `menu`)
> ⚠️ All prices are **estimates** — confirm every one with the owner.

For **each** dish:
- [ ] `name.de` / `name.en` / `name.tr`
- [ ] `desc.de` / `desc.en` / `desc.tr` — short description
- [ ] `price` — number in euros (e.g. `6.5` → shows "6,50 €")
- [ ] `category` — one of: `doener`, `teller`, `vegetarisch`, `snacks`, `getraenke`
- [ ] `image` — dish photo (see Images below)
- [ ] `vegetarian` — `true` to show the green veg badge
- [ ] `tag.de` / `tag.en` / `tag.tr` — optional ribbon (e.g. "Bestseller")

Add or remove dishes by adding/removing entries in the `menu` array.
Meat/sauce choices live in `meatOptions` / `sauceOptions`.

### 5. Images (section `images`)
Currently royalty-free stock stand-ins. To use real photos:
1. Put the files in `public/photos/` (e.g. `hero.jpg`, `doner-kebab.jpg`).
2. Replace each URL with a path, e.g. `hero: './photos/hero.jpg',`.

Named slots to replace:
- [ ] `hero` — big hero banner photo
- [ ] `grill`, `aboutInterior`, `heroSecondary` — 3 photos in the "Über uns" collage
- [ ] One photo per menu dish (`donerKebab`, `durumDoner`, … `tee`)
- [ ] `gallery` — array of 9 gallery photos
- [ ] `locationLuitpold`, `locationFranzLudwig` — location thumbnails

### 6. Reviews (section `reviews`)
For each of the 4 testimonials:
- [ ] `name`, `initials`, `location`
- [ ] `text.de` / `text.en` / `text.tr`

### 7. Marketing / UI copy (section `strings`)
Most important to review with the client:
- [ ] `hero.subline`
- [ ] `about.p1` / `about.p2` / `about.p3`
- [ ] `loyalty.*` (the stamp-card copy)
- [ ] `newsletter.*`
- [ ] `footer.tagline`

Everything else in `strings` is standard interface wording (buttons, labels)
and rarely needs changing. German (`de`), English (`en`) and Turkish (`tr`)
must stay in sync: every text needs all three variants.

---

## Notes
- The checkout, payment, newsletter and loyalty buttons are **demo mockups** —
  they don't process or store anything. That's intentional for the pitch.
- The map view in the Locations section is a **styled placeholder** (no maps API
  is called); only the "Route anzeigen" button opens the real `mapsUrl`.
- We deliberately do **not** hotlink the restaurant's Instagram photos.
