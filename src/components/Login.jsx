import React, { useState } from 'react';

export default function Login({ isStaff, onStudentLogin, onStaffLogin, onStaffClick, onBackClick }) {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState('admin'); // admin or teacher
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      if (isStaff) {
        await onStaffLogin(staffRole, password);
      } else {
        await onStudentLogin(studentId.trim(), name.trim(), password);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isStaff) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>학생부 자기평가</h1>
            <p>관리자 · 교사 로그인</p>
          </div>

          <div className="login-form-wrap">
            <div className="role-toggle">
              <button
                className={`role-btn ${staffRole === 'admin' ? 'active' : ''}`}
                onClick={() => { setStaffRole('admin'); setPassword(''); }}
              >
                관리자
              </button>
              <button
                className={`role-btn ${staffRole === 'teacher' ? 'active' : ''}`}
                onClick={() => { setStaffRole('teacher'); setPassword(''); }}
              >
                교사
              </button>
            </div>

            <div className="input-group">
              <label>{staffRole === 'admin' ? '관리자' : '교사'} 비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleSubmit}
              disabled={loading || !password}
            >
              {loading ? '로그인 중...' : `${staffRole === 'admin' ? '관리자' : '교사'} 로그인`}
            </button>

            <div className="login-footer">
              <button className="btn-text" onClick={onBackClick}>
                ← 학생 로그인으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>학생부 자기평가</h1>
          <p>학생 로그인</p>
        </div>

        <div className="login-form-wrap">
          <div className="input-group">
            <label>학번</label>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              placeholder="예: 20301"
              autoComplete="off"
            />
          </div>
          <div className="input-group">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 입력"
              autoComplete="off"
            />
          </div>
          <div className="input-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="초기 비밀번호: 1234"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div className="login-footer">
            <button className="btn-text" onClick={onStaffClick}>
              관리자 · 교사 로그인 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
