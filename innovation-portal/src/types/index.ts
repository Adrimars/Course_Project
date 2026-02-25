// ─── Enums (mirror Prisma enums for client-side use) ─────────────────────────

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum IdeaStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum IdeaCategory {
  TECHNOLOGY = 'TECHNOLOGY',
  PROCESS = 'PROCESS',
  PRODUCT = 'PRODUCT',
  COST_SAVING = 'COST_SAVING',
  CUSTOMER_EXPERIENCE = 'CUSTOMER_EXPERIENCE',
  OTHER = 'OTHER',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

// ─── Entity Types ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface AttachmentInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: IdeaStatus | null;
  toStatus: IdeaStatus;
  feedback: string | null;
  createdAt: Date;
  admin: {
    name: string;
  } | null;
}

export interface IdeaWithRelations {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  status: IdeaStatus;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
  submitter: {
    id: string;
    name: string;
    email: string;
  } | null;
  attachment: AttachmentInfo | null;
  statusHistory: StatusHistoryEntry[];
}

export interface IdeaSummary {
  id: string;
  title: string;
  category: IdeaCategory;
  status: IdeaStatus;
  visibility: Visibility;
  createdAt: Date;
  submitter: {
    id: string;
    name: string;
  } | null;
  attachment: { id: string } | null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

// ─── NextAuth Session Augmentation ───────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}
