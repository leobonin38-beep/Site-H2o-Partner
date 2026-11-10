/* ==========================================================
   Éléments communs des tuyaux en verre (accueil et passages
   entre les sections) : matériaux, tracé, raccords, bulles,
   vanne et manomètre.
   ========================================================== */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

const VS = `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position,1.);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

export function createKit() {
  const uniforms = { uTime: { value: 0 } };

  // verre : transparent au centre, reflets sur les bords ; teinte adaptée au fond (clair ou sombre)
  function glass(onLight) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uLight: { value: onLight ? 1 : 0 } },
      vertexShader: VS,
      fragmentShader: `
        uniform float uLight;
        varying vec3 vN; varying vec3 vV;
        void main(){
          vec3 n = normalize(vN), v = normalize(vV);
          float f = pow(1. - abs(dot(n, v)), 2.6);
          float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-.35,.85,.4))), 0.), 60.);
          float rim = pow(max(dot(n, normalize(vec3(.6,-.2,.3))), 0.), 6.) * .25;
          vec3 edge = mix(vec3(.62,.86,1.), vec3(.20,.42,.72), uLight);
          vec3 col = mix(edge, vec3(1.), clamp(spec*1.4 + f*.3*(1.-uLight), 0., 1.));
          float a = .05 + f*mix(.75, .6, uLight) + spec*.9 + rim*(1.-uLight);
          gl_FragColor = vec4(col, a);
        }`
    });
  }
  const glassDark = glass(false);
  const glassLight = glass(true);

  function waterMat(len, speed) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: uniforms.uTime, uLen: { value: len }, uSpeed: { value: speed } },
      vertexShader: VS,
      fragmentShader: `
        uniform float uTime, uLen, uSpeed;
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          float s = vUv.x * uLen - uTime * uSpeed;
          float a = vUv.y * 6.2832;
          float wob = sin(a * 2. + s * .6) * 1.1 + sin(a * 3. - s * .9) * .5;
          float streak = smoothstep(.62, 1., sin(s * 1.9 + wob) * .5 + .5);
          float fine = smoothstep(.75, 1., sin(s * 7.5 - a + wob * .5) * .5 + .5);
          float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 1.4);
          vec3 deep = vec3(.03, .36, .80), light = vec3(.50, .92, 1.);
          vec3 col = mix(deep, light, clamp(f * .85 + streak * .32 + fine * .12, 0., 1.));
          col += vec3(.85, .97, 1.) * (streak * streak * .22 + fine * .08);
          gl_FragColor = vec4(col, .5 + f * .32 + streak * .1);
        }`
    });
  }

  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.22 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe8212b, metalness: 0.15, roughness: 0.35 });
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  const bubbleGeo = new THREE.SphereGeometry(1, 12, 8);

  // tracé : lignes droites reliées par des coudes arrondis
  function pipePath(pts, r) {
    const path = new THREE.CurvePath();
    const v = pts.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0));
    let start = v[0].clone();
    const bends = [];
    for (let i = 1; i < v.length - 1; i++) {
      const dIn = v[i].clone().sub(v[i - 1]).normalize();
      const dOut = v[i + 1].clone().sub(v[i]).normalize();
      const a = v[i].clone().addScaledVector(dIn, -r);
      const b = v[i].clone().addScaledVector(dOut, r);
      path.add(new THREE.LineCurve3(start, a));
      path.add(new THREE.QuadraticBezierCurve3(a, v[i].clone(), b));
      bends.push([a, b, dIn, dOut]);
      start = b;
    }
    path.add(new THREE.LineCurve3(start, v[v.length - 1]));
    return { path, bends, v };
  }

  function ring(parent, pos, dir, R, len) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 40, 1), chrome);
    m.position.copy(pos);
    m.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    parent.add(m);
  }

  /**
   * Ajoute un tuyau complet à `parent` et renvoie l'objet d'animation de l'eau.
   * opts : onLight (fond clair), speed (vitesse de l'eau), gap/first (espacement des raccords),
   *        bubbles (bulles par unité de longueur), detail (segments par unité)
   */
  function addPipe(parent, pts, R, br, opts = {}) {
    const { onLight = false, speed = 1.5, gap = 4.6, first = 3.2, bubbles = 1.6, detail = 14 } = opts;
    const { path, bends, v } = pipePath(pts, br);
    const len = path.getLength();
    const seg = Math.max(60, Math.round(len * detail));

    const water = new THREE.Mesh(new THREE.TubeGeometry(path, seg, R * 0.74, 32, false), waterMat(len, speed));
    water.renderOrder = 1;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, seg, R, 36, false), onLight ? glassLight : glassDark);
    tube.renderOrder = 2;
    parent.add(water, tube);

    bends.forEach(([a, b, dIn, dOut]) => {
      ring(parent, a, dIn, R * 1.16, R * 0.55);
      ring(parent, b, dOut, R * 1.16, R * 0.55);
    });
    for (let i = 0; i < v.length - 1; i++) {
      const d = v[i + 1].clone().sub(v[i]), L = d.length();
      for (let t = first; t < L - first * 0.6; t += gap) ring(parent, v[i].clone().addScaledVector(d, t / L), d, R * 1.12, R * 0.38);
    }

    const frames = path.computeFrenetFrames(300, false);
    const count = Math.max(4, Math.round(len * bubbles));
    const mesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, count);
    mesh.renderOrder = 1.5;
    mesh.frustumCulled = false;
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({ u: Math.random(), ang: Math.random() * 6.283, rr: Math.random() * R * 0.55, s: R * (0.05 + Math.random() * 0.11), sp: 0.85 + Math.random() * 0.4 });
    }
    parent.add(mesh);
    const flow = { path, len, frames, mesh, data, speed };
    updateFlows([flow], 0);
    return flow;
  }

  const tmp = new THREE.Object3D();
  function updateFlows(flows, dt) {
    flows.forEach(f => {
      const N = f.frames.tangents.length - 1;
      f.data.forEach((b, i) => {
        b.u = (b.u + (f.speed * b.sp * dt) / f.len) % 1;
        const p = f.path.getPointAt(b.u);
        const k = Math.min(N, Math.round(b.u * N));
        tmp.position.copy(p)
          .addScaledVector(f.frames.normals[k], Math.cos(b.ang) * b.rr)
          .addScaledVector(f.frames.binormals[k], Math.sin(b.ang) * b.rr);
        tmp.scale.setScalar(b.s);
        tmp.updateMatrix();
        f.mesh.setMatrixAt(i, tmp.matrix);
      });
      f.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // vanne à volant rouge ; le volant est renvoyé pour pouvoir le faire tourner
  function makeValve() {
    const valve = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.66, 40, 24), chrome);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 20), chrome);
    stem.rotation.x = Math.PI / 2; stem.position.z = 0.6;
    const wheel = new THREE.Group();
    wheel.position.z = 1.05;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.075, 16, 60), red));
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.06), red);
      spoke.rotation.z = (i * Math.PI) / 3; wheel.add(spoke);
    }
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 24).rotateX(Math.PI / 2), red));
    valve.add(body, stem, wheel);
    return { valve, wheel };
  }

  // manomètre ; l'aiguille est renvoyée pour pouvoir l'animer
  function makeGauge() {
    const gauge = new THREE.Group();
    gauge.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 16).rotateZ(Math.PI / 2).translate(-0.62, 0, 0), chrome));
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 48).rotateX(Math.PI / 2), chrome);
    face.position.x = -1.05;
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ color: 0xf3f7fb }));
    dial.position.set(-1.05, 0, 0.085);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.01).translate(0.13, 0, 0), new THREE.MeshBasicMaterial({ color: 0xe8212b }));
    needle.position.set(-1.05, 0, 0.1);
    gauge.add(face, dial, needle);
    return { gauge, needle };
  }

  return { uniforms, addPipe, updateFlows, makeValve, makeGauge };
}
