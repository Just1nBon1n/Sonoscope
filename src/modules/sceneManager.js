// Importation de la bibliothèque Three.js
import * as THREE from "three";

// --- Fonction d'initialisation de la scène 3D --------------------------------
export function initScene(canvas3D) {
  // Création de la scène
  const scene = new THREE.Scene();

  // Création de la caméra
  const camera = new THREE.PerspectiveCamera(
    50,
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
  const point1 = new THREE.PointLight(0xffffff, 500);
  point1.position.set(10, 10, 10);
  const point2 = new THREE.PointLight(0xffffff, 500);
  point2.position.set(-10, -10, -10);
  scene.add(ambient, point1, point2);
  
  return { scene, camera, renderer };
}
// -----------------------------------------------------------------------------

// Fonction de génération de nombre aléatoire dans une plage
function rand(min, max) {
  if (max === undefined) { max = min; min = 0; }
  return min + (max - min) * Math.random();
}

// --- Fonction pour générer le contenu de la scène ----------------------------
export function initObjets(scene) {
  const monde = {
    socleBas: new THREE.Group(),
    socleHaut: new THREE.Group(),
    murEQ: new THREE.Group(),
    fluxCentral: new THREE.Group(),
    cubesFlux: []
  }
  scene.add(monde.socleBas, monde.socleHaut, monde.murEQ, monde.fluxCentral);

  // Création du socle Bas
  for (let i = 0; i < 3; i++) {
    const rayonInterieur = 13 - (i * 2);
    const rayonExterieur = 12.3 - (i * 2);
    const geoSocleBas = new THREE.CylinderGeometry(rayonExterieur, rayonInterieur, .7, 32);
    const matSocleBas = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const etageBas = new THREE.Mesh(geoSocleBas, matSocleBas);
    etageBas.position.y = -9 + (i * .7);
    monde.socleBas.add(etageBas);
  }

  // Création du socle Haut
  for (let i = 0; i < 3; i++) {
    const rayonInterieur = 12.3 - (i * 2);
    const rayonExterieur = 13 - (i * 2);
    const geoSocleHaut = new THREE.CylinderGeometry(rayonExterieur, rayonInterieur, .7, 32);
    const matSocleHaut = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const etageHaut = new THREE.Mesh(geoSocleHaut, matSocleHaut);
    etageHaut.position.y = 9 - (i * .7);
    monde.socleHaut.add(etageHaut);
  }

  // Création du flux central
  const nbObjet = 100;
  const geoFlux = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < nbObjet; i++) {
    // Couleur aléatoire et floor avec | 0
    const hue = rand(360) | 0;
    const matFlux = new THREE.MeshStandardMaterial({ color: `hsl(${hue}, 80%, 50%)` });

    const cube = new THREE.Mesh(geoFlux, matFlux);

    cube.position.set(rand(-4, 4), rand(-5, 5), rand(-4, 4));

    cube.rotation.set(rand(Math.PI), rand(Math.PI), 0);

    const s = rand(0.2, 1.5);
    cube.scale.set(s, s, s);

    monde.fluxCentral.add(cube);
    monde.cubesFlux.push(cube);
  }

  return monde;
}
// -----------------------------------------------------------------------------