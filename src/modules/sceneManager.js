// Importation de la bibliothèque Three.js
import * as THREE from "three";

// Fonction d'initialisation de la scène 3D
export function initScene(canvas3D) {
  // Création de la scène
  const scene = new THREE.Scene();

  // Création de la caméra
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // Création du rendu
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas3D,
    antialias: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   // Important pour la netteté


  // AJOUT LUMIERE DE BASE
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  const point = new THREE.PointLight(0xffffff, 500);
  point.position.set(10, 10, 10);
  scene.add(ambient, point);
  
  return { scene, camera, renderer };
}

// Fonction pour générer formes de base (Pyramide, Sphère, etc.)
export function initObjets(scene) {
  const groupe = new THREE.Group();

  const geometry = new THREE.CylinderGeometry(11, 11, 2, 20);
  const material = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const socle = new THREE.Mesh(geometry, material);
  socle.position.y = -0.5;
  groupe.add(socle);
  
  // 1. Le Cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x00ff88 })
  );
  cube.position.set(0, 1, 0); // Au centre
  
  // 2. La Pyramide (Cone)
  const pyramide = new THREE.Mesh(
    new THREE.ConeGeometry(1, 2, 4),
    new THREE.MeshStandardMaterial({ color: 0xff0055 })
  );
  pyramide.position.set(-6, 1, -6);

  // 3. La Sphère
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x00ccff })
  );
  sphere.position.set(6, 1, 6);

  groupe.add(cube, pyramide, sphere);
  scene.add(groupe);
  
  return { groupe, cube, pyramide, sphere, socle };
}
