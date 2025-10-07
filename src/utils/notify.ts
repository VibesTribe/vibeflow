export async function notifyCreditIssue(evt: any){
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const ROOT = process.cwd();
  const dir = path.join(ROOT, 'data', 'events');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `evt-${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(evt, null, 2));
  return file;
}
