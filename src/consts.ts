// Site Branding
export const SITE_TITLE = 'Odd Jobs';
export const SITE_DESCRIPTION = 'Professional handyman services for all your home repair and improvement needs. Quality workmanship, fair prices, and reliable service.';

// Contact Information (placeholder - update with real info)
export const CONTACT = {
  email: 'info@oddjobs.com',
  address: {
    street: '123 Main Street',
    city: 'Manchester',
    postcode: 'M1 1AA',
  },
};

// Business Hours
export const HOURS = {
  weekdays: '8:00 AM - 6:00 PM',
  saturday: '9:00 AM - 4:00 PM',
  sunday: 'Closed',
};

// Social Links (placeholder - update with real links)
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/oddjobs',
  instagram: 'https://instagram.com/oddjobs',
  twitter: 'https://twitter.com/oddjobs',
};

// Navigation Links
export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/quote', label: 'Get a Quote' },
];

// Services/Skills offered
export const SERVICES = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'plumbing',
    description: 'Tap repairs, leaks, and general plumbing maintenance',
    jobs: [
      'Tap replacement & repairs',
      'Toilet repairs & replacements',
      'Fixing leaking pipes & joints',
      'Radiator bleeding & valve replacements',
      'Washer & seal replacements',
      'Unblocking sinks, toilets & drains',
      'Silicone resealing (baths, showers, sinks)',
      'Shower head & hose replacements',
      'Outside tap installation',
    ],
    note: 'We do not carry out gas work, boiler installations, or new central heating systems. These require a Gas Safe registered engineer.',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'electrical',
    description: 'Minor electrical works and like-for-like replacements',
    jobs: [
      'Replacing light fittings & switches',
      'Socket replacement (like-for-like)',
      'Dimmer switch installation',
      'Changing light bulbs (high or awkward access)',
      'Extractor fan replacement (like-for-like)',
      'Doorbell installation',
      'Smoke & carbon monoxide detector fitting',
      'TV wall mounting with cable management',
    ],
    note: 'We carry out Part P exempt (minor) works only. New circuits, consumer unit replacements, and rewiring must be done by a registered electrician.',
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: 'carpentry',
    description: 'Doors, shelving, and woodwork repairs',
    jobs: [
      'Door hanging & adjustment',
      'Lock fitting & replacement',
      'Shelf & bracket installation',
      'Skirting board repair & replacement',
      'Architrave fitting',
      'Fence panel replacement & repair',
      'Gate repair & adjustment',
      'Decking repair',
      'Stair spindle & handrail repairs',
      'Worktop cutting & fitting',
    ],
  },
  {
    id: 'painting',
    name: 'Painting & Decorating',
    icon: 'painting',
    description: 'Interior and exterior painting and decorating',
    jobs: [
      'Interior wall & ceiling painting',
      'Exterior wall & fence painting',
      'Woodwork painting (doors, skirting, window frames)',
      'Wallpaper hanging & stripping',
      'Feature wall creation',
      'Touch-ups & small paint jobs',
      'Shed & outbuilding painting',
      'Deck staining & treatment',
    ],
  },
  {
    id: 'general',
    name: 'General Repairs',
    icon: 'general',
    description: 'All-around home maintenance and odd jobs',
    jobs: [
      'Plastering patches & filler work',
      'Wall & floor tiling (small areas)',
      'Grouting & regrouting',
      'Gutter cleaning & minor repair',
      'Pressure washing (patios, driveways)',
      'Window & door draught-proofing',
      'Curtain pole & blind fitting',
      'Picture & mirror hanging',
      'Loft hatch fitting',
      'General household repairs',
    ],
  },
  {
    id: 'assembly',
    name: 'Assembly',
    icon: 'assembly',
    description: 'Flat-pack furniture and equipment assembly',
    jobs: [
      'Flat-pack furniture assembly (IKEA, etc.)',
      'Garden furniture assembly',
      'Shed assembly',
      'Trampoline assembly',
      'Gym equipment assembly',
      'Bed frame assembly',
      'Wardrobe & storage unit assembly',
      'Office desk & chair assembly',
    ],
  },
];

// Testimonials (placeholder - managed via admin panel)
export const TESTIMONIALS = [
  {
    id: 'testimonial-1',
    name: 'Sarah M.',
    location: 'Didsbury',
    text: 'Excellent service from start to finish. Fixed our leaky tap and replaced the kitchen mixer - all done in under an hour. Very professional and tidy.',
    rating: 5,
    service: 'plumbing',
    date: 'January 2024',
  },
  {
    id: 'testimonial-2',
    name: 'James T.',
    location: 'Chorlton',
    text: 'Had several flat-pack wardrobes that needed assembling. Great attention to detail and everything was perfectly level. Would definitely recommend.',
    rating: 5,
    service: 'assembly',
    date: 'February 2024',
  },
  {
    id: 'testimonial-3',
    name: 'Linda K.',
    location: 'Sale',
    text: 'Prompt, reliable and reasonably priced. Hung three internal doors that had been sitting in my garage for months. Really pleased with the result.',
    rating: 5,
    service: 'carpentry',
    date: 'March 2024',
  },
  {
    id: 'testimonial-4',
    name: 'David H.',
    location: 'Stockport',
    text: 'Painted our entire living room and hallway. Clean work, no mess left behind, and the finish is fantastic. Will be using again for the bedrooms.',
    rating: 5,
    service: 'painting',
    date: 'December 2023',
  },
];

// FAQ Items
export const FAQ_ITEMS = [
  {
    question: 'How do I get a quote?',
    answer: 'Simply fill out our online quote form. We\'ll get back to you within 24 hours with a free, no-obligation estimate.',
  },
  {
    question: 'What areas do you serve?',
    answer: 'We serve Manchester and the surrounding areas within a 15-mile radius. Contact us to confirm service in your location.',
  },
  {
    question: 'Are you insured?',
    answer: 'Yes, we are fully insured with public liability insurance for your peace of mind.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept cash, bank transfer, and all major credit/debit cards. Payment is due upon completion of work.',
  },
  {
    question: 'Do you offer emergency services?',
    answer: 'Yes, we offer emergency call-out services for urgent repairs. Additional charges may apply for out-of-hours work.',
  },
];
