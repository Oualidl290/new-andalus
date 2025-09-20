import { SecurityEvent } from './validation'

export interface SecurityAlert {
  id: string
  type: 'security_event' | 'rate_limit' | 'authentication' | 'file_upload' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: Date
  source: {
    ip?: string
    userAgent?: string
    userId?: string
    endpoint?: string
  }
  details: Record<string, any>
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

export interface SecurityMetrics {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  recentEvents: SecurityEvent[]
  alertsGenerated: number
  topSourceIPs: Array<{ ip: string; count: number }>
  suspiciousActivities: number
  blockedRequests: number
}

export class SecurityMonitor {
  private events: SecurityEvent[] = []
  private alerts: SecurityAlert[] = []
  private maxEvents = 10000 // Keep last 10k events in memory
  private maxAlerts = 1000 // Keep last 1k alerts in memory

  // Thresholds for generating alerts
  private alertThresholds = {
    failedLogins: { count: 5, window: 15 * 60 * 1000 }, // 5 failed logins in 15 minutes
    suspiciousActivity: { count: 10, window: 60 * 60 * 1000 }, // 10 suspicious activities in 1 hour
    adminActions: { count: 50, window: 60 * 60 * 1000 }, // 50 admin actions in 1 hour
    fileUploads: { count: 100, window: 60 * 60 * 1000 }, // 100 file uploads in 1 hour
  }

  /**
   * Log a security event
   */
  logEvent(event: SecurityEvent): void {
    const eventWithTimestamp = {
      ...event,
      timestamp: new Date(),
      id: this.generateId(),
    }

    this.events.push(eventWithTimestamp)

    // Keep only recent events to prevent memory issues
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Check if this event should trigger an alert
    this.checkForAlerts(eventWithTimestamp)

    // Log to console for debugging
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn('Security event:', eventWithTimestamp)
    }
  }

  /**
   * Generate an alert based on security events
   */
  private checkForAlerts(event: SecurityEvent): void {
    const now = Date.now()

    // Check for failed login attempts
    if (event.type === 'login_failure') {
      const recentFailures = this.events.filter(e => 
        e.type === 'login_failure' &&
        e.ip === event.ip &&
        now - new Date(e.timestamp || 0).getTime() < this.alertThresholds.failedLogins.window
      )

      if (recentFailures.length >= this.alertThresholds.failedLogins.count) {
        this.generateAlert({
          type: 'authentication',
          severity: 'high',
          title: 'Multiple Failed Login Attempts',
          description: `${recentFailures.length} failed login attempts from IP ${event.ip}`,
          source: {
            ip: event.ip,
            userAgent: event.userAgent,
          },
          details: {
            failureCount: recentFailures.length,
            timeWindow: this.alertThresholds.failedLogins.window,
            events: recentFailures.slice(-5), // Last 5 events
          },
        })
      }
    }

    // Check for suspicious activity
    if (event.type === 'suspicious_activity') {
      const recentSuspicious = this.events.filter(e => 
        e.type === 'suspicious_activity' &&
        e.ip === event.ip &&
        now - new Date(e.timestamp || 0).getTime() < this.alertThresholds.suspiciousActivity.window
      )

      if (recentSuspicious.length >= this.alertThresholds.suspiciousActivity.count) {
        this.generateAlert({
          type: 'suspicious_activity',
          severity: 'critical',
          title: 'Suspicious Activity Pattern Detected',
          description: `${recentSuspicious.length} suspicious activities from IP ${event.ip}`,
          source: {
            ip: event.ip,
            userAgent: event.userAgent,
          },
          details: {
            activityCount: recentSuspicious.length,
            timeWindow: this.alertThresholds.suspiciousActivity.window,
            events: recentSuspicious.slice(-5),
          },
        })
      }
    }

    // Check for excessive admin actions
    if (event.type === 'admin_action' && event.userId) {
      const recentAdminActions = this.events.filter(e => 
        e.type === 'admin_action' &&
        e.userId === event.userId &&
        now - new Date(e.timestamp || 0).getTime() < this.alertThresholds.adminActions.window
      )

      if (recentAdminActions.length >= this.alertThresholds.adminActions.count) {
        this.generateAlert({
          type: 'security_event',
          severity: 'medium',
          title: 'Excessive Admin Activity',
          description: `${recentAdminActions.length} admin actions by user ${event.userId}`,
          source: {
            userId: event.userId,
            ip: event.ip,
          },
          details: {
            actionCount: recentAdminActions.length,
            timeWindow: this.alertThresholds.adminActions.window,
            events: recentAdminActions.slice(-10),
          },
        })
      }
    }

    // Check for excessive file uploads
    if (event.type === 'file_upload') {
      const recentUploads = this.events.filter(e => 
        e.type === 'file_upload' &&
        e.ip === event.ip &&
        now - new Date(e.timestamp || 0).getTime() < this.alertThresholds.fileUploads.window
      )

      if (recentUploads.length >= this.alertThresholds.fileUploads.count) {
        this.generateAlert({
          type: 'file_upload',
          severity: 'medium',
          title: 'Excessive File Upload Activity',
          description: `${recentUploads.length} file uploads from IP ${event.ip}`,
          source: {
            ip: event.ip,
            userAgent: event.userAgent,
          },
          details: {
            uploadCount: recentUploads.length,
            timeWindow: this.alertThresholds.fileUploads.window,
          },
        })
      }
    }
  }

  /**
   * Generate a security alert
   */
  private generateAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: SecurityAlert = {
      ...alertData,
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
    }

