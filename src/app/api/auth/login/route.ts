import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/session-manager';

// Simple single-user authentication
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin'; // In production, use environment variables

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Create session
      const sessionId = sessionManager.createSession('admin');
      
      // Set session cookie
      const response = NextResponse.json({ 
        success: true, 
        message: 'Login successful' 
      });
      
      response.headers.set('Set-Cookie', sessionManager.setSessionCookie(sessionId));
      
      return response;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
