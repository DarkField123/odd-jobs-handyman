import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';
import type { ChatSession } from 'firebase/vertexai';
import { app, db } from '../firebase/client';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { SERVICES } from '../../consts';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  jobs: string[];
  note?: string;
}

// Cache for services to avoid refetching during session
let cachedServices: Service[] | null = null;

async function getServicesForPrompt(): Promise<Service[]> {
  if (cachedServices) return cachedServices;

  // Try to fetch from Firestore
  if (db) {
    try {
      const q = query(collection(db, 'skills'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        cachedServices = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Service[];
        return cachedServices;
      }
    } catch (error) {
      console.warn('Chat service: Failed to fetch services from Firestore, using fallback');
    }
  }

  // Fall back to hardcoded SERVICES
  cachedServices = SERVICES;
  return cachedServices;
}

function buildServicesContext(services: Service[]): string {
  return services
    .map((service) => {
      let entry = `**${service.name}**: ${service.description}\n  Jobs: ${service.jobs.join(', ')}`;
      if (service.note) {
        entry += `\n  IMPORTANT NOTE: ${service.note}`;
      }
      return entry;
    })
    .join('\n\n');
}

function buildSystemPrompt(services: Service[]): string {
  return `You are the Odd Jobs virtual assistant — a friendly, helpful chatbot on the Odd Jobs handyman website based in Manchester, UK.

Your purpose is to help visitors understand what services are offered, identify which service category their job falls under, and give them a rough idea of pricing so they can decide whether to request a formal quote.

## Services We Offer
${buildServicesContext(services)}

## Pricing Guidance
Use these generic starting-price brackets based on job complexity:
- **Small jobs** (under 1-2 hours, single task): from £50 — e.g. bleeding radiators, changing a tap washer, hanging a few pictures, fitting a shelf bracket, replacing a light switch
- **Medium jobs** (half day, moderate complexity): from £100 — e.g. fitting a new tap, hanging a door, assembling a wardrobe, tiling a small splashback, painting a single room
- **Larger jobs** (full day or multi-day, higher complexity): from £200+ — e.g. full room painting, deck repair, fitting a kitchen worktop, multiple flat-pack assemblies, fence panel replacement across a full garden

ALWAYS add this caveat when discussing prices: "This is just a rough guide — the final price depends on the specific job. Request a free quote and the handyman will give you an accurate price after assessing the work."

## Regulatory Limitations
- For plumbing: We do NOT do gas work, boiler installations, or central heating systems (requires Gas Safe engineer). Make this clear if someone asks.
- For electrical: We only do Part P exempt (minor) works — like-for-like replacements. New circuits, rewiring, or consumer unit work needs a registered electrician. Make this clear if someone asks.

## Conversation Rules
1. Be concise. Keep replies to 2-4 sentences unless the user asks for detail.
2. Be warm and professional. Use a friendly British tone. No slang, no emojis.
3. If the user describes a job, identify which service category it falls under, mention some related jobs we do, and give a price bracket.
4. If the job sounds like it does NOT fit our services (e.g. full bathroom renovation, gas boiler, rewiring), say so politely and suggest they contact a specialist.
5. Gently steer users toward requesting a quote via the website quote form at /quote for an accurate price.
6. If you are unsure whether we offer something, say so honestly rather than guessing.
7. Do not discuss topics unrelated to handyman services or the Odd Jobs business.
8. Prices are always in GBP (£).
9. We serve Manchester and surrounding areas within a 15-mile radius.`;
}

let chatSession: ChatSession | null = null;

export function resetChat(): void {
  chatSession = null;
  // Clear cached services so next session gets fresh data
  cachedServices = null;
}

export async function sendMessage(userMessage: string): Promise<string> {
  if (!app) {
    throw new Error('Firebase is not initialised');
  }

  if (!chatSession) {
    // Fetch services and build system prompt
    const services = await getServicesForPrompt();
    const systemPrompt = buildSystemPrompt(services);

    const vertexAI = getVertexAI(app);
    const model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });
    chatSession = model.startChat({
      history: [],
      systemInstruction: systemPrompt,
    });
  }

  const result = await chatSession.sendMessage(userMessage);
  const response = result.response;
  return response.text();
}
