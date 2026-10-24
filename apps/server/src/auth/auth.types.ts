export interface AuthenticatedUser {
  userId: string;
  email?: string;
  userName?: string;
  avatarUrl?: string | null;
  orgId?: string | null;
  orgRole?: string | null;
  isGuest?: boolean;
}
