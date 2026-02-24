<!--
SYNC IMPACT REPORT
==================
Version Change: INITIAL → 1.0.0
Constitution Type: Initial creation
Ratification Date: 2026-02-24
Last Amended: 2026-02-24

Added Principles:
  1. Documentation-First - Specifications before implementation
  2. Quality Standards - Code quality gates and reviews  
  3. Service Boundaries - Microservice responsibilities and contracts
  4. Security-First - Authentication, authorization, and data protection
  5. Test Coverage - Comprehensive testing at all levels

Added Sections:
  - Technology Constraints (mandated stack)
  - Development Workflow (review process, quality gates, documentation requirements)

Template Consistency Status:
  ✅ plan-template.md - Constitution Check section ready
  ✅ spec-template.md - User story prioritization aligns with documentation-first
  ✅ tasks-template.md - Task organization aligns with quality workflow
  ✅ All templates - No agent-specific references (CLAUDE, etc.)

Follow-up Actions:
  - None (initial constitution fully populated)
-->

# InnovatEPAM Portal Constitution

## Core Principles

### I. Documentation-First

All features, APIs, and architectural decisions MUST be documented before implementation begins.

- Specifications written and approved before code
- API contracts defined with clear inputs/outputs
- Architectural Decision Records (ADRs) for significant changes
- README and inline documentation kept current

**Rationale**: Documentation-first ensures shared understanding, prevents misalignment, and creates a single source of truth for the team.

### II. Quality Standards

Code quality is non-negotiable; all code MUST meet defined quality gates before merging.

- Mandatory peer code reviews (minimum 1 approval)
- Static analysis and linting must pass (ESLint, TypeScript strict mode)
- No critical or high severity issues in quality checks
- Code coverage thresholds enforced

**Rationale**: Quality gates prevent technical debt accumulation and ensure maintainability as the project scales.

### III. Service Boundaries

Microservices MUST maintain clear boundaries, single responsibilities, and explicit contracts.

- Each service owns its domain and data
- Inter-service communication via well-defined APIs only
- No direct database access across service boundaries
- Versioned API contracts to manage changes

**Rationale**: Clear boundaries enable independent development, deployment, and scaling while preventing tight coupling.

### IV. Security-First

Security considerations MUST be addressed in design, implementation, and deployment.

- Authentication required for all protected endpoints (NextAuth.js)
- Authorization checks at service and data layers
- Input validation and sanitization mandatory
- Sensitive data encrypted at rest and in transit
- Regular security audits and dependency updates

**Rationale**: Security cannot be an afterthought in a portal handling user data and authentication.

### V. Test Coverage

Comprehensive testing MUST verify functionality at unit, integration, and end-to-end levels.

- Unit tests for business logic (minimum 80% coverage)
- Integration tests for service interactions and database operations
- End-to-end tests for critical user flows
- Tests written before or alongside implementation

**Rationale**: Testing ensures reliability, catches regressions early, and enables confident refactoring.

## Technology Constraints

The following technology stack is mandated for consistency and maintainability:

- **Framework**: Next.js (React-based, server-side rendering)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Handling**: Multer
- **Architecture**: Microservices

Technology changes require architecture review and migration plan approval.

## Development Workflow

### Code Review Process

- All changes via pull requests
- Minimum 1 approving review required
- CI/CD pipeline must pass (tests, linting, build)
- No force-pushes to main/production branches

### Quality Gates

- TypeScript strict mode enabled
- ESLint configuration enforced
- Automated tests must pass
- Build must complete successfully
- No blocking security vulnerabilities

### Documentation Requirements

- New features require specification in `.specify/` structure
- API changes documented with examples
- Database schema changes include migration notes
- Architecture changes require ADR

## Governance

This constitution supersedes all other development practices and guidelines.

**Amendment Process**:

1. Proposed amendments documented with rationale
2. Team review and approval required
3. Version incremented per semantic versioning
4. Migration plan for existing code if needed
5. All dependent templates and documentation updated

**Compliance**:

- All pull requests reviewed for constitutional compliance
- Violations must be justified and documented
- Repeated violations trigger process review
- Constitution reviewed quarterly for relevance

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
