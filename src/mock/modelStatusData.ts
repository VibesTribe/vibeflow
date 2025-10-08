import { ModelStatusRecord } from '../types/ModelStatus';

export const mockModelStatusData: ModelStatusRecord[] = [
  {
    platform: 'gemini-web',
    status: 'healthy',
    severity: 'info',
    last_message: 'Operating normally',
    color: '#2ecc71',
    last_updated: new Date().toISOString(),
    history: []
  },
  {
    platform: 'openrouter',
    status: 'near_limit',
    severity: 'warn',
    last_message: '11/12 rpm used',
    color: '#f1c40f',
    last_updated: new Date().toISOString(),
    history: []
  },
  {
    platform: 'deepseek-api',
    status: 'cooldown',
    severity: 'error',
    last_message: 'Quota exceeded; retry at 01:45 UTC',
    color: '#e74c3c',
    last_updated: new Date().toISOString(),
    cooldown_until: new Date(Date.now() + 3600000).toISOString(),
    history: []
  }
];
