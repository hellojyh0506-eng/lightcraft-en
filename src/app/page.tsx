import Link from 'next/link'
import { ArrowRight, Check, Upload, Wand2, Download } from 'lucide-react'
import { FAQSection } from '@/components/faq-section'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { FadeInSection } from '@/components/fade-in-section'

const TRANSFORMS = [
  { before: '/showcase-edit/real/ugly-watch.jpg', after: '/showcase-edit/real/ugly-watch-after.jpg', label: 'Watch', desc: 'Kitchen table → Boutique ad' },
  { before: '/showcase-edit/real/ugly-shoe.jpg', after: '/showcase-edit/real/ugly-shoe-after.jpg', label: 'Sneaker', desc: 'Bedroom snapshot → White background hero' },
  { before: '/showcase-edit/real/ugly-cup.jpg', after: '/showcase-edit/real/ugly-cup-after.jpg', label: 'Coffee Mug', desc: 'Kitchen snapshot → E-commerce hero' },
  { before: '/showcase-edit/real/ugly-bag.jpg', after: '/showcase-edit/real/ugly-bag-after.jpg', label: 'Handbag', desc: 'Cluttered desk → Brand showcase' },
]

const GALLERY = [
  '/showcase-gen/food-hotpot.jpg', '/showcase-gen/jewelry-ring.jpg',
  '/showcase-gen/pet-cat.jpg', '/showcase-gen/flower-bouquet.jpg',
  '/showcase-gen/drink-matcha.jpg', '/showcase-gen/fashion-sneaker.jpg',
  '/showcase-gen/beauty-skincare.jpg', '/showcase-gen/bakery-bread.jpg',
  '/showcase-gen/home-living.jpg', '/showcase-gen/food-noodle.jpg',
  '/showcase-gen/fashion-dress.jpg', '/showcase-gen/tech-earbuds.jpg',
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-noir-950 overflow-hidden">
      <Navbar variant="landing" />

      {/* ═══ HERO — Before/After visual impact ═══ */}
      <section className="relative flex flex-col justify-start sm:min-h-screen sm:justify-center noise-overlay bg-aurora">
        {/* Main content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 sm:pt-24 pb-10 sm:pb-16">
          {/* Top badge */}
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/8 border border-gold-400/15 mb-6 sm:mb-10 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <span className="font-body text-xs text-gold-300/80 tracking-wide">Verify your email for 50 free credits · Try all features now</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl sm:text-[5.5rem] font-light leading-[1.05] tracking-wide mb-4 sm:mb-6 animate-slide-up">
              <span className="text-noir-50">Your phone photos</span><br />
              <span className="text-gradient-gold">can look premium</span>
            </h1>
            <p className="font-body text-noir-300 text-sm sm:text-lg max-w-md mx-auto leading-relaxed mb-8 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              Upload a quick snapshot. AI swaps the background, creates stunning images, and makes videos.<br className="hidden sm:block" />
              Ready for your shop and social media — no designer needed.
            </p>
          </div>

          {/* Hero core: Large Before/After comparison */}
          <div className="max-w-4xl mx-auto mb-8 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="grid grid-cols-2 gap-2 sm:gap-5">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-noir-800 border border-noir-700/50 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TRANSFORMS[0].before} alt="Before editing" className="w-full h-full object-cover" />
                <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-noir-950/80 backdrop-blur-sm font-body text-xs text-noir-300">
                  Phone snapshot
                </span>
              </div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-gold-400/20 shadow-2xl shadow-gold-400/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TRANSFORMS[0].after} alt="After editing" className="w-full h-full object-contain p-4" />
                <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-gold-400/15 backdrop-blur-sm font-body text-xs text-gold-400">
                  AI-generated result
                </span>
              </div>
            </div>
            <p className="text-center font-body text-sm text-noir-500 mt-4">Same product — AI only swaps the background, every detail stays intact</p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center gap-5 mb-4 animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <Link href="/studio" className="btn-shine group inline-flex items-center gap-2.5 bg-gold-400 text-noir-950 font-body font-semibold px-10 py-4 rounded-full hover:bg-gold-300 hover:shadow-xl hover:shadow-gold-400/20 transition-all text-base tracking-wide">
              Try Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/pricing" className="font-body text-sm text-noir-400 hover:text-gold-400 transition-colors">See Pricing →</Link>
          </div>
          <p className="text-center font-body text-[11px] text-noir-600 animate-fade-in" style={{ animationDelay: '0.4s' }}>No download required · Use online · HD without watermark</p>
        </div>
      </section>

      {/* ═══ More comparison examples ═══ */}
      <section className="relative py-28 sm:py-36 noise-overlay">
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="font-body text-[11px] text-gold-400/50 uppercase tracking-[0.35em] mb-5">Real Results</p>
            <h2 className="font-display text-4xl sm:text-6xl font-light text-noir-50 tracking-wide leading-tight">
              Quick snap<span className="text-gold-400/80">,</span> stunning result
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 sm:gap-8">
            {TRANSFORMS.slice(1).map((t) => (
              <div key={t.label} className="card-glow group rounded-xl border border-noir-700/30 p-3 bg-noir-900/50">
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <div className="aspect-square rounded-lg overflow-hidden bg-noir-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.before} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="aspect-square rounded-lg overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.after} alt="" loading="lazy" className="w-full h-full object-contain p-1" />
                  </div>
                </div>
                <p className="font-display text-sm text-noir-100">{t.label}</p>
                <p className="font-body text-[11px] text-noir-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AI image generation showcase ═══ */}
      <section className="py-28 sm:py-36">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="font-body text-[11px] text-gold-400/50 uppercase tracking-[0.35em] mb-5">AI Generated</p>
            <h2 className="font-display text-4xl sm:text-6xl font-light text-noir-50 tracking-wide">No photo? AI creates one</h2>
            <p className="font-body text-noir-400 text-sm mt-4">Type a description, get a commercial-grade product image — completely free</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {GALLERY.map((src, i) => (
              <div key={i} className="card-glow group relative aspect-square rounded-xl overflow-hidden border border-noir-800/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
            ))}
          </div>
          <p className="text-center font-body text-[11px] text-noir-600 mt-8">All images above are AI-generated</p>
        </div>
      </section>

      {/* ═══ Three core capabilities ═══ */}
      <FadeInSection>
      <section className="py-28 sm:py-36 noise-overlay">
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="font-body text-[11px] text-gold-400/50 uppercase tracking-[0.35em] mb-5">Core Features</p>
            <h2 className="font-display text-4xl sm:text-6xl font-light text-noir-50 tracking-wide">One tool, three powers</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden">
            {[
              { title: 'Edit', price: '3 credits/image', sub: 'White background · Cutout · Remove watermark · Enhance', body: 'Upload a phone photo of your product. AI keeps the product intact, only swaps the background.' },
              { title: 'Generate', price: '2 credits/image', sub: 'Text description → Commercial product image', body: 'No photo? No problem. Type a description and AI creates one for you.' },
              { title: 'Video', price: '10-30 credits', sub: 'One image → Marketing short video', body: 'Turn a product photo into a cinematic video — ready for TikTok and Instagram.' },
            ].map((c) => (
              <div key={c.title} className="bg-noir-900 p-10 sm:p-14 hover:bg-noir-800/60 transition-colors duration-700">
                <div className="flex items-baseline justify-between mb-8">
                  <h3 className="font-display text-5xl font-light text-noir-50">{c.title}</h3>
                  <span className="font-body text-xs text-gold-400 bg-gold-400/8 px-3 py-1 rounded-full">{c.price}</span>
                </div>
                <p className="font-body text-xs text-gold-400/40 tracking-wider mb-3">{c.sub}</p>
                <p className="font-body text-sm text-noir-400 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </FadeInSection>

      {/* ═══ Three steps ═══ */}
      <FadeInSection>
      <section className="py-28 sm:py-36">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="font-body text-[11px] text-gold-400/50 uppercase tracking-[0.35em] mb-5">How It Works</p>
            <h2 className="font-display text-4xl sm:text-6xl font-light text-noir-50 tracking-wide">Three simple steps</h2>
          </div>
          {[
            { n: '01', icon: Upload, t: 'Upload', d: 'Take a photo and drag it in' },
            { n: '02', icon: Wand2, t: 'Choose', d: 'White background, generate image, or make video — pick one' },
            { n: '03', icon: Download, t: 'Download', d: 'Results in seconds — save and use right away' },
          ].map(({ n, icon: I, t, d }, i) => (
            <div key={n} className={`flex items-center gap-8 py-10 ${i > 0 ? 'border-t border-noir-800/60' : ''}`}>
              <span className="font-display text-4xl text-noir-800 w-16 shrink-0 text-right">{n}</span>
              <div className="w-11 h-11 rounded-xl bg-gold-400/[0.05] flex items-center justify-center shrink-0">
                <I className="w-5 h-5 text-gold-400/60" />
              </div>
              <div>
                <h3 className="font-display text-xl text-noir-100 mb-0.5">{t}</h3>
                <p className="font-body text-sm text-noir-500">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </FadeInSection>

      {/* ═══ Bottom CTA ═══ */}
      <FadeInSection>
      <section className="py-32 sm:py-40 noise-overlay bg-aurora">
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl sm:text-6xl font-light text-noir-50 tracking-wide leading-tight mb-8">
            Your competitors&apos; photos<br /><span className="text-gradient-gold">look more expensive. Why?</span>
          </h2>
          <p className="font-body text-noir-400 text-base mb-14 max-w-sm mx-auto leading-relaxed">
            50 free credits to get started. No install needed — works right in your browser.
          </p>
          <Link href="/studio" className="btn-shine group inline-flex items-center gap-2.5 bg-gold-400 text-noir-950 font-body font-semibold px-12 py-4.5 rounded-full hover:bg-gold-300 hover:shadow-xl hover:shadow-gold-400/20 transition-all text-base tracking-wide">
            Start Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-14 text-noir-500">
            {['50 free credits', 'No install needed', 'HD without watermark', 'Cancel anytime'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-gold-400/30" />
                <span className="font-body text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      </FadeInSection>

      <FadeInSection><FAQSection /></FadeInSection>
      <Footer />
    </div>
  )
}
