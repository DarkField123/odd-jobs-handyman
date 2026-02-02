// Server-side skill data fetching
// For static builds, this returns empty arrays
// Client-side components fetch real data from Firebase

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  order?: number;
}

export async function getAllSkills(): Promise<Skill[]> {
  // In a static build, return empty array
  // The client-side component will load data from Firebase
  return [];
}

export async function getSkillById(id: string): Promise<Skill | null> {
  return null;
}
