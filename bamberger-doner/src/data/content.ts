// PLACEHOLDER DATA - replace with real client data
// ============================================================================
//
//  BAMBERGER DÖNER - SINGLE SOURCE OF CONTENT
//
//  This is the ONLY file you need to edit to swap in the client's real data.
//  Every component on the site reads its content from here.
//
//  Sections in this file:
//    1. BUSINESS   → name, slogan, phone, rating, social links
//    2. LOCATIONS  → both shops: address, hours note, Google-Maps link, photo
//    3. IMAGES     → every photo slot on the site (clearly named)
//    4. MENU       → all dishes: name, description, price (€), category
//    5. REVIEWS    → the 4 testimonial cards
//    6. UI TEXT    → every interface string, German + English + Turkish
//    7. HELPERS    → types & small functions (no need to edit these)
//
//  See REPLACE_ME.md in the project root for a field-by-field checklist.
// ============================================================================

/* ========================================================================== */
/*  7a. TYPES (no need to edit)                                               */
/* ========================================================================== */

export type Lang = 'de' | 'en' | 'tr'

/** Every user-facing text exists in German, English and Turkish. */
export interface LocalizedText {
  de: string
  en: string
  tr: string
}

export type CategoryId = 'doener' | 'teller' | 'vegetarisch' | 'snacks' | 'getraenke'

export interface Option {
  id: string
  label: LocalizedText
}

export interface MenuItem {
  id: string
  name: LocalizedText
  desc: LocalizedText
  /** price in euros, e.g. 6.5 renders as "6,50 €" */
  price: number
  image: string
  category: CategoryId
  vegetarian?: boolean
  /** show meat + sauce pickers when adding to cart */
  customizable?: boolean
  /** renders as the large special "Big Döner Challenge" card */
  featured?: boolean
  /** small ribbon on the photo, e.g. Bestseller / XXL */
  tag?: LocalizedText
}

/* ========================================================================== */
/*  3. IMAGES - every photo slot on the site                                  */
/* ==========================================================================
   PLACEHOLDER IMAGES: high-quality royalty-free Unsplash stand-ins.
   They are NOT the restaurant's real photos.

   HOW TO SWAP IN REAL PHOTOS:
     1. Drop the client's photos into  public/photos/  (e.g. doner-kebab.jpg)
     2. Replace the matching URL below with a path, e.g.
          donerKebab: './photos/doner-kebab.jpg',
     3. Rebuild (npm run build). Nothing else changes.

   (Do NOT hotlink the restaurant's Instagram photos.)                        */

