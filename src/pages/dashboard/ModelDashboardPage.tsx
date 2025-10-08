import React from 'react';
import { ModelStatusPanel } from '../../components/dashboard/ModelStatusPanel';
import { mockModelStatusData } from '../../mock/modelStatusData';

export default function ModelDashboardPage() {
  return (
    <div className="p-6 min-h-screen bg-neutral-950 text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Model Analytics</h1>
      <ModelStatusPanel fallbackData={mockModelStatusData} />
    </div>
  );
}
