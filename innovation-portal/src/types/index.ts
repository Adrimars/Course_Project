// ─── Enums (mirror Prisma enums for client-side use) ─────────────────────────

export enum Role {
  USER = 'USER',
  INSPECTOR = 'INSPECTOR',
  ADMIN = 'ADMIN',
}

export enum IdeaStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  INSPECTING = 'INSPECTING',
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

export enum NoteType {
  PERSONAL = 'PERSONAL',
  COLLABORATIVE = 'COLLABORATIVE',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export enum JoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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
  ideaId: string;
  originalName: string;
  mimeType: string;
  size: number;        // bytes
  displayOrder: number;
}

/** Phase 3: Structured video link stored as JSON on the Idea row */
export interface VideoLink {
  url: string;
  title: string;
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

export interface NoteInfo {
  id: string;
  content: string;
  type: NoteType;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
  };
}

export interface AssignmentInfo {
  id: string;
  ideaId: string;
  status: AssignmentStatus;
  createdAt: Date;
  idea?: {
    id: string;
    title: string;
    status: IdeaStatus;
  };
  assigner: {
    id: string;
    name: string;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
  };
}

export interface JoinRequestInfo {
  id: string;
  ideaId: string;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  idea?: {
    id: string;
    title: string;
  };
}

export interface IdeaWithRelations {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  status: IdeaStatus;
  visibility: Visibility;
  metadata: Record<string, string> | null; // Phase 2: category-specific fields
  videoLinks: VideoLink[] | null;           // Phase 3: embedded video links
  createdAt: Date;
  updatedAt: Date;
  submitter: {
    id: string;
    name: string;
    email: string;
  } | null;
  attachments: AttachmentInfo[]; // Phase 3: multiple attachments
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
  /** Phase 3: one entry per attachment; count tells how many files are attached */
  attachments: Array<{ id: string }>;
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
