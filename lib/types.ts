// lib/types.ts

export enum ProjectType {
    AN = "AN",
    AS = "AS"
  }
  
  export enum ProjectStatus {
    TENDER = "TENDER",
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    CLOSED = "CLOSED"
  }
  
  export interface Project {
    prjid: string;
    name: string;
    status: ProjectStatus;
  }
  
  export interface Ausschreibung {
    id: number;
    prjid: string;
    version: string | null;
    lot_number: string | null;
    path: string;
  }
  
  export interface Angebot {
    id: number;
    prjid: string;
    version: string | null;
    lot_number: string | null;
    company: string | null;
    path: string;
  }