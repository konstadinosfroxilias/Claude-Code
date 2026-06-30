/**
 * ============================================================================
 *  BAMBERGER DÖNER — IMAGE CONFIG
 * ============================================================================
 *
 *  ALL imagery for the whole site lives here, in one place.
 *
 *  HOW TO SWAP IN THE REAL RESTAURANT PHOTOS LATER
 *  -----------------------------------------------
 *  Every value below is just a URL string. To use the client's own photos:
 *
 *    1. Drop the photo files into  /public/photos/   (e.g. doner-kebab.jpg)
 *    2. Replace the matching URL with an absolute path, e.g.
 *         donerKebab: '/photos/doner-kebab.jpg',
 *    3. Done — nothing else in the codebase needs to change.
 *
 *  The current images are high-quality, royalty-free Unsplash food photos
 *  used as realistic stand-ins for the pitch. They are NOT the restaurant's
 *  real photos and should be replaced before go-live.
 *
 *  (We deliberately do NOT hotlink the restaurant's Instagram photos.)
 * ============================================================================
 */

// Helper: build a sized, auto-formatted Unsplash URL from a photo id.
const ux = (id: string, w = 800, q = 80): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`

export const images = {
  /* ---- Hero & brand atmosphere ---- */
  hero: ux('1633896949673-1eb9d131a9b4', 1700, 80), // flame-grilled dürüm — showstopper
  heroSecondary: ux('1529006557810-274b9b2fc783', 1200), // loaded döner box
  grill: ux('1628294895950-9805252327bc', 1400), // marinated meat on the grill
  aboutInterior: ux('1552566626-52f8b828add9', 1200), // warm shop interior

  /* ---- Menu: Döner & Dürüm ---- */
  donerKebab: ux('1561651823-34feb02250e4'),
  durumDoner: ux('1626700051175-6818013e1d4f'),
  donerBox: ux('1529006557810-274b9b2fc783'),
  bigDonerChallenge: ux('1626074353765-517a681e40be', 1100), // mountain of grilled meat

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

  /* ---- Gallery (responsive grid) ---- */
  gallery: [
    ux('1633896949673-1eb9d131a9b4', 900), // flame dürüm
    ux('1628294895950-9805252327bc', 900), // grill
    ux('1529006557810-274b9b2fc783', 900), // döner box
    ux('1626074353765-517a681e40be', 900), // grilled meat
    ux('1594007654729-407eedc4be65', 900), // lahmacun
    ux('1630384060421-cb20d0e0649d', 900), // pommes
    ux('1610057099431-d73a1c9d2f2f', 900), // teller
    ux('1552566626-52f8b828add9', 900), // interior
    ux('1540420773420-3366772f4999', 900), // salad
  ],

  /* ---- Locations (small interior thumbnails) ---- */
  locationLuitpold: ux('1517248135467-4c7edcad34c4', 800),
  locationFranzLudwig: ux('1552566626-52f8b828add9', 800),
} as const

export type ImageKey = keyof typeof images
