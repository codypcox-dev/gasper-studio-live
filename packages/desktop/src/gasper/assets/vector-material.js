// GASPER-MAT-004 — packaged realm bridge for the pure vector material field.
// This file is deliberately DOM-free: it publishes math and stable identity,
// while all visible writes remain in the FormMaster SVG authority.
(function publishGasperVectorMaterial(global) {
  const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
  const finite=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const hash01=(seed,index)=>{let value=(seed^Math.imul(index+1,0x45d9f3b))>>>0;value=Math.imul(value^(value>>>16),0x45d9f3b)>>>0;value=Math.imul(value^(value>>>16),0x45d9f3b)>>>0;return(value^(value>>>16))/0xffffffff;};
  const featureManifest=global.__GASPER_MATERIAL_FEATURE_MANIFEST__;
  const manifestFeatures=(key,fallback)=>Object.freeze((featureManifest&&Array.isArray(featureManifest[key])?featureManifest[key]:fallback).map(Object.freeze));
  // Fallback mirrors vector-material-manifest.json literally (the authored
  // anchors are not a closed-form golden-ratio series; parity is asserted by
  // gasper-vector-material.test.ts with and without the manifest installed).
  const flecks=manifestFeatures('cosmicFlecks',[
    {id:'fleck-01',u:0,radial:.42,depth:-.28,phase:0,frequency:.11},
    {id:'fleck-02',u:.61803399,radial:.515,depth:-.19,phase:1.731,frequency:.127},
    {id:'fleck-03',u:.23606798,radial:.61,depth:-.1,phase:3.462,frequency:.144},
    {id:'fleck-04',u:.85410197,radial:.705,depth:-.01,phase:5.193,frequency:.161},
    {id:'fleck-05',u:.47213596,radial:.8,depth:.08,phase:6.924,frequency:.178},
    {id:'fleck-06',u:.09016994,radial:.42,depth:.17,phase:8.655,frequency:.11},
    {id:'fleck-07',u:.70820393,radial:.515,depth:.26,phase:10.386,frequency:.127},
    {id:'fleck-08',u:.32623792,radial:.61,depth:-.28,phase:12.117,frequency:.144},
    {id:'fleck-09',u:.94427191,radial:.705,depth:-.19,phase:13.848,frequency:.161},
    {id:'fleck-10',u:.5623059,radial:.8,depth:-.1,phase:15.579,frequency:.178},
    {id:'fleck-11',u:.18033989,radial:.42,depth:-.01,phase:17.31,frequency:.11},
    {id:'fleck-12',u:.79837388,radial:.515,depth:.08,phase:19.041,frequency:.127},
    {id:'fleck-13',u:.41640787,radial:.61,depth:.17,phase:20.772,frequency:.144},
    {id:'fleck-14',u:.03444185,radial:.705,depth:.26,phase:22.503,frequency:.161},
    {id:'fleck-15',u:.65247584,radial:.8,depth:-.28,phase:24.234,frequency:.178},
    {id:'fleck-16',u:.27050983,radial:.42,depth:-.19,phase:25.965,frequency:.11},
    {id:'fleck-17',u:.88854382,radial:.515,depth:-.1,phase:27.696,frequency:.127},
    {id:'fleck-18',u:.50657781,radial:.61,depth:-.01,phase:29.427,frequency:.144},
    {id:'fleck-19',u:.1246118,radial:.705,depth:.08,phase:31.158,frequency:.161},
    {id:'fleck-20',u:.74264579,radial:.8,depth:.17,phase:32.889,frequency:.178},
    {id:'fleck-21',u:.36067978,radial:.42,depth:.26,phase:34.62,frequency:.11},
    {id:'fleck-22',u:.97871376,radial:.515,depth:-.28,phase:36.351,frequency:.127},
    {id:'fleck-23',u:.59674775,radial:.61,depth:-.19,phase:38.082,frequency:.144},
    {id:'fleck-24',u:.21478174,radial:.705,depth:-.1,phase:39.813,frequency:.161},
  ]);
  const streaks=manifestFeatures('cosmicStreaks',[
    {id:'cosmic-streak-01',u:.14,radial:.58,depth:-.12,phase:.4,frequency:.09},
    {id:'cosmic-streak-02',u:.37,radial:.66,depth:-.08,phase:1.55,frequency:.11},
    {id:'cosmic-streak-03',u:.61,radial:.52,depth:-.16,phase:2.7,frequency:.08},
    {id:'cosmic-streak-04',u:.84,radial:.71,depth:-.05,phase:3.95,frequency:.10},
  ]);
  const bands=manifestFeatures('subsurfaceBands',[
    {id:'subsurface-band-01',u:.22,radial:.38,depth:-.24,phase:.2,frequency:.05},
    {id:'subsurface-band-02',u:.50,radial:.46,depth:-.18,phase:1.1,frequency:.06},
    {id:'subsurface-band-03',u:.78,radial:.34,depth:-.28,phase:2.05,frequency:.05},
  ]);
  const highlights=manifestFeatures('hardHighlights',[
    {id:'highlight-nub-left',u:.72,radial:.68,depth:.12,phase:0,frequency:0},
    {id:'highlight-nub-right',u:.28,radial:.68,depth:.12,phase:0,frequency:0},
    {id:'highlight-face-left',u:.58,radial:.48,depth:.18,phase:0,frequency:0},
  ]);
  const meshPoint=(mesh,anchor)=>{
    if(!mesh.length)return{x:120,y:112,depth:anchor.depth,nx:0,ny:-1};
    const sectors=24,rings=Math.max(1,Math.floor(mesh.length/sectors)),rp=clamp(anchor.radial,0,1)*Math.max(0,rings-1),r0=Math.floor(rp),r1=Math.min(rings-1,r0+1),rt=rp-r0,sp=(((anchor.u%1)+1)%1)*sectors,s0=Math.floor(sp)%sectors,s1=(s0+1)%sectors,st=sp-Math.floor(sp);
    const at=(r,s)=>mesh[Math.min(mesh.length-1,r*sectors+s)]||mesh[0];const a=at(r0,s0),b=at(r0,s1),c=at(r1,s0),d=at(r1,s1);const tx0=lerp(a.x,b.x,st),ty0=lerp(a.y,b.y,st),tx1=lerp(c.x,d.x,st),ty1=lerp(c.y,d.y,st);const x=lerp(tx0,tx1,rt),y=lerp(ty0,ty1,rt),depth=lerp(lerp(finite(a.projectedDepth,0),finite(b.projectedDepth,0),st),lerp(finite(c.projectedDepth,0),finite(d.projectedDepth,0),st),rt)+anchor.depth*.15;const vx=d.x-c.x||b.x-a.x,vy=d.y-c.y||b.y-a.y,len=Math.hypot(vx,vy)||1;let nx=-vy/len,ny=vx/len;if(ny>0){nx=-nx;ny=-ny;}return{x,y,depth,nx,ny};
  };
  const linePath=(point,length)=>{const half=length*.5,tx=-point.ny,ty=point.nx;return`M ${(point.x-tx*half).toFixed(2)} ${(point.y-ty*half).toFixed(2)} L ${(point.x+tx*half).toFixed(2)} ${(point.y+ty*half).toFixed(2)}`;};
  const intensity=(point,phase,energy,motion,yaw,material)=>{const m=material||{},keyIntensity=clamp(finite(m.keyIntensity,.58),0,1.5),keyDirection=clamp(finite(m.keyDirection,0),-1,1),rim=clamp(finite(m.rim,.62),0,1.5),pearl=clamp(finite(m.pearl,.72),0,1.5),absorption=clamp(finite(m.absorption,.18),0,1),clearcoat=clamp(finite(m.clearcoat,.42),0,1.5),roughness=clamp(finite(m.roughness,.35),0,1),texture=clamp(finite(m.texture,.56),0,1.5),normalStrength=clamp(finite(m.normalStrength,.58),0,1.5),curvatureResponse=clamp(finite(m.curvatureResponse,.48),0,1.5),pressureGain=clamp(finite(m.pressureGain,0),0,1),reliefGain=clamp(finite(m.reliefGain,0),0,1),facing=clamp(point.nx*(-.55+.18*keyDirection)+point.ny*(-.65+.24*keyDirection)+.22,0,1),depth=.55+.45*Math.tanh(point.depth*1.2),phaseTerm=.5+.5*Math.sin(phase),yawBias=clamp(yaw/45,-1,1)*point.nx*.08,keyGain=.82+.30*keyIntensity,rimGain=.82+.28*rim,pearlGain=.82+.28*pearl,clearcoatGain=.78+.34*clearcoat,roughnessGain=1-.18*roughness,absorptionGain=1-.32*absorption,textureGain=.82+.28*texture,normalGain=.80+.28*normalStrength,curvatureGain=.80+.28*curvatureResponse,pressureGainResponse=1+pressureGain*.12,reliefGainResponse=1+reliefGain*.08;return clamp((facing*.72+phaseTerm*.1+.18)*depth*(.86+energy*.24)*(1+motion*.12+yawBias)*keyGain*rimGain*pearlGain*clearcoatGain*roughnessGain*absorptionGain*textureGain*normalGain*curvatureGain*pressureGainResponse*reliefGainResponse,0,1);};
  function createVectorMaterialState(seed){return{seed:seed|0,previous:new Map(),revision:0};}
  function evaluateVectorMaterialFrame(state,mesh,options){
    const dt=clamp(finite(options&&options.dt,1/60),0,.25),time=finite(options&&options.time,0),energy=clamp(finite(options&&options.energy,.6),0,1),motion=clamp(finite(options&&options.motion,.5),0,1),yaw=finite(options&&options.yaw,0),tau=clamp(finite(options&&options.tau,.18),.03,1.5),material=options&&options.material||{};
    const project=anchor=>{const target=meshPoint(mesh,anchor),phase=anchor.phase+time*anchor.frequency*Math.PI*2,drift=(hash01(state.seed,anchor.id.length)-.5)*.35*motion;target.x+=Math.cos(phase*.73+drift)*.45;target.y+=Math.sin(phase*.61+drift)*.35;const previous=state.previous.get(anchor.id)||target,alpha=1-Math.exp(-dt/tau),point={x:lerp(previous.x,target.x,alpha),y:lerp(previous.y,target.y,alpha),depth:lerp(previous.depth,target.depth,alpha),nx:lerp(previous.nx,target.nx,alpha),ny:lerp(previous.ny,target.ny,alpha)};const nl=Math.hypot(point.nx,point.ny)||1;point.nx/=nl;point.ny/=nl;state.previous.set(anchor.id,point);return{point,phase,light:intensity(point,phase,energy,motion,yaw,material)};};
    const outF=flecks.map((anchor,index)=>{const q=project(anchor),rx=.85+.55*q.light+(index%3)*.12;return{id:anchor.id,x:q.point.x,y:q.point.y,rx,ry:rx*(.72+.18*((index%5)/5)),opacity:clamp(.32+.48*q.light,.32,.85),fill:anchor.u>.15&&anchor.u<.55?'#78fff0':'#efc8ff',rotation:(q.phase*18)%70-35,depth:q.point.depth};});
    const outS=streaks.map((anchor,index)=>{const q=project(anchor);return{id:anchor.id,d:linePath(q.point,10+index*2.4+4*q.light),opacity:clamp(.10+.28*q.light,.10,.55),strokeWidth:2.2+index*.65,depth:q.point.depth};});
    const base=[.05,.07,.09],outB=bands.map((anchor,index)=>{const q=project(anchor),rx=14+index*3.5+6*q.point.depth;return{id:anchor.id,cx:q.point.x,cy:q.point.y,rx,ry:rx*(.55+.08*index),opacity:clamp(base[index]*(.55+.9*q.light),.05,.18),depth:q.point.depth};});
    const outH=highlights.map(anchor=>{const q=project(anchor);return{id:anchor.id,x:q.point.x,y:q.point.y,opacity:clamp(.42+.42*q.light,.42,1),depth:q.point.depth};});
    state.revision+=1;return Object.freeze({packet:'GASPER-MAT-004',revision:state.revision,flecks:Object.freeze(outF),streaks:Object.freeze(outS),subsurfaceBands:Object.freeze(outB),highlights:Object.freeze(outH)});
  }
  const existing=global.__GASPER_VECTOR_MATERIAL__;
  if(existing&&existing.packet!=='GASPER-MAT-004')throw new Error('Gasper vector-material protocol collision');
  global.__GASPER_VECTOR_MATERIAL__=Object.freeze({version:'1',packet:'GASPER-MAT-004',coordinateSpace:'material',createVectorMaterialState,evaluateVectorMaterialFrame,features:Object.freeze({cosmicFlecks:flecks,cosmicStreaks:streaks,subsurfaceBands:bands,hardHighlights:highlights})});
})(globalThis);
