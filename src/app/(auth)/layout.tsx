import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Sign in / Sign up · LightCraft',
  description: 'Sign in to LightCraft, turn your photos into promotional videos',
}

/* Bento grid images — pick warm-toned, multi-category showcase images across industries
   Layout strategy: pets/portraits on top (cropping looks bad), flowers/food on bottom (cropping still looks good) */
const showcaseImages = [
  { src: '/showcase-gen/beauty-skincare.jpg', alt: 'Beauty & Skincare', label: 'Beauty' },
  { src: '/showcase-gen/jewelry-ring.jpg', alt: 'Jewelry Ring', label: 'Jewelry' },
  { src: '/showcase-gen/pet-cat.jpg', alt: 'Pet Cat', label: 'Pets' },
  { src: '/showcase-gen/food-noodle.jpg', alt: 'Food Noodle', label: 'Food' },
  { src: '/showcase-gen/bakery-bread.jpg', alt: 'Bakery Bread', label: 'Bakery' },
  { src: '/showcase-gen/flower-bouquet.jpg', alt: 'Flower Bouquet', label: 'Floristry' },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* ━━━ Left: immersive product showcase (58%) ━━━ */}
      <div className="hidden lg:block lg:w-[58%] relative overflow-hidden bg-noir-950">

        {/* Asymmetric Bento image grid */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-[3px]">
          {/* 1. Beauty — hero visual (2col x 2row, top-left) */}
          <div className="relative col-span-2 row-span-2 overflow-hidden">
            <Image
              src={showcaseImages[0].src}
              alt={showcaseImages[0].alt}
              fill
              sizes="30vw"
              className="object-cover auth-slow-zoom"
              style={{ animationDelay: '0s' }}
              priority
            />
            <div className="absolute inset-0 bg-noir-950/10" />
            <span className="absolute top-4 left-4 font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              {showcaseImages[0].label}
            </span>
          </div>

          {/* 2. Jewelry — top-right single cell */}
          <div className="relative col-span-1 row-span-1 overflow-hidden">
            <Image
              src={showcaseImages[1].src}
              alt={showcaseImages[1].alt}
              fill
              sizes="15vw"
              className="object-cover auth-slow-zoom"
              style={{ animationDelay: '3s' }}
              priority
            />
            <div className="absolute inset-0 bg-noir-950/10" />
            <span className="absolute top-3 left-3 font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              {showcaseImages[1].label}
            </span>
          </div>

          {/* 3. Pets — top-right corner (cat on top, ensure full display without face cropping) */}
          <div className="relative col-span-1 row-span-1 overflow-hidden">
            <Image
              src={showcaseImages[2].src}
              alt={showcaseImages[2].alt}
              fill
              sizes="15vw"
              className="object-cover object-top auth-slow-zoom"
              style={{ animationDelay: '6s' }}
            />
            <div className="absolute inset-0 bg-noir-950/10" />
            <span className="absolute top-3 left-3 font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              {showcaseImages[2].label}
            </span>
          </div>

          {/* 4. Food — middle row right (1col x 1row) */}
          <div className="relative col-span-1 row-span-1 overflow-hidden">
            <Image
              src={showcaseImages[3].src}
              alt={showcaseImages[3].alt}
              fill
              sizes="15vw"
              className="object-cover auth-slow-zoom"
              style={{ animationDelay: '9s' }}
            />
            <div className="absolute inset-0 bg-noir-950/10" />
            <span className="absolute top-3 left-3 font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              {showcaseImages[3].label}
            </span>
          </div>

          {/* 5. Bakery — middle row bottom-right */}
          <div className="relative col-span-1 row-span-1 overflow-hidden">
            <Image
              src={showcaseImages[4].src}
              alt={showcaseImages[4].alt}
              fill
              sizes="15vw"
              className="object-cover auth-slow-zoom"
              style={{ animationDelay: '12s' }}
            />
            <div className="absolute inset-0 bg-noir-950/10" />
            <span className="absolute top-3 left-3 font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              {showcaseImages[4].label}
            </span>
          </div>

          {/* 6. Floristry — full-width bottom (cropping only shows petals, still looks beautiful) */}
          <div className="relative col-span-4 row-span-1 overflow-hidden">
            <Image
              src={showcaseImages[5].src}
              alt={showcaseImages[5].alt}
              fill
              sizes="58vw"
              className="object-cover object-[center_40%] auth-slow-zoom"
              style={{ animationDelay: '15s' }}
            />
            <div className="absolute inset-0 bg-noir-950/20" />
            <span className="absolute top-3 left-3 font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              {showcaseImages[5].label}
            </span>
          </div>
        </div>

        {/* ━━━ Gradient overlays ━━━ */}
        {/* Bottom heavy gradient — ensures text readability */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: `linear-gradient(to top,
              var(--color-noir-950) 0%,
              rgba(15,14,12,0.92) 15%,
              rgba(15,14,12,0.4) 35%,
              transparent 55%)`,
          }}
        />
        {/* Top light gradient — keeps brand mark readable */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: 'linear-gradient(to bottom, rgba(15,14,12,0.5) 0%, transparent 25%)',
          }}
        />
        {/* Noise texture */}
        <div className="absolute inset-0 noise-overlay pointer-events-none z-[2]" style={{ opacity: 0.7 }} />

        {/* ━━━ Top-left brand mark ━━━ */}
        <div className="absolute top-8 left-10 xl:left-14 z-10">
          <p className="font-display text-lg text-gradient-gold tracking-luxe">LightCraft</p>
          <div className="w-6 h-px bg-gradient-to-r from-gold-400/60 to-transparent mt-2" />
        </div>

        {/* ━━━ Bottom value proposition ━━━ */}
        <div className="absolute inset-x-0 bottom-0 px-10 xl:px-14 pb-10 xl:pb-12 z-10">
          {/* Core selling point — passes the 5-second test, instantly clear */}
          <h2 className="font-display text-3xl xl:text-4xl font-light text-gradient-gold tracking-wide leading-tight mb-3">
            One Image<br />Becomes a Sales-Ready Video
          </h2>

          {/* Platform anchor */}
          <p className="font-body text-noir-200 text-sm max-w-xs leading-relaxed mb-8 opacity-80">
            Snap a photo and post it on social media
          </p>

          {/* Trust signal bar */}
          <div className="flex items-center gap-5 text-noir-300">
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-gold-400/60" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21" />
              </svg>
              <span className="font-body text-xs">Ready in 30s</span>
            </div>
            <div className="w-px h-3 bg-noir-600" />
            <span className="font-body text-xs">12 Industry Templates</span>
            <div className="w-px h-3 bg-noir-600" />
            <span className="font-body text-xs">Free Trial · 50 Credits</span>
          </div>
        </div>

        {/* Right gold separator line */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold-400/15 to-transparent z-20" />
      </div>

      {/* ━━━ Right: form area (42%) ━━━ */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 sm:p-8 bg-noir-900">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
