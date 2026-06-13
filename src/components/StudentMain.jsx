import React, { useState } from 'react';
import SubjectCard from './SubjectCard.jsx';

export default function StudentMain({ student, studentData, responseData, fieldConfig, onSaveSubject, onSubmit, onLogout }) {
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const isSubmitted = responseData.submitted;

  const subjects = studentData.subjects || [];

  const getSubjectKey = (subj, idx) => {
    return `${subj.subjectName}_${idx}`;
  };

  const handleFinalSubmit = () => {
    if (!confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }
    onSubmit();
    setConfirmSubmit(false);
  };

  // 입력 진행률 계산
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
      {/* 상단 헤더 */}
      <header className="student-header">
        <div className="header-left">
          <h1>학생부 자기평가</h1>
        </div>
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
          <div className="info-item">
            <span className="info-label">희망 학과</span>
            <span className="info-value">{studentData.hopeMajor || '-'}</span>
          </div>
          <div className="info-item info-item-wide">
            <span className="info-label">학생부 컨셉</span>
            <span className="info-value concept-value">{studentData.concept || '-'}</span>
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-info">
            <span>입력 진행률</span>
            <span>{filledSubjects} / {totalSubjects} 과목</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${totalSubjects > 0 ? (filledSubjects / totalSubjects * 100) : 0}%` }}
            />
          </div>
        </div>
      </section>

      {/* 제출 상태 안내 */}
      {isSubmitted && (
        <div className="submitted-banner">
          제출 완료 — {new Date(responseData.submittedAt).toLocaleString('ko-KR')}에 제출되었습니다. 수정이 불가합니다.
        </div>
      )}

      {/* 과목별 카드 */}
      <section className="subjects-section">
        <h2>과목별 자기평가</h2>
        {subjects.map((subj, idx) => {
          const key = getSubjectKey(subj, idx);
          return (
            <SubjectCard
              key={key}
              subject={subj}
              subjectKey={key}
              response={responseData.subjects?.[key] || null}
              fieldConfig={fieldConfig}
              onSave={onSaveSubject}
              disabled={isSubmitted}
            />
          );
        })}
      </section>

      {/* 제출 버튼 */}
      {!isSubmitted && (
        <div className="submit-section">
          {confirmSubmit ? (
            <div className="confirm-box">
              <p>제출 후에는 수정이 불가능합니다. 정말 제출하시겠습니까?</p>
              <div className="confirm-buttons">
                <button className="btn btn-danger" onClick={handleFinalSubmit}>
                  제출 확정
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmSubmit(false)}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-large" onClick={() => setConfirmSubmit(true)}>
              전체 제출
            </button>
          )}
        </div>
      )}
    </div>
  );
}
