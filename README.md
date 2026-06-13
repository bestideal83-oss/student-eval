# 학생부 자기평가 시스템

## 배포 순서

### 1단계: Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **프로젝트 추가** 클릭 → 프로젝트 이름 입력 (예: student-eval)
3. Google Analytics는 "사용 안 함"으로 설정해도 무방
4. 프로젝트 생성 완료 후 **웹 앱 추가** (</> 아이콘 클릭)
5. 앱 이름 입력 → **Firebase Hosting은 체크하지 않음**
6. 표시되는 `firebaseConfig` 값을 복사

### 2단계: Firestore 데이터베이스 생성

1. Firebase Console 좌측 메뉴 → **Firestore Database**
2. **데이터베이스 만들기** 클릭
3. 위치: **asia-northeast3 (서울)** 선택
4. **테스트 모드에서 시작** 선택 (나중에 보안 규칙 설정)
5. 생성 완료

### 3단계: Firestore 보안 규칙 설정

Firestore → **규칙** 탭에서 아래 내용으로 교체:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ※ 학교 내부용이므로 간단하게 설정합니다. 보안이 중요한 경우 별도 설정 가능합니다.

### 4단계: Firebase 설정 입력

`src/firebase.js` 파일을 열고 `firebaseConfig` 부분을 본인의 값으로 교체:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "student-eval-xxxxx.firebaseapp.com",
  projectId: "student-eval-xxxxx",
  storageBucket: "student-eval-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 5단계: Vercel 배포

1. [GitHub](https://github.com)에 이 프로젝트 폴더를 새 저장소로 업로드
2. [Vercel](https://vercel.com) 접속 → GitHub 계정 연결
3. **New Project** → 해당 저장소 선택
4. Framework Preset: **Vite** 선택
5. **Deploy** 클릭
6. 배포 완료 후 제공되는 URL로 접속 가능

### 6단계: 사용 시작

1. 배포된 URL 접속
2. **관리자·교사 로그인** 클릭
3. **관리자** 선택 → 초기 비밀번호: `2580`
4. **데이터 업로드** 탭 → 엑셀 템플릿에 맞춰 작성한 파일 업로드
5. **관리자·교사 비밀번호** 탭에서 비밀번호 변경 가능
6. 학생들에게 URL 안내 → 학번 + 이름 + 초기비밀번호(`1234`)로 로그인
7. 교사들에게 URL 안내 → 교사 로그인 초기 비밀번호: `7109`

---

## 엑셀 업로드 파일 형식

「학생부_기초자료_정보」 엑셀 파일을 그대로 업로드합니다. 아래 4개 시트를 자동 인식합니다.

| 시트명 | 열 구성 | 용도 |
|--------|---------|------|
| 수강 과목 | 학번 \| 성명 \| 개설과목(학점) \| 담당교사 | 학생-과목 매핑 |
| 진학희망관련 | 학번 \| 성명 \| 희망학과 \| 학생부 컨셉=동사형 진로 | 학생 기본정보 |
| 수행평가정보 | 과목명 \| 수행1 \| 수행2 \| 수행3 \| 수행4 \| 수행5 | 과목별 수행평가명 |
| 교과담당자 관련 | 교과명 \| 담당교사 | 빈 교사 보충용 |

- 첫 행은 헤더 (자동 건너뜀)
- 담당교사가 0이거나 비어있으면 「교과담당자 관련」시트에서 자동 보충
- 과목명 매칭 시 괄호/학점/공백 차이는 자동 보정

---

## 주요 기능 요약

- **학생**: 학번+이름+비밀번호 로그인 → 과목별 자기평가 입력 → 저장/제출
- **교사**: 교사 비밀번호 로그인 → 본인 과목 학생 자기평가 열람 → 교사별 엑셀 다운로드
- **관리자**: 엑셀 업로드, 마감 관리, 학생/관리자/교사 비밀번호 관리, 제출 현황, 전체 엑셀 다운로드

## 로그인 정보

| 구분 | 초기 비밀번호 | 비고 |
|------|-------------|------|
| 학생 | 1234 | 최초 로그인 시 변경 필수 |
| 관리자 | 2580 | 관리자 대시보드에서 변경 가능 |
| 교사 | 7109 | 관리자 대시보드에서 변경 가능 |
