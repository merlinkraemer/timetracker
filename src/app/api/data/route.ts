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
    const version = await dataStore.getDataVersion(session.userId);
    const activeClients = await dataStore.getActiveClients(session.userId);
    
    return NextResponse.json({
      ...data,
      _version: version,
      _activeClients: activeClients.length,
    });
      } catch {
      return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
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
    const { data, expectedVersion, clientId } = body;
    
    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }
    
    const result = await dataStore.saveUserData(
      session.userId, 
      data, 
      clientId, 
      expectedVersion
    );
    
    if (result.conflict) {
      // Data conflict - return current data so client can resolve
      const currentData = await dataStore.loadUserData(session.userId);
      
      return NextResponse.json({
        error: "Data conflict - data has been modified by another client",
        currentData: { ...currentData, _version: result.version },
        expectedVersion,
        actualVersion: result.version,
      }, { status: 409 });
    }
    
    if (!result.success) {
      return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      version: result.version 
    });
      } catch {
      return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
}

// Get data version and active clients count
export async function HEAD(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return new NextResponse(null, { status: auth.status });
    }

    const { session } = auth;
    const version = await dataStore.getDataVersion(session.userId);
    const activeClients = await dataStore.getActiveClients(session.userId);
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Data-Version': version.toString(),
        'X-Active-Clients': activeClients.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
      } catch {
      return new NextResponse(null, { status: 500 });
    }
}
