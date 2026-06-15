import React, { useState, useEffect } from 'react';
import { db, collection, doc, getDoc, setDoc, getDocs, updateDoc, writeBatch } from '../firebase.js';
import { parseUploadedExcel } from '../utils/excelUpload.js';
import { downloadResultExcel } from '../utils/excelDownload.js';
import { DEFAULT_FIELD_CONFIG, generateCustomId } from '../utils/fieldConfig.js';

export default function AdminDashboard({ onLogout, showMessage }) {
  const [tab, setTab] = useState('upload');
  const [students, setStudents] = useState([]);
  const [responses, setResponses] = useState({});
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 비밀번호 변경
  const [currentAdminPw, setCurrentAdminPw] = useState('');
  const [newAdminPw, setNewAdminPw] = useState('');
  const [newTeacherPw, setNewTeacherPw] = useState('');

  // 입력 항목 설정
  const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentList = [];
      studentsSnap.forEach(d => studentList.push({ id: d.id, ...d.data() }));
      studentList.sort((a, b) => a.id.localeCompare(b.id));
      setStudents(studentList);

      const responsesSnap = await getDocs(collection(db, 'responses'));
      const respMap = {};
      responsesSnap.forEach(d => { respMap[d.id] = d.data(); });
      setResponses(respMap);

      const configSnap = await getDoc(doc(db, 'config', 'system'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        setDeadline(data.deadline || '');
        if (data.fieldConfig) setFieldConfig(data.fieldConfig);
      }
    } catch (err) {
      console.error(err);
      showMessage('데이터 로드 중 오류가 발생했습니다.', 'error');
    }
    setLoading(false);
  };

  // ── 항목 설정 저장 ──
  const saveFieldConfig = async (newConfig) => {
    try {
      await updateDoc(doc(db, 'config', 'system'), { fieldConfig: newConfig });
      setFieldConfig(newConfig);
      showMessage('입력 항목 설정이 저장되었습니다.', 'success');
    } catch (err) { console.error(err); showMessage('오류가 발생했습니다.', 'error'); }
  };

  const toggleField = (id) => {
    const updated = fieldConfig.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f);
    saveFieldConfig(updated);
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) { showMessage('항목 이름을 입력하세요.', 'error'); return; }
    const newField = {
      id: generateCustomId(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      enabled: true,
      fixed: false
    };
    const updated = [...fieldConfig, newField];
    saveFieldConfig(updated);
    setNewFieldLabel('');
    setNewFieldType('text');
  };

  const removeCustomField = (id) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까? 기존에 입력된 데이터는 유지되지만 학생 화면에서 보이지 않게 됩니다.')) return;
    const updated = fieldConfig.filter(f => f.id !== id);
    saveFieldConfig(updated);
  };

  const moveField = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fieldConfig.length) return;
    const updated = [...fieldConfig];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    saveFieldConfig(updated);
  };

  // ── 엑셀 업로드 ──
  // ── 엑셀 업로드 (모드: 'init' 초기등록 / 'update' 정보업데이트) ──
  const [uploadMode, setUploadMode] = useState(null); // null, 'init', 'update'

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mode = uploadMode;
    setLoading(true);
    try {
      const parsed = await parseUploadedExcel(file);
      const BATCH_SIZE = 250;

      if (mode === 'init') {
        // ── 초기 등록: 전체 초기화 ──
        for (let start = 0; start < parsed.length; start += BATCH_SIZE) {
          const chunk = parsed.slice(start, start + BATCH_SIZE);
          const batch = writeBatch(db);
          for (const student of chunk) {
            batch.set(doc(db, 'students', student.id), {
              name: student.name, password: '1234', passwordChanged: false,
              hopeMajor: student.hopeMajor, concept: student.concept, subjects: student.subjects
            });
            batch.set(doc(db, 'responses', student.id), { submitted: false, submittedAt: null, subjects: {} });
          }
          await batch.commit();
        }
        showMessage(`${parsed.length}명 초기 등록 완료 (비밀번호: 1234, 응답 초기화)`, 'success');

      } else {
        // ── 정보 업데이트: 비밀번호·응답 보존, 학생정보·과목만 갱신 ──
        for (let start = 0; start < parsed.length; start += BATCH_SIZE) {
          const chunk = parsed.slice(start, start + BATCH_SIZE);
          const batch = writeBatch(db);
          for (const student of chunk) {
            const studentRef = doc(db, 'students', student.id);
            const existing = await getDoc(studentRef);

            if (existing.exists()) {
              // 기존 학생: 비밀번호 유지, 나머지 갱신
              batch.update(studentRef, {
                name: student.name,
                hopeMajor: student.hopeMajor,
                concept: student.concept,
                subjects: student.subjects
              });
              // responses는 건드리지 않음
            } else {
              // 신규 학생: 전체 생성
              batch.set(studentRef, {
                name: student.name, password: '1234', passwordChanged: false,
                hopeMajor: student.hopeMajor, concept: student.concept, subjects: student.subjects
              });
              batch.set(doc(db, 'responses', student.id), { submitted: false, submittedAt: null, subjects: {} });
            }
          }
          await batch.commit();
        }
        showMessage(`${parsed.length}명 정보 업데이트 완료 (비밀번호·응답 유지)`, 'success');
      }

      setUploadMode(null);
      await loadAllData();
    } catch (err) { console.error(err); showMessage('엑셀 처리 오류: ' + err.message, 'error'); }
    setLoading(false);
    e.target.value = '';
  };

  const handleSetDeadline = async () => {
    try {
      await updateDoc(doc(db, 'config', 'system'), { deadline });
      showMessage('마감기한이 설정되었습니다.', 'success');
    } catch (err) { showMessage('오류가 발생했습니다.', 'error'); }
  };

  const handleForceClose = async () => {
    if (!window.confirm('미제출 학생의 현재 저장 데이터를 모두 제출 처리합니다.')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const s of students) {
        if (!responses[s.id]?.submitted) {
          batch.update(doc(db, 'responses', s.id), { submitted: true, submittedAt: new Date().toISOString() });
          count++;
        }
      }
      if (count > 0) { await batch.commit(); showMessage(`${count}명 제출 처리 완료`, 'success'); await loadAllData(); }
      else showMessage('이미 모두 제출 완료 상태입니다.', 'info');
    } catch (err) { showMessage('오류가 발생했습니다.', 'error'); }
    setLoading(false);
  };

  const handleResetPassword = async (studentId) => {
    if (!window.confirm(`${studentId} 비밀번호를 1234로 초기화?`)) return;
    try { await updateDoc(doc(db, 'students', studentId), { password: '1234', passwordChanged: false }); showMessage('초기화 완료', 'success'); await loadAllData(); }
    catch (err) { console.error(err); }
  };

  const handleResetAllPasswords = async () => {
    if (!window.confirm('전체 학생 비밀번호를 1234로 초기화?')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const s of students) batch.update(doc(db, 'students', s.id), { password: '1234', passwordChanged: false });
      await batch.commit(); showMessage('전체 초기화 완료', 'success'); await loadAllData();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleUnsubmit = async (studentId) => {
    if (!window.confirm(`${studentId} 제출 취소?`)) return;
    try { await updateDoc(doc(db, 'responses', studentId), { submitted: false, submittedAt: null }); showMessage('제출 취소됨', 'success'); await loadAllData(); }
    catch (err) { console.error(err); }
  };

  const handleChangeAdminPw = async () => {
    if (!newAdminPw || newAdminPw.length < 4) { showMessage('4자리 이상 필요', 'error'); return; }
    try {
      const configSnap = await getDoc(doc(db, 'config', 'system'));
      if (configSnap.data().adminPassword !== currentAdminPw) { showMessage('현재 비밀번호 불일치', 'error'); return; }
      await updateDoc(doc(db, 'config', 'system'), { adminPassword: newAdminPw });
      showMessage('관리자 비밀번호 변경 완료', 'success'); setCurrentAdminPw(''); setNewAdminPw('');
    } catch (err) { showMessage('오류', 'error'); }
  };

  const handleChangeTeacherPw = async () => {
    if (!newTeacherPw || newTeacherPw.length < 4) { showMessage('4자리 이상 필요', 'error'); return; }
    try {
      await updateDoc(doc(db, 'config', 'system'), { teacherPassword: newTeacherPw });
      showMessage('교사 비밀번호 변경 완료', 'success'); setNewTeacherPw('');
    } catch (err) { showMessage('오류', 'error'); }
  };

  const handleDownload = () => {
    try { downloadResultExcel(students, responses, fieldConfig); showMessage('다운로드 시작', 'success'); }
    catch (err) { console.error(err); showMessage('다운로드 오류', 'error'); }
  };

  const submittedCount = students.filter(s => responses[s.id]?.submitted).length;
  const filteredStudents = students.filter(s => s.id.includes(searchTerm) || s.name.includes(searchTerm));

  const tabs = [
    { id: 'upload', label: '데이터 업로드', icon: '📤' },
    { id: 'fields', label: '입력 항목 설정', icon: '⚙️' },
    { id: 'deadline', label: '마감 관리', icon: '📅' },
    { id: 'studentPw', label: '학생 비밀번호', icon: '🔑' },
    { id: 'staffPw', label: '관리자·교사 비밀번호', icon: '🔐' },
    { id: 'status', label: '제출 현황', icon: '📋' },
    { id: 'download', label: '엑셀 다운로드', icon: '📥' },
  ];

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>관리자 대시보드</h1>
        <div className="header-right">
          <span className="stat-badge">등록 {students.length}명 · 제출 {submittedCount}명</span>
          <button className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {loading && <div className="loading-overlay">처리 중...</div>}

        {/* ── 데이터 업로드 ── */}
        {tab === 'upload' && (
          <div className="admin-section">
            <h2>학생 데이터 엑셀 업로드</h2>
            <div className="upload-guide">
              <h3>엑셀 파일 형식 안내</h3>
              <p><strong>수강 과목</strong> 시트 — 학번 | 성명 | 개설과목(학점) | 담당교사</p>
              <p><strong>진학희망관련</strong> 시트 — 학번 | 성명 | 희망학과 | 학생부 컨셉=동사형 진로</p>
              <p><strong>수행평가정보</strong> 시트 — 과목명 | 수행1 | 수행2 | 수행3 | 수행4 | 수행5</p>
              <p><strong>교과담당자 관련</strong> 시트 — 교과명 | 담당교사 (빈 교사 보충용)</p>
            </div>

            {!uploadMode ? (
              <div className="upload-mode-select">
                <div className="upload-mode-card" onClick={() => setUploadMode('init')}>
                  <div className="upload-mode-icon">🆕</div>
                  <h3>초기 등록</h3>
                  <p>처음 데이터를 등록하거나 전체를 새로 시작할 때</p>
                  <ul className="upload-mode-detail">
                    <li>모든 학생 비밀번호 → 1234 초기화</li>
                    <li>모든 학생 응답 데이터 → 초기화</li>
                    <li>학생정보·과목·수행평가 → 새로 등록</li>
                  </ul>
                  <span className="upload-mode-warn">⚠ 기존 입력 데이터가 모두 삭제됩니다</span>
                </div>
                <div className="upload-mode-card" onClick={() => setUploadMode('update')}>
                  <div className="upload-mode-icon">🔄</div>
                  <h3>정보 업데이트</h3>
                  <p>희망학과·컨셉·과목·수행평가 등 정보만 갱신할 때</p>
                  <ul className="upload-mode-detail">
                    <li>비밀번호 → <strong>유지</strong></li>
                    <li>학생 응답(자기평가) → <strong>유지</strong></li>
                    <li>학생정보·과목·수행평가 → 갱신</li>
                    <li>신규 학생 → 자동 추가 (비밀번호 1234)</li>
                  </ul>
                  <span className="upload-mode-safe">✓ 기존 입력 데이터가 보존됩니다</span>
                </div>
              </div>
            ) : (
              <div className="upload-area">
                <p className="upload-mode-label">
                  {uploadMode === 'init' ? '🆕 초기 등록 모드' : '🔄 정보 업데이트 모드'}
                </p>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} id="excel-upload" style={{ display: 'none' }} />
                <label htmlFor="excel-upload" className="btn btn-primary btn-large">엑셀 파일 선택 및 업로드</label>
                <div style={{ marginTop: 12 }}>
                  <button className="btn-text" onClick={() => setUploadMode(null)}>← 모드 다시 선택</button>
                </div>
              </div>
            )}

            {students.length > 0 && <div className="current-data-info"><p>현재 등록: <strong>{students.length}명</strong></p></div>}
          </div>
        )}

        {/* ── 입력 항목 설정 ── */}
        {tab === 'fields' && (
          <div className="admin-section">
            <h2>입력 항목 설정</h2>
            <p>학생에게 표시할 항목을 선택하세요. 비활성화된 항목은 학생 화면과 엑셀 수합에서 제외됩니다.</p>

            <div className="field-config-list">
              {fieldConfig.map((field, idx) => (
                <div key={field.id} className={`field-config-item ${field.enabled ? '' : 'disabled-field'}`}>
                  <div className="field-config-left">
                    <div className="field-move-btns">
                      <button className="move-btn" onClick={() => moveField(idx, -1)} disabled={idx === 0}>▲</button>
                      <button className="move-btn" onClick={() => moveField(idx, 1)} disabled={idx === fieldConfig.length - 1}>▼</button>
                    </div>
                    <div className="field-info">
                      <span className="field-label-text">{field.label}</span>
                      <span className="field-type-badge">
                        {field.type === 'text' ? '텍스트' : field.type === 'textarea' ? '장문' : field.type === 'chips' ? '복수선택' : '자기평가서'}
                      </span>
                      {field.fixed && <span className="field-fixed-badge">기본</span>}
                    </div>
                  </div>
                  <div className="field-config-right">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={field.enabled} onChange={() => toggleField(field.id)} />
                      <span className="toggle-slider"></span>
                    </label>
                    {!field.fixed && (
                      <button className="btn btn-small btn-ghost" onClick={() => removeCustomField(field.id)} style={{ color: 'var(--danger)' }}>
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="add-field-section">
              <h3>항목 추가</h3>
              <div className="add-field-form">
                <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label>항목 이름</label>
                  <input type="text" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="예: 수업 중 인상 깊었던 활동" />
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>입력 형태</label>
                  <select value={newFieldType} onChange={e => setNewFieldType(e.target.value)} className="field-type-select">
                    <option value="text">텍스트 (한 줄)</option>
                    <option value="textarea">장문 (여러 줄)</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={addCustomField} style={{ alignSelf: 'flex-end' }}>추가</button>
              </div>
            </div>
          </div>
        )}

        {/* ── 마감 관리 ── */}
        {tab === 'deadline' && (
          <div className="admin-section">
            <h2>마감기한 관리</h2>
            <div className="deadline-form">
              <div className="input-group"><label>마감 일시</label><input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
              <button className="btn btn-primary" onClick={handleSetDeadline}>마감기한 설정</button>
            </div>
            <div className="deadline-actions">
              <h3>강제 마감</h3>
              <p>미제출 학생의 저장 데이터를 그대로 제출 처리합니다.</p>
              <button className="btn btn-danger" onClick={handleForceClose}>미제출 전체 제출 처리</button>
            </div>
          </div>
        )}

        {/* ── 학생 비밀번호 ── */}
        {tab === 'studentPw' && (
          <div className="admin-section">
            <h2>학생 비밀번호 관리</h2>
            <div className="password-controls"><button className="btn btn-danger" onClick={handleResetAllPasswords}>전체 초기화 (1234)</button></div>
            <div className="search-bar"><input type="text" placeholder="학번 또는 이름 검색" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead><tr><th>학번</th><th>이름</th><th>변경여부</th><th>작업</th></tr></thead>
                <tbody>{filteredStudents.map(s => (
                  <tr key={s.id}><td>{s.id}</td><td>{s.name}</td>
                    <td><span className={`pw-badge ${s.passwordChanged ? 'changed' : ''}`}>{s.passwordChanged ? '변경' : '미변경'}</span></td>
                    <td><button className="btn btn-small btn-ghost" onClick={() => handleResetPassword(s.id)}>초기화</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 관리자·교사 비밀번호 ── */}
        {tab === 'staffPw' && (
          <div className="admin-section">
            <h2>관리자 · 교사 비밀번호 변경</h2>
            <div className="pw-change-block">
              <h3>관리자 비밀번호 변경</h3>
              <div className="pw-change-form">
                <div className="input-group"><label>현재 비밀번호</label><input type="password" value={currentAdminPw} onChange={e => setCurrentAdminPw(e.target.value)} /></div>
                <div className="input-group"><label>새 비밀번호</label><input type="password" value={newAdminPw} onChange={e => setNewAdminPw(e.target.value)} /></div>
                <button className="btn btn-primary" onClick={handleChangeAdminPw} disabled={!currentAdminPw || !newAdminPw}>변경</button>
              </div>
            </div>
            <div className="pw-change-block">
              <h3>교사 비밀번호 변경</h3>
              <div className="pw-change-form">
                <div className="input-group"><label>새 교사 비밀번호</label><input type="password" value={newTeacherPw} onChange={e => setNewTeacherPw(e.target.value)} /></div>
                <button className="btn btn-primary" onClick={handleChangeTeacherPw} disabled={!newTeacherPw}>변경</button>
              </div>
            </div>
          </div>
        )}

        {/* ── 제출 현황 ── */}
        {tab === 'status' && (
          <div className="admin-section">
            <h2>제출 현황</h2>
            <div className="status-summary">
              <div className="status-card"><span className="status-num">{students.length}</span><span className="status-label">전체</span></div>
              <div className="status-card submitted"><span className="status-num">{submittedCount}</span><span className="status-label">제출</span></div>
              <div className="status-card pending"><span className="status-num">{students.length - submittedCount}</span><span className="status-label">미제출</span></div>
            </div>
            <div className="search-bar"><input type="text" placeholder="학번 또는 이름 검색" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead><tr><th>학번</th><th>이름</th><th>상태</th><th>제출일시</th><th>작업</th></tr></thead>
                <tbody>{filteredStudents.map(s => {
                  const resp = responses[s.id];
                  return (<tr key={s.id}><td>{s.id}</td><td>{s.name}</td>
                    <td><span className={`submit-badge ${resp?.submitted ? 'done' : 'pending'}`}>{resp?.submitted ? '제출' : '미제출'}</span></td>
                    <td className="date-cell">{resp?.submittedAt ? new Date(resp.submittedAt).toLocaleString('ko-KR') : '-'}</td>
                    <td>{resp?.submitted && <button className="btn btn-small btn-ghost" onClick={() => handleUnsubmit(s.id)}>제출 취소</button>}</td>
                  </tr>);
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 엑셀 다운로드 ── */}
        {tab === 'download' && (
          <div className="admin-section">
            <h2>결과 엑셀 다운로드</h2>
            <div className="download-info">
              <p>전체 현황 단일 시트로 생성됩니다. 자동필터(슬라이서)가 적용되어 교사·교과별 필터링이 가능합니다.</p>
              <div className="download-preview">
                <h3>열 구성</h3>
                <p>성명 | 구분(교과명) | 담당교사 | 학번 이름 | 학생부 컨셉 | 교과 및 활동 키워드 | 세특반영수행평가 | 부각하고 싶은 장점 | 도서 | 개별자기평가 | 생기부기재내용 | Byte</p>
              </div>
            </div>
            <button className="btn btn-primary btn-large" onClick={handleDownload} disabled={students.length === 0}>엑셀 다운로드</button>
          </div>
        )}
      </div>
    </div>
  );
}
