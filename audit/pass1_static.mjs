import {readdirSync,readFileSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {join,resolve,dirname,relative,extname} from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';
const root=process.cwd(),out=join(root,'audit');
const scan=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(x=>{
 if(x.name==='node_modules'||x.name==='.git'||x.name==='dist'||x.name==='browser')return [];
 const path=join(dir,x.name);
 return x.isDirectory()?scan(path):[path];
});
const files=scan(join(root,'src'));
const jsFiles=files.filter(f=>/\.(?:js|mjs|cjs|ts|tsx)$/.test(f));
const cssFiles=files.filter(f=>/\.css$/.test(f));
const result={generated:new Date().toISOString(),jsFiles:jsFiles.length,cssFiles:cssFiles.length,
 jsErrors:[],cssErrors:[],missingRelativeImports:[],unreferencedAssets:[],staticCodePaths:0,cssRules:0};
const rx=/\b(?:import|export)\s*(?:[\s\S]*?from\s*)?['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
for(const path of jsFiles){
 const source=readFileSync(path,'utf8');
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
 for(const diag of ast.parseDiagnostics||[]){
  const pos=ast.getLineAndCharacterOfPosition(diag.start??0);
  result.jsErrors.push({file:relative(root,path),line:pos.line+1,message:ts.flattenDiagnosticMessageText(diag.messageText,' ')});
 }
 const importRx=/(?:import|export)\s+(?:[^;'"]*?\bfrom\s*)?['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
 for(const m of source.matchAll(importRx)){
  const spec=m[1]||m[2];if(!spec)continue;
  const base=resolve(dirname(path),spec);
  const opts=[base,base+'.js',base+'.json',base+'.css',base+'.mjs',join(base,'index.js')];
  if(!opts.some(existsSync))result.missingRelativeImports.push({file:relative(root,path),import:spec});
 }
 const visit=n=>{if(ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n)||ts.isArrowFunction(n))result.staticCodePaths++;ts.forEachChild(n,visit)};visit(ast);
}
for(const path of cssFiles){
 const source=readFileSync(path,'utf8');
 try{let tree=postcss.parse(source,{from:path});tree.walkRules(()=>result.cssRules++);}
 catch(e){result.cssErrors.push({file:relative(root,path),reason:e.message})}
}
const manifest=join(root,'package.json'),pkg=JSON.parse(readFileSync(manifest,'utf8'));
result.dependencies=Object.keys(pkg.dependencies||{}).length;
result.devDependencies=Object.keys(pkg.devDependencies||{}).length;
result.result=(result.jsErrors.length||result.cssErrors.length||result.missingRelativeImports.length)?'FINDINGS':'STATIC_PARSE_PASS';
writeFileSync(join(out,'PASS1_STATIC_CODE_EVIDENCE.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
