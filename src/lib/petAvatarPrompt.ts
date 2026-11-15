/**
 * 宠物 Q 版形象生成：prompt 拼装与类型定义。
 * 图生图（image-to-image）模式：以原照片为参考，精准保留宠物特征。
 * 所有 AI 调用在服务端 API Route 中，前端绝不接触 API Key。
 */

/* ------------------------------------------------------------------ */
/* 类型定义                                                            */
/* ------------------------------------------------------------------ */

export type PetAvatarStyle = 'blindbox' | 'clay' | 'candy';

/** @deprecated 图生图模式不再使用结构化描述，保留仅为兼容旧数据 */
export interface PetDesc {
  species: string;
  breedGuess?: string | null;
  furColor: string;
  furPattern?: string | null;
  eyeColor?: string | null;
  distinctiveFeatures?: string[] | null;
  pose?: string | null;
  mood?: string | null;
}

/* ------------------------------------------------------------------ */
/* 图生图提示词（Seedream 5.0 Pro / reference-to-image）                */
/* ------------------------------------------------------------------ */

/** 中文正向（≤300 字，Seedream 中文理解最佳） */
const I2I_PROMPT_ZH = `将参考图中的宠物转换为 Q 版 2.5D 手办风格。圆润大头小身（头身比约 2:1），蓬松柔软的绒毛质感，眼睛放大并带明亮高光，嘴角微扬的温柔微笑。严格保留参考照片中宠物的毛色、花纹分布、耳朵形态、脸型轮廓和标志性特征，不要改变品种辨识度。柔和影棚光，暖色轮廓光从侧后方勾勒身体边缘，浅景深。居中全身构图，背景为透明或极淡的星空紫光晕，周围少量漂浮的星光粒子。盲盒手办质感，软萌治愈，单只宠物，无文字，无水印。`;

/** 英文增强（与中文叠加，强化风格与细节约束） */
const I2I_PROMPT_EN = `Convert the pet in the reference photo into a 2.5D chibi figure. Big rounded head, small body, roughly 2:1 head-to-body ratio. Plush, soft fur texture. Enlarged glossy eyes with bright catchlights. Gentle, warm smile. Strictly preserve the reference pet's fur color, pattern placement, ear shape, face outline, and distinctive markings — do not change breed recognizability. Soft studio lighting with a warm rim light from the side-back, shallow depth of field. Centered full-body composition. Background: transparent or a very soft starry purple halo, with a few floating star particles. Blind-box collectible figure aesthetic, clay/vinyl material feel, cute and healing. Single pet only, no text, no watermark.`;

/** 风格变体修饰语 */
const STYLE_MODIFIERS: Record<PetAvatarStyle, string> = {
  blindbox: 'blind-box collectible figure, matte vinyl material, studio product shot',
  clay: 'claymation, soft clay texture, handcrafted, warm pastel tones',
  candy: 'translucent candy material, glossy resin, iridescent highlights',
};

/** 负向提示词 */
export const NEGATIVE_PROMPT = `photorealistic, realistic fur photo, human, hands, text, watermark, logo, signature, extra limbs, extra ears, deformed face, distorted eyes, multiple pets, cluttered background, scary, aggressive, low quality, blurry, jpeg artifacts, dark`;

/**
 * 拼装图生图 prompt。
 * 以原照片为参考图，prompt 只负责风格转换与特征保留指令。
 * 默认风格为 clay（黏土手办感，最贴近"萌"的调性）。
 */
export function buildI2IPrompt(
  style: PetAvatarStyle = 'clay',
): { prompt: string; negative: string } {
  const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.clay;

  // 中文为主 + 英文增强 + 风格修饰，三段叠加
  const prompt = `${I2I_PROMPT_ZH}\n\n${I2I_PROMPT_EN}\n\nStyle emphasis: ${styleModifier}.`;

  return { prompt, negative: NEGATIVE_PROMPT };
}

/* ------------------------------------------------------------------ */
/* Pollinations 免费文生图（无需 Key、国内直连，作为默认可用方案）        */
/* ------------------------------------------------------------------ */

