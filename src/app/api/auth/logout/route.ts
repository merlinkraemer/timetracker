import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/session-manager';

export async function POST(request: NextRequest) {
  try {
    const session = sessionManager.getSessionFromRequest(request);
    
    if (session) {
      sessionManager.invalidateSession(session.id);
    }
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logout successful' 
    });
    
    // Clear session cookie
    response.headers.set('Set-Cookie', sessionManager.clearSessionCookie());
    
    return response;
      } catch {
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
}
