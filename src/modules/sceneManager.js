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
  // Rayon de dispertion du nuage
  const rayonNuage = 4;

  for (let i = 0; i < nbObjet; i++) {
    // Couleur aléatoire et floor avec | 0
    const hue = rand(360) | 0;
    const matFlux = new THREE.MeshStandardMaterial({ 
      color: `hsl(${hue}, 80%, 50%)`, 
      emissive: `hsl(${hue}, 80%, 50%)`,
      emissiveIntensity: 0.5
    });

    const cube = new THREE.Mesh(geoFlux, matFlux);

    // PHI = gère l'étagement (arc demie-cercle - vertical)
    // 1. (-1 + (2 * i) / nbObjet) : distribue les points entre -1 et 1
    // 2. Math.acos() : transforme -1 à 1 en un angle entre 0 et π
    const phi = Math.acos(-1 + (2 * i) / nbObjet); 
    
    // THETA = gère l'éparpillement (arc cercle complet - horizontal)
    // 1. (nbObjet * Math.PI) : surface de la sphère (proportionnelle au nombre d'objets)
    // 2. Math.sqrt() : pour éviter que les concentration de points
    // 3. * phi : pour faire tourner les points en fonction de leur latitude (phi)
    const theta = Math.sqrt(nbObjet * Math.PI) * phi;

    // Positionnement du cube en coordonnées sphériques
    // Math.sin(phi) = taille de l'anneau à la latitude donnée (cette hauteur)
    // Math.cos(theta) et Math.sin(theta) : placer le point sur l'anneau
    // Math.cos(phi) : pour la hauteur du point
    cube.position.set(
        rayonNuage * Math.cos(theta) * Math.sin(phi),   // X
        rayonNuage * Math.sin(theta) * Math.sin(phi),   // Z
        rayonNuage * Math.cos(phi)                      // Y
    );

    cube.lookAt(0, 0, 0);

    // Scale random
    const s = rand(0.4, 1.4);
    cube.scale.set(s, s, s);

    monde.fluxCentral.add(cube);
    monde.cubesFlux.push(cube);
  }

  return monde;
}
// -----------------------------------------------------------------------------