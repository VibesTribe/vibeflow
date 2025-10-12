export type MaintenancePriority = 'high' | 'medium' | 'low';

export interface DigestItem {
  title: string;
  url?: string;
  summary?: string;
  tags?: string[];
  priority?: MaintenancePriority;
  source?: string;
}

export interface MaintenanceDigestEnvelope {
  source: string;
  imported_at: string;
  digest_path?: string;
  payload: { items?: DigestItem[]; [key: string]: unknown };
}

export interface MaintenanceTask {
  id: string;
  source: string;
  priority: MaintenancePriority;
  title: string;
  summary?: string;
  url?: string;
  tags: string[];
  created_at: string;
}
