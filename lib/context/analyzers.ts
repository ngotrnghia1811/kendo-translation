/**
 * MAC-RAG Analyzers
 * Phase 0: Rule-based domain classification, style detection, and entity extraction
 */

import type {
  SourceLanguage,
  DomainClassification,
  DomainType,
  StyleProfile,
  FormalityLevel,
  ToneType,
  Entity,
} from './context-builder';

const KENDO_TERMS: Record<string, { translation: string; type: Entity['type'] }> = {
  '竹刀': { translation: 'shinai', type: 'equipment' },
  '面': { translation: 'men', type: 'equipment' },
  '小手': { translation: 'kote', type: 'equipment' },
  '胴': { translation: 'do', type: 'equipment' },
  '垂れ': { translation: 'tare', type: 'equipment' },
  '防具': { translation: 'bogu', type: 'equipment' },
  '剣道着': { translation: 'kendogi', type: 'equipment' },
  '袴': { translation: 'hakama', type: 'equipment' },
  '木刀': { translation: 'bokuto/bokken', type: 'equipment' },
  '打ち': { translation: 'strike/uchi', type: 'technique' },
  '突き': { translation: 'thrust/tsuki', type: 'technique' },
  '払い': { translation: 'harai', type: 'technique' },
  '返し': { translation: 'kaeshi', type: 'technique' },
  '抜き': { translation: 'nuki', type: 'technique' },
  '出ばな': { translation: 'debana', type: 'technique' },
  '引き技': { translation: 'hiki-waza', type: 'technique' },
  '仕掛け技': { translation: 'shikake-waza', type: 'technique' },
  '応じ技': { translation: 'oji-waza', type: 'technique' },
  '一本': { translation: 'ippon', type: 'technique' },
  '構え': { translation: 'kamae', type: 'technique' },
  '中段': { translation: 'chudan', type: 'technique' },
  '上段': { translation: 'jodan', type: 'technique' },
  '下段': { translation: 'gedan', type: 'technique' },
  '八相': { translation: 'hasso', type: 'technique' },
  '脇構え': { translation: 'waki-gamae', type: 'technique' },
  '正眼': { translation: 'seigan', type: 'technique' },
  '足さばき': { translation: 'ashi-sabaki', type: 'technique' },
  '踏み込み': { translation: 'fumikomi', type: 'technique' },
  '送り足': { translation: 'okuri-ashi', type: 'technique' },
  '開き足': { translation: 'hiraki-ashi', type: 'technique' },
  '継ぎ足': { translation: 'tsugi-ashi', type: 'technique' },
  '素振り': { translation: 'suburi', type: 'technique' },
  '稽古': { translation: 'keiko', type: 'term' },
  '地稽古': { translation: 'ji-geiko', type: 'term' },
  '掛かり稽古': { translation: 'kakari-geiko', type: 'term' },
  '切り返し': { translation: 'kiri-kaeshi', type: 'technique' },
  '打ち込み': { translation: 'uchikomi', type: 'technique' },
  '礼': { translation: 'rei', type: 'term' },
  '礼法': { translation: 'reiho', type: 'term' },
  '残心': { translation: 'zanshin', type: 'term' },
  '気剣体': { translation: 'ki-ken-tai', type: 'term' },
  '気合い': { translation: 'kiai', type: 'term' },
  '間合い': { translation: 'maai', type: 'term' },
  '先': { translation: 'sen', type: 'term' },
  '心構え': { translation: 'mental attitude/kokorogamae', type: 'term' },
  '正中線': { translation: 'centerline/seichusen', type: 'term' },
  '先生': { translation: 'sensei', type: 'person' },
  '師範': { translation: 'shihan', type: 'person' },
  '範士': { translation: 'hanshi', type: 'person' },
  '教士': { translation: 'kyoshi', type: 'person' },
  '錬士': { translation: 'renshi', type: 'person' },
  '段': { translation: 'dan', type: 'term' },
  '級': { translation: 'kyu', type: 'term' },
};

