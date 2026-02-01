# Rentals Inc - AI-Orchestrated Leasing MVP

An intelligent leasing application system that combines AI-powered fraud detection with human oversight to streamline the rental application review process. Built on Vercel with a focus on auditability, RBAC, and clear state transitions.

## System Overview

The Rentals Inc Leasing System automates application review using a hybrid approach:

- **AI Document Analysis**: Machine learning models analyze application documents for fraud signals and risk indicators
- **Deterministic Policy Engine**: System applies business rules to AI recommendations for final decisions
- **Human Override Capability**: Reviewers can override automated decisions with full audit trail
- **Role-Based Access Control**: Three-tier access model (applicant, reviewer, admin)

The system operates through a clear workflow:
- **Submitted**: Application received and persisted
- **Under Review**: AI analysis in progress
- **Approved/Flagged**: Final decision based on policy rules applied to AI recommendations


# Rentals Inc Documentation Index

This contains comprehensive documentation for the Rentals Inc AI-Orchestrated Leasing MVP, organized by component and feature.

---

## Quick Navigation

### Architecture & Design
| Document | Description |
|----------|-------------|
| [Main README](README.md) | Architecture overview, setup instructions, and engineering reasoning |
| [API Documentation](api.http) | HTTP endpoint examples and testing |

### Implementation
| Component | Location | Description |
|-----------|----------|-------------|
| Backend API | [`apps/api/`](apps/api/) | Vercel Functions, Prisma ORM, workflow engine |
| Frontend UI | [`apps/web/`](apps/web/) | Next.js App Router, React components |
| Database Schema | [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) | PostgreSQL data models |
| Infrastructure | [`infra/`](infra/) | Terraform IaC templates |

### Key Features
| Feature | Description |
|---------|-------------|
| Application Submission | Applicant metadata capture with document upload (mocked) |
| AI Review Workflow | Fraud scoring, signal detection, document classification |
| Status Management | State machine with audit trail |
| RBAC | Role-based access control with email-based applicant filtering |

---

## System Architecture

```mermaid
flowchart TD
  Web[Next.js App] -->|POST /applications| Api[Vercel Functions]
  Api --> Db[(PostgreSQL)]
  Api --> Wf[Review Workflow]
  Wf --> Ai[AI Review Engine]
  Ai --> Db
  Api -->|GET /applications/:id| Web
```

### Technology Stack

**Frontend:**
- Next.js 16 with App Router
- React 19
- TypeScript 5
- Tailwind CSS 4

**Backend:**
- Vercel Functions (serverless)
- Prisma ORM 7.3
- PostgreSQL 16
- Zod validation

**Infrastructure:**
- Terraform for IaC
- Docker for local development
- Vercel for deployment

---

## Project Structure

```
├── apps/
│   ├── api/
│   │   ├── api/
│   │   │   ├── applications/       # Application endpoints
│   │   │   │   ├── index.ts        # POST /applications
│   │   │   │   ├── list.ts         # GET /applications
│   │   │   │   ├── [id].ts         # GET /applications/:id
│   │   │   │   └── [id]/
│   │   │   │       └── decision.ts # POST /applications/:id/decision
│   │   │   └── auth/               # Authentication endpoints
│   │   │       ├── signup.ts       # POST /auth/signup
│   │   │       ├── login.ts        # POST /auth/login
│   │   │       ├── logout.ts       # POST /auth/logout
│   │   │       └── me.ts           # GET /auth/me
│   │   ├── lib/
│   │   │   ├── ai.ts               # AI review logic
│   │   │   ├── auth.ts             # Authentication utilities
│   │   │   ├── crypto.ts           # Password hashing
│   │   │   ├── http.ts             # HTTP helpers
│   │   │   ├── prisma.ts           # Database client
│   │   │   ├── session.ts          # Session management
│   │   │   ├── validation.ts       # Zod schemas
│   │   │   └── workflow.ts         # Review workflow engine
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   └── migrations/         # Database migrations
│   │   └── scripts/
│   │       └── dev-help.mjs        # Development utilities
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Home page
│           │   ├── login/          # Login page
│           │   ├── signup/         # Signup page
│           │   ├── dashboard/      # Dashboard (submit application)
│           │   ├── my-applications/# Applicant's applications
│           │   ├── lookup/         # Reviewer lookup
│           │   └── status/[id]/    # Application status page
│           ├── components/
│           │   └── Navigation.tsx  # Navigation component
│           └── lib/
│               └── auth.tsx        # Auth context provider
├── infra/
│   ├── main.tf                     # Main Terraform config
│   ├── variables.tf                # Terraform variables
│   └── outputs.tf                  # Terraform outputs
└── packages/
    └── shared/                     # Shared types/utilities
```