    this.alerts.push(alert)

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts)
    }

    // Send alert to external systems
    this.sendAlert(alert)

    console.error('Security alert generated:', alert)
  }

  /**
   * Send alert to external systems
   */
  private async sendAlert(alert: SecurityAlert): Promise<void> {
    try {
      // In a real implementation, you would send alerts to:
      // - Email notifications
      // - Slack/Discord webhooks
      // - Security information and event management (SIEM) systems
      // - Push notifications
      // - SMS alerts for critical issues

      if (alert.severity === 'critical') {
        // Send immediate notification for critical alerts
        await this.sendCriticalAlert(alert)
      }

      // Log to external monitoring service
      await this.logToExternalService(alert)
    } catch (error) {
      console.error('Failed to send security alert:', error)
    }
  }

  /**
   * Send critical alert via multiple channels
   */
  private async sendCriticalAlert(alert: SecurityAlert): Promise<void> {
    // This would integrate with your notification systems
    console.error('CRITICAL SECURITY ALERT:', {
      title: alert.title,
      description: alert.description,
      source: alert.source,
      timestamp: alert.timestamp,
    })

    // Example: Send to webhook
    if (process.env.SECURITY_WEBHOOK_URL) {
      try {
        await fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 CRITICAL SECURITY ALERT: ${alert.title}`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Description', value: alert.description, short: false },
                { title: 'Source IP', value: alert.source.ip || 'Unknown', short: true },
                { title: 'Timestamp', value: alert.timestamp.toISOString(), short: true },
              ],
            }],
          }),
        })
      } catch (error) {
        console.error('Failed to send webhook alert:', error)
      }
    }
  }

  /**
   * Log alert to external monitoring service
   */
  private async logToExternalService(alert: SecurityAlert): Promise<void> {
    // This would integrate with services like:
    // - Datadog
    // - New Relic
    // - Splunk
    // - Elastic Security
    // - Custom logging service

    // Example implementation
    if (process.env.MONITORING_API_URL && process.env.MONITORING_API_KEY) {
      try {
        await fetch(process.env.MONITORING_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
          },
          body: JSON.stringify({
            event_type: 'security_alert',
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            source: alert.source,
            details: alert.details,
            timestamp: alert.timestamp.toISOString(),
          }),
        })
      } catch (error) {
        console.error('Failed to log to external service:', error)
      }
    }
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    const now = Date.now()
    const last24Hours = 24 * 60 * 60 * 1000

    // Filter events from last 24 hours
    const recentEvents = this.events.filter(e => 
      now - new Date(e.timestamp || 0).getTime() < last24Hours
    )

    // Count events by type
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const ipCounts: Record<string, number> = {}

    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      
      if (event.ip) {
        ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1
      }
    })

    // Get top source IPs
    const topSourceIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }))

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: recentEvents.slice(-50), // Last 50 events
      alertsGenerated: this.alerts.filter(a => 
        now - a.timestamp.getTime() < last24Hours
      ).length,
      topSourceIPs,
      suspiciousActivities: eventsByType.suspicious_activity || 0,
      blockedRequests: eventsByType.rate_limit || 0,
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50): SecurityAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      alert.resolvedBy = resolvedBy
      return true
    }
    return false
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup old events and alerts
   */
  cleanup(): void {
    const now = Date.now()
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000 // 7 days

    // Remove old events
    this.events = this.events.filter(e => 
      now - new Date(e.timestamp || 0).getTime() < retentionPeriod
    )

    // Remove old resolved alerts
    this.alerts = this.alerts.filter(a => 
      !a.resolved || now - a.timestamp.getTime() < retentionPeriod
    )
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor()

// Cleanup interval for memory management
if (typeof window === 'undefined') {
  setInterval(() => {
    securityMonitor.cleanup()
  }, 60 * 60 * 1000) // Every hour
}

// Helper functions for common security events
export const logSecurityEvent = {
  loginAttempt: (ip: string, userAgent: string, success: boolean, userId?: string) => {
    securityMonitor.logEvent({
      type: success ? 'login_success' : 'login_failure',
      userId,
      ip,
      userAgent,
      severity: success ? 'low' : 'medium',
      details: { success },
    })
  },

  passwordChange: (userId: string, ip: string, userAgent: string) => {
    securityMonitor.logEvent({
      type: 'password_change',
      userId,
      ip,
      userAgent,
      severity: 'medium',
      details: { action: 'password_change' },
    })
  },

  accountLocked: (userId: string, ip: string, reason: string) => {
    securityMonitor.logEvent({
      type: 'account_locked',
      userId,
      ip,
      severity: 'high',
      details: { reason },
    })
  },

  suspiciousActivity: (ip: string, userAgent: string, activity: string, details?: any) => {
    securityMonitor.logEvent({
      type: 'suspicious_activity',
      ip,
      userAgent,
      severity: 'high',
      details: { activity, ...details },
    })
  },

  fileUpload: (userId: string, ip: string, filename: string, size: number, mimeType: string) => {
    securityMonitor.logEvent({
      type: 'file_upload',
      userId,
      ip,
      severity: 'low',
      details: { filename, size, mimeType },
    })
  },

  adminAction: (userId: string, ip: string, action: string, target?: string) => {
    securityMonitor.logEvent({
      type: 'admin_action',
      userId,
      ip,
      severity: 'medium',
      details: { action, target },
    })
  },

  dataExport: (userId: string, ip: string, dataType: string, recordCount: number) => {
    securityMonitor.logEvent({
      type: 'data_export',
      userId,
      ip,
      severity: 'high',
      details: { dataType, recordCount },
    })
  },

  permissionChange: (userId: string, targetUserId: string, ip: string, oldRole: string, newRole: string) => {
    securityMonitor.logEvent({
      type: 'permission_change',
      userId,
      ip,
      severity: 'high',
      details: { targetUserId, oldRole, newRole },
    })
  },
}