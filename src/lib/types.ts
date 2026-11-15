export type PetProfile = {
  name: string;
  species: 'cat' | 'dog' | 'rabbit';
  persona: string;
};

export type PlanetDTO = {
  id: string;
  name: string;
  theme: string;
  visibility: 'PRIVATE' | 'INVITE' | 'PUBLIC';
  ownerName: string;
  petProfile: PetProfile;
  statsVisits: number;
  statsLights: number;
  statsStars: number;
};

export type PublicPlanetDTO = {
  id: string;
  name: string;
  theme: string;
  ownerName: string;
  petName: string;
  statsVisits: number;
  statsStars: number;
  updatedAt: string;
};

export type MemoryDTO = {
  id: string;
  text: string;
  imageUrl: string | null;
  createdAt: string;
};

export type GuestbookDTO = {
  id: string;
  visitorName: string;
  content: string;
  aiReply: string | null;
  createdAt: string;
};

export type VisitDTO = {
  id: string;
  visitorName: string;
  action: string;
  createdAt: string;
};

export type OwnerDashboardDTO = {
  planet: {
    id: string;
    name: string;
    theme: string;
    visibility: 'PRIVATE' | 'INVITE' | 'PUBLIC';
    inviteCode: string;
    statsVisits: number;
    statsLights: number;
    statsStars: number;
  };
  today: { visitors: number; lights: number; stars: number; feeds: number; messages: number };
  visits: VisitDTO[];
  guestbook: GuestbookDTO[];
  memories: (MemoryDTO & { visibility: 'PRIVATE' | 'PUBLIC' })[];
  aiBrief: string | null;
};
