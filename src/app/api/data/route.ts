import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  try {
    const data = await dataStore.loadData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;
    
    if (!data) {
      return NextResponse.json({ error: "Data required" }, { status: 400 });
    }
    
    const result = await dataStore.saveData(data);
    
    if (!result.success) {
      return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
