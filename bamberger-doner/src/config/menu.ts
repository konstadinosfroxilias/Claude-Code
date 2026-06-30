import { images } from './images'

/**
 * ============================================================================
 *  MENU DATA
 * ============================================================================
 *  NOTE TO CLIENT: all prices below are ESTIMATES and must be confirmed with
 *  the owner before go-live. To edit: change the `price` (a number in euros),
 *  the `name`/`desc` text, or the `image` key. Everything is in this one file.
 * ============================================================================
 */

export type CategoryId =
  | 'doener'
  | 'teller'
  | 'vegetarisch'
  | 'snacks'
  | 'getraenke'

export interface LocalizedText {
  de: string
  en: string
}

export interface Option {
  id: string
  label: LocalizedText
}

export interface MenuItem {
  id: string
  name: LocalizedText
  desc: LocalizedText
  price: number
  image: string
  category: CategoryId
  vegetarian?: boolean
  /** show inline meat + sauce pickers when adding to cart */
  customizable?: boolean
  /** renders as the large special "Big Döner Challenge" card */
  featured?: boolean
  /** small ribbon, e.g. Bestseller / XXL / Neu */
  tag?: LocalizedText
}

export const categories: { id: CategoryId; label: LocalizedText }[] = [
  { id: 'doener', label: { de: 'Döner & Dürüm', en: 'Döner & Wraps' } },
  { id: 'teller', label: { de: 'Teller', en: 'Plates' } },
  { id: 'vegetarisch', label: { de: 'Vegetarisch', en: 'Vegetarian' } },
  { id: 'snacks', label: { de: 'Snacks & Beilagen', en: 'Snacks & Sides' } },
  { id: 'getraenke', label: { de: 'Getränke', en: 'Drinks' } },
]

export const meatOptions: Option[] = [
  { id: 'pute', label: { de: 'Pute', en: 'Turkey' } },
  { id: 'rind', label: { de: 'Rind', en: 'Beef' } },
  { id: 'haehnchen', label: { de: 'Hähnchen', en: 'Chicken' } },
]

export const sauceOptions: Option[] = [
  { id: 'kraeuter', label: { de: 'Kräuter', en: 'Herb' } },
  { id: 'knoblauch', label: { de: 'Knoblauch', en: 'Garlic' } },
  { id: 'scharf', label: { de: 'Scharf', en: 'Spicy' } },
]

