import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { TimeTrackerData } from "@/types";

const DATA_FILE = path.join(process.cwd(), "data", "timetracker.json");

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load data from file
async function loadDataFromFile(): Promise<TimeTrackerData> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    // Return default data if file doesn't exist
    return {
      sessions: [],
      projects: [],
      currentSession: undefined,
    };
  }
}

// Save data to file
async function saveDataToFile(data: TimeTrackerData) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await loadDataFromFile();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading data:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: TimeTrackerData = await request.json();
    await saveDataToFile(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving data:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
