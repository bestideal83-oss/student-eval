export const DEFAULT_FIELD_CONFIG = [
  { id: 'keyword',     label: '교과 및 활동 키워드',   type: 'text',     enabled: true,  fixed: true },
  { id: 'assessments', label: '세특반영 수행평가',     type: 'chips',    enabled: true,  fixed: true },
  { id: 'strength',    label: '부각하고 싶은 장점',    type: 'textarea', enabled: true,  fixed: true },
  { id: 'book',        label: '도서',                 type: 'text',     enabled: true,  fixed: true },
  { id: 'selfEval',    label: '개별 자기 평가서',      type: 'selfEval', enabled: true,  fixed: true },
];

export function getEnabledFields(config) {
  return (config || DEFAULT_FIELD_CONFIG).filter(f => f.enabled);
}

export function generateCustomId() {
  return 'custom_' + Date.now().toString(36);
}

/**
 * Firestore에 저장된 fieldConfig와 코드의 기본값을 병합
 * fixed 필드는 항상 코드의 label을 사용 (이름 변경 반영)
 */
export function mergeFieldConfig(stored) {
  if (!stored || !Array.isArray(stored)) return DEFAULT_FIELD_CONFIG;

  const defaultMap = {};
  DEFAULT_FIELD_CONFIG.forEach(f => { defaultMap[f.id] = f; });

  // 기존 저장된 필드 업데이트
  const merged = stored.map(f => {
    if (f.fixed && defaultMap[f.id]) {
      // fixed 필드: 코드의 최신 label 적용, enabled 상태는 유지
      return { ...defaultMap[f.id], enabled: f.enabled };
    }
    return f; // 커스텀 필드는 그대로
  });

  // 코드에 있지만 저장본에 없는 fixed 필드 추가
  DEFAULT_FIELD_CONFIG.forEach(def => {
    if (!merged.find(f => f.id === def.id)) {
      merged.push(def);
    }
  });

  return merged;
}
