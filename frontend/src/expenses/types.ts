export interface ExpenseShare {
  userId: string;
  userName: string;
  shareAmount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  paidById: string;
  paidByName: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  shares: ExpenseShare[];
}

export interface Balance {
  userId: string;
  userName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}
