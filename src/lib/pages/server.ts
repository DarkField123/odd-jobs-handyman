// Server-side page data fetching
// For static builds, this returns null/empty
// Client-side components fetch real data from Firebase

export interface PageData {
  id: string;
  title?: string;
  content?: string;
  images?: Array<{
    id: string;
    url: string;
    alt: string;
    order: number;
  }>;
}

export async function getPageById(id: string): Promise<PageData | null> {
  // In a static build, return null
  // The client-side component will load data from Firebase
  return null;
}

export async function getAllPages(): Promise<PageData[]> {
  return [];
}
