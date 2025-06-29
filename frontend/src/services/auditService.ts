/**
 * Enterprise Audit Service
 * 
 * This service provides comprehensive audit logging capabilities for the
 * TurboFCL enterprise system, ensuring full traceability and compliance
 * with government audit requirements.
 */

import { v4 as uuidv4 } from 'uuid';
import {
    SecurityClearanceLevel
} from '../types/enterprise';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  operationType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACCESS' | 'EXPORT';
  resourceType: string;
  resourceId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  classification?: SecurityClearanceLevel;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditFilter {
  userId?: string;
  resourceType?: string;
  operationType?: string;
  startDate?: Date;
  endDate?: Date;
  classification?: SecurityClearanceLevel;
  outcome?: 'SUCCESS' | 'FAILURE' | 'WARNING';
  searchText?: string;
}

export interface AuditSearchResult {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

class AuditService {
  private baseUrl: string;
  private sessionId: string;
  private userId?: string;
  private localCache: AuditLogEntry[] = [];
  private maxCacheSize = 1000;
  
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || '/api/v1';
    this.sessionId = uuidv4();
    this.initializeSession();
  }

  private initializeSession(): void {
    // Initialize audit session
    this.logEvent({
      operationType: 'ACCESS',
      resourceType: 'APPLICATION',
      action: 'SESSION_START',
      outcome: 'SUCCESS',
      metadata: {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Set the current user context for audit logging
   */
  setUserContext(userId: string): void {
    this.userId = userId;
    this.logEvent({
      operationType: 'LOGIN',
      resourceType: 'USER',
      resourceId: userId,
      action: 'CONTEXT_SET',
      outcome: 'SUCCESS'
    });
  }

  /**
   * Clear user context (for logout)
   */
  clearUserContext(): void {
    if (this.userId) {
      this.logEvent({
        operationType: 'LOGOUT',
        resourceType: 'USER',
        resourceId: this.userId,
        action: 'CONTEXT_CLEAR',
        outcome: 'SUCCESS'
      });
    }
    this.userId = undefined;
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Partial<AuditLogEntry>): Promise<AuditLogEntry> {
    const auditEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      outcome: 'SUCCESS',
      ...event
    };

    // Add to local cache
    this.addToCache(auditEntry);

    try {
      // Send to backend
      await this.sendToBackend(auditEntry);
      return auditEntry;
    } catch (error) {
      console.error('Failed to send audit log to backend:', error);
      // Still return the entry as it's cached locally
      return auditEntry;
    }
  }

  /**
   * Log a user action
   */
  async logUserAction(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      operationType: 'ACCESS',
      resourceType,
      resourceId,
      action,
      details,
      outcome: 'SUCCESS'
    });
  }

  /**
   * Log a data access event
   */
  async logDataAccess(
    resourceType: string,
    resourceId: string,
    classification?: SecurityClearanceLevel,
    purpose?: string
  ): Promise<void> {
    await this.logEvent({
      operationType: 'READ',
      resourceType,
      resourceId,
      action: 'DATA_ACCESS',
      classification,
      details: { purpose },
      outcome: 'SUCCESS'
    });
  }

  /**
   * Log a data modification event
   */
  async logDataModification(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceType: string,
    resourceId?: string,
    changes?: Record<string, any>,
    classification?: SecurityClearanceLevel
  ): Promise<void> {
    await this.logEvent({
      operationType: operation,
      resourceType,
      resourceId,
      action: `DATA_${operation}`,
      classification,
      details: { changes },
      outcome: 'SUCCESS'
    });
  }

  /**
   * Log an error or security event
   */
  async logSecurityEvent(
    action: string,
    details: Record<string, any>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      operationType: 'ACCESS',
      resourceType: 'SECURITY',
      action,
      details: { ...details, severity },
      outcome: errorMessage ? 'FAILURE' : 'WARNING',
      errorMessage
    });
  }

  /**
   * Log compliance-related events
   */
  async logComplianceEvent(
    complianceType: string,
    action: string,
    details: Record<string, any>,
    outcome: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS'
  ): Promise<void> {
    await this.logEvent({
      operationType: 'ACCESS',
      resourceType: 'COMPLIANCE',
      action: `${complianceType}_${action}`,
      details,
      outcome
    });
  }

  /**
   * Log export/download events
   */
  async logExportEvent(
    resourceType: string,
    resourceIds: string[],
    format: string,
    classification?: SecurityClearanceLevel,
    purpose?: string
  ): Promise<void> {
    await this.logEvent({
      operationType: 'EXPORT',
      resourceType,
      action: 'DATA_EXPORT',
      classification,
      details: {
        resourceIds,
        format,
        purpose,
        count: resourceIds.length
      },
      outcome: 'SUCCESS'
    });
  }

  /**
   * Search audit logs
   */
  async searchLogs(
    filter: AuditFilter,
    page: number = 1,
    perPage: number = 50
  ): Promise<AuditSearchResult> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...this.buildFilterParams(filter)
      });

      const response = await fetch(`${this.baseUrl}/audit/logs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        logs: data.items || [],
        total: data.total || 0,
        page: data.page || 1,
        perPage: data.per_page || perPage,
        totalPages: data.pages || 1
      };
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      // Return local cache as fallback
      return this.searchLocalCache(filter, page, perPage);
    }
  }

  /**
   * Get audit summary/statistics
   */
  async getAuditSummary(
    startDate: Date,
    endDate: Date,
    groupBy: 'user' | 'resource' | 'operation' | 'day' = 'day'
  ): Promise<Record<string, number>> {
    try {
      const queryParams = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        group_by: groupBy
      });

      const response = await fetch(`${this.baseUrl}/audit/summary?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get audit summary:', error);
      return {};
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs(
    filter: AuditFilter,
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    try {
      // Log the export operation
      await this.logExportEvent(
        'AUDIT_LOGS',
        ['all'],
        format,
        SecurityClearanceLevel.CONFIDENTIAL,
        'Compliance audit export'
      );

      const queryParams = new URLSearchParams({
        format,
        ...this.buildFilterParams(filter)
      });

      const response = await fetch(`${this.baseUrl}/audit/export?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  // Private helper methods

  private addToCache(entry: AuditLogEntry): void {
    this.localCache.unshift(entry);
    if (this.localCache.length > this.maxCacheSize) {
      this.localCache = this.localCache.slice(0, this.maxCacheSize);
    }
  }

  private async sendToBackend(entry: AuditLogEntry): Promise<void> {
    const response = await fetch(`${this.baseUrl}/audit/logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      // In a real application, you might get this from a service
      // For now, return a placeholder
      return 'client-ip';
    } catch {
      return 'unknown';
    }
  }

  private getAuthToken(): string {
    // Get token from localStorage or your auth store
    return localStorage.getItem('authToken') || '';
  }

  private buildFilterParams(filter: AuditFilter): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (filter.userId) params.user_id = filter.userId;
    if (filter.resourceType) params.resource_type = filter.resourceType;
    if (filter.operationType) params.operation_type = filter.operationType;
    if (filter.startDate) params.start_date = filter.startDate.toISOString();
    if (filter.endDate) params.end_date = filter.endDate.toISOString();
    if (filter.classification) params.classification = filter.classification;
    if (filter.outcome) params.outcome = filter.outcome;
    if (filter.searchText) params.search = filter.searchText;

    return params;
  }

  private searchLocalCache(
    filter: AuditFilter,
    page: number,
    perPage: number
  ): AuditSearchResult {
    let filtered = this.localCache;

    // Apply filters
    if (filter.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId);
    }
    if (filter.resourceType) {
      filtered = filtered.filter(log => log.resourceType === filter.resourceType);
    }
    if (filter.operationType) {
      filtered = filtered.filter(log => log.operationType === filter.operationType);
    }
    if (filter.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filter.endDate!);
    }
    if (filter.outcome) {
      filtered = filtered.filter(log => log.outcome === filter.outcome);
    }
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchLower) ||
        log.resourceType.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const logs = filtered.slice(startIndex, endIndex);

    return {
      logs,
      total,
      page,
      perPage,
      totalPages
    };
  }
}

// Export singleton instance
export const auditService = new AuditService();
export default auditService;
