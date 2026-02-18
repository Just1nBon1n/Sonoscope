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
  // Création d'un objet "monde" pour organiser les éléments de la scène
  const monde = {
    socleBas: new THREE.Group(),
    socleHaut: new THREE.Group(),
    murEQ: new THREE.Group(),
    fluxCentral: new THREE.Group(),
    cubesFlux: []
  }
  scene.add(monde.socleBas, monde.socleHaut, monde.murEQ, monde.fluxCentral);


  // --- SOCLES (Haut et Bas et Bases) ---
  // Création du socle Bas
  for (let i = 0; i < 3; i++) {
    const rayonInterieur = 13 - (i * 2);
    const rayonExterieur = 12.3 - (i * 2);
    const geoSocleBas = new THREE.CylinderGeometry(rayonExterieur, rayonInterieur, .7, 32);
    const matSocleBas = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const etageBas = new THREE.Mesh(geoSocleBas, matSocleBas);
    // Pars a -9 et monte de 0.7
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
    // Pars a 9 et descend de 0.7
    etageHaut.position.y = 9 - (i * .7);
    monde.socleHaut.add(etageHaut);
  }

  // Création de la base des socles 
  const geoBaseSocle = new THREE.CylinderGeometry(14, 14, 2, 64);
  const matBaseSocle = new THREE.MeshStandardMaterial({ color: 0x237346 });
  const baseSocleBas = new THREE.Mesh(geoBaseSocle, matBaseSocle);
  baseSocleBas.position.y = -10;
  const baseSocleHaut = new THREE.Mesh(geoBaseSocle, matBaseSocle);
  baseSocleHaut.position.y = 10;
  monde.socleBas.add(baseSocleBas);
  monde.socleHaut.add(baseSocleHaut);


  // --- MUR EQ ---
  const configMurEQ = {
    nbColonnes: 64,
    cubesParColonne: 14,
    rayon: 30,
    tailleCube: 2,
    espacement: 1
  };

  // Tableau pour stocker les références des cubes du mur EQ
  monde.colonnesEQ = []; 

  // Géo identique mais mat différent pour chaque cube du mur EQ
  const geoCubeEQ = new THREE.BoxGeometry(configMurEQ.tailleCube, configMurEQ.tailleCube, configMurEQ.tailleCube);

  // Création des colonnes du mur EQ
  for (let i = 0; i < configMurEQ.nbColonnes; i++) {
    const colonne = [];

    // Calcul de la position angulaire de chaque colonne (pour faire un cercle)
    const angle = (i / configMurEQ.nbColonnes) * Math.PI * 2;
    const x = Math.cos(angle) * configMurEQ.rayon;
    const z = Math.sin(angle) * configMurEQ.rayon;

    // Création des cubes pour chaque colonne
    for (let j = 0; j < configMurEQ.cubesParColonne; j++) {
      const matIndividuel = new THREE.MeshStandardMaterial({ 
        color: 0x404040, 
      });

      const cube = new THREE.Mesh(geoCubeEQ, matIndividuel);
      // Calcul de la position verticale du cube dans la colonne
      // 1. Calcul de la hauteur totale de la colonne (cubes + espacement)
      const hauteurTotaleColonne = configMurEQ.cubesParColonne * configMurEQ.tailleCube + (configMurEQ.cubesParColonne - 1) * configMurEQ.espacement;
      // 2. Positionnement du cube en fonction de son index dans la colonne
      const yPos = (j * (configMurEQ.tailleCube + configMurEQ.espacement)) - (hauteurTotaleColonne / 2) + (configMurEQ.tailleCube / 2);
      cube.position.set(x, yPos, z);
      cube.lookAt(0, yPos, 0);

      // Ajout du cube à la scène et à la colonne
      monde.murEQ.add(cube);
      colonne.push(cube);
    }
    monde.colonnesEQ.push(colonne);
  }


  // --- FLUX CENTRAL ---
  const nbObjet = 100;
  const geoFlux = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < nbObjet; i++) {
    // Couleur aléatoire et floor avec | 0
    const hue = rand(360) | 0;
    const matFlux = new THREE.MeshStandardMaterial({ color: `hsl(${hue}, 80%, 50%)` });

    const cube = new THREE.Mesh(geoFlux, matFlux);

    // Position random
    cube.position.set(rand(-4, 4), rand(-5, 5), rand(-4, 4));

    // Rotation random
    cube.rotation.set(rand(Math.PI), rand(Math.PI), 0);

    // Scale random
    const s = rand(0.2, 1.5);
    cube.scale.set(s, s, s);

    monde.fluxCentral.add(cube);
    monde.cubesFlux.push(cube);
  }

  return monde;
}
// -----------------------------------------------------------------------------