---

## Part 1: API Documentation

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create new user account |
| `/api/auth/login` | POST | Authenticate and create session |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/auth/me` | GET | Get current user info |

### Application Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/applications` | POST | Submit new application |
| `/api/applications` | GET | List applications (filtered by role) |
| `/api/applications/:id` | GET | Get application details |
| `/api/applications/:id/decision` | POST | Update application decision (admin only) |

### Authentication Headers

The system uses session-based authentication:
- `Authorization: Bearer <session_token>` - Required for authenticated endpoints

Legacy headers (for backward compatibility):
- `X-User-Role`: `applicant | reviewer | admin`
- `X-Applicant-Email`: Required for applicant access

---

## Part 2: Data Models

### User Model
```typescript
{
  id: string (cuid)
  email: string (unique)
  passwordHash: string
  name: string
  role: UserRole (applicant | reviewer | admin)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Application Model
```typescript
{
  id: string (cuid)
  applicantName: string
  applicantEmail: string
  applicantPhone: string?
  status: ApplicationStatus (submitted | under_review | approved | flagged)
  applicantId: string? (foreign key to User)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### ReviewResult Model
```typescript
{
  id: string (cuid)
  applicationId: string
  fraudScore: float (0-100)
  summary: string
  aiNotes: string?
  signals: JSON? (detected fraud indicators)
  documentClassifications: JSON?
  recommendedAction: string?
  confidenceLevel: float?
  isAiGenerated: boolean
  createdAt: DateTime
}
```

### AuditEvent Model
```typescript
{
  id: string (cuid)
  applicationId: string
  actorRole: UserRole
  action: string
  metadata: JSON?
  createdAt: DateTime
}
```

---

## Part 3: Workflow Engine

### Application Lifecycle

1. **Submission** (`submitted`)
   - Applicant submits application with metadata
   - Documents recorded (metadata only, mocked upload)
   - Initial audit event created

2. **AI Review** (`under_review`)
   - Status automatically transitions to `under_review`
   - AI analyzes documents and generates fraud score
   - Signals and classifications extracted
   - ReviewResult persisted with AI recommendations

3. **Decision** (`approved` or `flagged`)
   - System policy applies deterministic rules to AI output
   - Status updated based on fraud score thresholds
   - Audit event records decision rationale
   - Notifications triggered (future enhancement)

4. **Human Override** (optional)
   - Reviewers/admins can manually update status
   - Override reason captured in audit event
   - Original AI recommendation preserved

### AI Review Logic

Location: [`apps/api/lib/ai.ts`](apps/api/lib/ai.ts)

The AI review engine uses deterministic heuristics for demo consistency:
- **Fraud Score Calculation**: Based on document count, email patterns, phone presence
- **Signal Detection**: Identifies suspicious patterns (missing docs, invalid formats)
- **Document Classification**: Categorizes uploaded documents
- **Confidence Scoring**: Estimates prediction reliability

### Policy Engine

Location: [`apps/api/lib/workflow.ts`](apps/api/lib/workflow.ts)

Deterministic rules applied to AI recommendations:
- Fraud score < 30: Auto-approve
- Fraud score 30-70: Flag for review
- Fraud score > 70: Auto-flag
- Missing critical documents: Auto-flag

---

## Part 4: RBAC Implementation

### Role Definitions

| Role | Permissions |
|------|-------------|
| **Applicant** | Submit applications, view own applications (email match) |
| **Reviewer** | View all applications, cannot submit |
| **Admin** | Full access: submit, view all, override decisions |

### Access Control Logic

Location: [`apps/api/lib/auth.ts`](apps/api/lib/auth.ts)

- Session-based authentication with JWT-like tokens
- Role extracted from User model
- Email-based filtering for applicant role
- Middleware validates permissions per endpoint

---

## Part 5: Assumptions & Limitations

### Current Assumptions

**Document Handling:**
- Documents are submitted as metadata only (filename, MIME type, size)
- No actual file upload or storage implemented
- Document analysis based on filename patterns and metadata

**AI Review:**
- Uses deterministic heuristics for demo consistency
- Falls back to rule-based analysis when AI API unavailable
- AI models are not trained on historical data (uses OpenAI/Grok APIs)

**Workflow Execution:**
- Workflows run synchronously within API request lifecycle
- No queue or background job processing
- Single-threaded processing per application

**Authentication:**
- Session-based authentication with 7-day expiration
- No OAuth or SSO integration
- Password reset not implemented

**Data Volume:**
- Designed for MVP/demo scale (< 1000 applications)
- No pagination on list endpoints
- No data archival or retention policies

### Known Limitations

**Scalability:**
- Synchronous workflow blocks API responses under load
- Single database instance without read replicas
- No connection pooling or caching layer
- Document metadata stored in main database

**Security:**
- No encryption at rest for database
- Session tokens not rotated
- No rate limiting on API endpoints
- CORS configured for development (permissive)

**Fraud Detection:**
- No OCR or actual document content analysis
- No third-party verification (employment, credit, identity)
- No image forensics or tampering detection
- No behavioral analysis (device fingerprinting, IP tracking)

**Operational:**
- No structured logging with correlation IDs
- No monitoring or alerting infrastructure
- No retry logic or dead-letter queues
- No feature flags for graceful degradation

**User Experience:**
- No email notifications for status changes
- No document preview or download
- No bulk operations for reviewers
- Mobile UI not optimized

### Production Readiness Gaps

To move from MVP to production, the following would be required:

1. **Infrastructure**: Async workflows (Vercel Workflows), read replicas, Redis caching, CDN for static assets
2. **Security**: Database encryption, rate limiting, HTTPS enforcement, security headers, audit log retention
3. **Fraud Detection**: Real document upload to S3, OCR integration, third-party verification APIs, ML model training
4. **Observability**: Structured logging, APM (Datadog/New Relic), error tracking (Sentry), uptime monitoring
5. **Compliance**: GDPR/CCPA data handling, PII encryption, data retention policies, right-to-deletion
6. **Testing**: Unit tests (>80% coverage), integration tests, load tests, security scans

---

## Part 6: Setup Instructions

### Prerequisites
- Node.js 20+
- Docker Desktop
- npm or yarn

### Local Development Setup

1. **Start PostgreSQL**
```bash
docker run --name rentals-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=rentals \
  -p 5432:5432 -d postgres:16
```

2. **Backend Setup**
```bash
cd apps/api
npm install
npx prisma migrate dev --name init
cd ../..
vercel dev --cwd apps/api --listen 3001
```

3. **Frontend Setup**
```bash
cd apps/web
npm install
npm run dev
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Environment Variables

Create `.env` in `apps/api/`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rentals"
```

---

## Part 7: Engineering Reasoning

### Scalability Considerations

**Current Bottlenecks at 10x Volume:**
- Synchronous workflow execution blocks API responses
- Single database instance limits write throughput
- Document metadata stored in main database

**Proposed Enhancements:**
- Migrate to Vercel Workflows for async execution
- Implement read replicas for reporting queries
- Move document storage to S3/Blob storage
- Add Redis caching layer for frequently accessed data
- Implement connection pooling with PgBouncer

**Key Metrics to Monitor:**
- Workflow execution duration (p50, p95, p99)
- Database write latency
- API response times
- Queue depth for async workflows
- Error rates by workflow step

### Fraud Detection & Trust

**Current Limitations:**
- Mocked document uploads (metadata only)
- Deterministic heuristics instead of trained ML models
- No external verification APIs

**Production Enhancements:**
- **OCR & Document Verification**: Extract text, verify authenticity, check EXIF data
- **Cross-Document Consistency**: Validate name/address consistency across documents
- **Third-Party Verification**: Employment verification, credit checks, identity verification APIs
- **Image Forensics**: Tampering detection, duplicate detection
- **Behavioral Signals**: Application completion time, device fingerprinting

**Automation Boundaries:**
- High-confidence approvals (fraud score < 20): Automated
- Medium-risk (20-70): Require human review
- High-risk (> 70): Auto-flag with mandatory review
- New applicant patterns: Route to human review until confidence established

### AI Authority & System Decisions

**Principle: AI Suggests, System Decides**

- AI outputs stored in `ReviewResult` table as recommendations
- System policy engine applies deterministic rules to AI output
- Canonical status lives in `Application.status`, never directly set by AI
- Human overrides create explicit `AuditEvent` records
- Original AI recommendations preserved for analysis

**Decisions Requiring Human Oversight:**
- Borderline fraud scores (30-70 range)
- Applications with conflicting signals
- High-value properties (future: property value threshold)
- Applicants with prior disputes (future: history check)

### Operational Readiness

**Reliability Mechanisms:**
- **Idempotency**: Application submissions use client-generated IDs (future)
- **Retries**: Workflow steps retry with exponential backoff
- **Dead Letter Queue**: Failed workflows route to DLQ for manual intervention
- **Correlation IDs**: Request tracing across services
- **Structured Logging**: JSON logs with context for debugging

**Monitoring & Alerting:**
- Workflow success/failure rates
- AI prediction latency
- Database connection pool exhaustion
- Repeated workflow failures (> 3 retries)
- Anomalous fraud score distributions

**Graceful Degradation:**
- AI service unavailable: Fall back to manual review
- Database read replica down: Route to primary
- Slow AI response: Timeout after 10s, queue for async processing

---

## Part 8: Testing Strategy

### Current Test Coverage
```bash
cd apps/api
npm test  # Currently returns "No tests yet"
```

### Recommended Test Suite

**Unit Tests:**
- AI scoring logic with various input combinations
- Policy engine decision rules
- RBAC permission checks
- Validation schemas

**Integration Tests:**
- End-to-end application submission flow
- Authentication and session management
- Database transactions and rollbacks
- Workflow state transitions

**Property-Based Tests:**
- Fraud scores always between 0-100
- Status transitions follow valid state machine
- Audit events created for every state change
- RBAC rules consistently enforced

---

## Part 9: Security Considerations

### Authentication & Authorization
- Password hashing with bcrypt (10 rounds)
- Session tokens with expiration
- Role-based access control enforced at API layer
- Email-based filtering for applicant data isolation

### Data Protection
- Sensitive PII in database (names, emails, phone numbers)
- No encryption at rest (future: enable PostgreSQL encryption)
- TLS for all API communication
- Session tokens stored securely (httpOnly cookies recommended)

### Audit Trail
- All status changes logged in `AuditEvent` table
- Actor role captured for accountability
- Metadata field for additional context
- Immutable audit log (no updates/deletes)

---

## Part 10: Future Enhancements

### Short-Term (MVP+)
- [ ] Real document upload to S3/Blob storage
- [ ] Email notifications for status changes
- [ ] Reviewer dashboard with queue management
- [ ] Bulk application export for reporting

### Medium-Term (V2)
- [ ] Trained ML models replacing heuristics
- [ ] OCR and document text extraction
- [ ] Third-party verification API integrations
- [ ] A/B testing framework for AI improvements
- [ ] Mobile-responsive UI enhancements

### Long-Term (V3)
- [ ] Multi-property portfolio applications
- [ ] Guarantor/co-applicant support
- [ ] Payment processing integration
- [ ] Lease generation and e-signature
- [ ] Tenant portal for ongoing communication

---

## Deployment

### Vercel Deployment

**Backend (API):**
```bash
cd apps/api
vercel --prod
```

**Frontend (Web):**
```bash
cd apps/web
vercel --prod
```

### Terraform Infrastructure

```bash
cd infra
terraform init
terraform plan
terraform apply
```

Provisions:
- Vercel project configuration
- Environment variables
- Database connection strings

---

## Contributing

This is an MVP demonstration project. For production use, consider:
- Adding comprehensive test coverage
- Implementing real document storage
- Training ML models on historical data
- Adding monitoring and alerting
- Conducting security audit
- Implementing rate limiting
- Adding API documentation (OpenAPI/Swagger)

---

## License

ISC

---

## Contact

For questions about this implementation, refer to the engineering reasoning in the main README.md.
