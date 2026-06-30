import { images } from './images'
import type { LocalizedText } from './menu'

export type Lang = 'de' | 'en'

/**
 * ============================================================================
 *  BUSINESS FACTS  (verified — safe to show the owner)
 * ============================================================================
 *  To edit addresses, phone, hours or rating, change the values here only.
 * ============================================================================
 */
export const business = {
  name: 'Bamberger Döner',
  slogan: {
    de: 'Dönergeschmack aus Berlin in Bamberg',
    en: 'The taste of Berlin döner — now in Bamberg',
  } as LocalizedText,
  phoneDisplay: '+49 951 91700610',
  phoneHref: 'tel:+4995191700610',
  rating: 4.7,
  ratingCount: 480,
  since: 2023,
  instagram: '#',
  facebook: '#',

  // Sun–Wed 10:30–23:00, Thu–Sat 10:30–00:00
  hours: [
    {
      days: { de: 'So – Mi', en: 'Sun – Wed' } as LocalizedText,
      time: '10:30 – 23:00',
      // weekday indexes (0 = Sunday)
      weekdays: [0, 1, 2, 3],
      close: '23:00',
    },
    {
      days: { de: 'Do – Sa', en: 'Thu – Sat' } as LocalizedText,
      time: '10:30 – 00:00',
      weekdays: [4, 5, 6],
      close: '00:00',
    },
  ],

  locations: [
    {
      id: 'luitpold',
      name: { de: 'Luitpoldstraße', en: 'Luitpoldstraße' } as LocalizedText,
      address: 'Luitpoldstraße 39',
      city: '96052 Bamberg',
      note: {
        de: 'Hauptfiliale · direkt am Hauptbahnhof / S-Bahn',
        en: 'Main shop · right by the main station / S-Bahn',
      } as LocalizedText,
      opened: {
        de: 'Seit Dezember 2023',
        en: 'Open since December 2023',
      } as LocalizedText,
      image: images.locationLuitpold,
    },
    {
      id: 'franz-ludwig',
      name: { de: 'Franz-Ludwig-Straße', en: 'Franz-Ludwig-Straße' } as LocalizedText,
      address: 'Franz-Ludwig-Straße',
      city: 'Bamberg',
      note: {
        de: 'Neue Filiale · mitten in der Innenstadt',
        en: 'New shop · right in the city centre',
      } as LocalizedText,
      opened: {
        de: 'Neu eröffnet · Januar 2026',
        en: 'Newly opened · January 2026',
      } as LocalizedText,
      image: images.locationFranzLudwig,
    },
  ],
}

export type Location = (typeof business.locations)[number]

/**
 * Returns today's opening string + a simple open/closed flag.
 * (Lightweight, demo-grade — good enough for the "today's hours" badge.)
 */
export function getTodayHours(lang: Lang): { label: string; open: boolean } {
  const now = new Date()
  const day = now.getDay()
  const block = business.hours.find((h) => h.weekdays.includes(day)) ?? business.hours[0]
  const minutes = now.getHours() * 60 + now.getMinutes()
  const openFrom = 10 * 60 + 30
  // close at 23:00 or "00:00" (treated as 24:00 for same-day comparison)
  const closeAt = block.close === '00:00' ? 24 * 60 : 23 * 60
  const open = minutes >= openFrom && minutes < closeAt
  const prefix = lang === 'de' ? 'Heute' : 'Today'
  return { label: `${prefix} ${block.time}`, open }
}

/**
 * ============================================================================
 *  TESTIMONIALS  (realistic German review snippets)
 * ============================================================================
 */
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
    },
  },
  {
    name: 'Jonas R.',
    initials: 'JR',
    location: 'Student, Uni Bamberg',
    text: {
      de: 'Frisch, schnell und super freundlich. Das Fleisch kommt direkt vom Spieß und ist immer saftig. Mein fester Spot nach der Vorlesung.',
      en: 'Fresh, fast and super friendly. The meat comes straight off the spit and is always juicy. My go-to spot after lectures.',
    },
  },
  {
    name: 'Sandra L.',
    initials: 'SL',
    location: 'Bamberg',
    text: {
      de: 'Endlich echter Berliner Döner in Bamberg! Faire Preise, top Qualität und das Team ist mega herzlich. Klare Empfehlung.',
      en: 'Finally real Berlin döner in Bamberg! Fair prices, top quality and the team is so warm. Highly recommend.',
    },
  },
  {
    name: 'Kerem Y.',
    initials: 'KY',
    location: 'Bamberg',
    text: {
      de: 'Die Big Döner Challenge habe ich (knapp) geschafft 😅 Riesige Portion, klasse Geschmack. Hier stimmt einfach alles.',
      en: 'I (barely) finished the Big Döner Challenge 😅 Massive portion, great taste. Everything here is just right.',
    },
  },
]

