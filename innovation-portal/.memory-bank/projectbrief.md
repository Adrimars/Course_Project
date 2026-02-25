# Innovation Portal — Project Brief

## Overview
The Innovation Portal is an internal web application where employees submit innovation ideas for review by administrators. It features role-based access, idea submission with file attachments, admin evaluation workflows, and visibility controls.

## Core Features (Current)
- **Authentication**: Email/password registration and login via NextAuth.js credentials provider
- **Idea Submission**: Multi-field form with title, description, category, visibility, and optional file attachment
- **Admin Evaluation**: Admins can change idea status with required feedback
- **Visibility Control**: Submitters toggle ideas between PUBLIC and PRIVATE
- **Auto-Status Transition**: Ideas move from SUBMITTED → UNDER_REVIEW when an admin first views them
- **User Management**: Admins can promote/demote user roles
- **Status History**: Full audit trail of status changes with timestamps and admin info

## Roles (Current)
| Role  | Capabilities |
|-------|-------------|
| USER  | Submit ideas, view public ideas + own private ideas, toggle own idea visibility |
| ADMIN | All USER capabilities + evaluate ideas, manage user roles, view all ideas |

## Business Rules
- First registered user automatically becomes ADMIN
- Cannot remove the last ADMIN
- Admins cannot change their own role
- Private ideas visible only to submitter and admins
- File uploads limited to 10 MB; allowed types: PDF, DOC, DOCX, PNG, JPEG

## Planned Enhancements
See `todo.md` for the full roadmap including:
- Bug fixes (Phase 0)
- Inspector role, task assignments, dashboard analytics (Phase 1)
- Smart forms, multi-media, drafts, multi-stage review, blind review, scoring (Phases 2–7)
