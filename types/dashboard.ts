export interface GetSummary {
  totalContactsCount: number;
  totalScansUsed: number;
  totalExportsCount: number;
  remainingScans: number;
  accountType: string;
}

export interface RecentContact {
  companyName: string;
  id?: number | string;  

  personName: string;
  designation: string;

  email: string;
  
  createdDate: string;
}
