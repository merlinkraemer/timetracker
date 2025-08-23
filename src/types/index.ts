export interface Session {
  id: string;
  start: string;
  end?: string;
  project: string;
  description: string;
  cashedOut?: boolean; // Whether this session has been cashed out
}

export interface TimeTrackerData {
  sessions: Session[];
  projects: string[];
  currentSession?: Session;
}

export interface CurrentSession {
  start: Date;
  project: string;
  description: string;
  elapsed: number;
}