/**
 * Pollinations 文生图 prompt。
 * 免费方案：生成通用 Q 版萌宠（不参考原照片，所以不会像特定宠物）。
 * 若需"精准像原宠物"，配置 IMAGE_API_KEY 后自动切换为图生图。
 */
export function buildPollinationsPrompt(style: PetAvatarStyle = 'clay'): string {
  const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.clay;
  return (
    `cute 2.5D chibi pet figure, big rounded head small body 2:1 ratio, ` +
    `plush soft fur texture, big glossy eyes with bright catchlights, gentle warm smile, ` +
    `soft studio lighting, warm rim light, shallow depth of field, ` +
    `${styleModifier}, blind-box collectible clay figure aesthetic, ` +
    `single adorable pet, centered full-body, soft purple starry gradient background, ` +
    `high detail, no text, no watermark`
  );
}

/* ------------------------------------------------------------------ */
/* 以下为旧版文生图导出，保留仅为兼容历史数据，图生图模式不再调用        */
/* ------------------------------------------------------------------ */

/** @deprecated 图生图模式不再使用视觉理解 */
export const VISION_PROMPT = `你是宠物形象设计师。看这张宠物照片，只输出 JSON，不要解释：
{"species":"cat|dog|other","breedGuess":"string|null","furColor":"string","furPattern":"纯色|虎斑|奶牛|三花|渐变|null","eyeColor":"string|null","distinctiveFeatures":["耳朵/尾巴/花纹/缺角等，最多3条"],"pose":"坐|站|趴|侧脸|null","mood":"温和|活泼|高冷|null"}
规则：不识别、不描述人物身份信息；不确定字段填 null；不编造特征。`;

/** @deprecated 图生图模式不再使用 */
const DEFAULT_PET_DESC: PetDesc = {
  species: 'cat',
  breedGuess: null,
  furColor: 'soft gray',
  furPattern: null,
  eyeColor: null,
  distinctiveFeatures: null,
  pose: null,
  mood: null,
};

/** @deprecated 图生图模式不再使用 */
export function normalizePetDesc(raw: Partial<PetDesc> | null | undefined): PetDesc {
  return {
    species: typeof raw?.species === 'string' && raw.species ? raw.species : DEFAULT_PET_DESC.species,
    breedGuess: typeof raw?.breedGuess === 'string' ? raw.breedGuess : null,
    furColor: typeof raw?.furColor === 'string' && raw.furColor ? raw.furColor : DEFAULT_PET_DESC.furColor,
    furPattern: typeof raw?.furPattern === 'string' ? raw.furPattern : null,
    eyeColor: typeof raw?.eyeColor === 'string' ? raw.eyeColor : null,
    distinctiveFeatures: Array.isArray(raw?.distinctiveFeatures)
      ? raw.distinctiveFeatures.filter((f): f is string => typeof f === 'string').slice(0, 3)
      : null,
    pose: typeof raw?.pose === 'string' ? raw.pose : null,
    mood: typeof raw?.mood === 'string' ? raw.mood : null,
  };
}

/** @deprecated 图生图模式不再使用，请用 buildI2IPrompt */
export function buildImagePrompt(
  petDesc: PetDesc,
  style: PetAvatarStyle = 'blindbox',
): { prompt: string; negative: string } {
  const desc = normalizePetDesc(petDesc);
  const styleModifier = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.blindbox;

  const features = desc.distinctiveFeatures?.length
    ? desc.distinctiveFeatures.join(', ')
    : 'no distinctive features';

  const prompt = `2.5D chibi figure of a ${desc.species}, ${desc.breedGuess || 'unknown breed'}, soft 3D render style, big head small body 2:1 ratio,
rounded chubby shapes, ${desc.furColor} plush fur texture, ${desc.furPattern || 'solid'} pattern, big glossy ${desc.eyeColor || 'brown'} eyes
with bright highlights, gentle smile, keep these features: ${features},
${styleModifier},
translucent candy-like material, soft studio lighting, warm rim light, shallow depth of field,
centered full-body composition, small floating star particles around,
background: transparent with a soft purple starry gradient halo,
blind-box collectible figure / claymation cute style, high detail, single pet, no text, no watermark`;

  return { prompt, negative: NEGATIVE_PROMPT };
}
