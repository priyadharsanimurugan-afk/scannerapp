export interface AllUser {
    id: number;
    userName: string;
    email: string;
    accountType: number;
    remainingScans: number;
  
}

export interface PremiumRequest {
  accountType: string;
  email: string;
  userName: string;
  id: number;
  message: string;
  paymentReference: string;
  contactNumber: string;
  status: string;
  adminRemark?: string;
  createdAt: string;
}