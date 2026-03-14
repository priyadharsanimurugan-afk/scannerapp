export interface SignUp {
  email: string;
  userName: string;
  phoneNumber: string;
  password: string;
}

export interface VerifyEmail {
  email: string;
  code: string;
}

export interface RefreshToken {
  refreshToken: string;
}
export interface Login {
  email: string;
  password: string;
}

export interface ForgotPassword {
  email: string;
}

export interface ResetPassword {
  email: string;
  code: string;
  password: string;
}
