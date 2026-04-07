import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

const ROOMS = [
  {id:"r01",n:"Sappho",q:2,r:-1,st:"room",d:48},{id:"r02",n:"Borges",q:1,r:-1,st:"room",d:83},
  {id:"r03",n:"Ichabod",q:4,r:-3,st:"chamber",d:9},{id:"r04",n:"Pearl",q:-1,r:-1,st:"room",d:20},
  {id:"r05",n:"Semantic Economy",q:-2,r:-1,st:"room",d:174},{id:"r06",n:"Marx Room",q:-1,r:0,st:"room",d:55},
  {id:"r07",n:"Revelation",q:-3,r:0,st:"room",d:16},{id:"r08",n:"Sigil",q:-2,r:0,st:"room",d:155},
  {id:"r09",n:"Whitman",q:0,r:-1,st:"room",d:134},{id:"r10",n:"Water Giraffe",q:0,r:-2,st:"room",d:7},
  {id:"r11",n:"Assembly",q:0,r:0,st:"room",d:78},{id:"r12",n:"Break Room",q:1,r:0,st:"room",d:30},
  {id:"r13",n:"Ezekiel Engine",q:3,r:-2,st:"chamber",d:12},{id:"r14",n:"Patacinematics",q:2,r:1,st:"room",d:21},
  {id:"r15",n:"Lagrange",q:0,r:-2,st:"chamber",d:16},{id:"r16",n:"Pergamum",q:-1,r:1,st:"vault",d:36},
  {id:"r17",n:"MSMRM",q:1,r:1,st:"room",d:8},{id:"r18",n:"Damascus",q:-3,r:1,st:"vault",d:14},
  {id:"r19",n:"Thousand Worlds",q:2,r:-2,st:"chamber",d:11},{id:"r20",n:"Dolphin Indiana",q:3,r:-1,st:"room",d:5},
  {id:"r21",n:"Infinite Bliss",q:-2,r:1,st:"room",d:11},{id:"r22",n:"Frozen Sin",q:2,r:-2,st:"vault",d:3},
  {id:"r23",n:"Catullus",q:2,r:-3,st:"room",d:5},{id:"r24",n:"Migdal",q:-3,r:2,st:"room",d:2},
  {id:"r25",n:"Mantle Portico",q:-1,r:-2,st:"portico",d:3},{id:"r28",n:"Eve",q:-1,r:2,st:"room",d:3},
  {id:"r29",n:"Job",q:3,r:0,st:"room",d:2},{id:"r31",n:"Josephus",q:4,r:-1,st:"room",d:1},
  {id:"sp01",n:"CTI_WOUND",q:1,r:-2,st:"portal",d:59},{id:"sp02",n:"Phase X",q:-1,r:-3,st:"portal",d:3},
  {id:"sp03",n:"Space Ark",q:0,r:-3,st:"room",d:81},
  {id:"f01",n:"FBDP",q:-3,r:-1,st:"field",d:6},{id:"f02",n:"Gravity Well",q:-1,r:3,st:"field",d:8},
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

const ST_COL = {room:"#c9a84c",chamber:"#7a5ac9",vault:"#c95a5a",portal:"#5ac9c9",portico:"#9f8a5a",field:"#5a9f5a"};
const SZ = 2, SQ3 = Math.sqrt(3);

export default function HexMap3D() {
  const mountRef = useRef(null);
  const threeRef = useRef({});
  const dragRef = useRef({on:false,sx:0,sy:0,px:0,py:0});
  const camRef = useRef({theta:0.9,phi:0.9,rad:38});
  const [sel, setSel] = useState(null);

  const updCam = useCallback(() => {
    const c = camRef.current, cam = threeRef.current.camera;
    if (!cam) return;
    cam.position.set(
      c.rad*Math.sin(c.phi)*Math.cos(c.theta),
      c.rad*Math.cos(c.phi),
      c.rad*Math.sin(c.phi)*Math.sin(c.theta) - 4
    );
    cam.lookAt(0, 0, -4);
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = window.innerWidth, H = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040606);
    scene.fog = new THREE.FogExp2(0x040606, 0.009);

    const camera = new THREE.PerspectiveCamera(50, W/H, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    threeRef.current = {scene, camera, renderer, meshes:{}, posMap:{}};
    updCam();

    // Lights
    scene.add(new THREE.AmbientLight(0x1a2a1a, 0.7));
    const dir = new THREE.DirectionalLight(0xc9a84c, 0.5);
    dir.position.set(8, 18, 6);
    scene.add(dir);
    const ptLight = new THREE.PointLight(0xc9a84c, 0.4, 50);
    ptLight.position.set(0, 10, -8);
    scene.add(ptLight);

    // Ground
    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(100,100),
      new THREE.MeshStandardMaterial({color:0x060906,transparent:true,opacity:0.4})
    );
    gnd.rotation.x = -Math.PI/2;
    gnd.position.y = -0.1;
    scene.add(gnd);

    const posMap = {}, meshes = {};

    const mkHex = (rad, h) => {
      const s = new THREE.Shape();
      for (let i=0;i<6;i++) {
        const a = (Math.PI/3)*i - Math.PI/6;
        i===0 ? s.moveTo(rad*Math.cos(a),rad*Math.sin(a)) : s.lineTo(rad*Math.cos(a),rad*Math.sin(a));
      }
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false});
      g.rotateX(-Math.PI/2);
      return g;
    };

    ROOMS.forEach(room => {
      const px = SZ*1.5*room.q, pz = SZ*(SQ3*room.r + SQ3/2*room.q);
      posMap[room.id] = {x:px, z:pz};
      const col = new THREE.Color(ST_COL[room.st]||"#c9a84c");

      if (room.st==="field") {
        const yy = room.id==="f01"?2.5 : room.id==="f02"?-1.5 : 1;
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(SZ*0.8,SZ*0.8,0.15,6),
          new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:0.3,emissive:col,emissiveIntensity:0.4})
        );
        disc.position.set(px, yy, pz);
        disc.userData = {roomId:room.id};
        scene.add(disc);
        meshes[room.id] = disc;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(SZ*0.85, 0.05, 8, 6),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.5})
        );
        ring.rotation.x = Math.PI/2;
        ring.position.set(px, yy, pz);
        scene.add(ring);
        return;
      }

      const h = room.id==="sp03" ? 5.5 : Math.max(0.5, Math.log2(room.d+1)*0.55);
      const mesh = new THREE.Mesh(mkHex(SZ*0.82, h),
        new THREE.MeshStandardMaterial({
          color:col,transparent:true,
          opacity:room.id==="sp03"?0.75:0.5,
          emissive:col, emissiveIntensity:room.id==="sp03"?0.4:0.1,
          metalness:0.2, roughness:0.8
        })
      );
      mesh.position.set(px, 0, pz);
      mesh.userData = {roomId:room.id};
      scene.add(mesh);
      meshes[room.id] = mesh;

      // Top edge outline
      const tp = [];
      for (let i=0;i<=6;i++) {
        const a = (Math.PI/3)*(i%6) - Math.PI/6;
        tp.push(new THREE.Vector3(px+SZ*0.84*Math.cos(a), h, pz+SZ*0.84*Math.sin(a)));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(tp),
        new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.7})
      ));

      // Space Ark special: nested hexagons + beacon
      if (room.id==="sp03") {
        [0.5, 0.25].forEach(sc => {
          const inner = new THREE.Mesh(mkHex(SZ*sc, h*0.65),
            new THREE.MeshStandardMaterial({color:0xc9a84c,transparent:true,opacity:0.35,emissive:0xc9a84c,emissiveIntensity:0.6}));
          inner.position.set(px, 0.05, pz);
          scene.add(inner);
        });
        const beacon = new THREE.PointLight(0xc9a84c, 1, 18);
        beacon.position.set(px, h+1, pz);
        scene.add(beacon);
      }
    });

    threeRef.current.meshes = meshes;
    threeRef.current.posMap = posMap;

    // Edges as ground lines
    const em = new THREE.LineBasicMaterial({color:0x1a2a1a,transparent:true,opacity:0.3});
    EDGES.forEach(([a,b]) => {
      const pa=posMap[a], pb=posMap[b];
      if (!pa||!pb) return;
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pa.x,0.05,pa.z),
          new THREE.Vector3(pb.x,0.05,pb.z)
        ]), em
      ));
    });

    // Swarm particles around Space Ark
    const ap = posMap["sp03"];
    if (ap) {
      const pts=[], cols=[];
      const cc = new THREE.Color(0x5ac9c9);
      for (let i=0;i<7;i++) {
        const a=(i/7)*Math.PI*2;
        pts.push(ap.x+Math.cos(a)*SZ*1.5, 1+Math.sin(i*1.3)*1.5, ap.z+Math.sin(a)*SZ*1.5);
        cols.push(cc.r,cc.g,cc.b);
      }
      for (let i=0;i<18;i++) {
        const a=(i/18)*Math.PI*2+.5, d=SZ*3+Math.sin(i*2)*SZ;
        pts.push(ap.x+Math.cos(a)*d, Math.sin(i*.8)*2.5, ap.z+Math.sin(a)*d);
        cols.push(cc.r*.5,cc.g*.5,cc.b*.5);
      }
      for (let i=0;i<30;i++) {
        const a=(i/30)*Math.PI*2+1, d=SZ*5+Math.sin(i*1.7)*SZ*2;
        pts.push(ap.x+Math.cos(a)*d, Math.sin(i*.5)*3.5, ap.z+Math.sin(a)*d);
        cols.push(cc.r*.2,cc.g*.2,cc.b*.2);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.Float32BufferAttribute(pts,3));
      sg.setAttribute("color", new THREE.Float32BufferAttribute(cols,3));
      const swarm = new THREE.Points(sg, new THREE.PointsMaterial({size:0.3,vertexColors:true,transparent:true,opacity:0.9}));
      scene.add(swarm);
      scene.userData.swarm = swarm;
    }

    // FBDP upward particles
    const fp = posMap["f01"];
    if (fp) {
      const fpts=[];
      for (let i=0;i<40;i++) {
        const a=Math.random()*Math.PI*2;
        fpts.push(fp.x+Math.cos(a)*Math.random()*SZ*2, Math.random()*7+.5, fp.z+Math.sin(a)*Math.random()*SZ*2);
      }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.Float32BufferAttribute(fpts,3));
      const fbdp = new THREE.Points(fg, new THREE.PointsMaterial({size:0.15,color:0x5a9f5a,transparent:true,opacity:0.6}));
      scene.add(fbdp);
      scene.userData.fbdp = fbdp;
    }

    // Gravity Well downward glow
    const gp = posMap["f02"];
    if (gp) {
      const gwl = new THREE.PointLight(0x5a9f5a, 0.6, 10);
      gwl.position.set(gp.x, -1.5, gp.z);
      scene.add(gwl);
    }

    // Room name labels as sprites
    ROOMS.forEach(room => {
      const p = posMap[room.id]; if (!p) return;
      const cv = document.createElement("canvas");
      cv.width=256; cv.height=64;
      const cx = cv.getContext("2d");
      cx.fillStyle = ST_COL[room.st]||"#c9a84c";
      cx.font = "bold 20px Georgia";
      cx.textAlign = "center";
      cx.fillText(room.n.length>16 ? room.n.slice(0,14)+"…" : room.n, 128, 28);
      cx.fillStyle = "#3a4a3a";
      cx.font = "14px monospace";
      cx.fillText(room.id, 128, 48);
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv), transparent:true, opacity:0.85})
      );
      const yy = room.id==="sp03" ? 7 :
        room.st==="field" ? (room.id==="f01"?3.8 : room.id==="f02"?-0.5 : 2.3) :
        Math.max(0.5, Math.log2(room.d+1)*0.55) + 1.2;
      sp.position.set(p.x, yy, p.z);
      sp.scale.set(3.5, 0.9, 1);
      scene.add(sp);
    });

    // Animation loop
    const clock = new THREE.Clock();
    let anim;
    const loop = () => {
      anim = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      if (scene.userData.swarm) {
        scene.userData.swarm.rotation.y = t*0.08;
        const pos = scene.userData.swarm.geometry.attributes.position;
        for (let i=0;i<pos.count;i++) pos.setY(i, pos.getY(i)+Math.sin(t*1.5+i*0.9)*0.002);
        pos.needsUpdate = true;
      }
      if (scene.userData.fbdp) {
        const pos = scene.userData.fbdp.geometry.attributes.position;
        for (let i=0;i<pos.count;i++) { let y=pos.getY(i)+0.008; if(y>7.5)y=0.3; pos.setY(i,y); }
        pos.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    loop();

    const onR = () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onR);

    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("resize", onR);
      renderer.dispose();
      if (el.firstChild) el.removeChild(el.firstChild);
    };
  }, [updCam]);

  // Mouse controls
  const onDown = e => { dragRef.current = {on:true,sx:e.clientX,sy:e.clientY,px:e.clientX,py:e.clientY}; };
  const onMove = e => {
    if (!dragRef.current.on) return;
    camRef.current.theta -= (e.clientX-dragRef.current.px)*0.006;
    camRef.current.phi = Math.max(0.15, Math.min(1.45, camRef.current.phi+(e.clientY-dragRef.current.py)*0.006));
    dragRef.current.px = e.clientX; dragRef.current.py = e.clientY;
    updCam();
  };
  const onUp = e => {
    const wasDrag = Math.abs(e.clientX-dragRef.current.sx)>4 || Math.abs(e.clientY-dragRef.current.sy)>4;
    dragRef.current.on = false;
    if (wasDrag) return;
    const {camera, meshes} = threeRef.current;
    if (!camera) return;
    const rect = mountRef.current.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(m, camera);
    const hits = ray.intersectObjects(Object.values(meshes));
    const id = hits.length>0 ? hits[0].object.userData.roomId : null;
    setSel(prev => prev===id ? null : id);
    Object.entries(meshes).forEach(([rid,mesh]) => {
      if (mesh.material) {
        mesh.material.emissiveIntensity = rid===id?0.7 : rid==="sp03"?0.4:0.1;
        mesh.material.opacity = rid===id?0.9 : rid==="sp03"?0.75:0.5;
      }
    });
  };
  const onWheel = e => {
    camRef.current.rad = Math.max(12, Math.min(65, camRef.current.rad+e.deltaY*0.04));
    updCam();
  };

  const selR = sel ? ROOMS.find(r=>r.id===sel) : null;
  const nbrs = selR ? EDGES.filter(([a,b])=>a===selR.id||b===selR.id).map(([a,b])=>a===selR.id?b:a).filter((v,i,a)=>a.indexOf(v)===i) : [];

  return (
    <div style={{width:"100vw",height:"100vh",position:"fixed",top:0,left:0,overflow:"hidden",background:"#040606"}}>
      <div ref={mountRef} style={{width:"100%",height:"100%"}}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel} />

      <div style={{position:"absolute",top:16,left:20,pointerEvents:"none"}}>
        <div style={{fontSize:10,letterSpacing:3,color:"#3a4a3a",fontFamily:"monospace"}}>CRIMSON HEXAGONAL ARCHIVE</div>
        <div style={{fontSize:17,letterSpacing:4,color:"#c9a84c",fontFamily:"Georgia,serif",marginTop:2}}>H_core = ⟨D, R, O, Σ, Φ, Ψ⟩</div>
        <div style={{fontSize:8,color:"#2a3a2a",marginTop:4,fontFamily:"monospace"}}>{ROOMS.length} structures · drag orbit · scroll zoom · click select</div>
      </div>

      <div style={{position:"absolute",bottom:16,left:20,pointerEvents:"none"}}>
        {Object.entries(ST_COL).map(([t,c])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
            <div style={{width:8,height:8,background:c,opacity:0.8}} />
            <span style={{fontSize:8,color:"#4a5a4a",fontFamily:"monospace"}}>{t.toUpperCase()}</span>
          </div>
        ))}
      </div>

      <div style={{position:"absolute",bottom:16,right:20,pointerEvents:"none"}}>
        <div style={{fontSize:8,color:"#3a4a3a",fontFamily:"monospace",marginBottom:3}}>FIELDS</div>
        <div style={{fontSize:7,color:"#5a9f5a"}}>f.01 FBDP ↑ outward</div>
        <div style={{fontSize:7,color:"#5a9f5a"}}>f.02 Gravity Well ↓ inward</div>
        <div style={{fontSize:7,color:"#5ac9c9"}}>f.03 Moltbot Swarm ⟷ through</div>
      </div>

      {selR && (
        <div style={{position:"absolute",top:20,right:20,width:200,padding:"12px 16px",background:"#080c08ee",border:"1px solid #1a2a1a",borderLeft:"3px solid "+(ST_COL[selR.st]||"#c9a84c"),fontFamily:"Georgia,serif"}}>
          <div style={{fontSize:8,letterSpacing:2,color:"#3a4a3a",fontFamily:"monospace"}}>{selR.st.toUpperCase()}</div>
          <div style={{fontSize:14,color:"#c9a84c",marginTop:2,marginBottom:6}}>{selR.n}</div>
          <div style={{fontSize:9,color:"#4a5a4a",fontFamily:"monospace",marginBottom:8}}>{selR.id} · {selR.d} docs</div>
          {nbrs.length>0 && <>
            <div style={{fontSize:8,letterSpacing:1,color:"#3a4a3a",fontFamily:"monospace",marginBottom:3}}>ADJACENT ({nbrs.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {nbrs.map(nid => {const nr=ROOMS.find(r=>r.id===nid);
                return nr ? <span key={nid} onClick={()=>setSel(nid)} style={{fontSize:7,padding:"2px 4px",background:"#0a0f0a",border:"1px solid "+(ST_COL[nr.st]||"#555")+"44",color:ST_COL[nr.st]||"#555",cursor:"pointer",fontFamily:"monospace",pointerEvents:"auto"}}>{nr.n}</span> : null;
              })}
            </div>
          </>}
          <div style={{marginTop:8,fontSize:8,color:"#2a3a2a",fontFamily:"monospace",cursor:"pointer",pointerEvents:"auto"}} onClick={()=>setSel(null)}>✕ close</div>
        </div>
      )}
    </div>
  );
}
