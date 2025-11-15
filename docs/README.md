# TalabaHub Documentation

Welcome to the TalabaHub backend documentation. This directory contains comprehensive guides for developers, DevOps engineers, and system administrators.

## 📚 Documentation Index

### Getting Started

- **[COMPLETE_IMPLEMENTATION_REPORT.md](./COMPLETE_IMPLEMENTATION_REPORT.md)** - Complete overview of the entire project
  - Executive summary
  - All 17 modules with detailed descriptions
  - Technical stack
  - Database schema
  - API documentation
  - Security features
  - Deployment guide
  - Project statistics

### Guides & How-Tos

- **[LOGGING_MONITORING_GUIDE.md](./LOGGING_MONITORING_GUIDE.md)** - Comprehensive logging and monitoring guide
  - Winston logger setup and usage
  - Log file management and rotation
  - HTTP request logging
  - Performance monitoring
  - Health checks
  - Production deployment
  - Troubleshooting

### Module Documentation

Each major module has detailed documentation:

#### Core Modules
- [Authentication & Authorization](../src/auth/README.md)
- [User Management](../src/users/README.md)
- [Universities](../src/universities/README.md)
- [Categories](../src/categories/README.md)
- [Brands & Discounts](../src/discounts/README.md)
- [Companies & Jobs](../src/jobs/README.md)
- [Education Partners & Courses](../src/courses/README.md)
- [Blog Posts](../src/blog-posts/README.md)
- [Events](../src/events/README.md)
- [Reviews](../src/reviews/README.md)

#### Service Modules
- [Email Service](../src/mail/README.md)
- [File Upload](../src/upload/README.md)
- [Payment Integration](../src/payment/README.md)
- [Logger](../src/logger/README.md)
- [Health Checks](../src/health/README.md)

### Reference Documentation

- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and changes
- **[DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md)** - Template for creating new documentation

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/sarvarbekyusupov/talabahub.git
cd talabahub

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

Server will be available at:
- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

---

## 📖 Documentation Standards

When contributing or updating documentation, please follow these guidelines:

### 1. Use the Template

For new features or modules, use [DOCUMENTATION_TEMPLATE.md](./DOCUMENTATION_TEMPLATE.md) as a starting point.

### 2. Update CHANGELOG.md

Every change should be documented in [CHANGELOG.md](../CHANGELOG.md):
- Add entries under `[Unreleased]` section
- Use categories: Added, Changed, Fixed, Deprecated, Removed, Security

### 3. Module README Files

Each module should have a README.md in its directory:
```
src/module-name/
├── README.md          ← Module documentation
├── module.module.ts
├── module.service.ts
└── module.controller.ts
```

### 4. Code Comments

- Use JSDoc for public methods
- Explain complex logic
- Document important decisions

Example:
```typescript
/**
 * Creates a new discount with usage tracking
 *
 * @param createDiscountDto - Discount creation data
 * @param userId - ID of the user creating the discount
 * @returns Created discount object
 * @throws BadRequestException if validation fails
 */
async createDiscount(createDiscountDto: CreateDiscountDto, userId: string) {
  // Implementation
}
```

---

## 🏗️ Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────┐
│         API Layer (REST)            │
│  Controllers + Swagger Decorators   │
└─────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────┐
│       Business Logic Layer          │
│    Services + DTOs + Validation     │
└─────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────┐
│       Data Access Layer             │
│     Prisma ORM + PostgreSQL         │
└─────────────────────────────────────┘
```

### Module Structure

```
src/
├── common/                 # Shared utilities
│   ├── decorators/        # Custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth guards
│   └── interceptors/      # Logging, performance
├── auth/                  # Authentication
├── users/                 # User management
├── [feature-modules]/     # Feature modules
├── mail/                  # Email service
├── upload/                # File upload
├── payment/               # Payment integration
├── logger/                # Logging
└── health/                # Health checks
```

---

## 🔐 Security

### Authentication Flow

1. User registers → Email verification sent
2. User verifies email → Account activated
3. User logs in → Receive access + refresh tokens
4. Use access token for API requests
5. Refresh access token when expired

### Authorization

Role-based access control (RBAC):
- **Student**: Normal user privileges
- **Admin**: Full system access
- **Partner**: Company/Education partner privileges

### Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Validate all input** - Use DTOs with class-validator
3. **Sanitize logs** - Remove passwords, tokens from logs
4. **Use HTTPS** - In production
5. **Rate limiting** - Prevent abuse (configured in .env)

---

## 📊 Monitoring & Logging

### Log Levels

Development:
```
error, warn, info, http, debug
```

Production:
```
error, warn, info, http
```

### Log Files

```
logs/
├── error-2025-11-15.log      # Errors only
├── combined-2025-11-15.log   # All logs
└── http-2025-11-15.log       # HTTP requests
```

### Health Endpoints

- `/api/health` - Full health check
- `/api/health/ready` - Readiness probe
- `/api/health/live` - Liveness probe
- `/api/health/metrics` - System metrics

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Writing Tests

Example test structure:
```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should create a user', async () => {
    const user = await service.create({...});
    expect(user).toBeDefined();
  });
});
```

---

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t talabahub-backend .

# Run container
docker run -p 3000:3000 --env-file .env talabahub-backend
```

### Kubernetes

See deployment manifests in `k8s/` directory:
- `deployment.yaml` - Application deployment
- `service.yaml` - Service configuration
- `configmap.yaml` - Configuration
- `secrets.yaml` - Sensitive data

---

## 🤝 Contributing

### Documentation Contributions

1. Fork the repository
2. Create a feature branch
3. Add/update documentation
4. Submit a pull request

### Documentation Review Checklist

- [ ] Clear and concise writing
- [ ] Code examples included
- [ ] Error scenarios covered
- [ ] Configuration documented
- [ ] Links working
- [ ] Follows template structure

---

## 📞 Support

### Getting Help

1. Check documentation in this directory
2. Search existing issues on GitHub
3. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Reporting Bugs

Use the bug report template and include:
- Error messages
- Log output
- Configuration (without secrets)
- Steps to reproduce

---

## 📝 License

[Add license information]

---

## 🔗 Useful Links

- **GitHub Repository**: https://github.com/sarvarbekyusupov/talabahub
- **API Documentation**: http://localhost:3000/api (when running)
- **Prisma Docs**: https://www.prisma.io/docs
- **NestJS Docs**: https://docs.nestjs.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

**Last Updated**: November 15, 2025
**Documentation Version**: 1.0.0
