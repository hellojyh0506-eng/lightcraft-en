// FAQ section — shared by landing page and pricing page
const faqs = [
  { q: 'Can I use the generated videos for commercial purposes?', a: 'Yes. You retain full usage rights to your uploaded materials and generated videos. Use them for e-commerce, social media, and other commercial purposes.' },
  { q: 'Are my images and data secure?', a: 'Yes. Your images are only used for video generation and will never be used for training or shared with third parties. See our Privacy Policy for details.' },
  { q: 'Does it work on mobile?', a: 'Yes. LightCraft is a web app — just open it in your phone\'s browser. No app download needed.' },
  { q: 'What happens when I run out of credits?', a: 'You can upgrade your membership plan for more credits. Free users can also earn credits through daily check-ins.' },
  { q: 'Do you offer refunds?', a: 'Credits for failed generations are automatically refunded. For membership subscription refunds, please contact support.' },
  { q: 'Do I need a credit card to sign up?', a: 'No. Signing up is free, and no credit card is required. You can upgrade your plan anytime through our payment options.' },
]

export function FAQSection() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="font-display text-3xl font-light text-noir-50 tracking-wide text-center mb-10">Frequently Asked Questions</h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <details key={i} className="group bg-noir-800/30 border border-noir-600/40 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-body text-sm text-noir-200 hover:text-noir-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
              {faq.q}
              <span className="text-noir-400 group-open:rotate-45 transition-transform duration-300 text-lg shrink-0 ml-4">+</span>
            </summary>
            <div className="px-6 pb-4 font-body text-sm text-noir-400 leading-relaxed">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
