import React, { useState, useEffect, useCallback } from 'react';
import { db, collection, doc, getDoc, setDoc, getDocs, updateDoc, writeBatch } from './firebase.js';
import Login from './components/Login.jsx';
import PasswordChange from './components/PasswordChange.jsx';
import StudentMain from './components/StudentMain.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import TeacherDashboard from './components/TeacherDashboard.jsx';
import { DEFAULT_FIELD_CONFIG } from './utils/fieldConfig.js';
import './styles.css';

export default function App() {
  const [page, setPage] = useState('login');
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = useCallback((text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  }, []);

  // ── 초기 config 보장 + fieldConfig 로드 ──
  const ensureConfig = async () => {
    const configRef = doc(db, 'config', 'system');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      await setDoc(configRef, {
        adminPassword: '2580',
        teacherPassword: '7109',
        deadline: '',
        fieldConfig: DEFAULT_FIELD_CONFIG
      });
    }
    const data = (await getDoc(configRef)).data();
    if (data.fieldConfig) setFieldConfig(data.fieldConfig);
    return data;
  };

  // ── 학생 로그인 ──
  const handleStudentLogin = async (studentId, name, password) => {
    try {
      // fieldConfig 먼저 로드
      await ensureConfig();

      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) { showMessage('등록되지 않은 학번입니다.', 'error'); return; }

      const data = studentSnap.data();
      if (data.name !== name) { showMessage('이름이 일치하지 않습니다.', 'error'); return; }
      if (data.password !== password) { showMessage('비밀번호가 일치하지 않습니다.', 'error'); return; }

      setCurrentStudent({ id: studentId, name: data.name });
      setStudentData(data);

      if (!data.passwordChanged) { setPage('passwordChange'); return; }

      await loadResponseData(studentId);
      setPage('student');
    } catch (err) {
      console.error(err);
      showMessage('로그인 중 오류가 발생했습니다.', 'error');
    }
  };

  const loadResponseData = async (studentId) => {
    try {
      const respRef = doc(db, 'responses', studentId);
      const respSnap = await getDoc(respRef);
      if (respSnap.exists()) {
        setResponseData(respSnap.data());
      } else {
        const initial = { submitted: false, submittedAt: null, subjects: {} };
        await setDoc(respRef, initial);
        setResponseData(initial);
      }
    } catch (err) { console.error(err); }
  };

  const handlePasswordChange = async (newPassword) => {
    try {
      const studentRef = doc(db, 'students', currentStudent.id);
      await updateDoc(studentRef, { password: newPassword, passwordChanged: true });
      setStudentData(prev => ({ ...prev, password: newPassword, passwordChanged: true }));
      await loadResponseData(currentStudent.id);
      setPage('student');
      showMessage('비밀번호가 변경되었습니다.', 'success');
    } catch (err) { console.error(err); showMessage('비밀번호 변경 중 오류가 발생했습니다.', 'error'); }
  };

  const handleSaveSubject = async (subjectKey, subjectResponse) => {
    try {
      const respRef = doc(db, 'responses', currentStudent.id);
      const updatedSubjects = { ...responseData.subjects, [subjectKey]: subjectResponse };
      await updateDoc(respRef, { subjects: updatedSubjects });
      setResponseData(prev => ({ ...prev, subjects: updatedSubjects }));
      showMessage('저장되었습니다.', 'success');
    } catch (err) { console.error(err); showMessage('저장 중 오류가 발생했습니다.', 'error'); }
  };

  const handleSubmit = async () => {
    try {
      const respRef = doc(db, 'responses', currentStudent.id);
      await updateDoc(respRef, { submitted: true, submittedAt: new Date().toISOString() });
      setResponseData(prev => ({ ...prev, submitted: true, submittedAt: new Date().toISOString() }));
      showMessage('제출이 완료되었습니다. 더 이상 수정할 수 없습니다.', 'success');
    } catch (err) { console.error(err); showMessage('제출 중 오류가 발생했습니다.', 'error'); }
  };

  const handleStaffLogin = async (role, password) => {
    try {
      const config = await ensureConfig();
      if (role === 'admin') {
        if (config.adminPassword === password) setPage('admin');
        else showMessage('관리자 비밀번호가 일치하지 않습니다.', 'error');
      } else {
        if (config.teacherPassword === password) setPage('teacher');
        else showMessage('교사 비밀번호가 일치하지 않습니다.', 'error');
      }
    } catch (err) { console.error(err); showMessage('로그인 중 오류가 발생했습니다.', 'error'); }
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    setStudentData(null);
    setResponseData(null);
    setPage('login');
  };

  return (
    <div className="app-container">
      {message.text && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      {page === 'login' && <Login onStudentLogin={handleStudentLogin} onStaffClick={() => setPage('staffLogin')} />}
      {page === 'staffLogin' && <Login isStaff onStaffLogin={handleStaffLogin} onBackClick={() => setPage('login')} />}
      {page === 'passwordChange' && <PasswordChange studentName={currentStudent?.name} onChangePassword={handlePasswordChange} onLogout={handleLogout} />}

      {page === 'student' && currentStudent && studentData && responseData && (
        <StudentMain
          student={currentStudent} studentData={studentData} responseData={responseData}
          fieldConfig={fieldConfig}
          onSaveSubject={handleSaveSubject} onSubmit={handleSubmit} onLogout={handleLogout}
        />
      )}

      {page === 'admin' && <AdminDashboard onLogout={handleLogout} showMessage={showMessage} />}
      {page === 'teacher' && <TeacherDashboard onLogout={handleLogout} showMessage={showMessage} />}
    </div>
  );
}