// Helper: sized Unsplash URL from a photo id (no need to edit)
const ux = (id: string, w = 800, q = 80): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`

export const images = {
  /* ---- Hero & brand atmosphere ---- */
  hero: ux('1633896949673-1eb9d131a9b4', 1700, 80), // BIG hero photo (flame-grilled dürüm)
  heroSecondary: ux('1529006557810-274b9b2fc783', 1200), // small square in "Über uns" collage
  grill: ux('1628294895950-9805252327bc', 1400), // wide photo in "Über uns" collage
  aboutInterior: ux('1552566626-52f8b828add9', 1200), // shop interior in "Über uns" collage

  /* ---- Menu: Döner & Dürüm ---- */
  donerKebab: ux('1561651823-34feb02250e4'),
  durumDoner: ux('1626700051175-6818013e1d4f'),
  donerBox: ux('1529006557810-274b9b2fc783'),
  bigDonerChallenge: ux('1626074353765-517a681e40be', 1100),

  /* ---- Menu: Teller ---- */
  donerTeller: ux('1610057099431-d73a1c9d2f2f'),
  salatTeller: ux('1540420773420-3366772f4999'),

  /* ---- Menu: Vegetarisch ---- */
  falafelDurum: ux('1604908176997-125f25cc6f3d'),
  falafelTeller: ux('1512621776951-a57141f2eefd'),

  /* ---- Menu: Snacks & Beilagen ---- */
  lahmacun: ux('1594007654729-407eedc4be65'),
  lahmacunDoner: ux('1593504049359-74330189a345'),
  pommes: ux('1630384060421-cb20d0e0649d'),

  /* ---- Menu: Getränke ---- */
  ayran: ux('1563636619-e9143da7973b'),
  fritzKola: ux('1581636625402-29b2a704ef13'),
  tee: ux('1571934811356-5cc061b6821f'),

  /* ---- Gallery grid (9 tiles, order = layout order) ---- */
  gallery: [
    ux('1633896949673-1eb9d131a9b4', 900), // 1 - large tile (top-left, 2×2)
    ux('1628294895950-9805252327bc', 900), // 2
    ux('1529006557810-274b9b2fc783', 900), // 3
    ux('1626074353765-517a681e40be', 900), // 4
    ux('1594007654729-407eedc4be65', 900), // 5
    ux('1630384060421-cb20d0e0649d', 900), // 6 - wide tile
    ux('1610057099431-d73a1c9d2f2f', 900), // 7
    ux('1552566626-52f8b828add9', 900), // 8
    ux('1540420773420-3366772f4999', 900), // 9
  ],

  /* ---- Location card thumbnails ---- */
  locationLuitpold: ux('1517248135467-4c7edcad34c4', 800),
  locationFranzLudwig: ux('1552566626-52f8b828add9', 800),
} as const

/* ========================================================================== */
/*  1. BUSINESS - name, slogan, phone, rating, socials                        */
/*  2. LOCATIONS - both shops                                                 */
/* ========================================================================== */

export const business = {
  name: 'Bamberger Döner',
  slogan: {
    de: 'Dönergeschmack aus Berlin in Bamberg',
    en: 'The taste of Berlin döner, now in Bamberg',
    tr: "Berlin döner lezzeti şimdi Bamberg'de",
  } as LocalizedText,

  phoneDisplay: '+49 951 91700610', // shown to users
  phoneHref: 'tel:+4995191700610', // used by "call" buttons (no spaces!)

  rating: 4.7, // Google rating shown in hero / reviews
  ratingCount: 480, // "480+ Bewertungen" under the Google badge
  since: 2023, // founding year (stamp badge + stats)

  instagram: '#', // ← replace with real Instagram profile URL
  facebook: '#', // ← replace with real Facebook page URL

  /* Opening hours: Sun-Wed 10:30-23:00, Thu-Sat 10:30-00:00.
     `weekdays` uses JS day indexes (0 = Sunday). `close` drives the
     live "open now" badge; "00:00" means midnight (end of that day). */
  hours: [
    {
      days: { de: 'So - Mi', en: 'Sun - Wed', tr: 'Paz - Çar' } as LocalizedText,
      time: '10:30 - 23:00',
      weekdays: [0, 1, 2, 3],
      close: '23:00',
    },
    {
      days: { de: 'Do - Sa', en: 'Thu - Sat', tr: 'Per - Cmt' } as LocalizedText,
      time: '10:30 - 00:00',
      weekdays: [4, 5, 6],
      close: '00:00',
    },
  ],

  locations: [
    {
      id: 'luitpold',
      name: { de: 'Luitpoldstraße', en: 'Luitpoldstraße', tr: 'Luitpoldstraße' } as LocalizedText,
      address: 'Luitpoldstraße 39',
      city: '96052 Bamberg',
      note: {
        de: 'Hauptfiliale · direkt am Hauptbahnhof / S-Bahn',
        en: 'Main shop · right by the main station / S-Bahn',
        tr: 'Ana şube · tren garının hemen yanında / S-Bahn',
      } as LocalizedText,
      opened: {
        de: 'Seit Dezember 2023',
        en: 'Open since December 2023',
        tr: "Aralık 2023'ten beri",
      } as LocalizedText,
      /** "Route anzeigen" button opens this link */
      mapsUrl:
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Bamberger Döner, Luitpoldstraße 39, 96052 Bamberg'),
      image: images.locationLuitpold,
    },
    {
      id: 'franz-ludwig',
      name: { de: 'Franz-Ludwig-Straße', en: 'Franz-Ludwig-Straße', tr: 'Franz-Ludwig-Straße' } as LocalizedText,
      address: 'Franz-Ludwig-Straße',
      city: 'Bamberg',
      note: {
        de: 'Neue Filiale · mitten in der Innenstadt',
        en: 'New shop · right in the city centre',
        tr: 'Yeni şube · şehir merkezinde',
      } as LocalizedText,
      opened: {
        de: 'Neu eröffnet · Januar 2026',
        en: 'Newly opened · January 2026',
        tr: 'Yeni açıldı · Ocak 2026',
      } as LocalizedText,
      mapsUrl:
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Bamberger Döner, Franz-Ludwig-Straße, Bamberg'),
      image: images.locationFranzLudwig,
    },
  ],
}

export type Location = (typeof business.locations)[number]

/* ========================================================================== */
/*  4. MENU - all dishes                                                      */
/* ==========================================================================
   ⚠️  ALL PRICES ARE ESTIMATES - confirm with the owner before launch.
   To edit a dish: change name/desc/price. To change its photo, edit the
   matching key in the IMAGES section above.                                  */

export const categories: { id: CategoryId; label: LocalizedText }[] = [
  { id: 'doener', label: { de: 'Döner & Dürüm', en: 'Döner & Wraps', tr: 'Döner & Dürüm' } },
  { id: 'teller', label: { de: 'Teller', en: 'Plates', tr: 'Tabaklar' } },
  { id: 'vegetarisch', label: { de: 'Vegetarisch', en: 'Vegetarian', tr: 'Vejetaryen' } },
  { id: 'snacks', label: { de: 'Snacks & Beilagen', en: 'Snacks & Sides', tr: 'Atıştırmalıklar' } },
  { id: 'getraenke', label: { de: 'Getränke', en: 'Drinks', tr: 'İçecekler' } },
]

/** Meat choices offered on customizable items */
export const meatOptions: Option[] = [
  { id: 'pute', label: { de: 'Pute', en: 'Turkey', tr: 'Hindi' } },
  { id: 'rind', label: { de: 'Rind', en: 'Beef', tr: 'Dana' } },
  { id: 'haehnchen', label: { de: 'Hähnchen', en: 'Chicken', tr: 'Tavuk' } },
]

/** Sauce choices offered on customizable items */
export const sauceOptions: Option[] = [
  { id: 'kraeuter', label: { de: 'Kräuter', en: 'Herb', tr: 'Otlu' } },
  { id: 'knoblauch', label: { de: 'Knoblauch', en: 'Garlic', tr: 'Sarımsaklı' } },
  { id: 'scharf', label: { de: 'Scharf', en: 'Spicy', tr: 'Acılı' } },
]

export const menu: MenuItem[] = [
  /* ---------------------------- Döner & Dürüm ---------------------------- */
  {
    id: 'doner-kebab',
    category: 'doener',
    name: { de: 'Döner Kebab', en: 'Döner Kebab', tr: 'Döner Kebap' },
    desc: {
      de: 'Frisch vom Drehspieß, knuspriges Fladenbrot, knackiger Salat und unsere hausgemachte Soße.',
      en: 'Fresh from the spit, crispy flatbread, crunchy salad and our house-made sauce.',
      tr: 'Şişten taze, çıtır pide ekmeği, taze salata ve ev yapımı sosumuzla.',
    },
    price: 6.5,
    image: images.donerKebab,
    customizable: true,
    tag: { de: 'Bestseller', en: 'Bestseller', tr: 'Çok satan' },
  },
  {
    id: 'durum-doner',
    category: 'doener',
    name: { de: 'Dürüm Döner', en: 'Dürüm Wrap', tr: 'Dürüm Döner' },
    desc: {
      de: 'Saftiges Fleisch im dünnen Yufka-Brot gerollt, perfekt für unterwegs.',
      en: 'Juicy meat rolled in thin yufka bread, perfect on the go.',
      tr: 'İnce yufkaya sarılı sulu et, yolda yemek için birebir.',
    },
    price: 7.5,
    image: images.durumDoner,
    customizable: true,
    tag: { de: 'Beliebt', en: 'Popular', tr: 'Popüler' },
  },
  {
    id: 'doner-box',
    category: 'doener',
    name: { de: 'Döner Box mit Pommes', en: 'Döner Box with Fries', tr: 'Patates Kızartmalı Döner Box' },
    desc: {
      de: 'Döner trifft knusprige Pommes, die handliche Box für den großen Hunger.',
      en: 'Döner meets crispy fries, the handy box for a big appetite.',
      tr: 'Döner ve çıtır patates bir arada, büyük açlıklar için pratik kutu.',
    },
    price: 6.0,
    image: images.donerBox,
    customizable: true,
  },
  {
    id: 'big-doner-challenge',
    category: 'doener',
    name: { de: 'Big Döner Challenge', en: 'Big Döner Challenge', tr: 'Big Döner Challenge' },
    desc: {
      de: 'Unser legendärer XXL-Döner mit doppelter Portion Fleisch. Schaffst du ihn allein? Wer ihn leert, kommt an unsere Wand der Helden. ❤️',
      en: 'Our legendary XXL döner with a double portion of meat. Can you finish it solo? Empty the box and you make our Wall of Heroes. ❤️',
      tr: 'Efsanevi XXL dönerimiz, duble et porsiyonuyla. Tek başına bitirebilir misin? Bitirenler Kahramanlar Duvarımıza giriyor. ❤️',
    },
    price: 15.0,
    image: images.bigDonerChallenge,
    customizable: true,
    featured: true,
    tag: { de: 'XXL', en: 'XXL', tr: 'XXL' },
  },

  /* -------------------------------- Teller ------------------------------- */
  {
    id: 'doner-teller',
    category: 'teller',
    name: {
      de: 'Döner Teller mit Pommes oder Reis',
      en: 'Döner Plate with Fries or Rice',
      tr: 'Patates veya Pilavlı Döner Tabağı',
    },
    desc: {
      de: 'Großzügige Portion Dönerfleisch mit Pommes oder Reis, frischem Salat und Soße.',
      en: 'A generous portion of döner meat with fries or rice, fresh salad and sauce.',
      tr: 'Bol döner eti, yanında patates veya pilav, taze salata ve sos.',
    },
    price: 11.0,
    image: images.donerTeller,
    customizable: true,
  },
  {
    id: 'salat-teller',
    category: 'teller',
    name: {
      de: 'Gemischter Salatteller mit Döner',
      en: 'Mixed Salad Plate with Döner',
      tr: 'Dönerli Karışık Salata Tabağı',
    },
    desc: {
      de: 'Knackiger frischer Salat mit zartem Dönerfleisch und cremigem Dressing.',
      en: 'Crunchy fresh salad with tender döner meat and a creamy dressing.',
      tr: 'Çıtır taze salata, yumuşacık döner eti ve kremalı sos ile.',
    },
    price: 9.5,
    image: images.salatTeller,
    customizable: true,
  },

  /* ----------------------------- Vegetarisch ---------------------------- */
  {
    id: 'falafel-durum',
    category: 'vegetarisch',
    name: { de: 'Falafel Dürüm', en: 'Falafel Wrap', tr: 'Falafel Dürüm' },
    desc: {
      de: 'Hausgemachte Falafel, frischer Salat und Sesam-Soße im Yufka gerollt.',
      en: 'House-made falafel, fresh salad and sesame sauce rolled in yufka.',
      tr: 'Ev yapımı falafel, taze salata ve susam sosu, yufkaya sarılı.',
    },
    price: 6.5,
    image: images.falafelDurum,
    vegetarian: true,
  },
  {
    id: 'falafel-teller',
    category: 'vegetarisch',
    name: { de: 'Falafel Teller', en: 'Falafel Plate', tr: 'Falafel Tabağı' },
    desc: {
      de: 'Goldene Falafel mit cremigem Hummus, buntem Salat und warmem Fladenbrot.',
      en: 'Golden falafel with creamy hummus, colourful salad and warm flatbread.',
      tr: 'Altın sarısı falafel, kremalı humus, renkli salata ve sıcak pide ile.',
    },
    price: 9.0,
    image: images.falafelTeller,
    vegetarian: true,
  },

  /* -------------------------- Snacks & Beilagen ------------------------- */
  {
    id: 'lahmacun',
    category: 'snacks',
    name: { de: 'Lahmacun', en: 'Lahmacun', tr: 'Lahmacun' },
    desc: {
      de: 'Dünn ausgerollter Teig, würzig belegt. Türkische Pizza, frisch gebacken.',
      en: 'Thin rolled dough, savoury topping. Turkish-style pizza, freshly baked.',
      tr: 'İncecik hamur, bol malzemeli harç. Taş fırından taze taze.',
    },
    price: 4.5,
    image: images.lahmacun,
  },
  {
    id: 'lahmacun-doner',
    category: 'snacks',
    name: { de: 'Lahmacun mit Döner', en: 'Lahmacun with Döner', tr: 'Dönerli Lahmacun' },
    desc: {
      de: 'Unser Klassiker mit extra Dönerfleisch, frischem Salat und Soße gerollt.',
      en: 'Our classic rolled with extra döner meat, fresh salad and sauce.',
      tr: 'Klasiğimiz; ekstra döner eti, taze salata ve sos ile sarılı.',
    },
    price: 8.0,
    image: images.lahmacunDoner,
    customizable: true,
  },
  {
    id: 'pommes',
    category: 'snacks',
    name: { de: 'Pommes', en: 'Fries', tr: 'Patates Kızartması' },
    desc: {
      de: 'Goldgelb, knusprig und frisch frittiert. Mit Ketchup oder Mayo.',
      en: 'Golden, crispy and freshly fried. With ketchup or mayo.',
      tr: 'Altın sarısı, çıtır çıtır ve taze kızarmış. Ketçap veya mayonezle.',
    },
    price: 3.5,
    image: images.pommes,
    vegetarian: true,
  },

  /* ------------------------------ Getränke ------------------------------ */
  {
    id: 'ayran',
    category: 'getraenke',
    name: { de: 'Ayran', en: 'Ayran', tr: 'Ayran' },
    desc: {
      de: 'Erfrischendes Joghurtgetränk, der perfekte Begleiter zum Döner.',
      en: 'Refreshing yoghurt drink, the perfect partner to your döner.',
      tr: 'Ferahlatan yoğurt içeceği, dönerin yanına birebir.',
    },
    price: 2.0,
    image: images.ayran,
    vegetarian: true,
  },
  {
    id: 'fritz-kola',
    category: 'getraenke',
    name: { de: 'Fritz-Kola', en: 'Fritz-Kola', tr: 'Fritz-Kola' },
    desc: {
      de: 'Eiskalt serviert, mit ordentlich Koffein und Kult-Faktor.',
      en: 'Served ice-cold, with plenty of caffeine and cult status.',
      tr: 'Buz gibi servis edilir, bol kafeinli ve efsane tadında.',
    },
    price: 2.5,
    image: images.fritzKola,
    vegetarian: true,
  },
  {
    id: 'tuerkischer-tee',
    category: 'getraenke',
    name: { de: 'Türkischer Tee', en: 'Turkish Tea', tr: 'Türk Çayı' },
    desc: {
      de: 'Traditionell aufgebrüht und im klassischen kleinen Glas serviert.',
      en: 'Traditionally brewed and served in the classic small glass.',
      tr: 'Geleneksel demleme, klasik ince belli bardakta servis edilir.',
    },
    price: 1.5,
    image: images.tee,
    vegetarian: true,
  },
]

/* ========================================================================== */
/*  5. REVIEWS - the 4 testimonial cards                                      */
/* ========================================================================== */

export const reviews: {
  name: string
  initials: string
  location: string
  text: LocalizedText
}[] = [
  {
    name: 'Melike A.',
    initials: 'MA',
    location: 'Bamberg',
    text: {
      de: 'Der beste Döner in Bamberg, kein Scherz! Die Kräutersoße ist ein Traum und die Portionen sind riesig. Schmeckt wirklich wie in Berlin. ❤️',
      en: 'The best döner in Bamberg, no joke! The herb sauce is a dream and the portions are huge. Really tastes like Berlin. ❤️',
      tr: "Bamberg'in en iyi döneri, şaka değil! Otlu sos bir harika, porsiyonlar kocaman. Gerçekten Berlin tadında. ❤️",
    },
  },
  {
    name: 'Jonas R.',
    initials: 'JR',
    location: 'Student, Uni Bamberg',
    text: {
      de: 'Frisch, schnell und super freundlich. Das Fleisch kommt direkt vom Spieß und ist immer saftig. Mein fester Spot nach der Vorlesung.',
      en: 'Fresh, fast and super friendly. The meat comes straight off the spit and is always juicy. My go-to spot after lectures.',
      tr: 'Taze, hızlı ve çok güler yüzlü. Et doğrudan şişten geliyor ve hep sulu. Dersten sonra değişmez adresim.',
    },
  },
  {
    name: 'Sandra L.',
    initials: 'SL',
    location: 'Bamberg',
    text: {
      de: 'Endlich echter Berliner Döner in Bamberg! Faire Preise, top Qualität und das Team ist mega herzlich. Klare Empfehlung.',
      en: 'Finally real Berlin döner in Bamberg! Fair prices, top quality and the team is so warm. Highly recommend.',
      tr: "Sonunda Bamberg'de gerçek Berlin döneri! Uygun fiyat, süper kalite ve ekip çok samimi. Kesinlikle tavsiye ederim.",
    },
  },
  {
    name: 'Kerem Y.',
    initials: 'KY',
    location: 'Bamberg',
    text: {
      de: 'Die Big Döner Challenge habe ich (knapp) geschafft 😅 Riesige Portion, klasse Geschmack. Hier stimmt einfach alles.',
      en: 'I (barely) finished the Big Döner Challenge 😅 Massive portion, great taste. Everything here is just right.',
      tr: "Big Döner Challenge'ı (ucu ucuna) bitirdim 😅 Dev porsiyon, harika lezzet. Burada her şey tam yerinde.",
    },
  },
]

/* ========================================================================== */
/*  6. UI TEXT - every interface string (German first, English toggle)        */
/* ==========================================================================
   The important marketing copy to review with the client:
     hero.subline, about.p1-p3, loyalty.*, newsletter.*, footer.tagline       */

const de = {
  nav: {
    menu: 'Menü',
    locations: 'Standorte',
    about: 'Über uns',
    gallery: 'Galerie',
    order: 'Jetzt bestellen',
    openCart: 'Warenkorb öffnen',
    langLabel: 'Sprache',
  },
  hero: {
    ratingSuffix: 'auf Google',
    ctaOrder: 'Jetzt bestellen',
    ctaMenu: 'Speisekarte ansehen',
    subline:
      'Echter Berliner Döner, frisch vom Drehspieß und mit Liebe gemacht. Jetzt zweimal in Bamberg.',
    openNow: 'Jetzt geöffnet',
    closedNow: 'Gerade geschlossen',
  },
  highlights: {
    fresh: { title: 'Frisch vom Drehspieß', sub: 'Jeden Tag frisch zubereitet' },
    direct: { title: 'Direkt bestellen, keine Gebühren', sub: 'Ohne Lieferando & Co.' },
    two: { title: '2× in Bamberg', sub: 'Luitpoldstraße & Innenstadt' },
    since: { title: 'Seit 2023', sub: 'Mit Herz gegründet' },
  },
  menu: {
    eyebrow: 'Unsere Speisekarte',
    title: 'Frisch gemacht, fair im Preis',
    subtitle:
      'Alles frisch zubereitet. Wähle deine Kategorie und leg los. Tippe auf „+“, um in den Warenkorb zu legen.',
    all: 'Alle',
    add: 'Hinzufügen',
    vegetarian: 'Vegetarisch',
    from: 'ab',
    challengeCta: 'Challenge annehmen',
    popular: 'Beliebt',
  },
  options: {
    title: 'Wähle deine Variante',
    meat: 'Fleisch',
    sauce: 'Soße',
    addToCart: 'In den Warenkorb',
    cancel: 'Abbrechen',
  },
  cart: {
    title: 'Dein Warenkorb',
    empty: 'Dein Warenkorb ist noch leer.',
    emptyHint: 'Füge ein paar Leckereien aus der Speisekarte hinzu.',
    subtotal: 'Zwischensumme',
    checkout: 'Zur Kasse',
    remove: 'Entfernen',
    items: 'Artikel',
    continue: 'Weiter einkaufen',
  },
  checkout: {
    title: 'Kasse',
    pickup: 'Abholung',
    delivery: 'Lieferung',
    pickupAt: 'Abholung in der Filiale',
    name: 'Name',
    namePlaceholder: 'Max Mustermann',
    phone: 'Telefon',
    phonePlaceholder: '0151 23456789',
    location: 'Filiale wählen',
    summary: 'Bestellübersicht',
    total: 'Gesamt',
    pay: 'Mit Karte bezahlen',
    paying: 'Zahlung wird verarbeitet …',
    secure: 'Sichere Zahlung',
    demoNote: 'Demo, keine echte Zahlung',
    back: 'Zurück',
    addressLabel: 'Lieferadresse',
    addressPlaceholder: 'Straße, Hausnr., PLZ',
    cardDetails: 'Kartendaten',
  },
  success: {
    title: 'Bestellung bestätigt!',
    message: 'Vielen Dank! Deine Bestellung ist bei uns eingegangen und wird frisch zubereitet.',
    orderNo: 'Bestellnummer',
    pickupInfo: 'Du bekommst eine SMS, sobald alles fertig ist.',
    demoNote: 'Demo: es wurde keine echte Bestellung ausgelöst und nichts berechnet.',
    done: 'Fertig',
  },
  about: {
    eyebrow: 'Unsere Geschichte',
    title: 'Berliner Döner-Liebe in Bamberg',
    p1: 'Bamberger Döner ist aus einer einfachen Idee entstanden: den echten, ehrlichen Geschmack des Berliner Straßen-Döners nach Bamberg zu bringen. Großzügige Portionen, frische Zutaten und Fleisch, das den ganzen Tag frisch vom Drehspieß geschnitten wird.',
    p2: 'Seit Dezember 2023 stehen wir in der Luitpoldstraße, direkt am Hauptbahnhof. Aus einem Laden wurden schnell viele Stammgäste und 2026 ein zweiter Standort mitten in der Innenstadt. Familiär geführt, mit viel Herz und noch mehr Soße. ❤️',
    p3: 'Unser Versprechen bleibt: frisch, fair und freundlich. Bestell direkt bei uns, ganz ohne Gebühren und Umwege.',
    statRating: 'Google-Bewertung',
    statShops: 'Standorte in Bamberg',
    statSince: 'Im Herzen Bambergs',
  },
  gallery: {
    eyebrow: 'Galerie',
    title: 'Zum Reinbeißen',
    subtitle: 'Ein kleiner Vorgeschmack auf das, was dich erwartet.',
  },
  reviews: {
    eyebrow: 'Bewertungen',
    title: 'Das sagen unsere Gäste',
    googleBadge: 'auf Google',
    reviewsWord: 'Bewertungen',
  },
  loyalty: {
    eyebrow: 'Treueprogramm',
    title: 'Sammle Stempel, hol dir Gratis-Döner',
    subtitle: 'Sammle 10 Stempel, 1 Döner gratis. Mit jeder Bestellung kommst du näher ans Ziel.',
    progress: 'Stempel gesammelt',
    reward: 'Gratis-Döner',
    cta: 'Digitale Stempelkarte aktivieren',
    almost: 'Nur noch {n}× bis zu deinem Gratis-Döner!',
  },
  locations: {
    eyebrow: 'Standorte',
    title: 'Zweimal für dich in Bamberg',
    call: 'Anrufen',
    directions: 'Route anzeigen',
    hours: 'Öffnungszeiten',
    mapHint: 'Kartenansicht',
  },
  newsletter: {
    title: 'Bleib auf dem Laufenden',
    subtitle: 'Neue Aktionen, Gratis-Döner-Gewinnspiele und Neuigkeiten, direkt in dein Postfach.',
    placeholder: 'Deine E-Mail-Adresse',
    button: 'Anmelden',
    success: 'Danke fürs Anmelden! ❤️',
    successHint: 'Wir melden uns mit leckeren Neuigkeiten.',
  },
  footer: {
    tagline: 'Echter Berliner Döner, frisch vom Drehspieß, jetzt zweimal in Bamberg.',
    contact: 'Kontakt',
    hours: 'Öffnungszeiten',
    locations: 'Standorte',
    follow: 'Folge uns',
    rights: 'Alle Rechte vorbehalten.',
    demo: 'Demo-Website, nur zur Veranschaulichung erstellt. Keine echten Bestellungen oder Zahlungen.',
  },
  common: {
    commissionFree: 'Bestell direkt bei uns, ohne Gebühren',
    close: 'Schließen',
  },
}

const en: typeof de = {
  nav: {
    menu: 'Menu',
    locations: 'Locations',
    about: 'About',
    gallery: 'Gallery',
    order: 'Order now',
    openCart: 'Open cart',
    langLabel: 'Language',
  },
  hero: {
    ratingSuffix: 'on Google',
    ctaOrder: 'Order now',
    ctaMenu: 'View the menu',
    subline:
      'Authentic Berlin-style döner, fresh off the spit and made with love. Now twice in Bamberg.',
    openNow: 'Open now',
    closedNow: 'Currently closed',
  },
  highlights: {
    fresh: { title: 'Fresh off the spit', sub: 'Prepared fresh every day' },
    direct: { title: 'Order direct, no fees', sub: 'No Lieferando & co.' },
    two: { title: '2× in Bamberg', sub: 'Luitpoldstraße & city centre' },
    since: { title: 'Since 2023', sub: 'Founded with heart' },
  },
  menu: {
    eyebrow: 'Our menu',
    title: 'Freshly made, fairly priced',
    subtitle: 'Everything made fresh. Pick a category and dig in. Tap “+” to add to your cart.',
    all: 'All',
    add: 'Add',
    vegetarian: 'Vegetarian',
    from: 'from',
    challengeCta: 'Take the challenge',
    popular: 'Popular',
  },
  options: {
    title: 'Choose your variation',
    meat: 'Meat',
    sauce: 'Sauce',
    addToCart: 'Add to cart',
    cancel: 'Cancel',
  },
  cart: {
    title: 'Your cart',
    empty: 'Your cart is still empty.',
    emptyHint: 'Add a few tasty things from the menu.',
    subtotal: 'Subtotal',
    checkout: 'Checkout',
    remove: 'Remove',
    items: 'items',
    continue: 'Keep browsing',
  },
  checkout: {
    title: 'Checkout',
    pickup: 'Pickup',
    delivery: 'Delivery',
    pickupAt: 'Pickup at the shop',
    name: 'Name',
    namePlaceholder: 'John Smith',
    phone: 'Phone',
    phonePlaceholder: '0151 23456789',
    location: 'Choose a shop',
    summary: 'Order summary',
    total: 'Total',
    pay: 'Pay by card',
    paying: 'Processing payment …',
    secure: 'Secure payment',
    demoNote: 'Demo, no real payment',
    back: 'Back',
    addressLabel: 'Delivery address',
    addressPlaceholder: 'Street, no., postcode',
    cardDetails: 'Card details',
  },
  success: {
    title: 'Order confirmed!',
    message: 'Thank you! Your order has reached us and is being freshly prepared.',
    orderNo: 'Order number',
    pickupInfo: 'You’ll get a text as soon as everything is ready.',
    demoNote: 'Demo: no real order was placed and nothing was charged.',
    done: 'Done',
  },
  about: {
    eyebrow: 'Our story',
    title: 'Berlin döner love in Bamberg',
    p1: 'Bamberger Döner grew from one simple idea: to bring the real, honest taste of Berlin street döner to Bamberg. Generous portions, fresh ingredients and meat sliced fresh off the spit all day long.',
    p2: 'Since December 2023 we’ve been on Luitpoldstraße, right by the main station. One shop quickly turned into a crowd of regulars and, in 2026, a second shop in the heart of the city. Family-run, with lots of heart and even more sauce. ❤️',
    p3: 'Our promise stays the same: fresh, fair and friendly. Order directly with us, with no fees and no detours.',
    statRating: 'Google rating',
    statShops: 'shops in Bamberg',
    statSince: 'in the heart of Bamberg',
  },
  gallery: {
    eyebrow: 'Gallery',
    title: 'Made to crave',
    subtitle: 'A little taste of what’s waiting for you.',
  },
  reviews: {
    eyebrow: 'Reviews',
    title: 'What our guests say',
    googleBadge: 'on Google',
    reviewsWord: 'reviews',
  },
  loyalty: {
    eyebrow: 'Loyalty program',
    title: 'Collect stamps, score a free döner',
    subtitle: 'Collect 10 stamps, 1 döner free. Every order brings you closer.',
    progress: 'stamps collected',
    reward: 'Free döner',
    cta: 'Activate digital stamp card',
    almost: 'Only {n} more to your free döner!',
  },
  locations: {
    eyebrow: 'Locations',
    title: 'Twice here for you in Bamberg',
    call: 'Call',
    directions: 'Directions',
    hours: 'Opening hours',
    mapHint: 'Map view',
  },
  newsletter: {
    title: 'Stay in the loop',
    subtitle: 'New deals, free-döner giveaways and news, straight to your inbox.',
    placeholder: 'Your email address',
    button: 'Sign up',
    success: 'Thanks for signing up! ❤️',
    successHint: 'We’ll be in touch with tasty news.',
  },
  footer: {
    tagline: 'Authentic Berlin döner, fresh off the spit, now twice in Bamberg.',
    contact: 'Contact',
    hours: 'Opening hours',
    locations: 'Locations',
    follow: 'Follow us',
    rights: 'All rights reserved.',
    demo: 'Demo website, built for illustration. No real orders or payments.',
  },
  common: {
    commissionFree: 'Order directly with us, no fees',
    close: 'Close',
  },
}

const tr: typeof de = {
  nav: {
    menu: 'Menü',
    locations: 'Şubeler',
    about: 'Hakkımızda',
    gallery: 'Galeri',
    order: 'Şimdi sipariş ver',
    openCart: 'Sepeti aç',
    langLabel: 'Dil',
  },
  hero: {
    ratingSuffix: "Google'da",
    ctaOrder: 'Şimdi sipariş ver',
    ctaMenu: 'Menüye göz at',
    subline:
      "Berlin usulü gerçek döner, şişten taze ve sevgiyle hazırlanır. Artık Bamberg'de iki şubede.",
    openNow: 'Şu an açık',
    closedNow: 'Şu an kapalı',
  },
  highlights: {
    fresh: { title: 'Şişten taze', sub: 'Her gün taze hazırlanır' },
    direct: { title: 'Doğrudan sipariş, komisyon yok', sub: 'Lieferando vb. olmadan' },
    two: { title: "2× Bamberg'de", sub: 'Luitpoldstraße & şehir merkezi' },
    since: { title: "2023'ten beri", sub: 'Yürekten kurulduk' },
  },
  menu: {
    eyebrow: 'Menümüz',
    title: 'Taze yapılır, fiyatı uygun',
    subtitle: 'Her şey taze hazırlanır. Kategorini seç ve başla. Sepete eklemek için „+" simgesine dokun.',
    all: 'Hepsi',
    add: 'Ekle',
    vegetarian: 'Vejetaryen',
    from: 'başlangıç',
    challengeCta: 'Meydan okumayı kabul et',
    popular: 'Popüler',
  },
  options: {
    title: 'Seçimini yap',
    meat: 'Et',
    sauce: 'Sos',
    addToCart: 'Sepete ekle',
    cancel: 'Vazgeç',
  },
  cart: {
    title: 'Sepetin',
    empty: 'Sepetin henüz boş.',
    emptyHint: 'Menüden birkaç lezzet ekle.',
    subtotal: 'Ara toplam',
    checkout: 'Ödemeye geç',
    remove: 'Kaldır',
    items: 'ürün',
    continue: 'Alışverişe devam et',
  },
  checkout: {
    title: 'Ödeme',
    pickup: 'Gel al',
    delivery: 'Teslimat',
    pickupAt: 'Şubeden teslim',
    name: 'İsim',
    namePlaceholder: 'Ali Yılmaz',
    phone: 'Telefon',
    phonePlaceholder: '0151 23456789',
    location: 'Şube seç',
    summary: 'Sipariş özeti',
    total: 'Toplam',
    pay: 'Kartla öde',
    paying: 'Ödeme işleniyor …',
    secure: 'Güvenli ödeme',
    demoNote: 'Demo, gerçek ödeme yok',
    back: 'Geri',
    addressLabel: 'Teslimat adresi',
    addressPlaceholder: 'Cadde, no, posta kodu',
    cardDetails: 'Kart bilgileri',
  },
  success: {
    title: 'Sipariş onaylandı!',
    message: 'Teşekkürler! Siparişin bize ulaştı ve taptaze hazırlanıyor.',
    orderNo: 'Sipariş numarası',
    pickupInfo: 'Her şey hazır olunca SMS alacaksın.',
    demoNote: 'Demo: gerçek bir sipariş oluşturulmadı ve ücret alınmadı.',
    done: 'Tamam',
  },
  about: {
    eyebrow: 'Hikayemiz',
    title: "Berlin döner aşkı Bamberg'de",
    p1: "Bamberger Döner basit bir fikirden doğdu: Berlin sokak dönerinin gerçek, dürüst lezzetini Bamberg'e getirmek. Bol porsiyonlar, taze malzemeler ve gün boyu şişten taze kesilen et.",
    p2: "Aralık 2023'ten beri Luitpoldstraße'deyiz, tren garının hemen yanında. Tek dükkan kısa sürede kalabalık bir müdavim kitlesine, 2026'da ise şehir merkezinde ikinci bir şubeye dönüştü. Aile işletmesi; bol sevgi, daha da bol sos. ❤️",
    p3: 'Sözümüz aynı: taze, dürüst ve güler yüzlü. Siparişini doğrudan bizden ver; komisyon yok, aracı yok.',
    statRating: 'Google puanı',
    statShops: "Bamberg'de şube",
    statSince: "Bamberg'in kalbinde",
  },
  gallery: {
    eyebrow: 'Galeri',
    title: 'İştah açan kareler',
    subtitle: 'Seni nelerin beklediğine dair küçük bir tadımlık.',
  },
  reviews: {
    eyebrow: 'Yorumlar',
    title: 'Misafirlerimiz ne diyor',
    googleBadge: "Google'da",
    reviewsWord: 'yorum',
  },
  loyalty: {
    eyebrow: 'Sadakat programı',
    title: 'Damga topla, bedava döner kazan',
    subtitle: '10 damga topla, 1 döner bedava. Her sipariş seni hedefe yaklaştırır.',
    progress: 'damga toplandı',
    reward: 'Bedava döner',
    cta: 'Dijital damga kartını etkinleştir',
    almost: 'Bedava dönerine sadece {n} sipariş kaldı!',
  },
  locations: {
    eyebrow: 'Şubeler',
    title: "Bamberg'de iki adreste yanındayız",
    call: 'Ara',
    directions: 'Yol tarifi',
    hours: 'Çalışma saatleri',
    mapHint: 'Harita görünümü',
  },
  newsletter: {
    title: 'Haberdar ol',
    subtitle: 'Yeni kampanyalar, bedava döner çekilişleri ve haberler, doğrudan e-postana.',
    placeholder: 'E-posta adresin',
    button: 'Kayıt ol',
    success: 'Kaydolduğun için teşekkürler! ❤️',
    successHint: 'Lezzetli haberlerle döneceğiz.',
  },
  footer: {
    tagline: "Şişten taze, Berlin usulü gerçek döner; şimdi Bamberg'de iki şubede.",
    contact: 'İletişim',
    hours: 'Çalışma saatleri',
    locations: 'Şubeler',
    follow: 'Bizi takip et',
    rights: 'Tüm hakları saklıdır.',
    demo: 'Demo web sitesi, yalnızca tanıtım amaçlıdır. Gerçek sipariş veya ödeme yoktur.',
  },
  common: {
    commissionFree: 'Doğrudan bizden sipariş ver, komisyon yok',
    close: 'Kapat',
  },
}

export const strings: Record<Lang, typeof de> = { de, en, tr }
export type Dict = typeof de

/* ========================================================================== */
/*  7b. HELPERS (no need to edit)                                             */
/* ========================================================================== */

/** German-style currency formatting (e.g. "6,50 €"); Turkish shares it. */
export const formatPrice = (value: number, lang: Lang): string =>
  new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)

/** Today's opening string + a simple open/closed flag for the hero badge. */
export function getTodayHours(lang: Lang): { label: string; open: boolean } {
  const now = new Date()
  const day = now.getDay()
  const block = business.hours.find((h) => h.weekdays.includes(day)) ?? business.hours[0]
  const minutes = now.getHours() * 60 + now.getMinutes()
  const openFrom = 10 * 60 + 30
  const closeAt = block.close === '00:00' ? 24 * 60 : 23 * 60
  const open = minutes >= openFrom && minutes < closeAt
  const prefix = lang === 'de' ? 'Heute' : lang === 'tr' ? 'Bugün' : 'Today'
  return { label: `${prefix} ${block.time}`, open }
}
