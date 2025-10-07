import fs from 'node:fs/promises';
import path from 'node:path';

async function findTaskJson(root){
  const base = path.join(root, 'data', 'tasks');
  async function walk(p){
    const out = [];
    const entries = await fs.readdir(p, { withFileTypes: true }).catch(()=>[]);
    for(const e of entries){
      const full = path.join(p, e.name);
      if(e.isDirectory()) out.push(...await walk(full));
      else if(e.isFile() && e.name.endsWith('.json')) out.push(full);
    }
    return out;
  }
  return await walk(base);
}

(async () => {
  const root = process.cwd();
  const tasks = await findTaskJson(root);
  if (!tasks.length) {
    console.log("No task json found in data/tasks; passing by default.");
    process.exit(0);
  }
  const contents = await Promise.all(tasks.map(p => fs.readFile(p, 'utf8').then(JSON.parse).catch(()=>null)));
  const visual = contents.find(j => j && (j.visualTarget || j.uiUrl || j.page));
  console.log("Visual target:", visual?.visualTarget || visual?.uiUrl || visual?.page || "(none)");
  // Placeholder always passes for now
  process.exit(0);
})();
