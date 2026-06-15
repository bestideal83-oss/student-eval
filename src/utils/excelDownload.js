import * as XLSX from 'xlsx';
import { getEnabledFields } from './fieldConfig.js';

/**
 * 전체 결과 엑셀 (관리자용) — 단일 시트 + 슬라이서용 테이블 형식
 * 열: 성명 | 구분(교과명) | 담당교사 | 학번 이름 | 학생부 컨셉 | 교과 및 활동 키워드 |
 *     세특반영수행평가 | 부각하고 싶은 장점 | 도서 | 개별자기평가 | 생기부기재내용 | Byte
 */
export function downloadResultExcel(students, responses, fieldConfig) {
  const wb = XLSX.utils.book_new();
  const rows = [];

  for (const student of students) {
    if (!student.subjects) continue;
    const concept = responses[student.id]?.customConcept || student.concept || '';

    student.subjects.forEach((subj, idx) => {
      const subjectKey = `${subj.subjectName}_${idx}`;
      const resp = responses[student.id]?.subjects?.[subjectKey] || {};
      const fd = resp.formData || {};

      rows.push(buildRow(student, subj, concept, resp, fd));
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  setColumnWidths(ws, [8, 18, 14, 14, 35, 20, 25, 25, 18, 50, 50, 8]);
  enableWrapText(ws);

  // 테이블 범위 설정 (슬라이서 호환)
  const range = XLSX.utils.decode_range(ws['!ref']);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  XLSX.utils.book_append_sheet(wb, ws, '전체현황');
  XLSX.writeFile(wb, `학생부_자기평가_결과_${todayStr()}.xlsx`);
}

/**
 * 교사별 엑셀 — 동일 형식
 */
export function downloadTeacherExcel(students, responses, teacherName, fieldConfig) {
  const wb = XLSX.utils.book_new();
  const rows = [];

  for (const student of students) {
    if (!student.subjects) continue;
    const concept = responses[student.id]?.customConcept || student.concept || '';

    student.subjects.forEach((subj, idx) => {
      if (subj.teacherName !== teacherName) return;
      const subjectKey = `${subj.subjectName}_${idx}`;
      const resp = responses[student.id]?.subjects?.[subjectKey] || {};
      const fd = resp.formData || {};

      rows.push(buildRow(student, subj, concept, resp, fd));
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  setColumnWidths(ws, [8, 18, 14, 14, 35, 20, 25, 25, 18, 50, 50, 8]);
  enableWrapText(ws);
  const range = XLSX.utils.decode_range(ws['!ref']);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  XLSX.utils.book_append_sheet(wb, ws, '전체현황');
  XLSX.writeFile(wb, `자기평가_${teacherName}_${todayStr()}.xlsx`);
}

// ── 행 생성 ──

function buildRow(student, subj, concept, resp, fd) {
  // 수행평가
  const assessments = (resp.selectedAssessments || []).join(', ');

  // 개별 자기평가서 합산
  const selfEvalTexts = [];
  if (resp.selfEvals) {
    resp.selfEvals.forEach((e, i) => {
      if (e.topic || e.motivation || e.process || e.result) {
        const parts = [];
        if (e.topic) parts.push(`[주제] ${e.topic}`);
        if (e.motivation) parts.push(`[동기] ${e.motivation}`);
        if (e.process) parts.push(`[과정] ${e.process}`);
        if (e.result) parts.push(`[결과] ${e.result}`);
        selfEvalTexts.push(parts.join(' '));
      }
    });
  }

  return {
    '성명': student.name,
    '구분(교과명)': subj.subjectName,
    '담당교사': subj.teacherName || '',
    '학번 이름': `${student.id} ${student.name}`,
    '학생부 컨셉': concept,
    '교과 및 활동 키워드': fd.keyword || resp.keyword || '',
    '세특반영수행평가': assessments,
    '부각하고 싶은 장점': fd.strength || resp.strength || '',
    '도서': fd.book || resp.book || '',
    '개별자기평가': selfEvalTexts.join(' / '),
    '생기부기재내용': '',
    'Byte': 0
  };
}

// ── 유틸 ──

function setColumnWidths(ws, widths) { ws['!cols'] = widths.map(w => ({ wch: w })); }

function enableWrapText(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) { if (!ws[addr].s) ws[addr].s = {}; ws[addr].s.alignment = { wrapText: true, vertical: 'top' }; }
    }
  }
}

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`;
}
