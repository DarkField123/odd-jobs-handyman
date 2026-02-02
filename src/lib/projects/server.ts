// Server-side project data fetching
// For static builds, this returns empty arrays
// Client-side components fetch real data from Firebase

export interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  skillId?: string;
  featured?: boolean;
  createdAt?: string;
}

export async function getAllProjects(): Promise<Project[]> {
  // In a static build, return empty array
  // The client-side component will load data from Firebase
  return [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  return null;
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return [];
}
