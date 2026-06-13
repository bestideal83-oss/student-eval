import * as XLSX from 'xlsx';
import { DEFAULT_FIELD_CONFIG, getEnabledFields } from './fieldConfig.js';

/**
 * 전체 결과 엑셀 (관리자용)
 */
export function downloadResultExcel(students, responses, fieldConfig) {
  const wb = XLSX.utils.book_new();
  const enabled = getEnabledFields(fieldConfig);
  const teacherSubjectMap = {};

  for (const student of students) {
    if (!student.subjects) continue;
    student.subjects.forEach((subj, idx) => {
      const sheetKey = `${subj.teacherName}_${subj.subjectName}`;
      if (!teacherSubjectMap[sheetKey]) {
        teacherSubjectMap[sheetKey] = { teacherName: subj.teacherName, subjectName: subj.subjectName, rows: [] };
      }
      teacherSubjectMap[sheetKey].rows.push(buildRow(student, subj, idx, responses, enabled));
    });
  }

  // 전체현황 시트
  const summaryRows = students.map(s => ({
    '학번': s.id, '성명': s.name, '희망학과': s.hopeMajor || '', '학생부컨셉': s.concept || '',
    '제출여부': responses[s.id]?.submitted ? '제출' : '미제출',
    '제출일시': responses[s.id]?.submittedAt ? new Date(responses[s.id].submittedAt).toLocaleString('ko-KR') : ''
  }));
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  setColumnWidths(summaryWs, [10, 10, 15, 25, 10, 20]);
  XLSX.utils.book_append_sheet(wb, summaryWs, '전체현황');

  for (const key of Object.keys(teacherSubjectMap).sort()) {
    const data = teacherSubjectMap[key];
    const ws = XLSX.utils.json_to_sheet(data.rows);
    const widths = [10, 10, 15, 25, ...enabled.map(f => f.type === 'selfEval' ? 50 : f.type === 'textarea' ? 30 : 20)];
    setColumnWidths(ws, widths);
    enableWrapText(ws);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(wb, `${data.teacherName}_${data.subjectName}`));
  }

  XLSX.writeFile(wb, `학생부_자기평가_결과_${todayStr()}.xlsx`);
}

/**
 * 교사별 엑셀
 */
export function downloadTeacherExcel(students, responses, teacherName, fieldConfig) {
  const wb = XLSX.utils.book_new();
  const enabled = getEnabledFields(fieldConfig);

  for (const student of students) {
    if (!student.subjects) continue;
    student.subjects.forEach((subj, idx) => {
      if (subj.teacherName !== teacherName) return;
      const row = buildRow(student, subj, idx, responses, enabled);
      const sheetKey = subj.subjectName;

      if (!wb.SheetNames.includes(sheetKey)) {
        const ws = XLSX.utils.json_to_sheet([row]);
        const widths = [10, 10, 15, 25, ...enabled.map(f => f.type === 'selfEval' ? 50 : f.type === 'textarea' ? 30 : 20)];
        setColumnWidths(ws, widths);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName(wb, sheetKey));
      } else {
        XLSX.utils.sheet_add_json(wb.Sheets[sheetKey], [row], { skipHeader: true, origin: -1 });
      }
    });
  }

  XLSX.writeFile(wb, `자기평가_${teacherName}_${todayStr()}.xlsx`);
}

// ── 공통 ──

function buildRow(student, subj, idx, responses, enabledFields) {
  const subjectKey = `${subj.subjectName}_${idx}`;
  const resp = responses[student.id]?.subjects?.[subjectKey] || {};
  const fd = resp.formData || {};

  const row = {
    '학번': student.id,
    '성명': student.name,
    '희망학과': student.hopeMajor || '',
    '학생부컨셉': student.concept || ''
  };

  for (const field of enabledFields) {
    if (field.id === 'assessments') {
      row[field.label] = (resp.selectedAssessments || []).join(', ');
    } else if (field.id === 'selfEval') {
      const texts = [];
      if (resp.selfEvals) {
        resp.selfEvals.forEach((e, i) => {
          if (e.topic || e.motivation || e.process || e.result) {
            const parts = [];
            if (e.topic) parts.push(`[주제탐구명] ${e.topic}`);
            if (e.motivation) parts.push(`[동기] ${e.motivation}`);
            if (e.process) parts.push(`[과정] ${e.process}`);
            if (e.result) parts.push(`[결과] ${e.result}`);
            texts.push(`<자기평가 ${i + 1}> ${parts.join(' ')}`);
          }
        });
      }
      row[field.label] = texts.join('\n\n');
    } else {
      // text, textarea (기본 + 커스텀 필드)
      // 하위호환: 기존 keyword/strength/book 필드
      row[field.label] = fd[field.id] || resp[field.id] || '';
    }
  }

  return row;
}

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

function safeSheetName(wb, name) {
  let safe = name.length > 31 ? name.substring(0, 31) : name;
  let final = safe, c = 1;
  while (wb.SheetNames.includes(final)) { final = `${safe.substring(0, 28)}_${c++}`; }
  return final;
}

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`;
}
