/**
 * aiSummary.ts
 *
 * - 백엔드가 string(JSON) 또는 객체 형태로 내려줘도 안전하게 파싱
 * - { menu?: string[], feature?: string[], purpose?: string[] } 형태만 사용
 */
export interface AiSummary {
    menu?: string[];
    feature?: string[];
    purpose?: string[];
  }
  
  export function parseAiSummary(input?: unknown): AiSummary | null {
    if (!input) return null;
  
    // 이미 객체인 경우
    if (typeof input === 'object') {
      const o = input as any;
      return {
        menu: Array.isArray(o.menu) ? o.menu : undefined,
        feature: Array.isArray(o.feature) ? o.feature : undefined,
        purpose: Array.isArray(o.purpose) ? o.purpose : undefined,
      };
    }
  
    // 문자열(JSON)인 경우
    if (typeof input === 'string') {
      try {
        const o = JSON.parse(input);
        return {
          menu: Array.isArray(o?.menu) ? o.menu : undefined,
          feature: Array.isArray(o?.feature) ? o.feature : undefined,
          purpose: Array.isArray(o?.purpose) ? o.purpose : undefined,
        };
      } catch {
        // 파싱 불가하면 무시
        return null;
      }
    }
  
    return null;
  }
  
  /**
   * feature 중 일부 키워드만 뽑아 해시태그로 사용
   * - '영업' / '전문' / '주차' 포함 항목만
   */
  export function pickFeatureTags(features?: string[]): string[] {
    if (!features) return [];
    const KEYWORDS = ['영업', '전문', '주차'];
    return features.filter(f => KEYWORDS.some(k => f.includes(k)));
  }
  