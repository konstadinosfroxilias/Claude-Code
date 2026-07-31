import { motion } from 'framer-motion'
import { useLang } from '../context/LanguageContext'
import { images } from '../data/content'
import SmartImage from './SmartImage'

// a few tiles get larger spans for a livelier, magazine-style grid
const spanFor = (i: number) =>
  i === 0
    ? 'col-span-2 row-span-2'
    : i === 5
      ? 'col-span-2'
      : ''

export default function Gallery() {
  const { t } = useLang()

  return (
    <section id="galerie" className="scroll-mt-20 bg-cream py-16 dark:bg-charcoal sm:py-24">
      <div className="container-px">
        <div className="max-w-2xl">
          <span className="eyebrow">{t.gallery.eyebrow}</span>
          <h2 className="section-title mt-3">{t.gallery.title}</h2>
          <p className="mt-3 text-charcoal/70 dark:text-cream/70">{t.gallery.subtitle}</p>
        </div>

        <div className="mt-8 grid auto-rows-[120px] grid-cols-2 gap-2.5 sm:auto-rows-[160px] sm:gap-4 md:grid-cols-4">
          {images.gallery.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.35, delay: (i % 4) * 0.05 }}
              className={`group overflow-hidden rounded-3xl shadow-soft ${spanFor(i)}`}
            >
              <SmartImage
                src={src}
                alt={`Bamberger Döner Galerie ${i + 1}`}
                className="h-full w-full"
                imgClassName="transition-transform duration-700 group-hover:scale-110"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
