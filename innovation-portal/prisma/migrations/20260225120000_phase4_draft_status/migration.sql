-- Phase 4: Draft Management
-- Add DRAFT value to IdeaStatus enum
-- Note: PostgreSQL requires adding enum values outside of transactions.

ALTER TYPE "IdeaStatus" ADD VALUE 'DRAFT';
