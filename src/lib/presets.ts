// Video scene presets — organized by industry for small business owners
// Each preset has a category, optimized prompt, and recommended settings.

export type PresetCategory =
  | 'ecommerce'
  | 'food'
  | 'beauty'
  | 'realestate'
  | 'portfolio'
  | 'ads'

export interface PresetCategoryInfo {
  id: PresetCategory
  label: string
}

export const CATEGORIES: PresetCategoryInfo[] = [
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'realestate', label: 'Real Estate' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'ads', label: 'Ads' },
]

export interface Preset {
  key: string
  label: string
  prompt: string
  hint: string // Card subtitle (one-line scene description)
  category: PresetCategory
}

export const PRESETS: Preset[] = [
  // ── E-commerce ────────────────────────────────────────────
  {
    key: 'ecom-showcase',
    category: 'ecommerce',
    label: 'Product Showcase',
    hint: 'Clean background · Professional ad feel',
    prompt:
      'Product on a clean background, soft even lighting, camera slowly pushes in revealing texture and detail, crisp premium feel',
  },
  {
    key: 'ecom-spin',
    category: 'ecommerce',
    label: 'Slow Spin',
    hint: 'Rotating view · Key angles',
    prompt:
      'Product rotating slowly on a white background, even studio lighting, camera at eye level, smooth partial rotation revealing key details',
  },
  {
    key: 'ecom-unboxing',
    category: 'ecommerce',
    label: 'Unboxing Reveal',
    hint: 'Box opens · Product reveal',
    prompt:
      'Elegant packaging opens to reveal the product, soft ambient lighting, close-up on the reveal moment, satisfying and premium',
  },
  {
    key: 'ecom-lifestyle',
    category: 'ecommerce',
    label: 'Lifestyle Context',
    hint: 'Product in real life · Relatable setting',
    prompt:
      'Product placed naturally in a cozy real-life setting, warm natural light, camera gently drifts showing it in context, inviting and aspirational',
  },
  {
    key: 'ecom-detail',
    category: 'ecommerce',
    label: 'Detail Close-up',
    hint: 'Macro shot · Texture & quality',
    prompt:
      'Extreme close-up on product details, slowly revealing texture and material quality, shallow depth of field, premium macro feel',
  },

  // ── Food & Drink ──────────────────────────────────────────
  {
    key: 'food-sizzle',
    category: 'food',
    label: 'Sizzle Reel',
    hint: 'Steam & sizzle · Mouth-watering',
    prompt:
      'Steam rising gently from the dish, warm light making the food look glossy and fresh, camera pushes in to show textures, appetizing',
  },
  {
    key: 'food-pour',
    category: 'food',
    label: 'Pour Shot',
    hint: 'Liquid pour · Satisfying flow',
    prompt:
      'Smooth liquid pouring in slow motion, warm golden lighting, close-up capturing the flow and texture, deeply satisfying',
  },
  {
    key: 'food-plating',
    category: 'food',
    label: 'Plating Beauty',
    hint: 'Finished dish · Art on a plate',
    prompt:
      'Beautifully plated dish, overhead camera slowly descending, each element colorful and artful, final presentation reveal',
  },
  {
    key: 'food-menu',
    category: 'food',
    label: 'Menu Highlight',
    hint: 'Signature dish · Hero shot',
    prompt:
      'Signature dish on a restaurant table, warm ambient lighting, slight steam rising, camera slowly orbiting, inviting hero shot',
  },
  {
    key: 'food-fresh',
    category: 'food',
    label: 'Fresh Produce',
    hint: 'Fruits & veggies · Dewy & vibrant',
    prompt:
      'Fresh fruits and vegetables with water droplets, natural light bringing out vibrant colors, camera slowly panning across, fresh and inviting',
  },

  // ── Beauty & Wellness ─────────────────────────────────────
  {
    key: 'beauty-nails',
    category: 'beauty',
    label: 'Nail Art Reveal',
    hint: 'Close-up · Intricate detail',
    prompt:
      'Camera pushes in on beautifully manicured nails, soft clean lighting, capturing colors and patterns, glamorous close-up',
  },
  {
    key: 'beauty-hair',
    category: 'beauty',
    label: 'Hair Showcase',
    hint: 'Flowing hair · Shine & volume',
    prompt:
      'Flowing healthy hair catching the light, showing volume and shine, soft wind gently moving strands, salon-quality lighting',
  },
  {
    key: 'beauty-skincare',
    category: 'beauty',
    label: 'Skincare Glow',
    hint: 'Product on skin · Glow effect',
    prompt:
      'Skincare product on dewy glowing skin, soft diffused lighting, close-up on texture and radiance, spa-like serenity',
  },
  {
    key: 'beauty-spa',
    category: 'beauty',
    label: 'Spa Ambiance',
    hint: 'Relaxing atmosphere · Inviting space',
    prompt:
      'Peaceful spa setting with candles flickering, warm towels, gentle steam, camera drifting slowly, calming and luxurious',
  },
  {
    key: 'beauty-swatch',
    category: 'beauty',
    label: 'Color Swatch',
    hint: 'Makeup colors · Side by side',
    prompt:
      'Beautiful color swatches on skin, camera slowly panning across the range, each shade rich under even lighting, clean editorial feel',
  },

  // ── Real Estate ───────────────────────────────────────────
  {
    key: 'realestate-walkthrough',
    category: 'realestate',
    label: 'Room Tour',
    hint: 'Interior sweep · Smooth camera',
    prompt:
      'Camera smoothly glides through a beautiful room, natural light through windows, revealing spacious layout and details, professional tour feel',
  },
  {
    key: 'realestate-exterior',
    category: 'realestate',
    label: 'Exterior Approach',
    hint: 'Curb appeal · First impression',
    prompt:
      'Camera slowly approaching property from the street, inviting entrance, golden hour lighting on the facade, warm establishing shot',
  },
  {
    key: 'realestate-feature',
    category: 'realestate',
    label: 'Feature Highlight',
    hint: 'Key selling point · Focus shot',
    prompt:
      'Camera focusing on a standout feature, slowly revealing the detail with cinematic lighting, emphasizing luxury and quality',
  },
  {
    key: 'realestate-neighborhood',
    category: 'realestate',
    label: 'Neighborhood Vibe',
    hint: 'Local area · Lifestyle feel',
    prompt:
      'Neighborhood atmosphere, tree-lined streets, warm natural light, conveying a desirable lifestyle and community feel',
  },

  // ── Portfolio / Creative ──────────────────────────────────
  {
    key: 'portfolio-showcase',
    category: 'portfolio',
    label: 'Project Showcase',
    hint: 'Finished work · Hero presentation',
    prompt:
      'Creative work displayed elegantly, camera slowly approaching to reveal details, professional lighting, impressive and polished',
  },
  {
    key: 'portfolio-process',
    category: 'portfolio',
    label: 'Process Reel',
    hint: 'Behind the scenes · Making of',
    prompt:
      'Hands working on a creation, tools and materials visible, close-up on the craft, natural workspace lighting, authentic behind-the-scenes',
  },
  {
    key: 'portfolio-before-after',
    category: 'portfolio',
    label: 'Before & After',
    hint: 'Transformation · Impact visual',
    prompt:
      'Dramatic transformation reveal, smoothly transitioning from original to stunning result, highlighting the contrast and improvement',
  },
  {
    key: 'portfolio-mockup',
    category: 'portfolio',
    label: 'Design Mockup',
    hint: 'Design on device · Context shot',
    prompt:
      'Design work displayed on a device in a stylish workspace, camera orbiting slowly, ambient lighting, clean and modern presentation',
  },

  // ── Ads & Dropshipping ────────────────────────────────────
  {
    key: 'ads-hook',
    category: 'ads',
    label: 'Hook Shot',
    hint: 'Attention grabber · First 3 seconds',
    prompt:
      'Product dramatically lit against a dark background, dynamic camera zoom creating urgency, bold and eye-catching, designed to stop the scroll',
  },
  {
    key: 'ads-ugc',
    category: 'ads',
    label: 'UGC Style',
    hint: 'User-generated feel · Authentic',
    prompt:
      'Product used naturally in everyday life, casual aesthetic, warm natural lighting, genuine and relatable, feels like a real customer moment',
  },
  {
    key: 'ads-comparison',
    category: 'ads',
    label: 'Product Comparison',
    hint: 'Side by side · Why us',
    prompt:
      'Two products side by side, clean lighting highlighting differences, the featured product clearly standing out in quality, persuasive',
  },
  {
    key: 'ads-testimonial',
    category: 'ads',
    label: 'Testimonial Frame',
    hint: 'Social proof · Trust builder',
    prompt:
      'Product displayed beautifully with space for text overlay, warm trustworthy lighting, camera gently moving, confidence-building premium feel',
  },
  {
    key: 'ads-countdown',
    category: 'ads',
    label: 'FOMO / Urgency',
    hint: 'Limited offer · Act now',
    prompt:
      'Product spotlighted with dramatic lighting, dark cinematic background, premium staging conveying exclusivity and urgency',
  },
]

/** Get presets for a specific category */
export function getPresetsByCategory(category: PresetCategory): Preset[] {
  return PRESETS.filter((p) => p.category === category)
}

// Multi-image prompt guidance — shown when user uploads multiple images
export const MULTI_IMAGE_HINT =
  "Multiple images selected. Consider describing transitions between scenes in your prompt, e.g. 'smooth transition between different angles.' Current version generates from one selected image at a time."
