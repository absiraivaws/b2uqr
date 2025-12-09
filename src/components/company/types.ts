export type CashierInfo = {
  id: string;
  username: string;
  displayName: string;
  status: string;
};

export type BranchInfo = {
  id: string;
  name: string;
  username: string;
  branchNumber?: number | null;
  managerName: string | null;
  managerContact: { email?: string | null; phone?: string | null } | null;
  managerUid?: string | null;
  cashiers: CashierInfo[];
};

export type ManagerDialogState = {
  open: boolean;
  branch: BranchInfo | null;
};

export type CashierDialogState = {
  open: boolean;
  branch: BranchInfo | null;
};
