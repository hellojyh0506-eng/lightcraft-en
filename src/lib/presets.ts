// Video scene presets — common scenarios for small business owners
// Labels are plain language. Prompts describe shots for the AI model.

export interface Preset {
  key: string
  label: string
  prompt: string
  hint: string // Card subtitle (one-line scene description)
}

export const PRESETS: Preset[] = [
  {
    key: 'ecommerce',
    label: 'E-commerce',
    hint: 'Product shots · Higher conversion',
    prompt:
      'Product on a clean background, evenly lit, camera slowly pushes in and orbits to reveal texture and craftsmanship, crisp and premium, like a professional ad',
  },
  {
    key: 'food',
    label: 'Food & Dining',
    hint: 'Food photos · Mouth-watering',
    prompt:
      'Steam rising gently, sauce flowing slowly, warm light making the food look glossy and fresh, camera pushes in to show ingredient textures, appetizing and inviting',
  },
  {
    key: 'pet',
    label: 'Pets',
    hint: 'Pet photos · Cute & eye-catching',
    prompt:
      'Adorable pet looking up at the camera, soft fluffy fur, warm sunlight on its body, camera slowly pushes in to capture expression and details, heartwarming and likeable',
  },
  {
    key: 'fresh',
    label: 'Fresh Produce',
    hint: 'Fruits & veggies · Fresh & dewy',
    prompt:
      'Fresh fruits and vegetables with water droplets still clinging, droplets gently sliding down, natural light bringing out vibrant colors, camera slowly panning across, looking fresh and inviting',
  },
  {
    key: 'storefront',
    label: 'Storefront',
    hint: 'Shop front · Drive foot traffic',
    prompt:
      'Camera slowly walks in from the shop entrance, bright and warm lighting, signage and interior clearly shown, people coming and going with lively atmosphere, inviting and upscale',
  },
  {
    key: 'beauty',
    label: 'Beauty',
    hint: 'Nails & hair · Showcase results',
    prompt:
      'Camera slowly pushes in on hands or hairstyle, soft clean lighting, capturing colors and details beautifully, gently rotating to show different angles, results at a glance, makes you want to try it',
  },
]

// Multi-image prompt guidance — shown when user uploads multiple images
export const MULTI_IMAGE_HINT =
  "Multiple images selected. Consider describing transitions between scenes in your prompt, e.g. 'smooth transition between different angles.' Current version generates from one selected image at a time."
