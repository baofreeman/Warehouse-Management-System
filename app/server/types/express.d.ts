import { Role } from "@prisma/client";

export interface PassportUser {
  id: string;
  userId: string;
  role: Role;
  name: string;
  enterprise?: string;
  enterpriseId?: string;
  isVerified?: boolean;
}

declare global {
  namespace Express {
    interface User extends PassportUser {}
    interface Request {
      user?: User;
    }
  }
}

export {};
