import Navbar from './components/Navbar'
import Hero from './components/Hero'
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

export default function App() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main>
        <Hero />
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

      {/* Global order overlay (cart → checkout → success) */}
      <CartDrawer />
    </div>
  )
}
