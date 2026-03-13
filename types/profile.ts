export interface Profile {
  userName: string;
  phoneNumber: string;
  email: string;
  accountType: string;
  totalScansUsed: number | any;
  remainingScans: number | any;
}

export interface EditProfile {
  userName: string;
  phoneNumber: string;
}
