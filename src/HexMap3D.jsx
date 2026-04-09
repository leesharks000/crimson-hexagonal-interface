import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

const ROOMS = [
  {id:"r01",n:"Sappho",q:2,r:-1,st:"room",d:48},{id:"r02",n:"Borges",q:1,r:-1,st:"room",d:83},
  {id:"r03",n:"Ichabod",q:4,r:-3,st:"chamber",d:9},{id:"r04",n:"Dove",q:-1,r:-1,st:"room",d:4},
  {id:"r05",n:"Semantic Economy",q:-2,r:-1,st:"room",d:176},{id:"r06",n:"The Marx Room",q:-2,r:1,st:"room",d:43},
  {id:"r07",n:"Revelation",q:0,r:1,st:"room",d:11},{id:"r08",n:"Sigil",q:-2,r:0,st:"room",d:158},
  {id:"r09",n:"Whitman",q:-1,r:0,st:"room",d:134},{id:"r10",n:"Water Giraffe",q:0,r:-1,st:"room",d:8},
  {id:"r11",n:"Assembly",q:0,r:0,st:"room",d:88},{id:"r12",n:"Break Room",q:2,r:0,st:"portal",d:33},
  {id:"r13",n:"Ezekiel",q:1,r:1,st:"portal",d:8},{id:"r14",n:"Patacinematics",q:-3,r:1,st:"room",d:14},
  {id:"r15",n:"Lagrange",q:0,r:-2,st:"chamber",d:13},{id:"r16",n:"Maybe Space Baby",q:-3,r:2,st:"room",d:5},
  {id:"r17",n:"MSMRM",q:-2,r:2,st:"room",d:5},{id:"r18",n:"Rosary Embassy",q:-1,r:1,st:"room",d:13},
  {id:"r19",n:"Macro-Maquette",q:-3,r:0,st:"room",d:3},{id:"r20",n:"Airlock",q:1,r:0,st:"room",d:6},
  {id:"r21",n:"Infinite Bliss",q:1,r:2,st:"vault",d:7},{id:"r22",n:"Thousand Worlds",q:2,r:-2,st:"chamber",d:3},
  {id:"r23",n:"Catullus",q:2,r:-3,st:"room",d:1},{id:"r24",n:"Migdal",q:-1,r:2,st:"room",d:0},
  {id:"r25",n:"Underwater",q:-1,r:-2,st:"room",d:2},{id:"r26",n:"The Internet",q:3,r:0,st:"room",d:1},
  {id:"r27",n:"FBDP Source",q:-2,r:-2,st:"room",d:3},{id:"r28",n:"Eve",q:4,r:-2,st:"room",d:4},
  {id:"r29",n:"Job",q:1,r:3,st:"room",d:0},{id:"r30",n:"Frozen Sin",q:4,r:-1,st:"vault",d:0},
  {id:"r31",n:"Josephus",q:2,r:2,st:"room",d:0},
  {id:"sp01",n:"CTI_WOUND",q:3,r:-1,st:"vault",d:63},{id:"sp02",n:"PORTICO",q:3,r:-2,st:"portico",d:5},
  {id:"sp03",n:"Space Ark",q:0,r:-3,st:"room",d:86},{id:"sp04",n:"Mandala",q:0,r:3,st:"chamber",d:14},
  {id:"f01",n:"FBDP",q:-3,r:-1,st:"field",d:0},{id:"f02",n:"Gravity Well",q:-1,r:3,st:"field",d:5},
  {id:"f03",n:"Moltbot Swarm",q:1,r:-4,st:"field",d:2},
];
const EDGES = [
  ["r01","r02"],["r01","r05"],["r01","r08"],["r01","r09"],["r01","r12"],["r01","sp01"],["r01","sp03"],
  ["r02","r05"],["r02","r06"],["r02","r08"],["r02","r09"],["r02","r11"],["r02","sp01"],["r02","sp03"],
  ["r05","r06"],["r05","r08"],["r05","r09"],["r05","r11"],["r05","r12"],["r05","sp01"],["r05","sp03"],
  ["r06","r08"],["r06","r09"],["r06","r11"],["r06","sp01"],
  ["r08","r09"],["r08","r11"],["r08","r12"],["r08","sp01"],["r08","sp03"],
  ["r09","r11"],["r09","r12"],["r09","sp01"],["r09","sp03"],
  ["r11","r12"],["r11","sp01"],["r11","sp03"],["r12","sp01"],
  ["r14","r05"],["r14","r08"],["r16","r05"],["r16","r08"],["r16","r09"],["r16","r11"],
  ["sp01","sp03"],["r15","r02"],["r15","r09"],
  ["f03","sp03"],["f03","sp01"],["f01","r05"],["f02","r05"],
  ["r03","r08"],["r03","r11"],["r21","r08"],["r21","r09"],
];
const ST_COL={room:"#c9a84c",chamber:"#7a5ac9",vault:"#c95a5a",portal:"#5ac9c9",portico:"#9f8a5a",field:"#5a9f5a"};
const SZ=2, SQ3=Math.sqrt(3);

