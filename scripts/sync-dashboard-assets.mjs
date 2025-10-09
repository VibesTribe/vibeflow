// Copy machine-readable state into docs/state/ for Pages
import fs from "node:fs/promises";
import path from "node:path";
const ROOT=process.cwd();
const COPY=[
  {src:path.join(ROOT,"data","state","openspec.index.json"),dst:path.join(ROOT,"docs","state","openspec.index.json")},
  {src:path.join(ROOT,"data","state","task.state.json"),dst:path.join(ROOT,"docs","state","task.state.json")}
];
async function cp(src,dst){
  try{const b=await fs.readFile(src);await fs.mkdir(path.dirname(dst),{recursive:true});await fs.writeFile(dst,b);
      console.log("Copied",path.relative(ROOT,src),"→",path.relative(ROOT,dst))}
  catch(e){console.warn("Skip copy:",path.relative(ROOT,src))}
}
for(const {src,dst} of COPY){await cp(src,dst);}
