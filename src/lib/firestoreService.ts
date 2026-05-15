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
  writeBatch,
  increment,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
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

// ─── Utils ────────────────────────────────────────────────────────────────────
function getYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}_${month}`;
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

/**
 * Thêm giao dịch mới & Cập nhật monthly_stats, yearly_stats
 * Sử dụng Batch Write để thực hiện đồng thời, tối ưu read/write
 */
export async function addTransaction(
  userId: string,
  tx: Omit<Transaction, "id" | "userId" | "createdAt">,
  categoryName: string = "Khác"
): Promise<string> {
  const batch = writeBatch(db);
  const txRef = doc(collection(db, "transactions"));
  
  // 1. Thêm document mới vào bảng transactions
  const data = {
    ...tx,
    userId,
    createdAt: serverTimestamp(),
  };
  batch.set(txRef, data);

  const monthStr = getYearMonth(tx.date); // "YYYY_MM"
  const yearStr = tx.date.substring(0, 4); // "YYYY"
  
  const monthlyStatsRef = doc(db, "users", userId, "monthly_stats", monthStr);
  const yearlyStatsRef = doc(db, "users", userId, "yearly_stats", yearStr);

  const incomeInc = tx.type === "income" ? tx.amount : 0;
  const expenseInc = tx.type === "expense" ? tx.amount : 0;
  const balanceInc = tx.type === "income" ? tx.amount : -tx.amount;

  // Object dùng chung để cập nhật (increment) số liệu
  const statsUpdate = {
    totalIncome: increment(incomeInc),
    totalExpense: increment(expenseInc),
    balance: increment(balanceInc),
    // Cộng dồn amount vào đúng danh mục trong object categories
    [`categories.${categoryName}`]: increment(tx.amount)
  };

  // 2. Cập nhật vào document tháng
  batch.set(monthlyStatsRef, statsUpdate, { merge: true });
  
  // 3. Cập nhật vào document năm
  batch.set(yearlyStatsRef, statsUpdate, { merge: true });

  await batch.commit();
  return txRef.id;
}

/** 
 * Xóa giao dịch & Xử lý trừ tiền ngược lại ở monthly_stats, yearly_stats 
 */
export async function deleteTransaction(
  txId: string, 
  oldData?: Transaction,
  categoryName: string = "Khác"
): Promise<void> {
  if (!oldData) {
    // Dự phòng trường hợp gọi không có oldData
    await deleteDoc(doc(db, "transactions", txId));
    return;
  }
  
  const batch = writeBatch(db);
  const txRef = doc(db, "transactions", txId);
  batch.delete(txRef);

  const monthStr = getYearMonth(oldData.date); // "YYYY_MM"
  const yearStr = oldData.date.substring(0, 4); // "YYYY"

  const monthlyStatsRef = doc(db, "users", oldData.userId, "monthly_stats", monthStr);
  const yearlyStatsRef = doc(db, "users", oldData.userId, "yearly_stats", yearStr);

  // Vì là xóa, ta trừ đi số tiền tương ứng
  const incomeDec = oldData.type === "income" ? -oldData.amount : 0;
  const expenseDec = oldData.type === "expense" ? -oldData.amount : 0;
  const balanceDec = oldData.type === "income" ? -oldData.amount : oldData.amount;

  const statsUpdate = {
    totalIncome: increment(incomeDec),
    totalExpense: increment(expenseDec),
    balance: increment(balanceDec),
    // Trừ đi số tiền khỏi danh mục
    [`categories.${categoryName}`]: increment(-oldData.amount)
  };

  batch.set(monthlyStatsRef, statsUpdate, { merge: true });
  batch.set(yearlyStatsRef, statsUpdate, { merge: true });

  await batch.commit();
}

/** Xóa nhiều giao dịch theo điều kiện */
export async function deleteTransactions(
  userId: string,
  condition: { type: "date"; dateStr: string } | { type: "month"; year: number; month: number } | { type: "year"; year: number } | { type: "all" }
): Promise<void> {
  let q;
  if (condition.type === "date") {
    q = query(collection(db, "transactions"), where("userId", "==", userId), where("date", "==", condition.dateStr));
  } else if (condition.type === "month") {
    const monthStr = String(condition.month).padStart(2, "0");
    const prefix = `${condition.year}-${monthStr}-`;
    q = query(collection(db, "transactions"), where("userId", "==", userId), where("date", ">=", prefix + "01"), where("date", "<=", prefix + "31"));
  } else if (condition.type === "year") {
    const prefix = `${condition.year}-`;
    q = query(collection(db, "transactions"), where("userId", "==", userId), where("date", ">=", prefix + "01-01"), where("date", "<=", prefix + "12-31"));
  } else {
    q = query(collection(db, "transactions"), where("userId", "==", userId));
  }

  const snap = await getDocs(q);
  const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
}

/**
 * Xóa giao dịch theo khoảng thời gian và đồng bộ lại bảng monthly_stats.
 * Sử dụng WriteBatch để đảm bảo tính toàn vẹn dữ liệu.
 * Xử lý chia nhỏ (chunk) nếu số lượng thao tác vượt quá giới hạn 500 của Firestore.
 * 
 * @param userId ID của người dùng hiện tại
 * @param startDate "YYYY-MM-DD", nếu truyền null/chuỗi rỗng sẽ không giới hạn từ dưới
 * @param endDate "YYYY-MM-DD", nếu truyền null/chuỗi rỗng sẽ không giới hạn từ trên
 */
export async function deleteTransactionsByDateRange(
  userId: string,
  startDate: string | null,
  endDate: string | null
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    let q = query(collection(db, "transactions"), where("userId", "==", userId));

    if (startDate) {
      q = query(q, where("date", ">=", startDate));
    }
    if (endDate) {
      q = query(q, where("date", "<=", endDate));
    }

    const snap = await getDocs(q);
    if (snap.empty) {
      return { success: true, message: "Không tìm thấy giao dịch nào để xóa.", count: 0 };
    }

    const docs = snap.docs;
    
    // Mỗi giao dịch bị xóa tốn 1 thao tác.
    // Mỗi bản ghi monthly_stats được cập nhật tốn 1 thao tác.
    // Trong trường hợp xấu nhất, N giao dịch có thể thuộc N tháng khác nhau,
    // cần tối đa 2N thao tác. Giới hạn batch của Firestore là 500.
    // Vì vậy, ta chia chunk là 200 (tương ứng tối đa 400 thao tác/batch) cho an toàn.
    const CHUNK_SIZE = 200;
    
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      // Dùng Map để nhóm tiền bị trừ theo từng tháng (year_month)
      const monthlyStatsUpdates = new Map<string, { incomeDec: number; expenseDec: number; balanceDec: number }>();

      chunk.forEach(docSnap => {
        const tx = docSnap.data() as Transaction;
        
        // 1. Thêm lệnh xóa document giao dịch vào batch
        batch.delete(docSnap.ref);

        // 2. Tính toán số tiền để cập nhật monthly_stats
        const monthStr = getYearMonth(tx.date);
        const currentStats = monthlyStatsUpdates.get(monthStr) || { incomeDec: 0, expenseDec: 0, balanceDec: 0 };

        if (tx.type === "income") {
          currentStats.incomeDec -= tx.amount;
          currentStats.balanceDec -= tx.amount; // Thu nhập giảm => Số dư giảm
        } else if (tx.type === "expense") {
          currentStats.expenseDec -= tx.amount;
          currentStats.balanceDec += tx.amount; // Chi phí giảm => Số dư tăng (vì balance = income - expense)
        }

        monthlyStatsUpdates.set(monthStr, currentStats);
      });

      // 3. Thêm lệnh cập nhật (increment) vào monthly_stats
      monthlyStatsUpdates.forEach((stats, monthStr) => {
        const statsRef = doc(db, "users", userId, "monthly_stats", monthStr);
        batch.set(statsRef, {
          totalIncome: increment(stats.incomeDec),
          totalExpense: increment(stats.expenseDec),
          balance: increment(stats.balanceDec)
        }, { merge: true });
      });

      // 4. Thực thi batch hiện tại
      await batch.commit();
    }

    return { success: true, message: `Đã xóa thành công ${docs.length} giao dịch.`, count: docs.length };
  } catch (error) {
    console.error("Lỗi khi xóa giao dịch hàng loạt:", error);
    return { success: false, message: "Đã xảy ra lỗi khi xóa giao dịch. Vui lòng thử lại.", count: 0 };
  }
}

/** Cập nhật giao dịch & Xử lý bù trừ monthly_stats */
export async function updateTransaction(
  txId: string,
  data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>,
  oldData?: Transaction
): Promise<void> {
  if (!oldData) {
    // Dự phòng
    await updateDoc(doc(db, "transactions", txId), data);
    return;
  }

  const batch = writeBatch(db);
  const txRef = doc(db, "transactions", txId);
  batch.update(txRef, data as any);

  // Tính newData bằng cách gộp data mới vào oldData
  const newData = { ...oldData, ...data } as Transaction;

  const oldMonth = getYearMonth(oldData.date);
  const newMonth = getYearMonth(newData.date);

  if (oldMonth === newMonth) {
    const statsRef = doc(db, "users", newData.userId, "monthly_stats", newMonth);

    const oldIncome = oldData.type === "income" ? oldData.amount : 0;
    const oldExpense = oldData.type === "expense" ? oldData.amount : 0;
    
    const newIncome = newData.type === "income" ? newData.amount : 0;
    const newExpense = newData.type === "expense" ? newData.amount : 0;

    const diffIncome = newIncome - oldIncome;
    const diffExpense = newExpense - oldExpense;
    const diffBalance = diffIncome - diffExpense;

    if (diffIncome !== 0 || diffExpense !== 0) {
      batch.set(statsRef, {
        totalIncome: increment(diffIncome),
        totalExpense: increment(diffExpense),
        balance: increment(diffBalance)
      }, { merge: true });
    }
  } else {
    // Rút tiền khỏi tháng cũ
    const oldStatsRef = doc(db, "users", oldData.userId, "monthly_stats", oldMonth);
    const oldIncomeDec = oldData.type === "income" ? -oldData.amount : 0;
    const oldExpenseDec = oldData.type === "expense" ? -oldData.amount : 0;
    const oldBalanceDec = oldData.type === "income" ? -oldData.amount : oldData.amount;

    batch.set(oldStatsRef, {
      totalIncome: increment(oldIncomeDec),
      totalExpense: increment(oldExpenseDec),
      balance: increment(oldBalanceDec)
    }, { merge: true });

    // Thêm tiền vào tháng mới
    const newStatsRef = doc(db, "users", newData.userId, "monthly_stats", newMonth);
    const newIncomeInc = newData.type === "income" ? newData.amount : 0;
    const newExpenseInc = newData.type === "expense" ? newData.amount : 0;
    const newBalanceInc = newData.type === "income" ? newData.amount : -newData.amount;

    batch.set(newStatsRef, {
      totalIncome: increment(newIncomeInc),
      totalExpense: increment(newExpenseInc),
      balance: increment(newBalanceInc)
    }, { merge: true });
  }

  await batch.commit();
}

const PAGE_SIZE = 20;

export async function fetchInitialTransactions(userId: string) {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(PAGE_SIZE)
  );

  const snapshot = await getDocs(q);
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));

  return {
    transactions,
    lastVisible,
    hasMore: snapshot.docs.length === PAGE_SIZE
  };
}

export async function fetchMoreTransactions(userId: string, lastVisibleDoc: QueryDocumentSnapshot<DocumentData>) {
  if (!lastVisibleDoc) return { transactions: [], lastVisible: null, hasMore: false };

  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    startAfter(lastVisibleDoc),
    limit(PAGE_SIZE)
  );

  const snapshot = await getDocs(q);
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));

  return {
    transactions,
    lastVisible,
    hasMore: snapshot.docs.length === PAGE_SIZE
  };
}

// ─── Optimize Read: Fetch Data for UI ──────────────────────────────────────────

/**
 * Tab Theo Ngày: Chỉ query bảng transactions lọc theo ngày hôm nay.
 */
export async function fetchDailyStats(userId: string, dateStr: string): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
      where("date", "==", dateStr)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
  } catch (error) {
    console.error("Lỗi khi fetchDailyStats:", error);
    return [];
  }
}

/**
 * Tab Theo Tháng: Lấy số liệu 1 tháng từ monthly_stats để vẽ thanh phần trăm danh mục.
 * (Không query vào bảng transactions)
 */
export async function fetchMonthlyStats(userId: string, yyyyMm: string) {
  try {
    const ref = doc(db, "users", userId, "monthly_stats", yyyyMm);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Lỗi khi fetchMonthlyStats:", error);
    return null;
  }
}

/**
 * Tab Theo Năm: Lấy tổng quan năm từ yearly_stats và 12 document tháng từ monthly_stats.
 * Chỉ tốn 13 reads.
 */
export async function fetchYearlyStats(userId: string, yyyy: string) {
  try {
    // 1. Get yearly data
    const yearlyRef = doc(db, "users", userId, "yearly_stats", yyyy);
    const yearlySnap = await getDoc(yearlyRef);
    const yearlyData = yearlySnap.exists() ? yearlySnap.data() : null;

    // 2. Get 12 months data
    const monthPromises = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${yyyy}_${String(m).padStart(2, "0")}`;
      const mRef = doc(db, "users", userId, "monthly_stats", monthStr);
      monthPromises.push(getDoc(mRef));
    }
    
    const monthSnaps = await Promise.all(monthPromises);
    const monthlyData = monthSnaps.map(snap => snap.exists() ? { id: snap.id, ...snap.data() } : null);

    return { yearlyData, monthlyData };
  } catch (error) {
    console.error("Lỗi khi fetchYearlyStats:", error);
    return { yearlyData: null, monthlyData: [] };
  }
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

/** Xóa ngân sách theo id */
export async function deleteBudget(budgetId: string): Promise<void> {
  await deleteDoc(doc(db, "budgets", budgetId));
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