const MARTIAL_ARTS_TERMS = ['武道', '道場', '形', '型', '流派', '技', '修行', '師匠', '弟子'];
const TECHNICAL_INDICATORS = ['システム', 'プログラム', 'データ', 'サーバー', '設定', 'API', 'コード'];

const KEIGO_PATTERNS = {
  sonkeigo: [
    /いらっしゃ[いるれ]/,
    /おっしゃ[いるれ]/,
    /ご覧にな[るれり]/,
    /なさ[いるれ]/,
    /お\S+にな[るれり]/,
  ],
  teineigo: [
    /です$/,
    /ます$/,
    /ました$/,
    /でしょう$/,
    /ございます$/,
  ],
  kenjogo: [
    /いたし[ます]/,
    /申し[ますあげ]/,
    /参り[ます]/,
    /おり[ます]/,
    /させていただ[きく]/,
  ],
  casual: [
    /だ$/,
    /だよ$/,
    /だね$/,
    /だろう$/,
    /じゃん$/,
    /っす$/,
  ],
};

export function analyzeDomain(text: string, lang: SourceLanguage): DomainClassification {
  const indicators: string[] = [];
  let kendoScore = 0;
  let martialArtsScore = 0;
  let technicalScore = 0;

  if (lang === 'ja') {
    for (const term of Object.keys(KENDO_TERMS)) {
      if (text.includes(term)) {
        kendoScore += 2;
        indicators.push(term);
      }
    }
    for (const term of MARTIAL_ARTS_TERMS) {
      if (text.includes(term)) {
        martialArtsScore += 1;
        if (!indicators.includes(term)) indicators.push(term);
      }
    }
    for (const term of TECHNICAL_INDICATORS) {
      if (text.includes(term)) {
        technicalScore += 1;
        if (!indicators.includes(term)) indicators.push(term);
      }
    }
    if (text.includes('剣道')) {
      kendoScore += 5;
      if (!indicators.includes('剣道')) indicators.push('剣道');
    }
  } else {
    const lowerText = text.toLowerCase();
    const kendoEnglishTerms = ['kendo', 'shinai', 'men', 'kote', 'do', 'bogu', 'suburi', 'keiko', 'kamae'];
    for (const term of kendoEnglishTerms) {
      if (lowerText.includes(term)) {
        kendoScore += 2;
        indicators.push(term);
      }
    }
  }

  let primary: DomainType = 'general';
  let confidence = 0.5;

  if (kendoScore >= 4) {
    primary = 'kendo';
    confidence = Math.min(0.95, 0.5 + kendoScore * 0.05);
  } else if (martialArtsScore >= 3 || kendoScore >= 2) {
    primary = 'martial_arts';
    confidence = Math.min(0.85, 0.5 + (martialArtsScore + kendoScore) * 0.05);
  } else if (technicalScore >= 3) {
    primary = 'technical';
    confidence = Math.min(0.85, 0.5 + technicalScore * 0.05);
  }

  let secondary: DomainType | undefined;
  if (primary === 'kendo' && martialArtsScore >= 2) secondary = 'martial_arts';
  else if (primary === 'martial_arts' && kendoScore >= 2) secondary = 'kendo';

  return { primary, secondary, confidence, indicators: indicators.slice(0, 10) };
}

