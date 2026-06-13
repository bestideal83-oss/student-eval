import React, { useState } from 'react';

export default function PasswordChange({ studentName, onChangePassword, onLogout }) {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (newPw.length < 4) {
      setError('비밀번호는 4자리 이상이어야 합니다.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPw === '1234') {
      setError('초기 비밀번호와 다른 비밀번호를 설정하세요.');
      return;
    }
    onChangePassword(newPw);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>비밀번호 변경</h1>
          <p>{studentName}님, 처음 로그인입니다.<br />새 비밀번호를 설정해 주세요.</p>
        </div>

        <div className="login-form-wrap">
          <div className="input-group">
            <label>새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={e => { setNewPw(e.target.value); setError(''); }}
              placeholder="4자리 이상"
            />
          </div>
          <div className="input-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setError(''); }}
              placeholder="다시 입력"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary btn-full" onClick={handleSubmit}>
            비밀번호 변경
          </button>

          <div className="login-footer">
            <button className="btn-text" onClick={onLogout}>← 돌아가기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
