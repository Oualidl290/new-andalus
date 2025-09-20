#!/usr/bin/env node

/**
 * Security Audit Script
 * 
 * This script performs a comprehensive security audit of the New Andalus platform
 * checking for common security vulnerabilities and misconfigurations.
 */

const fs = require('fs')
const path = require('path')

class SecurityAuditor {
  constructor() {
    this.issues = []
    this.warnings = []
    this.passed = []
  }

  log(type, message, details = '') {
    const timestamp = new Date().toISOString()
    const entry = { timestamp, type, message, details }
    
    switch (type) {
      case 'CRITICAL':
      case 'HIGH':
        this.issues.push(entry)
        console.error(`❌ ${type}: ${message}`)
        break
      case 'MEDIUM':
      case 'LOW':
        this.warnings.push(entry)
        console.warn(`⚠️  ${type}: ${message}`)
        break
      case 'PASS':
        this.passed.push(entry)
        console.log(`✅ ${message}`)
        break
      default:
        console.log(`ℹ️  ${message}`)
    }
    
    if (details) {
      console.log(`   ${details}`)
    }
  }

  // Check if file exists
  fileExists(filePath) {
    try {
      return fs.existsSync(path.join(process.cwd(), filePath))
    } catch {
      return false
    }
  }

  // Read file content
  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
    } catch {
      return null
    }
  }

  // Check package.json for security dependencies
  checkSecurityDependencies() {
    console.log('\n🔍 Checking Security Dependencies...')
    
    const packageJson = this.readFile('package.json')
    if (!packageJson) {
      this.log('CRITICAL', 'package.json not found')
      return
    }

    const pkg = JSON.parse(packageJson)
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies }

    // Required security dependencies
    const requiredDeps = [
      'zod',
      'isomorphic-dompurify',
      'express-rate-limit',
      'helmet'
    ]

    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        this.log('PASS', `Security dependency found: ${dep}`)
      } else {
        this.log('HIGH', `Missing security dependency: ${dep}`)
      }
    })

    // Check for vulnerable dependencies (common ones)
    const vulnerableDeps = [
      'lodash',
      'moment',
      'request',
      'node-uuid'
    ]

    vulnerableDeps.forEach(dep => {
      if (dependencies[dep]) {
        this.log('MEDIUM', `Potentially vulnerable dependency: ${dep}`, 
          'Consider updating or replacing with safer alternatives')
      }
    })
  }

  // Check security file structure
  checkSecurityFiles() {
    console.log('\n🔍 Checking Security File Structure...')
    
    const requiredFiles = [
      'src/lib/security/headers.ts',
      'src/lib/security/validation.ts',
      'src/lib/security/rate-limit.ts',
      'src/lib/security/csrf.ts',
      'src/lib/security/monitoring.ts',
      'src/lib/security/error-handling.ts',
      'middleware.ts',
      'SECURITY.md'
    ]

    requiredFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.log('PASS', `Security file exists: ${file}`)
      } else {
        this.log('HIGH', `Missing security file: ${file}`)
      }
    })

    // Check for security tests
    const testFiles = [
      'src/lib/security/__tests__/security-simple.test.ts',
      'src/test/security-e2e.test.ts'
    ]

    testFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.log('PASS', `Security test file exists: ${file}`)
      } else {
        this.log('MEDIUM', `Missing security test file: ${file}`)
      }
    })
  }

  // Check environment configuration
  checkEnvironmentConfig() {
    console.log('\n🔍 Checking Environment Configuration...')
    
    const envExample = this.readFile('.env.example')
    const envLocal = this.readFile('.env.local')

    if (!envExample) {
      this.log('MEDIUM', 'Missing .env.example file')
    } else {
      this.log('PASS', '.env.example file exists')
    }

    // Check for required environment variables
    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'DATABASE_URL',
      'REDIS_URL'
    ]

    const securityEnvVars = [
      'CSRF_SECRET',
      'SECURITY_WEBHOOK_URL',
      'MONITORING_API_KEY'
    ]

    if (envLocal) {
      requiredEnvVars.forEach(envVar => {
        if (envLocal.includes(envVar)) {
          this.log('PASS', `Environment variable configured: ${envVar}`)
        } else {
          this.log('HIGH', `Missing required environment variable: ${envVar}`)
        }
      })

      securityEnvVars.forEach(envVar => {
        if (envLocal.includes(envVar)) {
          this.log('PASS', `Security environment variable configured: ${envVar}`)
        } else {
          this.log('MEDIUM', `Missing security environment variable: ${envVar}`)
        }
      })
    } else {
      this.log('HIGH', 'Missing .env.local file - environment not configured')
    }
  }

  // Check middleware security implementation
  checkMiddlewareSecurity() {
    console.log('\n🔍 Checking Middleware Security...')
    
    const middleware = this.readFile('middleware.ts')
    if (!middleware) {
      this.log('CRITICAL', 'middleware.ts not found')
      return
    }

    // Check for security imports
    const securityImports = [
      'SecurityHeaders',
      'rateLimiter',
      'csrfProtection',
      'errorHandler'
    ]

    securityImports.forEach(importName => {
      if (middleware.includes(importName)) {
        this.log('PASS', `Middleware includes security component: ${importName}`)
      } else {
        this.log('HIGH', `Middleware missing security component: ${importName}`)
      }
    })

    // Check for security patterns
    const securityPatterns = [
      'applyHeaders',
      'rate.*limit',
      'csrf.*protection',
      'authentication',
      'authorization'
    ]

    securityPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(middleware)) {
        this.log('PASS', `Middleware implements security pattern: ${pattern}`)
      } else {
        this.log('MEDIUM', `Middleware may be missing security pattern: ${pattern}`)
      }
    })
  }

  // Check Next.js configuration
  checkNextJsConfig() {
    console.log('\n🔍 Checking Next.js Configuration...')
    
    const nextConfig = this.readFile('next.config.ts') || this.readFile('next.config.js')
    if (!nextConfig) {
      this.log('MEDIUM', 'next.config file not found')
      return
    }

    // Check for security headers configuration
    if (nextConfig.includes('headers')) {
      this.log('PASS', 'Next.js headers configuration found')
    } else {
      this.log('MEDIUM', 'Next.js headers configuration not found')
    }

    // Check for security-related configurations
    const securityConfigs = [
      'poweredByHeader.*false',
      'compress.*true',
      'generateEtags.*false'
    ]

    securityConfigs.forEach(config => {
      const regex = new RegExp(config, 'i')
      if (regex.test(nextConfig)) {
        this.log('PASS', `Next.js security config found: ${config}`)
      } else {
        this.log('LOW', `Next.js security config not found: ${config}`)
      }
    })
  }

  // Check for common security vulnerabilities in code
  checkCodeSecurity() {
    console.log('\n🔍 Checking Code Security Patterns...')
    
    const srcFiles = this.getAllTsFiles('src')
    
    srcFiles.forEach(file => {
      const content = this.readFile(file)
      if (!content) return

      // Check for dangerous patterns
      const dangerousPatterns = [
        { pattern: /eval\s*\(/, severity: 'CRITICAL', message: 'eval() usage detected' },
        { pattern: /innerHTML\s*=/, severity: 'HIGH', message: 'innerHTML assignment detected' },
        { pattern: /document\.write/, severity: 'HIGH', message: 'document.write usage detected' },
        { pattern: /\$\{.*\}.*query/i, severity: 'HIGH', message: 'Potential SQL injection in template literal' },
        { pattern: /password.*console\.log/i, severity: 'HIGH', message: 'Password logging detected' },
        { pattern: /secret.*console\.log/i, severity: 'HIGH', message: 'Secret logging detected' }
      ]

      dangerousPatterns.forEach(({ pattern, severity, message }) => {
        if (pattern.test(content)) {
          this.log(severity, `${message} in ${file}`)
        }
      })

      // Check for good security patterns
      const goodPatterns = [
        { pattern: /sanitize/i, message: 'Input sanitization found' },
        { pattern: /validate/i, message: 'Input validation found' },
        { pattern: /escape/i, message: 'Output escaping found' },
        { pattern: /helmet/i, message: 'Helmet security middleware found' }
      ]

      goodPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(content)) {
          this.log('PASS', `${message} in ${file}`)
        }
      })
    })
  }

  // Get all TypeScript files in a directory
  getAllTsFiles(dir) {
    const files = []
    
    try {
      const items = fs.readdirSync(path.join(process.cwd(), dir))
      
      items.forEach(item => {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(path.join(process.cwd(), fullPath))
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.getAllTsFiles(fullPath))
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath)
        }
      })
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files
  }

  // Check database security
  checkDatabaseSecurity() {
    console.log('\n🔍 Checking Database Security...')
    
    // Check for Drizzle ORM usage (prevents SQL injection)
    const dbFiles = [
      'src/lib/db/schema.ts',
      'src/lib/db/queries.ts',
      'drizzle.config.ts'
    ]

    dbFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.log('PASS', `Database file exists: ${file}`)
        
        const content = this.readFile(file)
        if (content && content.includes('drizzle')) {
          this.log('PASS', `Drizzle ORM usage detected in ${file}`)
        }
      } else {
        this.log('MEDIUM', `Database file missing: ${file}`)
      }
    })

    // Check for raw SQL usage (potential security risk)
    const srcFiles = this.getAllTsFiles('src')
    srcFiles.forEach(file => {
      const content = this.readFile(file)
      if (content) {
        const rawSqlPatterns = [
          /SELECT.*FROM/i,
          /INSERT.*INTO/i,
          /UPDATE.*SET/i,
          /DELETE.*FROM/i
        ]

        rawSqlPatterns.forEach(pattern => {
          if (pattern.test(content) && !content.includes('drizzle')) {
            this.log('HIGH', `Potential raw SQL usage in ${file}`, 
              'Consider using Drizzle ORM for parameterized queries')
          }
        })
      }
    })
  }

  // Generate security report
  generateReport() {
    console.log('\n📊 Security Audit Report')
    console.log('=' .repeat(50))
    
    const total = this.issues.length + this.warnings.length + this.passed.length
    const score = Math.round(((this.passed.length / total) * 100) || 0)
    
    console.log(`\n📈 Security Score: ${score}%`)
    console.log(`✅ Passed: ${this.passed.length}`)
    console.log(`⚠️  Warnings: ${this.warnings.length}`)
    console.log(`❌ Issues: ${this.issues.length}`)
    
    if (this.issues.length > 0) {
      console.log('\n🚨 Critical Issues to Address:')
      this.issues.forEach(issue => {
        console.log(`   • ${issue.message}`)
        if (issue.details) {
          console.log(`     ${issue.details}`)
        }
      })
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings to Consider:')
      this.warnings.forEach(warning => {
        console.log(`   • ${warning.message}`)
        if (warning.details) {
          console.log(`     ${warning.details}`)
        }
      })
    }
    
    console.log('\n📋 Recommendations:')
    
    if (score < 70) {
      console.log('   • Address critical security issues immediately')
      console.log('   • Implement missing security components')
      console.log('   • Review and update security configuration')
    } else if (score < 85) {
      console.log('   • Address remaining security warnings')
      console.log('   • Enhance security monitoring and testing')
      console.log('   • Review security documentation')
    } else {
      console.log('   • Maintain current security posture')
      console.log('   • Regular security audits and updates')
      console.log('   • Consider advanced security features')
    }
    
    console.log('\n🔗 Next Steps:')
    console.log('   • Run security tests: npm test -- src/lib/security/')
    console.log('   • Review SECURITY.md documentation')
    console.log('   • Update dependencies: npm audit fix')
    console.log('   • Schedule regular security audits')
    
    return {
      score,
      total,
      passed: this.passed.length,
      warnings: this.warnings.length,
      issues: this.issues.length,
      details: {
        passed: this.passed,
        warnings: this.warnings,
        issues: this.issues
      }
    }
  }

  // Run complete security audit
  async runAudit() {
    console.log('🔒 New Andalus Security Audit')
    console.log('=' .repeat(50))
    
    this.checkSecurityDependencies()
    this.checkSecurityFiles()
    this.checkEnvironmentConfig()
    this.checkMiddlewareSecurity()
    this.checkNextJsConfig()
    this.checkDatabaseSecurity()
    this.checkCodeSecurity()
    
    return this.generateReport()
  }
}

// Run the audit if this script is executed directly
if (require.main === module) {
  const auditor = new SecurityAuditor()
  auditor.runAudit().then(report => {
    // Exit with error code if there are critical issues
    const exitCode = report.issues > 0 ? 1 : 0
    process.exit(exitCode)
  }).catch(error => {
    console.error('Security audit failed:', error)
    process.exit(1)
  })
}

module.exports = SecurityAuditor