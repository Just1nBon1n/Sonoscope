// sceneManager.js
// Ce module gère la création et l'animation de la scène 3D avec Three.js
// Importation de la bibliothèque Three.js
import * as THREE from "three";

// Importation du PostProcessing pour les effets visuels
import { 
    EffectComposer, 
    RenderPass, 
    BloomEffect, 
    GodRaysEffect, 
    EffectPass, 
    SMAAEffect,
    EdgeDetectionMode
} from "postprocessing";

// === Fonction d'initialisation de la scène 3D ================================
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
    antialias: false,   // Post-processing gère l'anti-aliasing
    powerPreference: "high-performance",
  })

  // Configuration du color space et du tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Configuration de la taille du rendu et du pixel ratio pour une meilleure qualité
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   

  // Ajout du brouillard pour plus de profondeur
  scene.fog = new THREE.FogExp2(0x020202, 0.008); 
  renderer.setClearColor(0x020202);

  // Création des lumières directionnelles pour éclairer les socles et les cubes
  // Directionnel vers le haut
  const lightTop = new THREE.DirectionalLight(0xffffff, 2);
  lightTop.position.set(0, 15, 0); // Éclaire les socles par le dessus/devant
  scene.add(lightTop);

  // Directionnel vers le bas
  const lightBottom = new THREE.DirectionalLight(0xffffff, 2);
  lightBottom.position.set(0, -15, 0); // Éclaire les socles par le dessous
  scene.add(lightBottom);

  // Debug visuel de la lumiere du haut
  // const helperTop = new THREE.DirectionalLightHelper(lightTop, 5);
  // scene.add(helperTop);

  // Debug visuel de la lumiere du bas
  // Pour ta DirectionalLight (lightBottom)
  // const helperBottom = new THREE.DirectionalLightHelper(lightBottom, 5);
  // scene.add(helperBottom);

  // Création de la source des rayons (Gods Rays)
  const sourceGeo = new THREE.SphereGeometry(2, 32, 32);
  const sourceMat = new THREE.MeshStandardMaterial({ 
    color: 0x000000,           
    emissive: 0xffffff,        
    emissiveIntensity: 0.2,    
    transparent: true,
    opacity: 0.8
  });
  const sourceLumineuse = new THREE.Mesh(sourceGeo, sourceMat);
  // Positionnement au centre
  sourceLumineuse.position.set(0, 0, 0); 
  scene.add(sourceLumineuse);
  
  return { scene, camera, renderer, sourceLumineuse };
}
// =============================================================================

// === Fonction d'initialisation du post-processing ============================
export function initPostProcessing(renderer, scene, camera, sourceLumineuse) {
  // 1. Création du composer pour le post-processing
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType 
  });

  // 2. Configuration du rendu de base
  composer.addPass(new RenderPass(scene, camera));

  // 3. Configuration du bloom pour l'effet de lueur
  const bloomEffect = new BloomEffect({
    intensity: 1.5,
    luminanceThreshold: 0.3,
    luminanceSmoothing: 0.2,
  });

  // 4. Configurations des rayons de lumière (God Rays) 
  const godRaysEffect = new GodRaysEffect(camera, sourceLumineuse, {
    height: 480,
    kernelSize: 1, // Flou des rayons
    density: 0.96,
    decay: 0.97,
    weight: 0.1,
    exposure: 1.5,
    samples: 100, // Nombre de rayons 
    clampMax: 1.0
  });

  // 5. Anti-aliasing de haute qualité (SMAA)
  const smaaEffect = new SMAAEffect({
    preset: 3, // Preset de qualité élevée
    edgeDetectionMode: EdgeDetectionMode.COLOR
  });

  // 6. Ajout des passes dans le composer (ordre important)
  const effectPass = new EffectPass(camera, smaaEffect, /*godRaysEffect,*/ bloomEffect);
  composer.addPass(effectPass);

  return { composer, bloomEffect, godRaysEffect };
}
// =============================================================================

// Fonction de génération de nombre aléatoire dans une plage
function rand(min, max) {
  if (max === undefined) { max = min; min = 0; }
  return min + (max - min) * Math.random();
}

