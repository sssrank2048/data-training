import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const privateRoot=path.resolve('data/private');
const localFiles=new Set(['inspected-data.json','air-france-mirror.xls']);
const port=Number(process.env.PORT||4317);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.xls':'application/vnd.ms-excel'};
http.createServer(async(req,res)=>{
  try{
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end();return}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const localName=name.startsWith('/__local/')?name.slice('/__local/'.length):null;
    if(localName!==null&&!localFiles.has(localName))throw Error('Not found');
    const file=localName?path.join(privateRoot,localName):path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!localName&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
    if(!(await stat(file)).isFile())throw Error('Not found');
    let body=await readFile(file);
    if(file===path.join(root,'index.html')){
      const available=await Promise.all([...localFiles].map(f=>stat(path.join(privateRoot,f)).then(s=>s.isFile()).catch(()=>false)));
      if(available.every(Boolean))body=Buffer.from(body.toString().replace('</head>','<meta name="local-case" content="available"></head>'));
    }
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log(`Air France course: http://127.0.0.1:${port}`));
