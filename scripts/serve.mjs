import http from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist'),privateRoot=path.resolve('data/private');
const localFiles=new Set(['inspected-data.json','air-france-mirror.xls','rocketfuel_data.csv']);
const exportNames=new Set(['rocket-fuel-filtered-with-source-rows.csv','rocket-fuel-groups.json','rocket-fuel-team-report.md']);
const port=Number(process.env.PORT||4317);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.xls':'application/vnd.ms-excel','.csv':'text/csv; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end();return;}
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(req.method==='POST'&&name==='/__local/export'){
   if(req.headers.origin!==`http://${req.headers.host}`||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(403);res.end();return;}
   const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>45*1024*1024){res.writeHead(413);res.end('Export too large');return;}chunks.push(chunk);}
   let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{res.writeHead(400);res.end('Invalid JSON');return;}
   if(!exportNames.has(payload.filename)||typeof payload.body!=='string'){res.writeHead(400);res.end('Invalid export');return;}
   const token=randomUUID(),folder=path.join(privateRoot,'exports',token);await mkdir(folder,{recursive:true});await writeFile(path.join(folder,payload.filename),payload.body,{flag:'wx'});
   const result=JSON.stringify({url:`/__exports/${token}/${payload.filename}`,filename:payload.filename});res.writeHead(201,{'Content-Type':types['.json'],'Cache-Control':'no-store'});res.end(result);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let file,attachment=false;
  const exported=name.match(/^\/__exports\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([^/]+)$/);
  if(exported){if(!exportNames.has(exported[2]))throw Error('Not found');file=path.join(privateRoot,'exports',exported[1],exported[2]);attachment=true;}
  else{
   const localName=name.startsWith('/__local/')?name.slice('/__local/'.length):null;
   if(localName!==null&&!localFiles.has(localName))throw Error('Not found');
   file=localName?path.join(privateRoot,localName):path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
   if(!localName&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  }
  if(!(await stat(file)).isFile())throw Error('Not found');let body=await readFile(file);
  if(file===path.join(root,'reference/air-france/index.html')){
   const available=await Promise.all(['inspected-data.json','air-france-mirror.xls'].map(f=>stat(path.join(privateRoot,f)).then(s=>s.isFile()).catch(()=>false)));
   if(available.every(Boolean))body=Buffer.from(body.toString().replace('</head>','<meta name="local-case" content="available"></head>'));
  }
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':body.length};if(attachment)headers['Content-Disposition']=`attachment; filename="${path.basename(file)}"`;
  res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Advertising incrementality course: http://127.0.0.1:${port}/`));
