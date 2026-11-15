export const VISIBILITY = ['PRIVATE', 'INVITE', 'PUBLIC'] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const MEMORY_VISIBILITY = ['PRIVATE', 'PUBLIC'] as const;
export type MemoryVisibility = (typeof MEMORY_VISIBILITY)[number];

export const VISITOR_ACTIONS = ['LIGHT', 'STAR', 'FEED'] as const;
export type VisitorAction = (typeof VISITOR_ACTIONS)[number];

export const ACTION_LABEL: Record<string, string> = {
  ENTER: '到访星球',
  LIGHT: '点亮星球',
  STAR: '送了一颗星',
  FEED: '投喂宠物',
  MESSAGE: '留下留言',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  PRIVATE: '私密',
  INVITE: '邀请码',
  PUBLIC: '公开',
};

export const ACTION_ICON: Record<string, string> = {
  ENTER: '🛰️',
  LIGHT: '✨',
  STAR: '⭐',
  FEED: '🍬',
  MESSAGE: '💌',
};

/** 敏感词过滤：命中的词等长替换为 *，不做拦截，保证留言流畅 */
const BLOCKED_WORDS = [
  '傻逼',
  '操你',
  '死全家',
  '色情',
  '约炮',
  '开房',
  '裸聊',
  '微信转账',
  '银行卡号',
  '身份证号',
];

export function maskSensitive(input: string): string {
  let output = input;
  for (const word of BLOCKED_WORDS) {
    if (output.includes(word)) {
      output = output.split(word).join('*'.repeat(word.length));
    }
  }
  return output;
}

export function isVisibility(value: unknown): value is Visibility {
  return typeof value === 'string' && (VISIBILITY as readonly string[]).includes(value);
}

export function isVisitorAction(value: unknown): value is VisitorAction {
  return typeof value === 'string' && (VISITOR_ACTIONS as readonly string[]).includes(value);
}
