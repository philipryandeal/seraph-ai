'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const matrix = JSON.parse(fs.readFileSync(path.join(root,'public/matrix/tree.json'),'utf8'));
const app = require('../server.js');
const server = http.createServer(app);
let port;
const ready = new Promise(resolve=>server.listen(0,'127.0.0.1',()=>{port=server.address().port;resolve();}));
after(async()=>{await ready;await new Promise(resolve=>server.close(resolve));});
async function get(route, host='seraphnganga.com'){
  await ready;
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:route,method:'GET',headers:{Host:host}},res=>{
      const chunks=[];
      res.on('data',part=>chunks.push(part));
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject);req.end();
  });
}

const sharedEdges = {
11:['chokmah','binah'],12:['chokmah','chesed'],13:['chesed','netzach'],
14:['gevurah','tiphereth'],15:['chokmah','tiphereth'],16:['chesed','tiphereth'],
17:['netzach','hod'],18:['binah','tiphereth'],19:['tiphereth','hod'],
20:['gevurah','hod'],21:['tiphereth','yesod'],22:['chesed','gevurah'],
23:['binah','gevurah'],24:['netzach','yesod'],25:['kether','tiphereth'],
26:['kether','binah'],27:['netzach','tiphereth'],28:['kether','chokmah'],
29:['netzach','malkuth'],30:['hod','yesod'],31:['hod','malkuth'],
32:['yesod','malkuth']
};

test('Ten stations match the shared Tree and have individual stories, not new geometry',()=>{
  assert.equal(matrix.stations.length,10);
  assert.deepEqual(matrix.stations.map(n=>n.id).sort(),[
    'binah','chesed','chokmah','gevurah','hod','kether','malkuth','netzach','tiphereth','yesod']);
  assert.equal(new Set(matrix.stations.map(n=>n.n)).size,10);
  assert.equal(matrix.stations.find(n=>n.id==='tiphereth').title,'The Forge');
  assert.equal(matrix.stations.find(n=>n.id==='malkuth').n,10);
  assert.equal(matrix.stations.find(n=>n.id==='kether').n,1);
  assert.equal(matrix.status,'proposed-world-map');
  for(const n of matrix.stations){
    assert.ok(n.x>=0 && n.x<=900 && n.y>=0 && n.y<=1060);
    assert.equal(n.status,'proposed');
  }
});

test('Twenty-two path numbers use precisely the shared Adam connections',()=>{
  assert.equal(matrix.paths.length,22);
  assert.deepEqual(matrix.paths.map(e=>e.n).sort((a,b)=>a-b),
    Array.from({length:22},(_,i)=>i+11));
  for(const edge of matrix.paths) {
    assert.deepEqual([edge.from,edge.to],sharedEdges[edge.n],String(edge.n));
    assert.equal(edge.status,'unwritten');
  }
});

test('The Seraph homepage has a public link to the Matrix',async()=>{
  const response=await get('/');
  assert.equal(response.status,200);
  assert.match(response.body,/href="\/matrix\/">Play Seraph’s Matrix/);
  assert.match(response.body,/The House of/);
  assert.match(response.headers['content-security-policy'],/script-src 'self'/);
});

test('The public Tree serves a working local script, stylesheet, and tree JSON',async()=>{
  const response=await get('/matrix/');
  assert.equal(response.status,200);
  assert.match(response.body,/Seraph's/);
  assert.match(response.body,/id="matrix-tree"/);
  assert.match(response.body,/src="\/matrix\/matrix.js"/);
  assert.match(response.body,/href="\/matrix\/matrix.css"/);
  assert.match(response.body,/Nothing enters/);
  const js=await get('/matrix/matrix.js');
  assert.equal(js.status,200);
  assert.match(js.headers['content-type'],/javascript/);
  assert.match(js.body,/class:'matrix-path'/);
  assert.doesNotMatch(js.body,/\/matrix\/stations\/|\/matrix\/paths\//);
  const css=await get('/matrix/matrix.css');
  assert.equal(css.status,200);
  assert.match(css.body,/\.matrix-path:is\(:hover,:focus-visible\)/);
  assert.match(css.body,/#e77835/);
  const data=await get('/matrix/tree.json');
  assert.equal(data.status,200);
  assert.equal(JSON.parse(data.body).paths.length,22);
});

test('Ten station shells and twenty-two path shells exist without opening gates',async()=>{
  const publicTree=(await get('/matrix/')).body;
  assert.doesNotMatch(publicTree,/href="\/matrix\/(?:stations|paths)\//);
  for(const station of matrix.stations){
    const r=await get('/matrix/stations/'+station.id);
    assert.equal(r.status,200,station.id);
    assert.equal(r.headers['x-robots-tag'],'noindex, nofollow');
    assert.match(r.body,/name="robots" content="noindex,nofollow"/);
    assert.ok(r.body.includes(station.title),station.id);
    assert.match(r.body,/empty room/);
  }
  for(const edge of matrix.paths){
    const r=await get('/matrix/paths/'+edge.n);
    assert.equal(r.status,200,String(edge.n));
    assert.equal(r.headers['x-robots-tag'],'noindex, nofollow');
    assert.ok(r.body.includes('Path '+edge.n),String(edge.n));
    assert.ok(r.body.includes(matrix.stations.find(n=>n.id===edge.from).title));
    assert.ok(r.body.includes(matrix.stations.find(n=>n.id===edge.to).title));
    assert.match(r.body,/empty room/);
  }
  assert.equal((await get('/matrix/paths/33')).status,404);
  assert.equal((await get('/matrix/stations/daat')).status,404);
  const sitemap=await get('/sitemap.xml');
  assert.doesNotMatch(sitemap.body,/\/matrix\/(?:paths|stations)\//);
});

test('House security policy and canonical domain remain intact',async()=>{
  const redirect=await get('/matrix/?q=1','www.seraphnganga.com');
  assert.equal(redirect.status,301);
  assert.equal(redirect.headers.location,'https://seraphnganga.com/matrix/?q=1');
  const railway=await get('/matrix/','example.up.railway.app');
  assert.equal(railway.status,301);
  assert.equal(railway.headers.location,'https://seraphnganga.com/matrix/');
  const r=await get('/matrix/');
  assert.equal(r.headers['x-frame-options'],'DENY');
  assert.equal(r.headers['x-content-type-options'],'nosniff');
  assert.match(r.headers['content-security-policy'],/frame-ancestors 'none'/);
  assert.doesNotMatch(r.headers['content-security-policy'],/unsafe-inline|unsafe-eval/);
});
