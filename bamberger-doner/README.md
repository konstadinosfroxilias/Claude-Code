# Bamberger Döner — Website-Demo

A polished, **frontend-only** demo website for **Bamberger Döner** in Bamberg —
_"Dönergeschmack aus Berlin in Bamberg"_. Built to show the owner exactly how
their site could look and feel.

Everything is mocked: there is **no backend, no database, no real payments and no
real API calls**. The online-ordering flow (cart → checkout → success) is a
realistic UI simulation that processes nothing and charges nothing.

---

## ▶️ Run it locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default **http://localhost:5173**).

Other commands:

```bash
npm run build     # type-check + production build into /dist
npm run preview   # preview the production build locally
```

> Requires Node 18+.

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

Everything a non-developer needs to change lives in **three files** under
`src/config/`:

### 1. Photos → `src/config/images.ts`

All image URLs are in **one object** with obvious keys (`hero`, `donerKebab`,
`gallery`, …). The current photos are royalty-free Unsplash stand-ins.

To use the restaurant's real photos:

1. Drop the files into `public/photos/` (e.g. `doner-kebab.jpg`).
2. Replace the matching URL with a path, e.g.
   `donerKebab: '/photos/doner-kebab.jpg',`
3. That's it — nothing else changes.

### 2. Prices, dish names & descriptions → `src/config/menu.ts`

Each menu item has a `price` (a number in euros), a `name` and a `desc`
(both in German + English). Edit in place.

> ⚠️ **The prices in this demo are estimates and must be confirmed with the
> owner before go-live.** See the list at the bottom.

### 3. Business facts & all UI text → `src/config/content.ts`

- `business` → addresses, phone, opening hours, rating, locations.
- `reviews` → the testimonial snippets.
- `strings.de` / `strings.en` → every user-facing label, in both languages.

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
  `src/config/content.ts` (`business.instagram` / `business.facebook`).
- We deliberately do **not** embed or hotlink the restaurant's Instagram photos.

---

_Demo website — built for illustration during the pitch._
