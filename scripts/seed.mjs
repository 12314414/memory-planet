/**
 * 演示数据：3 颗公开星球 + 1 颗邀请码星球。
 * 运行：npm run db:seed（内部使用 node --env-file=.env）
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO = [
  {
    nickname: '星野',
    planetName: '慢慢星球',
    theme: 'honey',
    visibility: 'PUBLIC',
    inviteCode: 'ABC123',
    pet: { name: '奶糖', species: 'rabbit', persona: '一只毛茸茸的兔子，喜欢在回忆里打滚，很会安慰人' },
    memories: [
      { text: '夏末的风把晾在阳台的床单吹得鼓鼓的，那天什么都没发生，但很好。', visibility: 'PUBLIC' },
      { text: '第一次学会做番茄炒蛋，盐放多了，还是吃完了。', visibility: 'PUBLIC' },
      { text: '有些话只写给自己看：别怕，慢一点也没关系。', visibility: 'PRIVATE' },
    ],
    guestbook: [
      { name: '阿柚', content: '你的星球闻起来像刚晒过的被子。', reply: '奶糖把这句话收进了胡萝卜篮子里，谢谢你呀。' },
    ],
  },
  {
    nickname: '阿柚',
    planetName: '海盐星球',
    theme: 'mint',
    visibility: 'PUBLIC',
    inviteCode: 'MINT66',
    pet: { name: '小宇宙', species: 'dog', persona: '一只热情的柯基，负责在星球门口迎接每一位访客' },
    memories: [
      { text: '海边捡到一块很普通的石头，因为那天开心，就一直留着。', visibility: 'PUBLIC' },
      { text: '凌晨两点的便利店，关东煮冒着白气。', visibility: 'PUBLIC' },
      { text: '不想被任何人看到的、关于辞职那天的记录。', visibility: 'PRIVATE' },
    ],
    guestbook: [
      { name: '鹿鹿', content: '来你这里吹了会儿海风，充电完成。', reply: '小宇宙摇着尾巴，把你送到轨道口啦。' },
    ],
  },
  {
    nickname: '鹿鹿',
    planetName: '午夜花园',
    theme: 'violet',
    visibility: 'PUBLIC',
    inviteCode: 'LUNA88',
    pet: { name: '月见', species: 'cat', persona: '一只只在夜里活动的黑猫，说话很轻，喜欢星星' },
    memories: [
      { text: '楼下的猫又在同一块砖上等月亮。', visibility: 'PUBLIC' },
      { text: '把一整张专辑从第一首听到最后一首，没有跳歌。', visibility: 'PUBLIC' },
    ],
    guestbook: [],
  },
  {
    nickname: '栗子',
    planetName: '只给朋友的星球',
    theme: 'sakura',
    visibility: 'INVITE',
    inviteCode: 'FRIEND',
    pet: { name: '团子', species: 'cat', persona: '一只爱收集星星的橘猫，说话轻轻的，会害羞' },
    memories: [{ text: '这颗星球暂不对外开放，只有拿到邀请码的人能看到。', visibility: 'PUBLIC' }],
    guestbook: [],
  },
];

async function main() {
  const existing = await prisma.planet.findFirst({ where: { inviteCode: 'ABC123' } });
  if (existing) {
    console.log('[seed] 演示数据已存在，跳过。');
    return;
  }

  for (const [index, demo] of DEMO.entries()) {
    const user = await prisma.user.create({ data: { nickname: demo.nickname } });
    const updatedAt = new Date(Date.now() - index * 6 * 60 * 60 * 1000);

    const planet = await prisma.planet.create({
      data: {
        ownerId: user.id,
        name: demo.planetName,
        theme: demo.theme,
        petProfileJson: JSON.stringify(demo.pet),
        visibility: demo.visibility,
        inviteCode: demo.inviteCode,
        updatedAt,
        statsVisits: 3 + index * 2,
        statsLights: 2 + index,
        statsStars: 1 + index,
        memories: {
          create: demo.memories.map((memory) => ({
            ownerId: user.id,
            text: memory.text,
            visibility: memory.visibility,
          })),
        },
      },
    });

    for (const entry of demo.guestbook) {
      await prisma.guestbook.create({
        data: {
          planetId: planet.id,
          visitorId: `seed-visitor-${entry.name}`,
          visitorName: entry.name,
          content: entry.content,
          aiReply: entry.reply,
          status: 'VISIBLE',
        },
      });
      await prisma.visit.create({
        data: {
          planetId: planet.id,
          visitorId: `seed-visitor-${entry.name}`,
          visitorName: entry.name,
          action: 'MESSAGE',
        },
      });
    }
  }

  console.log('[seed] 已生成 4 颗演示星球：ABC123 / MINT66 / LUNA88 / FRIEND');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
