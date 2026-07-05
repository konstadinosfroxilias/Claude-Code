# Bamberger Döner — Website-Demo

A polished, **frontend-only** demo website for **Bamberger Döner** in Bamberg —
_"Dönergeschmack aus Berlin in Bamberg"_. Built to show the owner exactly how
their site could look and feel.

Everything is mocked: there is **no backend, no database, no real payments and no
real API calls**. The online-ordering flow (cart → checkout → success) is a
realistic UI simulation that processes nothing and charges nothing.

---

## ▶️ Run & build

```bash
npm install        # once
npm run dev        # (a) live preview at http://localhost:5173
npm run build      # (b) rebuild the production site into /dist
```

> Requires Node 18+.

### Open the finished site without any tools

The production build is **self-contained**: `npm run build` inlines all
JavaScript and CSS into a single `dist/index.html`. You can just
**double-click `dist/index.html`** and it opens in your browser — no server
needed. (`npm run preview` also serves `/dist` at a local URL if you prefer.)

> Keep the computer online the first time you open it — the food photos load
> from the web until you swap in local photos.

---

## 🧩 Tech stack

- **Vite + React + TypeScript**
- **Tailwind CSS** (brand palette + fonts configured in `tailwind.config.js`)
- **lucide-react** icons
- **framer-motion** for the micro-interactions (cart slide-in, add-to-cart bump,
  animated success checkmark, hover/scroll reveals)
- Google Fonts: **Anton** / **Oswald** (display) + **Inter** (body)
- Single-page app, mobile-first, German-first with a **DE / EN** toggle

---

## ✏️ Where to edit things (for go-live)

**Everything lives in ONE file:** [`src/data/content.ts`](./src/data/content.ts)

Every component reads its content from that single file, so you swap in all the
client's real data by editing only it — menu items & prices, both shop
locations (address, hours, phone, Google Maps link), business name & tagline,
promo copy, reviews and all image slots.

See **[`REPLACE_ME.md`](./REPLACE_ME.md)** for a field-by-field checklist.

> ⚠️ **All menu prices are estimates and must be confirmed with the owner
> before go-live.** See the list at the bottom.

---

## 💶 Menu prices used (please confirm with the owner)

| Dish | Price (estimate) |
| --- | --- |
| Döner Kebab | €6,50 |
| Dürüm Döner | €7,50 |
| Döner Box mit Pommes | €6,00 |
| Big Döner Challenge (XXL) | €15,00 |
| Döner Teller mit Pommes oder Reis | €11,00 |
| Gemischter Salatteller mit Döner | €9,50 |
| Falafel Dürüm | €6,50 |
| Falafel Teller | €9,00 |
| Lahmacun | €4,50 |
| Lahmacun mit Döner | €8,00 |
| Pommes | €3,50 |
| Ayran | €2,00 |
| Fritz-Kola | €2,50 |
| Türkischer Tee | €1,50 |

---

## 📌 Notes

- The map views in the **Standorte** section are styled placeholders — **no maps
  API is called.** "Route anzeigen" simply opens Google Maps in a new tab with
  the address pre-filled.
- The checkout's card field and "Mit Karte bezahlen" button are a **visual
  mock** styled after a real card checkout. A small "Demo – keine echte Zahlung"
  note is shown so it's clear nothing is charged.
- The newsletter and loyalty buttons show a friendly confirmation but **save
  nothing**.
- Instagram/Facebook links point to `#` — swap in the real profile URLs in
  `src/data/content.ts` (`business.instagram` / `business.facebook`).
- We deliberately do **not** embed or hotlink the restaurant's Instagram photos.

---

_Demo website — built for illustration during the pitch._
