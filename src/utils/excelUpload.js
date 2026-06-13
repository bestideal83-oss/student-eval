import * as XLSX from 'xlsx';

/**
 * 학생부 기초자료 엑셀 파서
 * 
 * 필요 시트:
 *   수강 과목        — 학번 | 성명 | 개설과목(학점) | 담당교사
 *   진학희망관련      — 학번 | 성명 | 희망학과 | 학생부 컨셉=동사형 진로
 *   수행평가정보      — 과목명 | 수행1 | 수행2 | 수행3 | 수행4 | 수행5
 *   교과담당자 관련   — 교과명 | 담당교사  (빠진 담당교사 보충용)
 */
export function parseUploadedExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheetNames = wb.SheetNames;

        // ── 시트 찾기 (이름에 키워드 포함 여부로 유연 매칭) ──
        const find = (keywords) => {
          for (const kw of keywords) {
            const found = sheetNames.find(n => n.includes(kw));
            if (found) return found;
          }
          return null;
        };

        const subjectSheetName   = find(['수강 과목', '수강과목']);
        const careerSheetName    = find(['진학희망관련']);
        const assessSheetName    = find(['수행평가정보', '수행평가']);
        const teacherSheetName   = find(['교과담당자', '담당자']);

        if (!subjectSheetName) throw new Error('"수강 과목" 시트를 찾을 수 없습니다.');

        // ── 1. 진학희망관련 → 학생 기본정보 ──
        const studentMap = {}; // id → { id, name, hopeMajor, concept, subjects[] }

        if (careerSheetName) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[careerSheetName], { header: 1 });
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r[0]) continue;
            const id = String(r[0]).trim();
            studentMap[id] = {
              id,
              name: String(r[1] || '').trim(),
              hopeMajor: r[2] ? String(r[2]).trim() : '',
              concept: r[3] ? String(r[3]).trim() : '',
              subjects: []
            };
          }
        }

        // ── 2. 교과담당자 관련 → 과목-교사 보조 매핑 ──
        const teacherLookup = {}; // 과목명 → 담당교사
        if (teacherSheetName) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[teacherSheetName], { header: 1 });
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r[0] || !r[1]) continue;
            const subj = String(r[0]).trim();
            const teacher = String(r[1]).trim();
            if (teacher && teacher !== '0') {
              teacherLookup[subj] = teacher;
            }
          }
        }

        // ── 3. 수행평가정보 → 과목별 수행평가명 ──
        const assessmentMap = {}; // 과목명 → [수행1, 수행2, ...]
        if (assessSheetName) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[assessSheetName], { header: 1 });
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r[0]) continue;
            const subj = String(r[0]).trim();
            const assessments = [];
            for (let j = 1; j <= 5; j++) {
              if (r[j] && String(r[j]).trim()) {
                assessments.push(String(r[j]).trim());
              }
            }
            assessmentMap[subj] = assessments;
          }
        }

        // ── 수행평가 매칭 헬퍼: 정규화된 이름으로 유사 매칭 ──
        const normalize = (s) => s.replace(/[\s()（）학점\d]/g, '').trim();
        const findAssessments = (subjectName) => {
          // 정확 매칭
          if (assessmentMap[subjectName]) return assessmentMap[subjectName];
          // 정규화 매칭
          const norm = normalize(subjectName);
          for (const [key, val] of Object.entries(assessmentMap)) {
            if (normalize(key) === norm) return val;
          }
          return [];
        };

        const findTeacher = (subjectName, originalTeacher) => {
          // 원래 교사가 유효하면 사용
          if (originalTeacher && originalTeacher !== '0' && originalTeacher !== 'NaN') {
            return originalTeacher;
          }
          // 보조 매핑에서 찾기
          if (teacherLookup[subjectName]) return teacherLookup[subjectName];
          const norm = normalize(subjectName);
          for (const [key, val] of Object.entries(teacherLookup)) {
            if (normalize(key) === norm) return val;
          }
          return '';
        };

        // ── 4. 수강 과목 → 학생-과목 매핑 ──
        const subjectRows = XLSX.utils.sheet_to_json(wb.Sheets[subjectSheetName], { header: 1 });
        for (let i = 1; i < subjectRows.length; i++) {
          const r = subjectRows[i];
          if (!r[0]) continue;
          const id = String(r[0]).trim();
          const name = String(r[1] || '').trim();
          const subjectName = String(r[2] || '').trim();
          const rawTeacher = r[3] != null ? String(r[3]).trim() : '';

          if (!subjectName) continue;

          // 학생이 진학희망관련에 없으면 여기서 생성
          if (!studentMap[id]) {
            studentMap[id] = {
              id,
              name,
              hopeMajor: '',
              concept: '',
              subjects: []
            };
          }

          const teacherName = findTeacher(subjectName, rawTeacher);
          const assessments = findAssessments(subjectName);

          studentMap[id].subjects.push({
            subjectName,
            teacherName,
            assessments
          });
        }

        const result = Object.values(studentMap).filter(s => s.subjects.length > 0);
        result.sort((a, b) => a.id.localeCompare(b.id));

        if (result.length === 0) {
          reject(new Error('파싱된 학생 데이터가 없습니다.'));
          return;
        }

        resolve(result);
      } catch (err) {
        reject(new Error('엑셀 파일 파싱 실패: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsArrayBuffer(file);
  });
}