export const menu: MenuItem[] = [
  /* ---------------------------- Döner & Dürüm ---------------------------- */
  {
    id: 'doner-kebab',
    category: 'doener',
    name: { de: 'Döner Kebab', en: 'Döner Kebab' },
    desc: {
      de: 'Frisch vom Drehspieß, knuspriges Fladenbrot, knackiger Salat und unsere hausgemachte Soße.',
      en: 'Fresh from the spit, crispy flatbread, crunchy salad and our house-made sauce.',
    },
    price: 6.5,
    image: images.donerKebab,
    customizable: true,
    tag: { de: 'Bestseller', en: 'Bestseller' },
  },
  {
    id: 'durum-doner',
    category: 'doener',
    name: { de: 'Dürüm Döner', en: 'Dürüm Wrap' },
    desc: {
      de: 'Saftiges Fleisch im dünnen Yufka-Brot gerollt – perfekt für unterwegs.',
      en: 'Juicy meat rolled in thin yufka bread – perfect on the go.',
    },
    price: 7.5,
    image: images.durumDoner,
    customizable: true,
    tag: { de: 'Beliebt', en: 'Popular' },
  },
  {
    id: 'doner-box',
    category: 'doener',
    name: { de: 'Döner Box mit Pommes', en: 'Döner Box with Fries' },
    desc: {
      de: 'Döner trifft knusprige Pommes – die handliche Box für den großen Hunger.',
      en: 'Döner meets crispy fries – the handy box for a big appetite.',
    },
    price: 6.0,
    image: images.donerBox,
    customizable: true,
  },
  {
    id: 'big-doner-challenge',
    category: 'doener',
    name: { de: 'Big Döner Challenge', en: 'Big Döner Challenge' },
    desc: {
      de: 'Unser legendärer XXL-Döner mit doppelter Portion Fleisch. Schaffst du ihn allein? Wer ihn leert, kommt an unsere Wand der Helden. ❤️',
      en: 'Our legendary XXL döner with a double portion of meat. Can you finish it solo? Empty the box and you make our Wall of Heroes. ❤️',
    },
    price: 15.0,
    image: images.bigDonerChallenge,
    customizable: true,
    featured: true,
    tag: { de: 'XXL', en: 'XXL' },
  },

  /* -------------------------------- Teller ------------------------------- */
  {
    id: 'doner-teller',
    category: 'teller',
    name: {
      de: 'Döner Teller mit Pommes oder Reis',
      en: 'Döner Plate with Fries or Rice',
    },
    desc: {
      de: 'Großzügige Portion Dönerfleisch mit Pommes oder Reis, frischem Salat und Soße.',
      en: 'A generous portion of döner meat with fries or rice, fresh salad and sauce.',
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
    },
    desc: {
      de: 'Knackiger frischer Salat mit zartem Dönerfleisch und cremigem Dressing.',
      en: 'Crunchy fresh salad with tender döner meat and a creamy dressing.',
    },
    price: 9.5,
    image: images.salatTeller,
    customizable: true,
  },

  /* ----------------------------- Vegetarisch ---------------------------- */
  {
    id: 'falafel-durum',
    category: 'vegetarisch',
    name: { de: 'Falafel Dürüm', en: 'Falafel Wrap' },
    desc: {
      de: 'Hausgemachte Falafel, frischer Salat und Sesam-Soße im Yufka gerollt.',
      en: 'House-made falafel, fresh salad and sesame sauce rolled in yufka.',
    },
    price: 6.5,
    image: images.falafelDurum,
    vegetarian: true,
  },
  {
    id: 'falafel-teller',
    category: 'vegetarisch',
    name: { de: 'Falafel Teller', en: 'Falafel Plate' },
    desc: {
      de: 'Goldene Falafel mit cremigem Hummus, buntem Salat und warmem Fladenbrot.',
      en: 'Golden falafel with creamy hummus, colourful salad and warm flatbread.',
    },
    price: 9.0,
    image: images.falafelTeller,
    vegetarian: true,
  },

  /* -------------------------- Snacks & Beilagen ------------------------- */
  {
    id: 'lahmacun',
    category: 'snacks',
    name: { de: 'Lahmacun', en: 'Lahmacun' },
    desc: {
      de: 'Dünn ausgerollter Teig, würzig belegt – türkische Pizza, frisch gebacken.',
      en: 'Thin rolled dough, savoury topping – Turkish-style pizza, freshly baked.',
    },
    price: 4.5,
    image: images.lahmacun,
  },
  {
    id: 'lahmacun-doner',
    category: 'snacks',
    name: { de: 'Lahmacun mit Döner', en: 'Lahmacun with Döner' },
    desc: {
      de: 'Unser Klassiker mit extra Dönerfleisch, frischem Salat und Soße gerollt.',
      en: 'Our classic rolled with extra döner meat, fresh salad and sauce.',
    },
    price: 8.0,
    image: images.lahmacunDoner,
    customizable: true,
  },
  {
    id: 'pommes',
    category: 'snacks',
    name: { de: 'Pommes', en: 'Fries' },
    desc: {
      de: 'Goldgelb, knusprig und frisch frittiert. Mit Ketchup oder Mayo.',
      en: 'Golden, crispy and freshly fried. With ketchup or mayo.',
    },
    price: 3.5,
    image: images.pommes,
    vegetarian: true,
  },

  /* ------------------------------ Getränke ------------------------------ */
  {
    id: 'ayran',
    category: 'getraenke',
    name: { de: 'Ayran', en: 'Ayran' },
    desc: {
      de: 'Erfrischendes Joghurtgetränk – der perfekte Begleiter zum Döner.',
      en: 'Refreshing yoghurt drink – the perfect partner to your döner.',
    },
    price: 2.0,
    image: images.ayran,
    vegetarian: true,
  },
  {
    id: 'fritz-kola',
    category: 'getraenke',
    name: { de: 'Fritz-Kola', en: 'Fritz-Kola' },
    desc: {
      de: 'Eiskalt serviert, mit ordentlich Koffein und Kult-Faktor.',
      en: 'Served ice-cold, with plenty of caffeine and cult status.',
    },
    price: 2.5,
    image: images.fritzKola,
    vegetarian: true,
  },
  {
    id: 'tuerkischer-tee',
    category: 'getraenke',
    name: { de: 'Türkischer Tee', en: 'Turkish Tea' },
    desc: {
      de: 'Traditionell aufgebrüht und im klassischen kleinen Glas serviert.',
      en: 'Traditionally brewed and served in the classic small glass.',
    },
    price: 1.5,
    image: images.tee,
    vegetarian: true,
  },
]

/** German-style currency formatting (e.g. "6,50 €"). */
export const formatPrice = (value: number, lang: 'de' | 'en'): string =>
  new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
