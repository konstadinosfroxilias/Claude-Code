import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import Highlights from './components/Highlights'
import Menu from './components/Menu'
import About from './components/About'
import Gallery from './components/Gallery'
import Reviews from './components/Reviews'
import Loyalty from './components/Loyalty'
import Locations from './components/Locations'
import Newsletter from './components/Newsletter'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ScrollProgress from './components/ScrollProgress'
import MobileOrderBar from './components/MobileOrderBar'

export default function App() {
  return (
    <div className="relative min-h-screen bg-cream">
      <ScrollProgress />

      {/* page-wide film grain for a premium, tactile finish */}
      <div
        className="pointer-events-none fixed inset-0 z-[90] opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Highlights />
        <Menu />
        <About />
        <Gallery />
        <Reviews />
        <Loyalty />
        <Locations />
        <Newsletter />
      </main>
      <Footer />

      {/* Sticky mobile "order" bar (phones only, appears when cart has items) */}
      <MobileOrderBar />

      {/* Global order overlay (cart → checkout → success) */}
      <CartDrawer />
    </div>
  )
}
