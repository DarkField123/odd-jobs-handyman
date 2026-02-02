# Odd Jobs - Handyman Website Redesign

## Design Reference
See `redesign.png` in this directory for the visual mockup.

---

## Brand Identity

- **Name:** Odd Jobs
- **Tagline:** Handyman Services
- **Logo:** Red wrench icon + "Odd Jobs" text

### Color Scheme (Red Theme)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--accent` | #E53935 | Primary red, buttons, CTAs |
| `--accent-dark` | #C62828 | Hover states, darker accents |
| `--accent-light` | #EF5350 | Lighter accents, highlights |
| `--bg-light` | #f5f5f5 | Light backgrounds |
| `--bg-dark` | #1a1a1a | Dark backgrounds, footer |
| `--text-primary` | #333333 | Main text |
| `--text-secondary` | #666666 | Secondary text |

---

## Page Structure

### Home Page Sections
1. **Hero** - Toolbox illustration, "Odd Jobs & Handyman Services" headline, CTA button
2. **Services Grid** - 6 service cards with icons (Plumbing, Electrical, Carpentry, Painting, General Repairs, Assembly)
3. **Quote Section** - "We're Here to Help!" with phone number and quote CTA
4. **Red CTA Banner** - "Get a Free Quote Today!" full-width banner
5. **FAQ Section** - Accordion-style frequently asked questions
6. **Footer** - Multi-column with branding, links, contact info

### Navigation
- Home
- About
- Gallery
- Projects
- Get a Quote

---

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Documentation (this README) | Complete |
| 1 | Foundation & Branding (consts, CSS, layouts) | Pending |
| 2 | Navigation (Header, Footer) | Pending |
| 3 | Home Page & Sections | Pending |
| 4 | Public Pages (Quote, About, Gallery, Projects) | Pending |
| 5 | Admin & Firebase Integration | Pending |

---

## Contact Information (Placeholder)
- **Phone:** (555) 123-4567
- **Email:** info@oddjobs.com

---

## Technical Stack
- **Framework:** Astro
- **UI Components:** React (for interactive elements)
- **Styling:** CSS with custom properties
- **Backend:** Firebase (Firestore, Auth)
- **Hosting:** TBD

---

## File Structure
```
handyman/
├── src/
│   ├── components/
│   │   ├── sections/      # Hero, ServicesGrid, FAQ, etc.
│   │   ├── icons/         # Service icons, WrenchIcon
│   │   ├── auth/          # AdminGuard
│   │   ├── account/       # AccountLayout
│   │   └── editors/       # Admin CRUD components
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro    # Home
│   │   ├── about.astro
│   │   ├── gallery.astro
│   │   ├── quote.astro
│   │   ├── projects/
│   │   └── account/
│   ├── styles/
│   │   └── global.css
│   ├── lib/               # Firebase, data fetching
│   └── consts.ts          # Site constants
└── public/
    └── images/
```
