import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/session-manager";
import { dataStore } from "@/lib/data-store";

// Middleware to check authentication
async function authenticateRequest(request: NextRequest) {
  const session = sessionManager.getSessionFromRequest(request);
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { session } = auth;
    const data = await dataStore.loadUserData(session.userId);
    
    return NextResponse.json({
      currentSession: data.currentSession || null,
    });
  } catch (error) {
    console.error("Failed to load current session:", error);
    return NextResponse.json({ error: "Failed to load current session" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { session } = auth;
    const body = await request.json();
    const { currentSession } = body;
    
    // Load current data
    const currentData = await dataStore.loadUserData(session.userId);
    
    // Update with current session (including timer state)
    const updatedData = {
      ...currentData,
      currentSession: currentSession || null,
    };
    
    // Save updated data - get version from dataStore
    const version = await dataStore.getDataVersion(session.userId);
    const result = await dataStore.saveUserData(
      session.userId, 
      updatedData, 
      `current-session-${Date.now()}`, 
      version || 0
    );
    
    if (!result.success) {
      return NextResponse.json({ error: "Failed to save current session" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      version: result.version 
    });
  } catch (error) {
    console.error("Failed to save current session:", error);
    return NextResponse.json({ error: "Failed to save current session" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { session } = auth;
    
    // Load current data
    const currentData = await dataStore.loadUserData(session.userId);
    
    // Remove current session
    const updatedData = {
      ...currentData,
      currentSession: undefined,
    };
    
    // Save updated data - get version from dataStore
    const version = await dataStore.getDataVersion(session.userId);
    const result = await dataStore.saveUserData(
      session.userId, 
      updatedData, 
      `clear-session-${Date.now()}`, 
      version || 0
    );
    
    if (!result.success) {
      return NextResponse.json({ error: "Failed to clear current session" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      version: result.version 
    });
  } catch (error) {
    console.error("Failed to clear current session:", error);
    return NextResponse.json({ error: "Failed to clear current session" }, { status: 500 });
  }
}
