import React, { useState, useEffect } from 'react';

export default function SubjectCard({ subject, subjectKey, response, fieldConfig, onSave, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedAssessments, setSelectedAssessments] = useState([]);
  const [selfEvals, setSelfEvals] = useState([
    { topic: '', motivation: '', process: '', result: '' },
    { topic: '', motivation: '', process: '', result: '' }
  ]);
  const [dirty, setDirty] = useState(false);

  const enabledFields = (fieldConfig || []).filter(f => f.enabled);

  // 기존 응답 데이터 로드
  useEffect(() => {
    if (response) {
      setFormData(response.formData || {
        keyword: response.keyword || '',
        strength: response.strength || '',
        book: response.book || ''
      });
      setSelectedAssessments(response.selectedAssessments || []);
      if (response.selfEvals?.length > 0) {
        const loaded = [...response.selfEvals];
        while (loaded.length < 2) loaded.push({ topic: '', motivation: '', process: '', result: '' });
        setSelfEvals(loaded);
      }
    }
  }, [response]);

  const updateField = (id, value) => {
    if (disabled) return;
    setDirty(true);
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const toggleAssessment = (name) => {
    if (disabled) return;
    setDirty(true);
    setSelectedAssessments(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const updateSelfEval = (index, field, value) => {
    if (disabled) return;
    setDirty(true);
    setSelfEvals(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    onSave(subjectKey, {
      formData,
      // 하위호환
      keyword: formData.keyword || '',
      strength: formData.strength || '',
      book: formData.book || '',
      selectedAssessments,
      selfEvals
    });
    setDirty(false);
  };

  // 입력 여부 판단
  const hasContent = Object.values(formData).some(v => v) ||
    selectedAssessments.length > 0 ||
    selfEvals.some(e => e.topic || e.motivation || e.process || e.result);

  const assessments = subject.assessments || [];

  // 필드 렌더러
  const renderField = (field) => {
    // ── chips (수행평가) ──
    if (field.id === 'assessments' && field.type === 'chips') {
      if (assessments.length === 0) return null;
      return (
        <div className="form-section" key={field.id}>
          <h4>{field.label} <span className="hint">(복수 선택 가능)</span></h4>
          <div className="assessment-chips">
            {assessments.map((a, i) => (
              <button
                key={i}
                className={`chip ${selectedAssessments.includes(a) ? 'selected' : ''}`}
                onClick={() => toggleAssessment(a)}
                disabled={disabled}
              >{a}</button>
            ))}
          </div>
        </div>
      );
    }

    // ── selfEval (자기평가서) ──
    if (field.id === 'selfEval' && field.type === 'selfEval') {
      return (
        <div className="form-section" key={field.id}>
          <h4>{field.label} <span className="hint">(최대 2개)</span></h4>
          {selfEvals.map((evalItem, idx) => {
            const hasAny = evalItem.topic || evalItem.motivation || evalItem.process || evalItem.result;
            return (
              <div key={idx} className={`self-eval-block ${idx === 1 && !selfEvals[0].topic && !hasAny ? 'dimmed' : ''}`}>
                <div className="eval-number">자기평가 {idx + 1}</div>
                <div className="eval-fields">
                  <div className="eval-field">
                    <label>주제탐구명</label>
                    <input type="text" value={evalItem.topic} onChange={e => updateSelfEval(idx, 'topic', e.target.value)} placeholder="탐구 주제를 입력하세요" disabled={disabled} />
                  </div>
                  <div className="eval-field">
                    <label>동기</label>
                    <textarea value={evalItem.motivation} onChange={e => updateSelfEval(idx, 'motivation', e.target.value)} placeholder="탐구를 시작하게 된 동기" disabled={disabled} rows={3} />
                  </div>
                  <div className="eval-field">
                    <label>과정</label>
                    <textarea value={evalItem.process} onChange={e => updateSelfEval(idx, 'process', e.target.value)} placeholder="탐구 과정" disabled={disabled} rows={3} />
                  </div>
                  <div className="eval-field">
                    <label>결과</label>
                    <textarea value={evalItem.result} onChange={e => updateSelfEval(idx, 'result', e.target.value)} placeholder="탐구 결과 및 느낀 점" disabled={disabled} rows={3} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ── text / textarea (기본 필드 + 커스텀 필드) ──
    return (
      <div className="form-section" key={field.id}>
        <h4>{field.label}</h4>
        {field.type === 'textarea' ? (
          <textarea
            value={formData[field.id] || ''}
            onChange={e => updateField(field.id, e.target.value)}
            placeholder={`${field.label}을(를) 입력하세요`}
            disabled={disabled}
            rows={2}
          />
        ) : (
          <input
            type="text"
            value={formData[field.id] || ''}
            onChange={e => updateField(field.id, e.target.value)}
            placeholder={`${field.label}을(를) 입력하세요`}
            disabled={disabled}
          />
        )}
      </div>
    );
  };

  return (
    <div className={`subject-card ${expanded ? 'expanded' : ''} ${hasContent ? 'has-content' : ''}`}>
      <div className="subject-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="subject-title-area">
          <span className={`status-dot ${hasContent ? 'filled' : ''}`} />
          <div>
            <h3>{subject.subjectName}</h3>
            <span className="teacher-name">{subject.teacherName} 선생님</span>
          </div>
        </div>
        <span className={`expand-icon ${expanded ? 'open' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="subject-card-body">
          {enabledFields.map(renderField)}

          {!disabled && (
            <div className="card-actions">
              <button className={`btn ${dirty ? 'btn-primary' : 'btn-secondary'}`} onClick={handleSave}>
                {dirty ? '저장하기' : '저장 완료'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
