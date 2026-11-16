import type { PetProfile } from './types';

export type AiType = 'welcome' | 'reply' | 'brief' | 'polish';

export type AiContext = {
  type: AiType;
  planetName: string;
  themeLabel: string;
  pet: PetProfile;
  visitorName: string;
  content?: string;
  briefData?: string;
};

const LIMIT: Record<AiType, number> = { welcome: 60, reply: 50, brief: 240, polish: 50 };

export function clip(text: string, max: number) {
  const clean = text
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/^(宠物|旁白|回复|欢迎语)[:：]\s*/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/** 失败降级模板：保证任何情况下都有可展示的文案（服务端与静态演示版共用） */
export function fallbackText(ctx: AiContext): string {
  if (ctx.type === 'welcome') {
    return clip(
      `欢迎${ctx.visitorName}来到${ctx.planetName}～我是${ctx.pet.name}，这里的回忆都晒过太阳啦。`,
      LIMIT.welcome,
    );
  }
  if (ctx.type === 'reply') {
    return clip(`${ctx.pet.name}记下了你的话，谢谢你来到这颗星球。`, LIMIT.reply);
  }
  if (ctx.type === 'polish') {
    // 降级：保持原意，只做长度裁剪
    return clip(ctx.content || '', LIMIT.polish);
  }
  return clip(`今日访客小结：${ctx.briefData || '暂时还没有新的互动。'}`, LIMIT.brief);
}