/**
 * ============================================================================
 *  UI STRINGS  (German first, English toggle)
 * ============================================================================
 */
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
      'Echter Berliner Döner – frisch vom Drehspieß, mit Liebe gemacht. Jetzt zweimal in Bamberg.',
    openNow: 'Jetzt geöffnet',
    closedNow: 'Gerade geschlossen',
  },
  highlights: {
    fresh: { title: 'Frisch vom Drehspieß', sub: 'Jeden Tag frisch zubereitet' },
    direct: { title: 'Direkt bestellen – keine Gebühren', sub: 'Ohne Lieferando & Co.' },
    two: { title: '2× in Bamberg', sub: 'Luitpoldstraße & Innenstadt' },
    since: { title: 'Seit 2023', sub: 'Mit Herz gegründet' },
  },
  menu: {
    eyebrow: 'Unsere Speisekarte',
    title: 'Frisch gemacht, fair im Preis',
    subtitle:
      'Alles frisch zubereitet – wähle deine Kategorie und leg los. Tippe auf „+“, um in den Warenkorb zu legen.',
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
    demoNote: 'Demo – keine echte Zahlung',
    back: 'Zurück',
  },
  success: {
    title: 'Bestellung bestätigt!',
    message: 'Vielen Dank! Deine Bestellung ist bei uns eingegangen und wird frisch zubereitet.',
    orderNo: 'Bestellnummer',
    pickupInfo: 'Du bekommst eine SMS, sobald alles fertig ist.',
    demoNote: 'Demo – es wurde keine echte Bestellung ausgelöst und nichts berechnet.',
    done: 'Fertig',
  },
  about: {
    eyebrow: 'Unsere Geschichte',
    title: 'Berliner Döner-Liebe in Bamberg',
    p1: 'Bamberger Döner ist aus einer einfachen Idee entstanden: den echten, ehrlichen Geschmack des Berliner Straßen-Döners nach Bamberg zu bringen. Großzügige Portionen, frische Zutaten und Fleisch, das den ganzen Tag frisch vom Drehspieß geschnitten wird.',
    p2: 'Seit Dezember 2023 stehen wir in der Luitpoldstraße – direkt am Hauptbahnhof. Aus einem Laden wurden schnell viele Stammgäste und 2026 ein zweiter Standort mitten in der Innenstadt. Familiär geführt, mit viel Herz und noch mehr Soße. ❤️',
    p3: 'Unser Versprechen bleibt: frisch, fair und freundlich. Bestell direkt bei uns – ohne Gebühren, ohne Umwege.',
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
    subtitle: 'Neue Aktionen, Gratis-Döner-Gewinnspiele und Neuigkeiten – direkt in dein Postfach.',
    placeholder: 'Deine E-Mail-Adresse',
    button: 'Anmelden',
    success: 'Danke fürs Anmelden! ❤️',
    successHint: 'Wir melden uns mit leckeren Neuigkeiten.',
  },
  footer: {
    tagline: 'Echter Berliner Döner, frisch vom Drehspieß – jetzt zweimal in Bamberg.',
    contact: 'Kontakt',
    hours: 'Öffnungszeiten',
    locations: 'Standorte',
    follow: 'Folge uns',
    rights: 'Alle Rechte vorbehalten.',
    demo: 'Demo-Website – zur Veranschaulichung erstellt. Keine echten Bestellungen oder Zahlungen.',
  },
  common: {
    commissionFree: 'Bestell direkt bei uns – ohne Gebühren',
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
      'Authentic Berlin-style döner – fresh off the spit, made with love. Now twice in Bamberg.',
    openNow: 'Open now',
    closedNow: 'Currently closed',
  },
  highlights: {
    fresh: { title: 'Fresh off the spit', sub: 'Prepared fresh every day' },
    direct: { title: 'Order direct – no fees', sub: 'No Lieferando & co.' },
    two: { title: '2× in Bamberg', sub: 'Luitpoldstraße & city centre' },
    since: { title: 'Since 2023', sub: 'Founded with heart' },
  },
  menu: {
    eyebrow: 'Our menu',
    title: 'Freshly made, fairly priced',
    subtitle:
      'Everything made fresh – pick a category and dig in. Tap “+” to add to your cart.',
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
    demoNote: 'Demo – no real payment',
    back: 'Back',
  },
  success: {
    title: 'Order confirmed!',
    message: 'Thank you! Your order has reached us and is being freshly prepared.',
    orderNo: 'Order number',
    pickupInfo: 'You’ll get a text as soon as everything is ready.',
    demoNote: 'Demo – no real order was placed and nothing was charged.',
    done: 'Done',
  },
  about: {
    eyebrow: 'Our story',
    title: 'Berlin döner love in Bamberg',
    p1: 'Bamberger Döner grew from one simple idea: to bring the real, honest taste of Berlin street döner to Bamberg. Generous portions, fresh ingredients and meat sliced fresh off the spit all day long.',
    p2: 'Since December 2023 we’ve been on Luitpoldstraße – right by the main station. One shop quickly turned into a crowd of regulars and, in 2026, a second shop in the heart of the city. Family-run, with lots of heart and even more sauce. ❤️',
    p3: 'Our promise stays the same: fresh, fair and friendly. Order directly with us – no fees, no detours.',
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
    subtitle: 'New deals, free-döner giveaways and news – straight to your inbox.',
    placeholder: 'Your email address',
    button: 'Sign up',
    success: 'Thanks for signing up! ❤️',
    successHint: 'We’ll be in touch with tasty news.',
  },
  footer: {
    tagline: 'Authentic Berlin döner, fresh off the spit – now twice in Bamberg.',
    contact: 'Contact',
    hours: 'Opening hours',
    locations: 'Locations',
    follow: 'Follow us',
    rights: 'All rights reserved.',
    demo: 'Demo website – built for illustration. No real orders or payments.',
  },
  common: {
    commissionFree: 'Order directly with us – no fees',
    close: 'Close',
  },
}

export const strings: Record<Lang, typeof de> = { de, en }
export type Dict = typeof de
