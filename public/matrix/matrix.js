// One shared Tree geometry; Seraph's locations and stories belong to the Living Iron house.
// Hover is CSS-only and never rewrites the detail panel, so the Tree cannot jump.
const SVG = 'http://www.w3.org/2000/svg';
const map = document.getElementById('matrix-tree');
const details = {
  type: document.getElementById('matrix-detail-type'),
  title: document.getElementById('matrix-detail-title'),
  copy: document.getElementById('matrix-detail-description')
};
const shortNames = {
  kether:'HORIZON',chokmah:'SPARK',binah:'MEMORY',
  chesed:'MERCY',gevurah:'BOUNDARY',tiphereth:'THE FORGE',
  netzach:'WILD CIRCUIT',hod:'WITNESSES',
  yesod:'CONTACT',malkuth:'THRESHOLD'
};
const svg = (tag,attributes={})=>{
  const el = document.createElementNS(SVG,tag);
  for(const [name,value] of Object.entries(attributes))el.setAttribute(name,String(value));
  return el;
};

async function buildTree(){
  const response = await fetch('/matrix/tree.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Tree data unavailable');
  const tree = await response.json();
  if(tree.stations.length!==10||tree.paths.length!==22)throw new Error('Invalid Tree data');
  const stations = new Map(tree.stations.map(station=>[station.id,station]));
  const edges = new Map(tree.paths.map(path=>[path.n,path]));
  const stationEls = new Map();
  const pathEls = new Map();
  let current = {kind:'station',id:'malkuth'};
  map.replaceChildren();
  map.append(
    svg('ellipse',{cx:450,cy:530,rx:345,ry:505,class:'matrix-orbit'}),
    svg('ellipse',{cx:450,cy:530,rx:302,ry:450,class:'matrix-orbit'})
  );

  function paint(){
    for(const [n,el] of pathEls){
      const edge=edges.get(n);
      el.classList.toggle('is-selected',current.kind==='path'?current.id===n:edge.from===current.id||edge.to===current.id);
    }
    for(const [id,el] of stationEls){
      const edge=current.kind==='path'?edges.get(current.id):null;
      el.classList.toggle('is-selected',current.kind==='station'&&current.id===id);
      el.classList.toggle('is-related',!!edge&&(edge.from===id||edge.to===id));
    }
  }
  function choose(kind,id){
    current={kind,id};
    if(kind==='station'){
      const s=stations.get(id);
      details.type.textContent=s.sefirah.toUpperCase()+' · PROPOSED ROOM';
      details.title.textContent=s.title;
      details.copy.textContent=s.summary;
    }else{
      const path=edges.get(id);
      details.type.textContent='PATH '+id+' · UNWRITTEN CROSSING';
      details.title.textContent=stations.get(path.from).title+' ↔ '+stations.get(path.to).title;
      details.copy.textContent='One of the twenty-two shared Tree connections. Its story, choice, and passage rules have not been written. Exploring the map does not grant passage.';
    }
    paint();
  }
  function selectable(group,kind,id){
    const pick=()=>choose(kind,id);
    group.addEventListener('click',pick);
    group.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}
    });
  }

  for(const edge of tree.paths){
    const from=stations.get(edge.from),to=stations.get(edge.to);
    if(!from||!to)throw new Error('Unknown Tree endpoint');
    const group=svg('g',{class:'matrix-path',role:'button',tabindex:0,
      'aria-label':'Path '+edge.n+', '+from.title+' to '+to.title+', not yet written'});
    group.append(
      svg('line',{class:'matrix-path-visible',x1:from.x,y1:from.y,x2:to.x,y2:to.y}),
      svg('line',{class:'matrix-path-hit',x1:from.x,y1:from.y,x2:to.x,y2:to.y})
    );
    selectable(group,'path',edge.n);
    pathEls.set(edge.n,group);map.append(group);
  }
  for(const s of tree.stations){
    const group=svg('g',{class:'matrix-node'+(s.id==='tiphereth'?' is-forge':''),role:'button',tabindex:0,
      'aria-label':s.sefirah+': '+s.title+', proposed world'});
    group.append(
      svg('circle',{class:'matrix-node-orbit',cx:s.x,cy:s.y,r:64}),
      svg('circle',{class:'matrix-node-body',cx:s.x,cy:s.y,r:49})
    );
    const number=svg('text',{class:'matrix-node-digit',x:s.x,y:s.y+11});
    number.textContent=s.n;
    const label=svg('text',{class:'matrix-node-label',x:s.x,y:s.y+86});
    label.textContent=shortNames[s.id]||s.sefirah.toUpperCase();
    group.append(number,label);
    selectable(group,'station',s.id);
    stationEls.set(s.id,group);map.append(group);
  }
  choose('station','malkuth');
  document.getElementById('begin-matrix').addEventListener('click',()=>{
    choose('station','malkuth');
    requestAnimationFrame(()=>stationEls.get('malkuth')?.focus({preventScroll:true}));
  });
}

buildTree().catch(()=>{
  map.replaceChildren();
  const message=svg('text',{x:450,y:500,'text-anchor':'middle',fill:'#ece7dc'});
  message.textContent='The Forge is quiet. Please return shortly.';
  map.append(message);
});
