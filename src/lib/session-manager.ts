import { NextRequest } from 'next/server';

export interface UserSession {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    sessionId: string;
  };
}

class SessionManager {
  private static instance: SessionManager;
  private sessions = new Map<string, UserSession>();
  private readonly SESSION_COOKIE = 'timetracker_session';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    // Clean up expired sessions every hour
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  createSession(userId: string): string {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: UserSession = {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  validateSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    
    if (sessionAge > this.SESSION_DURATION) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return session;
  }

  invalidateSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now.getTime() - session.createdAt.getTime();
      if (sessionAge > this.SESSION_DURATION) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get session from request cookies
  getSessionFromRequest(request: NextRequest): UserSession | null {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = this.parseCookies(cookieHeader);
    const sessionId = cookies[this.SESSION_COOKIE];
    
    if (!sessionId) return null;
    return this.validateSession(sessionId);
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }

  // Set session cookie in response
  setSessionCookie(sessionId: string): string {
    return `${this.SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${this.SESSION_DURATION / 1000}`;
  }

  // Clear session cookie
  clearSessionCookie(): string {
    return `${this.SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
  }
}

export const sessionManager = SessionManager.getInstance();
