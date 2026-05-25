import * as THREE from "three";

// ─── Module-level state ───────────────────────────────────────────────────────
let wordList = [];
let wordidx  = 0;
let frameidx = 0;
let animationId = null;
let onWordChange = null;
let onFinished   = null;
let DATA_FPS     = 4; // default — controlled by setSpeed()

const NUM_JOINTS = 21;

// Smooth-lerp state: separate current (displayed) vs target arrays
let leftCurrent  = Array.from({ length: NUM_JOINTS }, () => new THREE.Vector3());
let rightCurrent = Array.from({ length: NUM_JOINTS }, () => new THREE.Vector3());
let leftTarget   = Array.from({ length: NUM_JOINTS }, () => new THREE.Vector3());
let rightTarget  = Array.from({ length: NUM_JOINTS }, () => new THREE.Vector3());
let leftActive   = new Array(NUM_JOINTS).fill(false);
let rightActive  = new Array(NUM_JOINTS).fill(false);
let leftSnapped  = new Array(NUM_JOINTS).fill(false);
let rightSnapped = new Array(NUM_JOINTS).fill(false);

// ─── Public API ───────────────────────────────────────────────────────────────
export function setSpeed(fps) {
  DATA_FPS = Math.max(1, Math.min(30, fps));
}

export function updateWordList(words, cbWord, cbDone) {
  wordList = words;
  wordidx  = 0;
  frameidx = 0;
  onWordChange = cbWord  || null;
  onFinished   = cbDone  || null;
  leftSnapped.fill(false);
  rightSnapped.fill(false);
  leftActive.fill(false);
  rightActive.fill(false);
}

// ─── Hand skeleton edges ──────────────────────────────────────────────────────
const EDGES = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

// ─── Coordinate transform ─────────────────────────────────────────────────────
// MediaPipe coords are normalised 0→1. Subtract 0.5 to center at origin.
const SCALE    = 75;
const Y_OFFSET = 12; // sign hands sit low in frame; shift up to center them
const _tv = new THREE.Vector3();
function toVec(coords, out) {
  out.set(
    (coords[0] - 0.5) * SCALE,
    (coords[1] - 0.5) * -SCALE + Y_OFFSET,
    coords[2] * 12
  );
}

// Joint size hierarchy: wrist=big, knuckles=medium, tips=accented
const JOINT_RADIUS = [
  1.4,                        // 0  wrist
  0.85,0.7,0.65,1.0,         // 1-4  thumb
  0.85,0.7,0.65,1.0,         // 5-8  index
  0.85,0.7,0.65,1.0,         // 9-12 middle
  0.8, 0.65,0.6,0.9,         // 13-16 ring
  0.8, 0.65,0.6,0.9,         // 17-20 pinky
];