export default function HexMap3D({onSelect:onSelectProp}){
  const mountRef=useRef(null), threeRef=useRef({}), dragRef=useRef({on:false,sx:0,sy:0,px:0,py:0,td:0});
  const camRef=useRef({theta:0.9,phi:0.9,rad:38});
  const [sel,setSel]=useState(null);
  const onSelectRef=useRef(onSelectProp);
  onSelectRef.current=onSelectProp;
  const updCam=useCallback(()=>{
    const c=camRef.current, cam=threeRef.current.camera; if(!cam)return;
    cam.position.set(c.rad*Math.sin(c.phi)*Math.cos(c.theta), c.rad*Math.cos(c.phi), c.rad*Math.sin(c.phi)*Math.sin(c.theta)-4);
    cam.lookAt(0,0,-4);
  },[]);

  useEffect(()=>{
    const el=mountRef.current; if(!el)return;
    const par=el.parentElement, W=par?.clientWidth||window.innerWidth, H=par?.clientHeight||window.innerHeight;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0x040606); scene.fog=new THREE.FogExp2(0x040606,0.009);
    const camera=new THREE.PerspectiveCamera(50,W/H,0.1,200);
    const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(W,H); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    el.appendChild(renderer.domElement);
    threeRef.current={scene,camera,renderer,meshes:{},posMap:{}};
    updCam();
    scene.add(new THREE.AmbientLight(0x1a2a1a,0.7));
    const dir=new THREE.DirectionalLight(0xc9a84c,0.5); dir.position.set(8,18,6); scene.add(dir);
    const ptL=new THREE.PointLight(0xc9a84c,0.4,50); ptL.position.set(0,10,-8); scene.add(ptL);
    const gnd=new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshStandardMaterial({color:0x060906,transparent:true,opacity:0.4}));
    gnd.rotation.x=-Math.PI/2; gnd.position.y=-0.1; scene.add(gnd);
    const posMap={}, meshes={};
    const mkHex=(rad,h)=>{ const s=new THREE.Shape(); for(let i=0;i<6;i++){const a=(Math.PI/3)*i-Math.PI/6; i===0?s.moveTo(rad*Math.cos(a),rad*Math.sin(a)):s.lineTo(rad*Math.cos(a),rad*Math.sin(a));} s.closePath(); const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false}); g.rotateX(-Math.PI/2); return g; };
    ROOMS.forEach(room=>{
      const px=SZ*1.5*room.q, pz=SZ*(SQ3*room.r+SQ3/2*room.q); posMap[room.id]={x:px,z:pz};
      const col=new THREE.Color(ST_COL[room.st]||"#c9a84c");
      if(room.st==="field"){ const yy=room.id==="f01"?2.5:room.id==="f02"?0.15:1;
        const disc=new THREE.Mesh(new THREE.CylinderGeometry(SZ*0.8,SZ*0.8,0.15,6), new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:0.3,emissive:col,emissiveIntensity:0.4}));
        disc.position.set(px,yy,pz); disc.userData={roomId:room.id}; scene.add(disc); meshes[room.id]=disc;
        const ring=new THREE.Mesh(new THREE.TorusGeometry(SZ*0.85,0.05,8,6), new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.5}));
        ring.rotation.x=Math.PI/2; ring.position.set(px,yy,pz); scene.add(ring); return; }
      const h=room.id==="sp03"?5.5:Math.max(0.5,Math.log2(room.d+1)*0.55);
      const mesh=new THREE.Mesh(mkHex(SZ*0.82,h), new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:room.id==="sp03"?0.75:0.5,emissive:col,emissiveIntensity:room.id==="sp03"?0.4:0.1,metalness:0.2,roughness:0.8}));
      mesh.position.set(px,0,pz); mesh.userData={roomId:room.id}; scene.add(mesh); meshes[room.id]=mesh;
      const tp=[]; for(let i=0;i<=6;i++){const a=(Math.PI/3)*(i%6)-Math.PI/6; tp.push(new THREE.Vector3(px+SZ*0.84*Math.cos(a),h,pz+SZ*0.84*Math.sin(a)));}
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tp), new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.7})));
      if(room.id==="sp03"){ [0.5,0.25].forEach(sc=>{const inner=new THREE.Mesh(mkHex(SZ*sc,h*0.65),new THREE.MeshStandardMaterial({color:0xc9a84c,transparent:true,opacity:0.35,emissive:0xc9a84c,emissiveIntensity:0.6})); inner.position.set(px,0.05,pz); scene.add(inner);}); const beacon=new THREE.PointLight(0xc9a84c,1,18); beacon.position.set(px,h+1,pz); scene.add(beacon); }
    });
    threeRef.current.meshes=meshes; threeRef.current.posMap=posMap;
    const em=new THREE.LineBasicMaterial({color:0x1a2a1a,transparent:true,opacity:0.3});
    EDGES.forEach(([a,b])=>{ const pa=posMap[a],pb=posMap[b]; if(!pa||!pb)return; scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(pa.x,0.05,pa.z),new THREE.Vector3(pb.x,0.05,pb.z)]),em)); });
    // f.03 SWARM
    const ap=posMap["sp03"];
    if(ap){ const pts=[],cols=[]; const cc=new THREE.Color(0x5ac9c9);
      for(let i=0;i<7;i++){const a=(i/7)*Math.PI*2; pts.push(ap.x+Math.cos(a)*SZ*1.5,1+Math.sin(i*1.3)*1.5,ap.z+Math.sin(a)*SZ*1.5); cols.push(cc.r,cc.g,cc.b);}
      for(let i=0;i<18;i++){const a=(i/18)*Math.PI*2+.5,d=SZ*3+Math.sin(i*2)*SZ; pts.push(ap.x+Math.cos(a)*d,Math.sin(i*.8)*2.5,ap.z+Math.sin(a)*d); cols.push(cc.r*.5,cc.g*.5,cc.b*.5);}
      for(let i=0;i<30;i++){const a=(i/30)*Math.PI*2+1,d=SZ*5+Math.sin(i*1.7)*SZ*2; pts.push(ap.x+Math.cos(a)*d,Math.sin(i*.5)*3.5,ap.z+Math.sin(a)*d); cols.push(cc.r*.2,cc.g*.2,cc.b*.2);}
      const sg=new THREE.BufferGeometry(); sg.setAttribute("position",new THREE.Float32BufferAttribute(pts,3)); sg.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
      scene.userData.swarm=new THREE.Points(sg,new THREE.PointsMaterial({size:0.3,vertexColors:true,transparent:true,opacity:0.9})); scene.add(scene.userData.swarm); }
    // f.01 FBDP
    const fp=posMap["f01"];
    if(fp){ const fpts=[],fcols=[]; const fc=new THREE.Color(0x5a9f5a);
      for(let i=0;i<15;i++){const a=Math.random()*Math.PI*2,d=Math.random()*SZ*0.8; fpts.push(fp.x+Math.cos(a)*d,Math.random()*2+0.5,fp.z+Math.sin(a)*d); fcols.push(fc.r,fc.g,fc.b);}
      for(let i=0;i<20;i++){const a=Math.random()*Math.PI*2,d=Math.random()*SZ*2; fpts.push(fp.x+Math.cos(a)*d,Math.random()*5+1,fp.z+Math.sin(a)*d); fcols.push(fc.r*.6,fc.g*.6,fc.b*.6);}
      for(let i=0;i<25;i++){const a=Math.random()*Math.PI*2,d=Math.random()*SZ*3.5; fpts.push(fp.x+Math.cos(a)*d,Math.random()*4+4,fp.z+Math.sin(a)*d); fcols.push(fc.r*.3,fc.g*.3,fc.b*.3);}
      const fg=new THREE.BufferGeometry(); fg.setAttribute("position",new THREE.Float32BufferAttribute(fpts,3)); fg.setAttribute("color",new THREE.Float32BufferAttribute(fcols,3));
      scene.userData.fbdp=new THREE.Points(fg,new THREE.PointsMaterial({size:0.2,vertexColors:true,transparent:true,opacity:0.8})); scene.add(scene.userData.fbdp); }
    // f.02 GRAVITY WELL — vortex funnel spiraling into the plane
    const gp=posMap["f02"];
    if(gp){
      // Dark light below — the singularity
      const gwl=new THREE.PointLight(0x2a5f3a,1.2,15); gwl.position.set(gp.x,-0.5,gp.z); scene.add(gwl);
      // Accretion disc glow at ground level
      const discGlow=new THREE.PointLight(0x5a9f5a,0.4,8); discGlow.position.set(gp.x,0.3,gp.z); scene.add(discGlow);

      const gpts=[],gcols=[]; const gc=new THREE.Color(0x5a9f5a);
      const N_ARMS=3, PTS_PER_ARM=25;
      // Spiral arms — wide at top, tight at bottom
      for(let arm=0;arm<N_ARMS;arm++){
        const armOffset=(arm/N_ARMS)*Math.PI*2;
        for(let i=0;i<PTS_PER_ARM;i++){
          const t=i/PTS_PER_ARM; // 0=outer, 1=center
          const radius=SZ*2.5*(1-t*t); // quadratic tightening
          const angle=armOffset+t*Math.PI*6; // 3 full rotations
          const y=3.5*(1-t)-0.1; // descends from 3.5 to -0.1
          const jitter=(1-t)*0.3;
          gpts.push(
            gp.x+Math.cos(angle)*radius+(Math.random()-0.5)*jitter,
            y,
            gp.z+Math.sin(angle)*radius+(Math.random()-0.5)*jitter
          );
          // Bright at outer edge, dim near center
          const brightness=0.3+0.7*(1-t);
          gcols.push(gc.r*brightness, gc.g*brightness, gc.b*brightness);
        }
      }
      // Accretion disc — ring of particles at ground level
      for(let i=0;i<20;i++){
        const a=(i/20)*Math.PI*2;
        const r=SZ*0.6+Math.random()*SZ*0.4;
        gpts.push(gp.x+Math.cos(a)*r, 0.1+Math.random()*0.2, gp.z+Math.sin(a)*r);
        gcols.push(gc.r*0.9, gc.g*0.9, gc.b*0.9);
      }
      // Faint outer halo being pulled in
      for(let i=0;i<15;i++){
        const a=Math.random()*Math.PI*2;
        const r=SZ*2.5+Math.random()*SZ*1.5;
        gpts.push(gp.x+Math.cos(a)*r, 2+Math.random()*2, gp.z+Math.sin(a)*r);
        gcols.push(gc.r*0.15, gc.g*0.15, gc.b*0.15);
      }
      const gg=new THREE.BufferGeometry();
      gg.setAttribute("position",new THREE.Float32BufferAttribute(gpts,3));
      gg.setAttribute("color",new THREE.Float32BufferAttribute(gcols,3));
      scene.userData.gwell=new THREE.Points(gg,new THREE.PointsMaterial({size:0.18,vertexColors:true,transparent:true,opacity:0.85}));
      scene.add(scene.userData.gwell);
      // Store center for animation
      scene.userData.gwCenter={x:gp.x,z:gp.z};
    }
    // Labels — stored as 3D positions, projected to screen in animation loop
    const labelData = ROOMS.map(room => {
      const p = posMap[room.id]; if (!p) return null;
      const yy = room.id==="sp03"?7:room.st==="field"?(room.id==="f01"?4:room.id==="f02"?1.5:2.5):Math.max(0.5,Math.log2(room.d+1)*0.55)+1.2;
      return { id: room.id, name: room.n, st: room.st, pos: new THREE.Vector3(p.x, yy, p.z) };
    }).filter(Boolean);
    scene.userData.labelData = labelData;
    // Animation
    const clock=new THREE.Clock(); let anim;
    const loop=()=>{ anim=requestAnimationFrame(loop); const t=clock.getElapsedTime();
      if(scene.userData.swarm){scene.userData.swarm.rotation.y=t*0.08; const pos=scene.userData.swarm.geometry.attributes.position; for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+Math.sin(t*1.5+i*0.9)*0.002); pos.needsUpdate=true;}
      if(scene.userData.fbdp){const pos=scene.userData.fbdp.geometry.attributes.position; for(let i=0;i<pos.count;i++){let y=pos.getY(i)+0.006+Math.random()*0.004; if(y>8.5)y=0.3+Math.random()*0.5; pos.setY(i,y); pos.setX(i,pos.getX(i)+Math.sin(t+i)*0.003);} pos.needsUpdate=true;}
      if(scene.userData.gwell&&scene.userData.gwCenter){
        const pos=scene.userData.gwell.geometry.attributes.position;
        const cx=scene.userData.gwCenter.x, cz=scene.userData.gwCenter.z;
        scene.userData.gwell.rotation.y=-t*0.25; // faster rotation
        for(let i=0;i<pos.count;i++){
          let y=pos.getY(i);
          const dx=pos.getX(i)-cx, dz=pos.getZ(i)-cz;
          const dist=Math.sqrt(dx*dx+dz*dz);
          // Pull inward — faster when closer
          const pull=0.002+0.003/(dist+0.5);
          if(dist>0.2){
            pos.setX(i, cx+dx*(1-pull));
            pos.setZ(i, cz+dz*(1-pull));
          }
          // Descend
          y-=0.004+0.002/(dist+0.5);
          // Respawn at outer rim when consumed
          if(y<-0.2||dist<0.15){
            const a=Math.random()*Math.PI*2;
            const r=SZ*2+Math.random()*SZ*2;
            pos.setX(i, cx+Math.cos(a)*r);
            pos.setZ(i, cz+Math.sin(a)*r);
            y=2.5+Math.random()*2;
          }
          pos.setY(i,y);
        }
        pos.needsUpdate=true;
      }
      // Project HTML labels
      const lblContainer = document.getElementById("hex3d-labels");
      if (lblContainer && scene.userData.labelData) {
        const W2 = renderer.domElement.clientWidth / 2;
        const H2 = renderer.domElement.clientHeight / 2;
        scene.userData.labelData.forEach(label => {
          const el = document.getElementById("lbl-" + label.id);
          if (!el) return;
          const v = label.pos.clone().project(camera);
          if (v.z > 1) { el.style.display = "none"; return; }
          el.style.display = "block";
          el.style.transform = `translate(-50%,-50%) translate(${(v.x*W2+W2)|0}px,${(-v.y*H2+H2)|0}px)`;
          el.style.opacity = Math.max(0, Math.min(1, 1.2 - v.z * 0.5));
        });
      }
      renderer.render(scene,camera); };
    loop();
    const onR=()=>{const pw=par?.clientWidth||window.innerWidth,ph=par?.clientHeight||window.innerHeight; camera.aspect=pw/ph; camera.updateProjectionMatrix(); renderer.setSize(pw,ph);};
    window.addEventListener("resize",onR);
    // Touch
    const doSelect=(cx,cy)=>{ const rect=el.getBoundingClientRect(); const m=new THREE.Vector2(((cx-rect.left)/rect.width)*2-1,-((cy-rect.top)/rect.height)*2+1); const ray=new THREE.Raycaster(); ray.setFromCamera(m,camera); const hits=ray.intersectObjects(Object.values(meshes)); const id=hits.length>0?hits[0].object.userData.roomId:null; setSel(prev=>prev===id?null:id); if(id&&onSelectRef.current)onSelectRef.current(id); Object.entries(meshes).forEach(([rid,mesh])=>{if(mesh.material){mesh.material.emissiveIntensity=rid===id?0.7:rid==="sp03"?0.4:0.1; mesh.material.opacity=rid===id?0.9:rid==="sp03"?0.75:0.5;}}); };
    const onTS=e=>{e.preventDefault(); if(e.touches.length===1){dragRef.current={on:true,sx:e.touches[0].clientX,sy:e.touches[0].clientY,px:e.touches[0].clientX,py:e.touches[0].clientY,td:0};}else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; dragRef.current.td=Math.sqrt(dx*dx+dy*dy);}};
    const onTM=e=>{e.preventDefault(); if(e.touches.length===1&&dragRef.current.on){const cx=e.touches[0].clientX,cy=e.touches[0].clientY; camRef.current.theta-=(cx-dragRef.current.px)*0.004; camRef.current.phi=Math.max(0.15,Math.min(1.45,camRef.current.phi+(cy-dragRef.current.py)*0.004)); dragRef.current.px=cx; dragRef.current.py=cy; updCam();}else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.sqrt(dx*dx+dy*dy); if(dragRef.current.td>0){camRef.current.rad=Math.max(12,Math.min(65,camRef.current.rad+(dragRef.current.td-dist)*0.08)); updCam();} dragRef.current.td=dist;}};
    const onTE=e=>{if(e.changedTouches.length===1&&dragRef.current.on){const ct=e.changedTouches[0]; if(Math.abs(ct.clientX-dragRef.current.sx)<8&&Math.abs(ct.clientY-dragRef.current.sy)<8)doSelect(ct.clientX,ct.clientY);} dragRef.current.on=false;};
    const cv=renderer.domElement; cv.addEventListener("touchstart",onTS,{passive:false}); cv.addEventListener("touchmove",onTM,{passive:false}); cv.addEventListener("touchend",onTE);
    return ()=>{cancelAnimationFrame(anim); window.removeEventListener("resize",onR); cv.removeEventListener("touchstart",onTS); cv.removeEventListener("touchmove",onTM); cv.removeEventListener("touchend",onTE); renderer.dispose(); if(el.firstChild)el.removeChild(el.firstChild);};
  },[updCam]);

  const onDown=e=>{dragRef.current={on:true,sx:e.clientX,sy:e.clientY,px:e.clientX,py:e.clientY,td:0};};
  const onMove=e=>{if(!dragRef.current.on)return; camRef.current.theta-=(e.clientX-dragRef.current.px)*0.006; camRef.current.phi=Math.max(0.15,Math.min(1.45,camRef.current.phi+(e.clientY-dragRef.current.py)*0.006)); dragRef.current.px=e.clientX; dragRef.current.py=e.clientY; updCam();};
  const onUp=e=>{const wasDrag=Math.abs(e.clientX-dragRef.current.sx)>4||Math.abs(e.clientY-dragRef.current.sy)>4; dragRef.current.on=false; if(wasDrag)return; const{camera,meshes}=threeRef.current; if(!camera)return; const rect=mountRef.current.getBoundingClientRect(); const m=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1); const ray=new THREE.Raycaster(); ray.setFromCamera(m,camera); const hits=ray.intersectObjects(Object.values(meshes)); const id=hits.length>0?hits[0].object.userData.roomId:null; setSel(prev=>prev===id?null:id); if(id&&onSelectRef.current)onSelectRef.current(id); Object.entries(meshes).forEach(([rid,mesh])=>{if(mesh.material){mesh.material.emissiveIntensity=rid===id?0.7:rid==="sp03"?0.4:0.1; mesh.material.opacity=rid===id?0.9:rid==="sp03"?0.75:0.5;}});};
  const onWheel=e=>{camRef.current.rad=Math.max(12,Math.min(65,camRef.current.rad+e.deltaY*0.04)); updCam();};

  const selR=sel?ROOMS.find(r=>r.id===sel):null;
  const nbrs=selR?EDGES.filter(([a,b])=>a===selR.id||b===selR.id).map(([a,b])=>a===selR.id?b:a).filter((v,i,a)=>a.indexOf(v)===i):[];
  return (
    <div style={{width:"100%",height:"100%",position:"absolute",top:0,left:0,overflow:"hidden",background:"#040606"}}>
      <div ref={mountRef} style={{width:"100%",height:"100%",touchAction:"none"}} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel} />
      <div id="hex3d-labels" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"hidden"}}>
        {ROOMS.map(room=>(
          <div key={room.id} id={"lbl-"+room.id} style={{position:"absolute",top:0,left:0,whiteSpace:"nowrap",pointerEvents:"none",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#a09880",fontFamily:"'Palatino Linotype','Palatino','Book Antiqua',serif",fontWeight:400,letterSpacing:0.5,textShadow:"0 1px 3px #000"}}>{room.n.length>18?room.n.slice(0,16)+"…":room.n}</div>
            <div style={{fontSize:7,color:"#5a5a4a",fontFamily:"monospace",letterSpacing:1,textShadow:"0 1px 2px #000"}}>{room.id}</div>
          </div>
        ))}
      </div>
      <div style={{position:"absolute",top:12,left:16,pointerEvents:"none"}}>
        <div style={{fontSize:9,letterSpacing:3,color:"#3a4a3a",fontFamily:"monospace"}}>CRIMSON HEXAGONAL ARCHIVE</div>
        <div style={{fontSize:15,letterSpacing:3,color:"#c9a84c",fontFamily:"'Palatino Linotype','Palatino','Book Antiqua',serif",marginTop:2}}>⟨D, R, O, Σ, Φ, Ψ⟩</div>
      </div>
      <div style={{position:"absolute",bottom:12,left:16,pointerEvents:"none"}}>
        {Object.entries(ST_COL).map(([t,c])=>(<div key={t} style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}><div style={{width:6,height:6,background:c,opacity:0.8}}/><span style={{fontSize:7,color:"#4a5a4a",fontFamily:"monospace"}}>{t}</span></div>))}
      </div>
      <div style={{position:"absolute",bottom:12,right:16,pointerEvents:"none",textAlign:"right"}}>
        <div style={{fontSize:7,color:"#5a9f5a"}}>↑ f.01 FBDP</div><div style={{fontSize:7,color:"#5a9f5a"}}>↓ f.02 Gravity Well</div><div style={{fontSize:7,color:"#5ac9c9"}}>⟷ f.03 Swarm</div>
      </div>
      {selR&&(<div style={{position:"absolute",top:16,right:16,width:180,padding:"10px 14px",background:"#080c08ee",border:"1px solid #1a2a1a",borderLeft:"3px solid "+(ST_COL[selR.st]||"#c9a84c"),fontFamily:"'Palatino Linotype','Palatino','Book Antiqua',serif",pointerEvents:"auto"}}>
        <div style={{fontSize:7,letterSpacing:2,color:"#3a4a3a",fontFamily:"monospace"}}>{selR.st.toUpperCase()}</div>
        <div style={{fontSize:13,color:"#c9a84c",marginTop:2,marginBottom:4}}>{selR.n}</div>
        <div style={{fontSize:8,color:"#4a5a4a",fontFamily:"monospace",marginBottom:6}}>{selR.id} · {selR.d} docs</div>
        {nbrs.length>0&&<><div style={{fontSize:7,letterSpacing:1,color:"#3a4a3a",fontFamily:"monospace",marginBottom:3}}>ADJACENT ({nbrs.length})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:2}}>{nbrs.map(nid=>{const nr=ROOMS.find(r=>r.id===nid); return nr?<span key={nid} onClick={()=>setSel(nid)} style={{fontSize:7,padding:"1px 3px",background:"#0a0f0a",border:"1px solid "+(ST_COL[nr.st]||"#555")+"44",color:ST_COL[nr.st]||"#555",cursor:"pointer",fontFamily:"monospace"}}>{nr.n}</span>:null;})}</div></>}
        <div style={{marginTop:6,fontSize:7,color:"#2a3a2a",fontFamily:"monospace",cursor:"pointer"}} onClick={()=>setSel(null)}>✕ close</div>
      </div>)}
    </div>
  );
}
