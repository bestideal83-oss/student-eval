import React, { useState, useEffect } from 'react';
import { db, collection, doc, getDoc, getDocs } from '../firebase.js';
import { downloadTeacherExcel } from '../utils/excelDownload.js';
import { DEFAULT_FIELD_CONFIG, getEnabledFields } from '../utils/fieldConfig.js';

export default function TeacherDashboard({ onLogout, showMessage }) {
  const [students, setStudents] = useState([]);
  const [responses, setResponses] = useState({});
  const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG);
  const [teacherNames, setTeacherNames] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const list = [];
      studentsSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.id.localeCompare(b.id));
      setStudents(list);

      const responsesSnap = await getDocs(collection(db, 'responses'));
      const respMap = {};
      responsesSnap.forEach(d => { respMap[d.id] = d.data(); });
      setResponses(respMap);

      // fieldConfig 로드
      const configSnap = await getDoc(doc(db, 'config', 'system'));
      if (configSnap.exists() && configSnap.data().fieldConfig) {
        setFieldConfig(configSnap.data().fieldConfig);
      }

      const names = new Set();
      list.forEach(s => s.subjects?.forEach(subj => { if (subj.teacherName) names.add(subj.teacherName); }));
      const sorted = [...names].sort();
      setTeacherNames(sorted);
      if (sorted.length > 0) setSelectedTeacher(sorted[0]);
    } catch (err) { console.error(err); showMessage('데이터 로드 오류', 'error'); }
    setLoading(false);
  };

  const enabledFields = getEnabledFields(fieldConfig);

  const getTeacherData = () => {
    if (!selectedTeacher) return [];
    const subjectMap = {};

    for (const student of students) {
      if (!student.subjects) continue;
      student.subjects.forEach((subj, idx) => {
        if (subj.teacherName !== selectedTeacher) return;
        if (!subjectMap[subj.subjectName]) subjectMap[subj.subjectName] = [];

        const subjectKey = `${subj.subjectName}_${idx}`;
        const resp = responses[student.id]?.subjects?.[subjectKey] || {};
        const fd = resp.formData || {};

        subjectMap[subj.subjectName].push({
          studentId: student.id,
          studentName: student.name,
          hopeMajor: student.hopeMajor || '',
          concept: responses[student.id]?.customConcept || student.concept || '',
          submitted: responses[student.id]?.submitted || false,
          resp, fd
        });
      });
    }
    return Object.entries(subjectMap).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const getCellValue = (row, field) => {
    if (field.id === 'assessments') return (row.resp.selectedAssessments || []).join(', ');
    if (field.id === 'selfEval') {
      return (row.resp.selfEvals || [])
        .filter(e => e.topic || e.motivation || e.process || e.result)
        .map((e, i) => `${i + 1}. ${e.topic || '(미입력)'}`)
        .join(' / ');
    }
    return row.fd[field.id] || row.resp[field.id] || '';
  };

  const handleDownload = () => {
    try { downloadTeacherExcel(students, responses, selectedTeacher, fieldConfig); showMessage('다운로드 시작', 'success'); }
    catch (err) { console.error(err); showMessage('다운로드 오류', 'error'); }
  };

  const teacherData = getTeacherData();

  if (loading) return <div className="admin-page"><div className="loading-overlay">로딩 중...</div></div>;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>교사 대시보드</h1>
        <div className="header-right"><button className="btn btn-ghost" onClick={onLogout}>로그아웃</button></div>
      </header>

      <div className="teacher-select-bar">
        <label>교사 선택</label>
        <div className="teacher-chips">
          {teacherNames.map(name => (
            <button key={name} className={`chip ${selectedTeacher === name ? 'selected' : ''}`} onClick={() => setSelectedTeacher(name)}>{name}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleDownload} disabled={!selectedTeacher}>내 과목 엑셀 다운로드</button>
      </div>

      {teacherData.length === 0 ? (
        <div className="admin-section"><p>데이터가 없습니다.</p></div>
      ) : (
        teacherData.map(([subjectName, rows]) => (
          <div key={subjectName} className="admin-section" style={{ marginBottom: 16 }}>
            <h2>{subjectName} <span className="teacher-subcount">{rows.length}명</span></h2>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>학번</th><th>성명</th><th>학생부 컨셉</th>
                    {enabledFields.map(f => <th key={f.id}>{f.label}</th>)}
                    <th>제출</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.studentId}>
                      <td>{r.studentId}</td>
                      <td>{r.studentName}</td>
                      <td className="cell-wrap">{r.concept}</td>
                      {enabledFields.map(f => <td key={f.id} className="cell-wrap">{getCellValue(r, f) || '-'}</td>)}
                      <td><span className={`submit-badge ${r.submitted ? 'done' : 'pending'}`}>{r.submitted ? '제출' : '미제출'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
