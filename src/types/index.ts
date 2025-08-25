export interface Session {
  id: string;
  start: string;
  end?: string;
  project: string; // This will store the project name
  description: string;
  cashedOut?: boolean; // Whether this session has been cashed out
}

export interface Project {
  name: string;
  color: string;
}

export interface TimeTrackerData {
  sessions: Session[];
  projects: Project[];
}

export interface CurrentSession {
  start: Date;
  project: string;
  description: string;
  elapsed: number;
}