// ─── Main init ────────────────────────────────────────────────────────────────
export function NewThree(labelId, containerId) {
  const label     = document.getElementById(labelId);
  const container = document.getElementById(containerId);
  if (!container) return;

  // ── Renderer ────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  // ── Scene ───────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c12);
  scene.fog = new THREE.FogExp2(0x080c12, 0.006);

  // ── Camera — centered on origin where hands now live ────────────────────────
  const camera = new THREE.PerspectiveCamera(
    68,
    container.clientWidth / container.clientHeight,
    0.1,
    300
  );
  camera.position.set(0, 6, 52);
  camera.lookAt(0, 6, 0);

  // ── Lights ──────────────────────────────────────────────────────────────────
  // Strong ambient — ensures every face of every joint is lit
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-10, 15, 25);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 1.5);
  fill.position.set(15, -5, 20);
  scene.add(fill);

  // ── Subtle grid ─────────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(80, 18, 0x1a2a3a, 0x111e2a);
  grid.position.y = -30;
  scene.add(grid);

  // ── Per-finger color palette ─────────────────────────────────────────────────
  // MeshBasicMaterial = always fully lit, never dark-side shadowing
  // Joint index → finger:  0=wrist  1-4=thumb  5-8=index  9-12=mid  13-16=ring  17-20=pinky
  const FINGER_COLORS = [
    0xffd700, // 0  wrist      — gold
    0xff6b35, // 1  thumb base — orange
    0xff6b35, // 2
    0xff6b35, // 3
    0xff4500, // 4  thumb tip  — deep orange
    0x00d4ff, // 5  index base — bright cyan
    0x00d4ff, // 6
    0x00d4ff, // 7
    0x00ffcc, // 8  index tip  — aqua
    0x44ff44, // 9  middle base — lime
    0x44ff44, // 10
    0x44ff44, // 11
    0x88ff00, // 12 middle tip — yellow-green
    0xcc44ff, // 13 ring base  — violet
    0xcc44ff, // 14
    0xcc44ff, // 15
    0xff44ff, // 16 ring tip   — magenta
    0xff2299, // 17 pinky base — pink
    0xff2299, // 18
    0xff2299, // 19
    0xff66bb, // 20 pinky tip  — light pink
  ];

  // Build one sphere mesh per joint with its own bright material
  function makeJoints() {
    return Array.from({ length: NUM_JOINTS }, (_, i) => {
      const geo = new THREE.SphereGeometry(JOINT_RADIUS[i], 14, 10);
      const mat = new THREE.MeshBasicMaterial({ color: FINGER_COLORS[i] });
      const m   = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      return m;
    });
  }

  const leftJoints  = makeJoints();
  const rightJoints = makeJoints();

  // ── Bone colors: match the base finger color, one bone mat per edge ──────────
  // Edge index → connects joints u→v. Color = FINGER_COLORS[u].
  const boneGeo = new THREE.CylinderGeometry(0.18, 0.30, 1, 8, 1);

  function makeBones() {
    return Array.from({ length: EDGES.length }, (_, i) => {
      const u   = EDGES[i][0];
      const mat = new THREE.MeshBasicMaterial({ color: FINGER_COLORS[u] });
      const m   = new THREE.Mesh(boneGeo, mat);
      m.visible = false;
      scene.add(m);
      return m;
    });
  }

  const leftBones  = makeBones();
  const rightBones = makeBones();

  // ── Reusable vectors (avoid GC in hot loop) ──────────────────────────────────
  const _dir = new THREE.Vector3();
  const _mid = new THREE.Vector3();
  const _up  = new THREE.Vector3(0, 1, 0);

  function positionBone(boneMesh, p1, p2) {
    _dir.subVectors(p2, p1);
    const len = _dir.length();
    if (len < 0.001) { boneMesh.visible = false; return; }
    _mid.addVectors(p1, p2).multiplyScalar(0.5);
    boneMesh.position.copy(_mid);
    boneMesh.scale.set(1, len, 1);
    boneMesh.quaternion.setFromUnitVectors(_up, _dir.divideScalar(len));
    boneMesh.visible = true;
  }

  // ── Apply targets from one data frame ───────────────────────────────────────
  function applyFrame(coordArr, active, targets, current, snapped) {
    const pts = coordArr ? coordArr.slice(0, NUM_JOINTS) : [];
    for (let i = 0; i < NUM_JOINTS; i++) {
      if (i < pts.length && pts[i]?.Coordinates) {
        toVec(pts[i].Coordinates, targets[i]);
        if (!snapped[i]) {
          current[i].copy(targets[i]); // first appearance: snap, no lerp from 0
          snapped[i] = true;
        }
        active[i] = true;
      } else {
        active[i] = false;
        snapped[i] = false;
      }
    }
  }

  // ── Clock & frame timer ──────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let frameTimer = 0; // always reads latest value


  // ── Render loop ──────────────────────────────────────────────────────────────
  function render() {
    animationId = requestAnimationFrame(render);
    const dt = clock.getDelta();

    // Framerate-independent lerp — smooth, not frame-dependent
    const lf = 1 - Math.exp(-dt * 14); // higher = snappier

    // Gentle camera sway — focused on Y_OFFSET height where hands live
    const t = clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.07) * 2.5;
    camera.position.y = 6 + Math.cos(t * 0.05) * 1.2;
    camera.lookAt(0, 6, 0);

    // (Light cycling removed since we switched to flat bright colors)

    // ── Advance data frame ──────────────────────────────────────────────────
    frameTimer += dt;
    if (frameTimer >= 1 / DATA_FPS) {
      frameTimer -= 1 / DATA_FPS;

      if (wordidx < wordList.length && window.__mimeAIData) {
        const word   = wordList[wordidx];
        const frames = window.__mimeAIData[word];

        if (!frames) {
          wordidx++; frameidx = 0;
          leftSnapped.fill(false); rightSnapped.fill(false);
        } else {
          if (frameidx === 0) {
            if (label) label.textContent = word.toUpperCase();
            onWordChange?.(word, wordidx, wordList.length);
          }

          const frame = frames.find(f => f.Frame === frameidx);
          if (!frame) {
            wordidx++; frameidx = 0;
            leftSnapped.fill(false); rightSnapped.fill(false);
            leftActive.fill(false); rightActive.fill(false);
          } else {
            let left  = frame["Left Hand Coordinates"]  || [];
            let right = frame["Right Hand Coordinates"] || [];

            // Dataset quirk: overflow from one hand into the other
            if (left.length > NUM_JOINTS) {
              right = [...left.slice(NUM_JOINTS), ...right];
              left  = left.slice(0, NUM_JOINTS);
            } else if (right.length > NUM_JOINTS) {
              left  = [...right.slice(NUM_JOINTS), ...left];
              right = right.slice(0, NUM_JOINTS);
            }

            applyFrame(left,  leftActive,  leftTarget,  leftCurrent,  leftSnapped);
            applyFrame(right, rightActive, rightTarget, rightCurrent, rightSnapped);
            frameidx++;
          }
        }
      } else if (wordidx >= wordList.length && wordList.length > 0) {
        if (label) label.textContent = "DONE";
        leftActive.fill(false); rightActive.fill(false);
        if (onFinished) { onFinished(); onFinished = null; }
      }
    }

    // ── Lerp current toward target & update meshes ──────────────────────────
    for (let i = 0; i < NUM_JOINTS; i++) {
      // Left hand
      leftCurrent[i].lerp(leftTarget[i], lf);
      leftJoints[i].position.copy(leftCurrent[i]);
      leftJoints[i].visible = leftActive[i];

      // Right hand
      rightCurrent[i].lerp(rightTarget[i], lf);
      rightJoints[i].position.copy(rightCurrent[i]);
      rightJoints[i].visible = rightActive[i];
    }

    // ── Update bone cylinders ───────────────────────────────────────────────
    for (let i = 0; i < EDGES.length; i++) {
      const [u, v] = EDGES[i];
      if (leftJoints[u].visible && leftJoints[v].visible) {
        positionBone(leftBones[i], leftCurrent[u], leftCurrent[v]);
      } else {
        leftBones[i].visible = false;
      }
      if (rightJoints[u].visible && rightJoints[v].visible) {
        positionBone(rightBones[i], rightCurrent[u], rightCurrent[v]);
      } else {
        rightBones[i].visible = false;
      }
    }

    renderer.render(scene, camera);
  }

  // ── Load JSON once, cache globally, then start loop ──────────────────────────
  if (window.__mimeAIData) {
    render();
  } else {
    fetch("/reference1_normalized.json")
      .then(r => r.json())
      .then(data => { window.__mimeAIData = data; render(); })
      .catch(err => console.error("Failed to load sign data:", err));
  }

  // ── ResizeObserver ───────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(container);

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  return () => {
    if (animationId) cancelAnimationFrame(animationId);
    ro.disconnect();
    renderer.dispose();
    if (container.contains(renderer.domElement))
      container.removeChild(renderer.domElement);
  };
}
