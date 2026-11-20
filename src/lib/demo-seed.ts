/**
 * 静态演示版（GitHub Pages）内置数据。
 * 服务器版用 Prisma 读写 SQLite / Postgres；静态版把这份数据灌进 localStorage，
 * 页面、组件与接口语义完全一致，只是数据落在浏览器里。
 */

export type DemoPlanet = {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  theme: string;
  petProfileJson: string;
  visibility: 'PRIVATE' | 'INVITE' | 'PUBLIC';
  inviteCode: string;
  updatedAt: string;
  statsVisits: number;
  statsLights: number;
  statsStars: number;
};

export type DemoMemory = {
  id: string;
  planetId: string;
  ownerId: string;
  text: string;
  imageUrl: string | null;
  visibility: 'PRIVATE' | 'PUBLIC';
  createdAt: string;
};

export type DemoGuestbook = {
  id: string;
  planetId: string;
  visitorId: string;
  visitorName: string;
  content: string;
  aiReply: string | null;
  status: 'VISIBLE' | 'DELETED';
  createdAt: string;
};

export type DemoVisit = {
  id: string;
  planetId: string;
  visitorId: string;
  visitorName: string;
  action: string;
  createdAt: string;
};

export type DemoFriendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  // PENDING | ACCEPTED
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
};

export type DemoDirectMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  read: boolean;
  createdAt: string;
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

export const DEMO_USER_ID = 'u-demo';
export const DEMO_MINE_PLANET_ID = 'p-mine';

export const DEMO_PLANETS: DemoPlanet[] = [
  {
    id: DEMO_MINE_PLANET_ID,
    ownerId: DEMO_USER_ID,
    ownerName: '我',
    name: '我的小星球',
    theme: 'aurora',
    petProfileJson: JSON.stringify({
      name: '团子',
      species: 'cat',
      persona: '一只爱收集星星的橘猫，说话轻轻的，会害羞',
    }),
    visibility: 'INVITE',
    inviteCode: 'MINE01',
    updatedAt: hoursAgo(0),
    statsVisits: 3,
    statsLights: 2,
    statsStars: 1,
  },
  {
    id: 'p-manman',
    ownerId: 'u-xingye',
    ownerName: '星野',
    name: '慢慢星球',
    theme: 'honey',
    petProfileJson: JSON.stringify({
      name: '奶糖',
      species: 'rabbit',
      persona: '一只毛茸茸的兔子，喜欢在回忆里打滚，很会安慰人',
    }),
    visibility: 'INVITE',
    inviteCode: 'ABC123',
    updatedAt: hoursAgo(6),
    statsVisits: 3,
    statsLights: 2,
    statsStars: 1,
  },
  {
    id: 'p-seasalt',
    ownerId: 'u-ayou',
    ownerName: '阿柚',
    name: '海盐星球',
    theme: 'mint',
    petProfileJson: JSON.stringify({
      name: '小宇宙',
      species: 'dog',
      persona: '一只热情的柯基，负责在星球门口迎接每一位访客',
    }),
    visibility: 'PUBLIC',
    inviteCode: 'MINT66',
    updatedAt: hoursAgo(12),
    statsVisits: 5,
    statsLights: 3,
    statsStars: 2,
  },
  {
    id: 'p-garden',
    ownerId: 'u-lulu',
    ownerName: '鹿鹿',
    name: '午夜花园',
    theme: 'violet',
    petProfileJson: JSON.stringify({
      name: '月见',
      species: 'cat',
      persona: '一只只在夜里活动的黑猫，说话很轻，喜欢星星',
    }),
    visibility: 'PUBLIC',
    inviteCode: 'LUNA88',
    updatedAt: hoursAgo(18),
    statsVisits: 7,
    statsLights: 4,
    statsStars: 3,
  },
  {
    id: 'p-friend',
    ownerId: 'u-lizi',
    ownerName: '栗子',
    name: '只给朋友的星球',
    theme: 'sakura',
    petProfileJson: JSON.stringify({
      name: '团子',
      species: 'cat',
      persona: '一只爱收集星星的橘猫，说话轻轻的，会害羞',
    }),
    visibility: 'INVITE',
    inviteCode: 'FRIEND',
    updatedAt: hoursAgo(24),
    statsVisits: 9,
    statsLights: 5,
    statsStars: 4,
  },
];

