export type PetProfile = {
  name: string;
  species: 'cat' | 'dog' | 'rabbit';
  persona: string;
  /** AI 生成的虚拟形象（Base64 或 https 图片） */
  avatarUrl?: string;
};

export type PlanetDTO = {
  id: string;
  name: string;
  theme: string;
  visibility: 'PRIVATE' | 'INVITE' | 'PUBLIC';
  ownerName: string;
  /** 主人 userId，访客页用于「加好友」定位对方（DEMO 模式也返回） */
  ownerId?: string;
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

/** 好友关系 DTO（前端统一用这个结构，服务端与 DEMO 保持一致） */
export type FriendDTO = {
  id: string;
  status: 'PENDING' | 'ACCEPTED';
  direction: 'incoming' | 'outgoing';
  user: { id: string; nickname: string };
  createdAt: string;
};

export type ConversationDTO = {
  user: { id: string; nickname: string };
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export type DirectMessageDTO = {
  id: string;
  mine: boolean;
  content: string;
  createdAt: string;
};
