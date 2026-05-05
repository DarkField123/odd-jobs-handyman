// Feature configuration - controlled via environment variables

export const config = {
  // Project identity
  projectName: import.meta.env.PUBLIC_PROJECT_NAME || 'Odd Jobs',
  projectIcon: import.meta.env.PUBLIC_PROJECT_ICON || '🔧',

  // Feature toggles
  features: {
    accounting: import.meta.env.PUBLIC_ENABLE_ACCOUNTING === 'true',
    portfolio: import.meta.env.PUBLIC_ENABLE_PORTFOLIO === 'true',
    blog: import.meta.env.PUBLIC_ENABLE_BLOG === 'true',
    gallery: import.meta.env.PUBLIC_ENABLE_GALLERY === 'true',
    services: import.meta.env.PUBLIC_ENABLE_SERVICES === 'true',
    quotes: import.meta.env.PUBLIC_ENABLE_QUOTES === 'true',
  },

  // Check if content section should show (blog OR gallery enabled)
  get hasContentFeatures() {
    return this.features.blog || this.features.gallery;
  },
};

export type FeatureFlags = typeof config.features;