export const DEMO_MEMORIES: DemoMemory[] = [
  {
    id: 'm-mine-1',
    planetId: DEMO_MINE_PLANET_ID,
    ownerId: DEMO_USER_ID,
    text: '第一次把回忆放到星球上，风都变甜了一点。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(30),
  },
  {
    id: 'm-mine-2',
    planetId: DEMO_MINE_PLANET_ID,
    ownerId: DEMO_USER_ID,
    text: '那只总在窗台打盹的小家伙，替我看过很多次日落。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(52),
  },
  {
    id: 'm-mine-3',
    planetId: DEMO_MINE_PLANET_ID,
    ownerId: DEMO_USER_ID,
    text: '写给自己的悄悄话：不用急着长大。',
    imageUrl: null,
    visibility: 'PRIVATE',
    createdAt: hoursAgo(74),
  },
  {
    id: 'm-man-1',
    planetId: 'p-manman',
    ownerId: 'u-xingye',
    text: '夏末的风把晾在阳台的床单吹得鼓鼓的，那天什么都没发生，但很好。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(8),
  },
  {
    id: 'm-man-2',
    planetId: 'p-manman',
    ownerId: 'u-xingye',
    text: '第一次学会做番茄炒蛋，盐放多了，还是吃完了。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(20),
  },
  {
    id: 'm-man-3',
    planetId: 'p-manman',
    ownerId: 'u-xingye',
    text: '有些话只写给自己看：别怕，慢一点也没关系。',
    imageUrl: null,
    visibility: 'PRIVATE',
    createdAt: hoursAgo(26),
  },
  {
    id: 'm-sea-1',
    planetId: 'p-seasalt',
    ownerId: 'u-ayou',
    text: '海边捡到一块很普通的石头，因为那天开心，就一直留着。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(14),
  },
  {
    id: 'm-sea-2',
    planetId: 'p-seasalt',
    ownerId: 'u-ayou',
    text: '凌晨两点的便利店，关东煮冒着白气。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(28),
  },
  {
    id: 'm-sea-3',
    planetId: 'p-seasalt',
    ownerId: 'u-ayou',
    text: '不想被任何人看到的、关于辞职那天的记录。',
    imageUrl: null,
    visibility: 'PRIVATE',
    createdAt: hoursAgo(40),
  },
  {
    id: 'm-gar-1',
    planetId: 'p-garden',
    ownerId: 'u-lulu',
    text: '楼下的猫又在同一块砖上等月亮。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(22),
  },
  {
    id: 'm-gar-2',
    planetId: 'p-garden',
    ownerId: 'u-lulu',
    text: '把一整张专辑从第一首听到最后一首，没有跳歌。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(34),
  },
  {
    id: 'm-fri-1',
    planetId: 'p-friend',
    ownerId: 'u-lizi',
    text: '这颗星球暂不对外开放，只有拿到邀请码的人能看到。',
    imageUrl: null,
    visibility: 'PUBLIC',
    createdAt: hoursAgo(44),
  },
];

export const DEMO_GUESTBOOK: DemoGuestbook[] = [
  {
    id: 'g-man-1',
    planetId: 'p-manman',
    visitorId: 'seed-visitor-阿柚',
    visitorName: '阿柚',
    content: '你的星球闻起来像刚晒过的被子。',
    aiReply: '奶糖把这句话收进了胡萝卜篮子里，谢谢你呀。',
    status: 'VISIBLE',
    createdAt: hoursAgo(9),
  },
  {
    id: 'g-sea-1',
    planetId: 'p-seasalt',
    visitorId: 'seed-visitor-鹿鹿',
    visitorName: '鹿鹿',
    content: '来你这里吹了会儿海风，充电完成。',
    aiReply: '小宇宙摇着尾巴，把你送到轨道口啦。',
    status: 'VISIBLE',
    createdAt: hoursAgo(15),
  },
];

export const DEMO_VISITS: DemoVisit[] = [
  {
    id: 'v-mine-1',
    planetId: DEMO_MINE_PLANET_ID,
    visitorId: 'seed-visitor-阿柚',
    visitorName: '阿柚',
    action: 'LIGHT',
    createdAt: hoursAgo(3),
  },
  {
    id: 'v-mine-2',
    planetId: DEMO_MINE_PLANET_ID,
    visitorId: 'seed-visitor-鹿鹿',
    visitorName: '鹿鹿',
    action: 'STAR',
    createdAt: hoursAgo(5),
  },
  {
    id: 'v-mine-3',
    planetId: DEMO_MINE_PLANET_ID,
    visitorId: 'seed-visitor-星野',
    visitorName: '星野',
    action: 'ENTER',
    createdAt: hoursAgo(11),
  },
  {
    id: 'v-man-1',
    planetId: 'p-manman',
    visitorId: 'seed-visitor-阿柚',
    visitorName: '阿柚',
    action: 'MESSAGE',
    createdAt: hoursAgo(9),
  },
  {
    id: 'v-sea-1',
    planetId: 'p-seasalt',
    visitorId: 'seed-visitor-鹿鹿',
    visitorName: '鹿鹿',
    action: 'MESSAGE',
    createdAt: hoursAgo(15),
  },
];

/** 静态导出时预渲染的动态路由参数 */
export const DEMO_PLANET_IDS = DEMO_PLANETS.map((planet) => planet.id);
export const DEMO_INVITE_CODES = DEMO_PLANETS.map((planet) => planet.inviteCode);

/**
 * 好友关系种子：模拟「阿柚」已通过你的申请（已成好友）、「星野」向你发来待处理申请。
 * 其它星球主人（栗子、鹿鹿）作为可发送申请的陌生人。
 */
export const DEMO_FRIENDSHIPS: DemoFriendship[] = [
  {
    id: 'f-accepted-阿柚',
    requesterId: DEMO_USER_ID,
    addresseeId: 'u-ayou',
    status: 'ACCEPTED',
    createdAt: hoursAgo(50),
  },
  {
    id: 'f-pending-星野',
    requesterId: 'u-xingye',
    addresseeId: DEMO_USER_ID,
    status: 'PENDING',
    createdAt: hoursAgo(4),
  },
];

/** 私信种子：与「阿柚」的一段已有对话（含一条未读） */
export const DEMO_DIRECT_MESSAGES: DemoDirectMessage[] = [
  {
    id: 'dm-1',
    senderId: DEMO_USER_ID,
    recipientId: 'u-ayou',
    content: '阿柚，你的海盐星球真的好治愈，我可以常来坐坐吗？',
    read: true,
    createdAt: hoursAgo(48),
  },
  {
    id: 'dm-2',
    senderId: 'u-ayou',
    recipientId: DEMO_USER_ID,
    content: '当然可以呀，小宇宙最喜欢新朋友啦，随时欢迎～',
    read: true,
    createdAt: hoursAgo(46),
  },
  {
    id: 'dm-3',
    senderId: 'u-ayou',
    recipientId: DEMO_USER_ID,
    content: '对了，今天给你星球送了一颗星，你记得去看看哦。',
    read: false,
    createdAt: hoursAgo(2),
  },
];
