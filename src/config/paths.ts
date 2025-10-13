import path from 'path';

const root = path.resolve(process.env.VIBEFLOW_ROOT ?? process.cwd());

export const directories = {
  root,
  dataState: path.join(root, 'data', 'state'),
  dataMetrics: path.join(root, 'data', 'metrics'),
  docsState: path.join(root, 'docs', 'state'),
  visualReports: path.join(root, 'docs', 'reports', 'visual'),
  tasksQueue: path.join(root, 'data', 'tasks', 'queued'),
  tasksInProgress: path.join(root, 'data', 'tasks', 'in-progress'),
  testQueue: path.join(root, 'data', 'tasks', 'tests', 'queued'),
  testInProgress: path.join(root, 'data', 'tasks', 'tests', 'in-progress')
};

export const files = {
  assignmentLog: path.join(directories.dataState, 'assignment.log.json'),
  supervisorLog: path.join(directories.dataState, 'supervisor.log.json')
};

export function resolveInRoot(...segments: string[]): string {
  return path.join(root, ...segments);
}

