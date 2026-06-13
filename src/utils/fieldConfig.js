/**
 * 기본 입력 항목 설정
 * 
 * id: 고유 키 (응답 데이터 저장 키)
 * label: 표시 이름
 * type: 'text' | 'textarea' | 'chips' | 'selfEval'
 * enabled: 학생에게 표시 여부
 * fixed: true면 삭제 불가 (토글만 가능)
 */
export const DEFAULT_FIELD_CONFIG = [
  { id: 'keyword',     label: '교과 세특 키워드',   type: 'text',     enabled: true,  fixed: true },
  { id: 'assessments', label: '세특반영 수행평가',   type: 'chips',    enabled: true,  fixed: true },
  { id: 'strength',    label: '부각장점 키워드',     type: 'textarea', enabled: true,  fixed: true },
  { id: 'book',        label: '도서',               type: 'text',     enabled: true,  fixed: true },
  { id: 'selfEval',    label: '개별 자기평가서',     type: 'selfEval', enabled: true,  fixed: true },
];

/** 활성화된 필드만 반환 */
export function getEnabledFields(config) {
  return (config || DEFAULT_FIELD_CONFIG).filter(f => f.enabled);
}

/** 고유 custom ID 생성 */
export function generateCustomId() {
  return 'custom_' + Date.now().toString(36);
}
