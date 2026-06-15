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
