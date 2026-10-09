import * as THREE from 'three';

// A balance in gold, drawn from the logo's scale: a column, a beam, two pans on three
// cords each, and the rhombus of the calligraphy as its finial. Its beam is a damped
// spring, so each step of the method lands as a physical weight and the scale settles.

export type ScaleRig = {
  group: THREE.Group;
  setTarget(balance: number): void;
  update(dt: number, time: number, presence: number, px: number): void;
};

export function buildScale(mobile: boolean): ScaleRig {
  const seg = mobile ? 20 : 40;
  const group = new THREE.Group();

  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b067, metalness: 1, roughness: 0.24 });
  const goldDim = new THREE.MeshStandardMaterial({ color: 0xa47a2c, metalness: 1, roughness: 0.38 });
  const garnet = new THREE.MeshPhysicalMaterial({ color: 0x9a1f1f, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x2a0303 });
  const mats = [gold, goldDim, garnet];

  // plinth
  const plinth = new THREE.LatheGeometry(
    [new THREE.Vector2(0, 0), new THREE.Vector2(0.27, 0), new THREE.Vector2(0.27, 0.025), new THREE.Vector2(0.2, 0.04), new THREE.Vector2(0.19, 0.075), new THREE.Vector2(0.06, 0.1), new THREE.Vector2(0.03, 0.14), new THREE.Vector2(0, 0.14)],
    seg,
  );
  group.add(new THREE.Mesh(plinth, goldDim));
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.74, seg / 2), gold);
  column.position.y = 0.14 + 0.37;
  group.add(column);
  for (const y of [0.32, 0.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, seg), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }
  const PIV = 0.9;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.034, seg / 2, seg / 4), gold);
  hub.position.y = PIV;
  group.add(hub);
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), garnet);
  finial.scale.set(0.82, 1.45, 0.82);
  finial.position.y = PIV + 0.1;
  group.add(finial);

  // beam
  const beam = new THREE.Group();
  beam.position.y = PIV;
  group.add(beam);
  const HALF = 0.52;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, HALF * 2, 12), gold);
  bar.rotation.z = Math.PI / 2;
  beam.add(bar);
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), gold);
    cap.position.x = side * HALF;
    beam.add(cap);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 10), gold);
    tip.position.set(side * HALF, 0.035, 0);
    beam.add(tip);
    // hanger: stays vertical, swings like a pendulum
    const hang = new THREE.Group();
    hang.position.x = side * HALF;
    beam.add(hang);
    const DROP = 0.46;
    const R = 0.2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const end = new THREE.Vector3(Math.cos(a) * R * 0.94, -DROP, Math.sin(a) * R * 0.94);
      const len = end.length();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, len, 5), goldDim);
      cord.position.copy(end).multiplyScalar(0.5);
      cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
      hang.add(cord);
    }
    const pan = new THREE.Mesh(
      new THREE.LatheGeometry([new THREE.Vector2(0, -0.055), new THREE.Vector2(0.09, -0.05), new THREE.Vector2(0.16, -0.03), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.205, 0.006), new THREE.Vector2(0.196, 0.004), new THREE.Vector2(0.155, -0.024), new THREE.Vector2(0, -0.045)], seg),
      gold,
    );
    pan.position.y = -DROP;
    hang.add(pan);
    arms.push(hang);
  }
  // normalise: plinth at y=0 → total height ≈ 1
  group.children.forEach((c) => (c.position.y -= 0));

  const key = new THREE.DirectionalLight(0xffe2b0, 0);
  key.position.set(-1.5, 2.5, 2);
  const rim = new THREE.DirectionalLight(0xff8a6a, 0);
  rim.position.set(2, 1, -2);
  group.add(key, rim, key.target);

  const MAX = 0.3; // rad
  let theta = MAX, omega = 0, tgt = MAX, prevOmega = 0;
  const swing = [0, 0], swingV = [0, 0];

  return {
    group,
    setTarget(balance: number) {
      tgt = MAX * (1 - Math.max(0, Math.min(1, balance)));
    },
    update(dt, time, presence, px) {
      if (dt <= 0) return;
      // fixed sub-steps so the settling feels the same at any frame rate
      const n = Math.min(8, Math.ceil(dt / (1 / 120)));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        const acc = -38 * (theta - tgt) - 3.6 * omega;
        omega += acc * h;
        theta += omega * h;
        const alpha = (omega - prevOmega) / h;
        prevOmega = omega;
        for (let i = 0; i < 2; i++) {
          const sa = -14 * swing[i] - 1.8 * swingV[i] - alpha * 0.02;
          swingV[i] += sa * h;
          swing[i] += swingV[i] * h;
        }
      }
      beam.rotation.z = theta;
      arms.forEach((a, i) => (a.rotation.z = -theta + swing[i]));
      group.rotation.y = Math.sin(time * 0.22) * 0.32 + px * 0.25;
      const p = presence;
      mats.forEach((m) => ((m as THREE.MeshStandardMaterial).envMapIntensity = 0.15 + p * 1.05));
      key.intensity = p * 2.2;
      rim.intensity = p * 1.4;
      garnet.emissiveIntensity = 0.5 + (1 - theta / MAX) * 2.5 * p;
    },
  };
}
