export interface ModelStatusRecord {
  platform: string;
  status: 'healthy' | 'near_limit' | 'cooldown';
  severity: 'info' | 'warn' | 'error';
  last_message: string;
  color: string;
  last_updated: string;
  cooldown_until?: string | null;
  history?: {
    status: string;
    severity: string;
    message: string;
    at: string;
  }[];
}
