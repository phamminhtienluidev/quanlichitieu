/**
 * firestoreService.ts
 * Toàn bộ các hàm CRUD tương tác với Firestore.
 * Mỗi collection đều lọc theo userId để đảm bảo bảo mật phía client.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  getDocsFromCache,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: "income" | "expense";
  date: string;        // "YYYY-MM-DD"
  note?: string;
  createdAt?: Timestamp;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  createdAt?: Timestamp;
}

export interface Budget {
  id: string;
  userId: string;
  categoryName: string;
  limit: number;
  month: number;  // 1-12
  year: number;
  createdAt?: Timestamp;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  currency: string;
  /** Bật cảnh báo trình duyệt khi chi gần / vượt ngân sách tháng. */
  budgetAlertsEnabled?: boolean;
  createdAt?: Timestamp;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** Lấy tất cả giao dịch của user */
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

/** Lấy tất cả giao dịch từ bộ nhớ đệm (offline) */
export async function getTransactionsFromCache(userId: string): Promise<Transaction[]> {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );
  const snap = await getDocsFromCache(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

/** Thêm giao dịch mới */
export async function addTransaction(
  userId: string,
  tx: Omit<Transaction, "id" | "userId" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "transactions"), {
    ...tx,
    userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Xóa giao dịch */
export async function deleteTransaction(txId: string): Promise<void> {
  await deleteDoc(doc(db, "transactions", txId));
}

/** Cập nhật giao dịch */
export async function updateTransaction(
  txId: string,
  data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "transactions", txId), data);
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** Lấy tất cả danh mục của user */
export async function getCategories(userId: string): Promise<Category[]> {
  const q = query(
    collection(db, "categories"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}

/** Lấy tất cả danh mục từ bộ nhớ đệm */
export async function getCategoriesFromCache(userId: string): Promise<Category[]> {
  const q = query(
    collection(db, "categories"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocsFromCache(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}

/** Thêm danh mục mới */
export async function addCategory(
  userId: string,
  cat: Omit<Category, "id" | "userId" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "categories"), {
    ...cat,
    userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Xóa danh mục */
export async function deleteCategory(catId: string): Promise<void> {
  await deleteDoc(doc(db, "categories", catId));
}

/** Seed danh mục mặc định nếu user chưa có danh mục nào */
export async function seedDefaultCategories(userId: string): Promise<void> {
  const defaults = [
    { name: "Lương", icon: "payments" },
    { name: "Mua sắm", icon: "shopping_bag" },
    { name: "Ăn uống", icon: "restaurant" },
    { name: "Xăng xe", icon: "local_gas_station" },
  ];
  for (const cat of defaults) {
    await addCategory(userId, cat);
  }
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

/** Lấy tất cả ngân sách của user trong 1 tháng */
export async function getBudgets(
  userId: string,
  year: number,
  month: number
): Promise<Budget[]> {
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId),
    where("year", "==", year),
    where("month", "==", month)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
}

/** Lấy tất cả ngân sách của user (mọi tháng) */
export async function getAllBudgets(userId: string): Promise<Budget[]> {
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
}

/** Lấy tất cả ngân sách từ bộ nhớ đệm */
export async function getAllBudgetsFromCache(userId: string): Promise<Budget[]> {
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId)
  );
  const snap = await getDocsFromCache(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
}

/** Đặt/cập nhật ngân sách (upsert theo userId + categoryName + year + month) */
export async function setBudget(
  userId: string,
  budget: Omit<Budget, "id" | "userId" | "createdAt">
): Promise<void> {
  // Tìm budget hiện có để update thay vì tạo mới
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId),
    where("categoryName", "==", budget.categoryName),
    where("year", "==", budget.year),
    where("month", "==", budget.month)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { limit: budget.limit });
  } else {
    await addDoc(collection(db, "budgets"), {
      ...budget,
      userId,
      createdAt: serverTimestamp(),
    });
  }
}

/** Xóa ngân sách theo categoryName + year + month */
export async function deleteBudget(
  userId: string,
  categoryName: string,
  year: number,
  month: number
): Promise<void> {
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId),
    where("categoryName", "==", categoryName),
    where("year", "==", year),
    where("month", "==", month)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

/** Lấy thông tin profile từ Firestore */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

/** Tạo hoặc cập nhật user profile */
export async function setUserProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<void> {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, profile);
  } else {
    await setDoc(ref, {
      displayName: "",
      email: "",
      photoURL: "",
      currency: "VND",
      ...profile,
      createdAt: serverTimestamp(),
    });
  }
}
