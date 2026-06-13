import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

// ★★★ 아래 설정을 본인의 Firebase 프로젝트 정보로 교체하세요 ★★★
const firebaseConfig = {
  apiKey: "AIzaSyCz76TLm9z_QbdJxU8zcfx5lqC3xqEG7Zc",
  authDomain: "student-eval-164b6.firebaseapp.com",
  projectId: "student-eval-164b6",
  storageBucket: "student-eval-164b6.firebasestorage.app",
  messagingSenderId: "48451370910",
  appId: "1:48451370910:web:8954dcb8dcb8107271208f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch };
