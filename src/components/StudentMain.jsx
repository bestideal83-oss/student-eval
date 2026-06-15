import React, { useState } from 'react';
import SubjectCard from './SubjectCard.jsx';

export default function StudentMain({ student, studentData, responseData, fieldConfig, onSaveSubject, onSaveConcept, onSubmit, onLogout }) {
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [editingConcept, setEditingConcept] = useState(false);
  const [conceptDraft, setConceptDraft] = useState('');
  const isSubmitted = responseData.submitted;

  const subjects = studentData.subjects || [];
  const currentConcept = responseData.customConcept || studentData.concept || '';

  const getSubjectKey = (subj, idx) => `${subj.subjectName}_${idx}`;

  const handleFinalSubmit = () => {
    if (!confirmSubmit) { setConfirmSubmit(true); return; }
    onSubmit();
    setConfirmSubmit(false);
  };

  const handleConceptEdit = () => {
    setConceptDraft(currentConcept);
    setEditingConcept(true);
  };

  const handleConceptSave = () => {
    onSaveConcept(conceptDraft);
    setEditingConcept(false);
  };

  const totalSubjects = subjects.length;
  const filledSubjects = subjects.filter((subj, idx) => {
    const key = getSubjectKey(subj, idx);
    const resp = responseData.subjects?.[key];
    if (!resp) return false;
    const fd = resp.formData || {};
    return Object.values(fd).some(v => v) ||
      resp.selectedAssessments?.length > 0 ||
      resp.selfEvals?.some(e => e.topic || e.motivation || e.process || e.result);
  }).length;

  return (
    <div className="student-page">
      <header className="student-header">
        <div className="header-left"><h1>학생부 자기평가</h1></div>
        <div className="header-right">
          <span className="student-name-badge">{student.id} {student.name}</span>
          <button className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      {/* 개인 정보 요약 */}
      <section className="info-summary">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">학번</span>
            <span className="info-value">{student.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">이름</span>
            <span className="info-value">{student.name}</span>
          </div>
          <div className="info-item info-item-wide">
            <span className="info-label">학생부 컨셉 (동사형 희망진로)</span>
            {editingConcept ? (
              <div className="concept-edit">
                <textarea
                  value={conceptDraft}
                  onChange={e => setConceptDraft(e.target.value)}
                  rows={2}
                  placeholder="학생부 컨셉을 입력하세요"
                  disabled={isSubmitted}
                />
                <div className="concept-edit-btns">
                  <button className="btn btn-primary btn-small" onClick={handleConceptSave}>저장</button>
                  <button className="btn btn-ghost btn-small" onClick={() => setEditingConcept(false)}>취소</button>
                </div>
              </div>
            ) : (
              <div className="concept-display">
                <span className="info-value concept-value">{currentConcept || '(미입력)'}</span>
                {!isSubmitted && (
                  <button className="btn-text" onClick={handleConceptEdit}>변경</button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-info">
            <span>입력 진행률</span>
            <span>{filledSubjects} / {totalSubjects} 과목</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${totalSubjects > 0 ? (filledSubjects / totalSubjects * 100) : 0}%` }} />
          </div>
        </div>
      </section>

      {isSubmitted && (
        <div className="submitted-banner">
          제출 완료 — {new Date(responseData.submittedAt).toLocaleString('ko-KR')}에 제출되었습니다. 수정이 불가합니다.
        </div>
      )}

      <section className="subjects-section">
        <h2>과목별 자기평가</h2>
        {subjects.map((subj, idx) => {
          const key = getSubjectKey(subj, idx);
          return (
            <SubjectCard
              key={key} subject={subj} subjectKey={key}
              response={responseData.subjects?.[key] || null}
              fieldConfig={fieldConfig}
              onSave={onSaveSubject} disabled={isSubmitted}
            />
          );
        })}
      </section>

      {!isSubmitted && (
        <div className="submit-section">
          {confirmSubmit ? (
            <div className="confirm-box">
              <p>제출 후에는 수정이 불가능합니다. 정말 제출하시겠습니까?</p>
              <div className="confirm-buttons">
                <button className="btn btn-danger" onClick={handleFinalSubmit}>제출 확정</button>
                <button className="btn btn-ghost" onClick={() => setConfirmSubmit(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-large" onClick={() => setConfirmSubmit(true)}>전체 제출</button>
          )}
        </div>
      )}
    </div>
  );
}
