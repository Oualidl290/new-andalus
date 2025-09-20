# 🤝 Contributing to New Andalus Editorial Platform

Thank you for your interest in contributing to New Andalus! We welcome contributions from developers of all skill levels. This guide will help you get started with contributing to our open-source editorial platform.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Workflow](#contributing-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Security](#security)
- [Community](#community)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** or **Bun 1.0+**
- **Git**
- **Docker** and **Docker Compose** (recommended)
- **PostgreSQL 16+** (if not using Docker)
- **Redis 7+** (if not using Docker)

### Quick Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/platform.git
   cd platform
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/new-andalus/platform.git
   ```
4. **Start the development environment**:
   ```bash
   docker-compose up -d
   npm install
   npm run dev
   ```

## 🛠️ Development Setup

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run db:push

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

### Option 2: Local Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your local database URLs

# Start local PostgreSQL and Redis
# (Instructions vary by OS)

# Run database migrations
npm run db:push

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

### Development Services

When using Docker Compose, the following services are available:

- **Application**: http://localhost:3000
- **Database Admin (Adminer)**: http://localhost:8080
- **Redis Admin**: http://localhost:8001
- **Email Testing (MailHog)**: http://localhost:8025
- **Object Storage (MinIO)**: http://localhost:9001
- **Metrics (Grafana)**: http://localhost:3001
- **Search (Kibana)**: http://localhost:5601

## 🔄 Contributing Workflow

### 1. Choose an Issue

- Browse [open issues](https://github.com/new-andalus/platform/issues)
- Look for issues labeled `good first issue` for beginners
- Comment on the issue to let others know you're working on it

### 2. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Write clean, readable code
- Follow our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Check code quality
npm run lint
npm run type-check

# Run security audit
npm run security:audit
```

### 5. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Examples of good commit messages
git commit -m "feat: add real-time collaborative editing"
git commit -m "fix: resolve database connection timeout issue"
git commit -m "docs: update API documentation for articles endpoint"
git commit -m "test: add unit tests for user authentication"
git commit -m "refactor: optimize database query performance"
```

### 6. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
# Use the PR template and provide detailed description
```

## 📝 Coding Standards

### TypeScript

- Use **strict mode** TypeScript
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for functions
- Avoid `any` type - use proper typing

```typescript
// ✅ Good
interface User {
  id: string
  email: string
  name: string
}

function getUser(id: string): Promise<User | null> {
  // implementation
}

// ❌ Bad
function getUser(id: any): any {
  // implementation
}
```

### React Components

- Use **functional components** with hooks
- Prefer **composition** over inheritance
- Use **TypeScript interfaces** for props
- Follow the **single responsibility principle**

```typescript
// ✅ Good
interface ArticleCardProps {
  article: Article
  onEdit?: (id: string) => void
  className?: string
}

export function ArticleCard({ article, onEdit, className }: ArticleCardProps) {
  return (
    <div className={cn("article-card", className)}>
      {/* component content */}
    </div>
  )
}

// ❌ Bad
export function ArticleCard(props: any) {
  return <div>{/* component content */}</div>
}
```

### Styling

- Use **Tailwind CSS** utility classes
- Create **reusable components** for common patterns
- Use **CSS variables** for theming
- Follow **mobile-first** responsive design

```typescript
// ✅ Good
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
  Submit
</button>

// ❌ Bad
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
  Submit
</button>
```

### API Routes

- Use **proper HTTP status codes**
- Implement **input validation** with Zod
- Add **error handling** and logging
- Follow **RESTful conventions**

```typescript
// ✅ Good
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = articleSchema.parse(body)
    
    const article = await createArticle(validatedData)
    
    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Database

- Use **Drizzle ORM** for type-safe queries
- Create **proper indexes** for performance
- Use **transactions** for data consistency
- Follow **database naming conventions**

```typescript
// ✅ Good
export async function createArticleWithTags(
  articleData: NewArticle,
  tagIds: string[]
) {
  return await db.transaction(async (tx) => {
    const [article] = await tx.insert(articles).values(articleData).returning()
    
    if (tagIds.length > 0) {
      await tx.insert(articleTags).values(
        tagIds.map(tagId => ({ articleId: article.id, tagId }))
      )
    }
    
    return article
  })
}
```

## 🧪 Testing Guidelines

### Test Structure

We follow the testing pyramid:

- **70% Unit Tests**: Test individual functions and components
- **20% Integration Tests**: Test API endpoints and database interactions
- **10% End-to-End Tests**: Test complete user workflows

### Writing Tests

```typescript
// Unit test example
describe('ArticleCard', () => {
  it('should render article title and excerpt', () => {
    const article = {
      id: '1',
      title: 'Test Article',
      excerpt: 'Test excerpt',
      status: 'published'
    }
    
    render(<ArticleCard article={article} />)
    
    expect(screen.getByText('Test Article')).toBeInTheDocument()
    expect(screen.getByText('Test excerpt')).toBeInTheDocument()
  })
})

// Integration test example
describe('POST /api/articles', () => {
  it('should create a new article', async () => {
    const articleData = {
      title: 'New Article',
      content: { type: 'doc', content: [] },
      status: 'draft'
    }
    
    const response = await request(app)
      .post('/api/articles')
      .send(articleData)
      .expect(201)
    
    expect(response.body.title).toBe('New Article')
  })
})
```

### Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- ArticleCard.test.tsx

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation

### Code Documentation

- Add **JSDoc comments** for public functions
- Use **clear variable names**
- Add **inline comments** for complex logic
- Update **README** for new features

```typescript
/**
 * Creates a new article with the provided data
 * @param articleData - The article data to create
 * @param authorId - The ID of the article author
 * @returns Promise resolving to the created article
 * @throws {ValidationError} When article data is invalid
 */
export async function createArticle(
  articleData: NewArticle,
  authorId: string
): Promise<Article> {
  // implementation
}
```

### API Documentation

- Document **all API endpoints**
- Include **request/response examples**
- Specify **error codes** and messages
- Use **OpenAPI/Swagger** format when possible

## 🔒 Security

### Security Guidelines

- **Never commit secrets** or sensitive data
- Use **environment variables** for configuration
- Implement **input validation** on all endpoints
- Follow **OWASP security guidelines**
- Add **security tests** for new features

### Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email us at **security@newandalus.com**
3. Include detailed information about the vulnerability
4. Allow us time to address the issue before public disclosure

## 🏷️ Issue Labels

We use the following labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `documentation` - Improvements or additions to documentation
- `security` - Security-related issues
- `performance` - Performance improvements
- `accessibility` - Accessibility improvements

## 🎯 Pull Request Guidelines

### PR Checklist

Before submitting a pull request, ensure:

- [ ] Code follows our style guidelines
- [ ] Tests pass locally (`npm run test`)
- [ ] Code is properly documented
- [ ] Commit messages follow conventional commits
- [ ] PR description clearly explains the changes
- [ ] Screenshots included for UI changes
- [ ] Breaking changes are documented

### PR Template

When creating a pull request, use our template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🌟 Recognition

Contributors are recognized in several ways:

- **Contributors page** on our website
- **GitHub contributors** section
- **Release notes** acknowledgments
- **Special badges** for significant contributions

## 💬 Community

### Getting Help

- **GitHub Discussions**: For questions and general discussion
- **Discord**: Real-time chat with the community
- **Stack Overflow**: Tag questions with `new-andalus`
- **Email**: For private inquiries

### Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and experiences
- Provide constructive feedback
- Follow our code of conduct

## 📞 Contact

- **General Questions**: [oualiddev.ba@gmail.com](oualiddev.ba@gmail.com)
- **Security Issues**: [security@newandalus.com](mailto:security@newandalus.com)
- **Maintainers**: [maintainers@newandalus.com](mailto:maintainers@newandalus.com)

---

Thank you for contributing to New Andalus! Your contributions help make this platform better for everyone. Oualid bahloul