// === Fonction pour générer le contenu de la scène ============================
export function initObjets(scene) {
  // Rayon de la sphère
  const rayonSpere = 4;

  // Création d'un objet "monde" pour organiser les éléments de la scène
  const monde = {
    socleBas: new THREE.Group(),
    socleHaut: new THREE.Group(),
    murEQ: new THREE.Group(),
    fluxCentral: new THREE.Group(),
    cubesFlux: [],
    rayonSpere: rayonSpere
  }
  scene.add(monde.socleBas, monde.socleHaut, monde.murEQ, monde.fluxCentral);

  // --- SOCLES (Haut et Bas et Bases) -----------------------------------------
  // Création du socle Bas
  for (let i = 0; i < 3; i++) {
    const rayonInterieur = 13 - (i * 2);
    const rayonExterieur = 12.3 - (i * 2);
    const geoSocleBas = new THREE.CylinderGeometry(rayonExterieur, rayonInterieur, .7, 12);
    const matSocleBas = new THREE.MeshStandardMaterial({ 
      color: 0x9e9e9e,
      metalness: 0.2, 
      roughness: 0.9,
      flatShading: true 
    });
    const etageBas = new THREE.Mesh(geoSocleBas, matSocleBas);
    // Pars a -9 et monte de 0.7
    etageBas.position.y = -9 + (i * .7);
    monde.socleBas.add(etageBas);
  }


  // Création du socle Haut
  for (let i = 0; i < 3; i++) {
    // Inverse les rayons pour faire le socle à l'envers
    const rayonInterieur = 12.3 - (i * 2);
    const rayonExterieur = 13 - (i * 2);
    const geoSocleHaut = new THREE.CylinderGeometry(rayonExterieur, rayonInterieur, .7, 12);
    const matSocleHaut = new THREE.MeshStandardMaterial({
      color: 0x9e9e9e,
      metalness: 0.2, 
      roughness: 0.9,
      flatShading: true 
    });
    const etageHaut = new THREE.Mesh(geoSocleHaut, matSocleHaut);
    // Pars a 9 et descend de 0.7
    etageHaut.position.y = 9 - (i * .7);
    monde.socleHaut.add(etageHaut);
  }

  // Création de la base des socles 
  const geoBaseSocle = new THREE.CylinderGeometry(14, 14, 2, 64);
  const matBaseSocle = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.2,
    roughness: 0.9 
  });
  const baseSocleBas = new THREE.Mesh(geoBaseSocle, matBaseSocle);
  baseSocleBas.position.y = -10;
  baseSocleBas.name = "baseFixe";
  const baseSocleHaut = new THREE.Mesh(geoBaseSocle, matBaseSocle);
  baseSocleHaut.position.y = 10;
  baseSocleHaut.name = "baseFixe";
  monde.socleBas.add(baseSocleBas);
  monde.socleHaut.add(baseSocleHaut);

  // --- MUR EQ ----------------------------------------------------------------
  // Configuration du mur EQ
  const configMurEQ = {
    nbColonnes: 64,
    cubesParColonne: 14,
    rayon: 34,
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
        color: 0x000000,           
        emissive: 0x000000,        
        emissiveIntensity: 1.0,    
        metalness: 0.2,            
        roughness: 0.9, 
      });

      const cube = new THREE.Mesh(geoCubeEQ, matIndividuel);
      // Calcul de la position verticale du cube dans la colonne
      // 1. Calcul de la hauteur totale de la colonne (cubes + espacement)
      const hauteurTotaleColonne = configMurEQ.cubesParColonne * configMurEQ.tailleCube + (configMurEQ.cubesParColonne - 1) * configMurEQ.espacement;
      // 2. Positionnement du cube en fonction de son index dans la colonne
      const yPos = (j * (configMurEQ.tailleCube + configMurEQ.espacement)) - (hauteurTotaleColonne / 2) + (configMurEQ.tailleCube / 2);
      // 3. application des positions 
      cube.position.set(x, yPos, z);
      cube.lookAt(0, yPos, 0);
      // 4. Variation aléatoire en Z (range: -1 à 1)
      const variationZ = (Math.random() - 0.5) * 2.0; 
      cube.translateZ(variationZ);

      // Stockage de la position originale du cube pour l'animation
      cube.userData.originalPos = cube.position.clone();

      // Ajout du cube à la scène et à la colonne
      monde.murEQ.add(cube);
      colonne.push(cube);
    }
    monde.colonnesEQ.push(colonne);
  }

  // --- FLUX CENTRAL ----------------------------------------------------------
  const nbObjet = 150;
  const geoFlux = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < nbObjet; i++) {
    // 1. Couleur de base aléatoire
    const baseColCube = rand(30, 50) | 0;

    // 2. Création matériau avec la couleur de base
    const matFlux = new THREE.MeshStandardMaterial({ 
        color: `hsl(0, 0%, ${baseColCube}%)`, 
        emissive: `hsl(0, 0%, ${baseColCube}%)`,
        emissiveIntensity: 0.5,
        metalness: 0.9, 
        roughness: 0.3,
        transparent: true,
        opacity: 1.0
    });

    // 3. Création du mesh avec la géométrie et le matériau
    const cube = new THREE.Mesh(geoFlux, matFlux);

    // 4. Stockage de la valeur pour l'animation
    cube.userData.baseColCube = new THREE.Color(`hsl(0, 0%, ${baseColCube}%)`);

    // 5. Positionnement des cubes dans une sphère 
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
        rayonSpere * Math.cos(theta) * Math.sin(phi),   // X
        rayonSpere * Math.sin(theta) * Math.sin(phi),   // Z
        rayonSpere * Math.cos(phi)                      // Y
    );

    // 6. Scale random
    const s = rand(0.4, 1.4);
    cube.scale.set(s, s, s);

    // 7. Stockage de la position originale du cube pour l'animation
    cube.userData.originalPos = cube.position.clone();

    // 8. Stockage du scale original du cube pour l'animation
    cube.userData.originalScale = s;

    // 9. Faire face au centre
    cube.lookAt(0, 0, 0);

    // 10. Ajout du cube à la scène et au tableau de cubes du flux central
    monde.fluxCentral.add(cube);
    monde.cubesFlux.push(cube);
  }

  return monde;
}
// =============================================================================