export function analyzeStyle(text: string, lang: SourceLanguage): StyleProfile {
  let formality: FormalityLevel = 'semi_formal';
  let tone: ToneType = 'instructional';
  let keigoLevel: StyleProfile['keigoLevel'] = undefined;

  if (lang === 'ja') {
    let sonkeigoCount = 0;
    let teineigoCount = 0;
    let kenjogoCount = 0;
    let casualCount = 0;

    for (const p of KEIGO_PATTERNS.sonkeigo) { if (p.test(text)) sonkeigoCount++; }
    for (const p of KEIGO_PATTERNS.teineigo) { if (p.test(text)) teineigoCount++; }
    for (const p of KEIGO_PATTERNS.kenjogo) { if (p.test(text)) kenjogoCount++; }
    for (const p of KEIGO_PATTERNS.casual) { if (p.test(text)) casualCount++; }

    if (sonkeigoCount > 0 || kenjogoCount > 0) {
      formality = 'formal';
      keigoLevel = sonkeigoCount > kenjogoCount ? 'sonkeigo' : 'kenjogo';
    } else if (teineigoCount > casualCount) {
      formality = 'semi_formal';
      keigoLevel = 'teineigo';
    } else if (casualCount > 0) {
      formality = 'casual';
      keigoLevel = 'casual';
    }
  } else {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('shall') || lowerText.includes('hereby') || lowerText.includes('pursuant')) {
      formality = 'formal';
    } else if (lowerText.includes("don't") || lowerText.includes("can't") || lowerText.includes("you'll")) {
      formality = 'casual';
    }
  }

  if (text.includes('方法') || text.includes('やり方') || text.includes('ポイント') ||
    text.toLowerCase().includes('how to') || text.toLowerCase().includes('step')) {
    tone = 'instructional';
  } else if (text.includes('と思い') || text.includes('感じ') || text.includes('経験')) {
    tone = 'narrative';
  } else if (text.includes('？') || text.includes('?') || text.includes('ですか')) {
    tone = 'conversational';
  }

  let audience: StyleProfile['audience'] = 'general';
  const hasBasicTerms = text.includes('基本') || text.includes('初心者') ||
    text.toLowerCase().includes('basic') || text.toLowerCase().includes('beginner');
  const hasAdvancedTerms = text.includes('応用') || text.includes('上級') || text.includes('高度') ||
    text.toLowerCase().includes('advanced') || text.toLowerCase().includes('expert');

  if (hasBasicTerms) audience = 'beginner';
  else if (hasAdvancedTerms) audience = 'advanced';

  return { formality, tone, audience, keigoLevel };
}

export function extractEntities(text: string, lang: SourceLanguage): Entity[] {
  const entities: Entity[] = [];

  if (lang === 'ja') {
    for (const [term, info] of Object.entries(KENDO_TERMS)) {
      if (text.includes(term)) {
        entities.push({ text: term, type: info.type, translation: info.translation, confidence: 0.95 });
      }
    }
  } else {
    const lowerText = text.toLowerCase();
    for (const [jaText, info] of Object.entries(KENDO_TERMS)) {
      const enTerm = info.translation.toLowerCase().split('/')[0];
      if (lowerText.includes(enTerm)) {
        entities.push({ text: enTerm, type: info.type, translation: jaText, confidence: 0.90 });
      }
    }
  }

  return entities;
}

export function extractKeyTerms(text: string, lang: SourceLanguage): string[] {
  const terms: string[] = [];

  if (lang === 'ja') {
    for (const term of Object.keys(KENDO_TERMS)) {
      if (text.includes(term)) terms.push(term);
    }

    const suffixPatterns = [/(\S+技)/g, /(\S+法)/g, /(\S+道)/g];
    for (const pattern of suffixPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (!terms.includes(match) && match.length <= 6) terms.push(match);
        }
      }
    }
  }

  return terms.slice(0, 20);
}

export function estimateComplexity(
  text: string,
  lang: SourceLanguage,
  entityCount: number
): 'low' | 'medium' | 'high' {
  const length = text.length;
  let score = 0;

  if (length > 1000) score += 2;
  else if (length > 500) score += 1;

  if (entityCount > 10) score += 2;
  else if (entityCount > 5) score += 1;

  if (lang === 'ja') {
    const nestedPatterns = (text.match(/が|は|を|に|で|と|から|まで|より/g) || []).length;
    if (nestedPatterns > 20) score += 2;
    else if (nestedPatterns > 10) score += 1;
  }

  const avgSentenceLength = lang === 'ja'
    ? text.length / (text.split(/[。！？]/).length || 1)
    : text.length / (text.split(/[.!?]/).length || 1);

  if (avgSentenceLength > 100) score += 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
