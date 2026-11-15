/**
 * 宠物 Q 版形象生成：prompt 拼装与类型定义。
 * 视觉理解与图像生成共用此文件，但接口调用在服务端 API Route 中。
 */

export const VISION_PROMPT = `你是宠物形象设计师。看这张宠物照片，只输出 JSON，不要解释：
{"species":"cat|dog|other","breedGuess":"string|null","furColor":"string","furPattern":"纯色|虎斑|奶牛|三花|渐变|null","eyeColor":"string|null","distinctiveFeatures":["耳朵/尾巴/花纹/缺角等，最多3条"],"pose":"坐|站|趴|侧脸|null","mood":"温和|活泼|高冷|null"}
规则：不识别、不描述人物身份信息；不确定字段填 null；不编造特征。`;

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

export type PetAvatarStyle = 'blindbox' | 'clay' | 'candy';

const STYLE_MODIFIERS: Record<PetAvatarStyle, string> = {
  blindbox: 'blind-box collectible figure, matte vinyl material, studio product shot',
  clay: 'claymation, soft clay texture, handcrafted, warm pastel tones',
  candy: 'translucent candy material, glossy resin, iridescent highlights',
};

const NEGATIVE_PROMPT = `photorealistic, realistic fur photo, human, hands, text, watermark, logo, signature,
extra limbs, extra ears, deformed face, distorted eyes, multiple pets, cluttered background,
scary, aggressive, low quality, blurry, jpeg artifacts, dark`;

/** 兜底默认值：视觉理解失败或字段缺失时使用，绝不允许拼出 undefined */
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
