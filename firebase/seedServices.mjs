/**
 * Seed script to populate Firestore 'skills' collection with SERVICES data
 *
 * Usage:
 *   npm run seed:services         - Seed only missing services
 *   npm run seed:services:reset   - Delete all and reseed
 *
 * Configuration (choose one):
 *   Option 1: Environment variable (recommended for CI/CD)
 *     - Set FIREBASE_SERVICE_ACCOUNT with base64-encoded service account JSON
 *     - Encode with: node -e "console.log(Buffer.from(require('fs').readFileSync('path/to/key.json')).toString('base64'))"
 *
 *   Option 2: JSON file (local development)
 *     - Save service account key as: firebase/serviceAccountKey.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Services data (mirrors consts.ts SERVICES)
const SERVICES = [
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

// Load service account credentials
function getServiceAccount() {
  // Option 1: Environment variable (base64-encoded JSON)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error: FIREBASE_SERVICE_ACCOUNT env var is not valid base64 JSON');
      process.exit(1);
    }
  }

  // Option 2: JSON file (fallback for local dev)
  const keyPath = join(__dirname, 'serviceAccountKey.json');
  if (existsSync(keyPath)) {
    try {
      return JSON.parse(readFileSync(keyPath, 'utf8'));
    } catch (error) {
      console.error('Error: Could not parse firebase/serviceAccountKey.json');
      process.exit(1);
    }
  }

  // Neither option available
  console.error('Error: No Firebase service account credentials found.');
  console.error('');
  console.error('Option 1: Set FIREBASE_SERVICE_ACCOUNT environment variable');
  console.error('  - Get key from Firebase Console > Project Settings > Service Accounts');
  console.error('  - Base64 encode it: node -e "console.log(Buffer.from(require(\'fs\').readFileSync(\'key.json\')).toString(\'base64\'))"');
  console.error('  - Add to .env: FIREBASE_SERVICE_ACCOUNT=<base64-string>');
  console.error('');
  console.error('Option 2: Save key as firebase/serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = getServiceAccount();

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const skillsCollection = db.collection('skills');

// Check for --reset flag
const isReset = process.argv.includes('--reset');

async function seedServices() {
  console.log('');
  console.log(isReset ? '=== RESET MODE: Deleting all services ===' : '=== Seeding services ===');
  console.log('');

  // If reset mode, delete all existing documents
  if (isReset) {
    const existing = await skillsCollection.get();
    if (!existing.empty) {
      const batch = db.batch();
      existing.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Deleted ${existing.size} existing service(s)`);
    }
  }

  // Get existing service IDs
  const existingDocs = await skillsCollection.get();
  const existingIds = new Set(existingDocs.docs.map((doc) => doc.id));

  // Seed services
  const batch = db.batch();
  let addedCount = 0;
  let skippedCount = 0;

  SERVICES.forEach((service, index) => {
    if (!isReset && existingIds.has(service.id)) {
      console.log(`  Skipped: ${service.name} (already exists)`);
      skippedCount++;
      return;
    }

    const docRef = skillsCollection.doc(service.id);
    const data = {
      name: service.name,
      icon: service.icon,
      description: service.description,
      jobs: service.jobs,
      order: index,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Add note if present
    if (service.note) {
      data.note = service.note;
    }

    batch.set(docRef, data);
    console.log(`  Adding: ${service.name}`);
    addedCount++;
  });

  if (addedCount > 0) {
    await batch.commit();
  }

  console.log('');
  console.log(`Done! Added: ${addedCount}, Skipped: ${skippedCount}`);
  console.log('');
}

seedServices().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
