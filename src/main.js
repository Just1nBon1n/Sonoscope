// Sonoscope - Visualiseur de musique en temps réel
// Fichier principal : src/main.js
// Ce fichier initialise la scène 3D, gère l'audio et lance l'animation
// === Fichier principal de l'application ======================================
// Importation des fonctions des modules
import { initAudio, obtenirDonneesLog } from "./modules/audioManager.js";
import {
  extractionCouleurs,
  trierPaletteParLuminance,
  analyserPalette,
} from "./modules/colorManager.js";
import { initGUI } from "./modules/guiManager.js";
import {
  obtenirMetadonneesMusique,
  setLastFmUser,
} from "./modules/metaDataManager.js";
import {
  initScene,
  initObjets,
  initPostProcessing,
} from "./modules/sceneManager.js";
import {
  updateMusiqueUI,
  initPaletteUI,
  setupDebugToggle,
  drawDebug,
  drawCompareDebug,
} from "./modules/uiManager.js";

// === Importation de la bibliothèque Three.js et des modules ==================
import * as THREE from "three";
import ColorThief from "colorthief";
import GUI from "lil-gui";
import { Timer } from "three/src/core/Timer.js";

// === Gestion resize de la fenêtre ============================================
window.addEventListener("resize", () => {
  // Mettre à jour la caméra
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Mettre à jour le rendu
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
// =============================================================================

// === Gestion du démarrage ====================================================
// Analyse de l'URL pour récupérer le pseudo Last.fm (ex: ?user=MonPseudo)
const urlParams = new URLSearchParams(window.location.search);
// Variable de pseudo dans l'URL
const userFromUrl = urlParams.get("user");
// Variable de pseudo dans la mémoire locale du navigateur
const userFromMemory = localStorage.getItem("sonoscope_user");

// On définit le pseudo prioritaire dès le début (URL > Mémoire > Valeur par défaut)
const pseudoAuDemarrage = userFromUrl || userFromMemory;

// On initialise les composants UI
initPaletteUI();
setupDebugToggle();

// Différent éléments du UI
// Écran d'accueil
const pageAcceuil = document.getElementById("accueil");
// Bouton de démarrage
const btnStart = document.getElementById("bouton-entrer");
// Input du pseudo dans le démarrage
const initialInput = document.getElementById("accueil-user-input");
// Input du pseudo dans le player
const playerInput = document.getElementById("controles-user-input");

// Si un pseudo est présent (URL ou mémoire), on l'utilise dans les inputs
if (pseudoAuDemarrage) {
  initialInput.value = pseudoAuDemarrage;
  playerInput.value = pseudoAuDemarrage;
}

// Événement de clic sur le bouton de démarrage (Agit comme le clic initial pour activer l'audio)
btnStart.addEventListener("click", async () => {
  // On utilise le pseudo défini au démarrage
  // trim pour éviter les espaces vides
  const user = initialInput.value.trim();
  if (user) {
    // Mettre à jour le pseudo dans le input
    if (playerInput) playerInput.value = user;

    // Ajout du pseudo dans la mémoire locale
    localStorage.setItem("sonoscope_user", user);

    // Mise à jour de l'URL
    const newUrl = `${window.location.origin}${window.location.pathname}?user=${user}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    // Mise a jour de l'utilisateur dans metaDataManager
    setLastFmUser(user);
    pageAcceuil.classList.add("fade-out");

    // initialisation de l'audio et lancement du polling
    audioElements = await initAudio();
    polling();
    setInterval(polling, 5000);
  }
});

// Bouton GO pour changer d'utilisateur Last.fm
document.getElementById("controles-go-bouton").addEventListener("click", () => {
  const nouveauPseudo = playerInput.value.trim();
  if (nouveauPseudo !== "") {
    setLastFmUser(nouveauPseudo);

    // Aussi mettre à jour le pseudo dnas la mémoire locale
    localStorage.setItem("sonoscope_user", nouveauPseudo);
    const newUrl = `${window.location.origin}${window.location.pathname}?user=${nouveauPseudo}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    polling();
  }
});
// =============================================================================

// === Vérification toutes les 10 secondes (Polling) ===========================
let dernierIsrc = null;

async function polling() {
  // Récupération des métadonnées de la musique actuelle
  const musicData = await obtenirMetadonneesMusique();

  // Vérification du ISRC pour éviter le double polling sur la même musique
  if (!musicData || musicData.isrc === dernierIsrc) {
    return;
  }
  // Si nouvelle musique changer le dernier ISRC
  dernierIsrc = musicData.isrc;

  // Affichage dans la console du titre et de l'artiste
  console.log(`Nouvelle musique : ${musicData.titre} --- ${musicData.artiste}`);
  // Affichage de l'ISRC dans la console
  console.log(`ISRC : ${musicData.isrc}`);

  // Appel de la fonction de gestion des couleurs avec les métadonnées
  gestionCouleurs(musicData);

  if (musicData.reccobeats && musicData.reccobeats.content) {
    // Affichage des audio features de ReccoBeats
    console.log("Détails ReccoBeats :", musicData.reccobeats.content);
  }
}
// =============================================================================

// === Extraction des couleurs de la musique et mise à jour de la scène 3D =====
async function gestionCouleurs(musicData) {
  if (musicData.pochetteUrl) {
    try {
      // 1. Extraction et Tri
      let nouvellePalette = await extractionCouleurs(musicData.pochetteUrl);
      nouvellePalette = trierPaletteParLuminance(nouvellePalette);

      // 2. Calcul des stats sur la NOUVELLE palette
      const stats = analyserPalette(nouvellePalette);

      // --- 3. Logique du rendu adaptatif sur le bloom ------------------------
      // Seuil (Threshold) : filtrage de la lumière
      const ratioLum = stats.moyenneLum;
      monde.bloomThresholdCible = THREE.MathUtils.mapLinear(
        Math.pow(ratioLum, 1.5),
        0,
        1, // Plage d'entrée (0 = album très sombre, 1 = album très lumineux)
        0.1, // Sortie min (Album noir) : plus de lumière
        0.95, // Sortie max (Album très lumineux) : moins de lumière
      );

      // Intensité : Force de la lumière
      const ratioSat = stats.moyenneSat;
      monde.bloomIntensityCible = THREE.MathUtils.mapLinear(
        ratioSat,
        0,
        1, // Plage d'entrée (0 = album très désaturé, 1 = album très saturé)
        2, // Sortie min (Album désaturé) : lumière plus forte
        0.8, // Sortie max (Album saturé) : lumière moins forte
      );
      // -----------------------------------------------------------------------

      // 4. Mise à jour des références pour la transition 3D
      monde.paletteCible = nouvellePalette;
      if (!monde.paletteActuelle) {
        monde.paletteActuelle = nouvellePalette.map((c) => c.clone());
      }

      // 5. Interface
      updateMusiqueUI(musicData, nouvellePalette);
    } catch (err) {
      console.error("Erreur lors de l'extraction des couleurs :", err);
    }
  }
}
// =============================================================================

// === Initialisation de l'audio dans navigateur (avec click) ==================
let audioElements = null;
window.addEventListener(
  "click",
  async () => {
    // Si l'audio n'est pas déjà lancé
    if (!audioElements) {
      audioElements = await initAudio();

      if (audioElements) {
        console.log("Flux audio activé !");
      }
    }
  },
  { once: true },
);
// =============================================================================

// === Initialisation de la scène 3D et des objets =============================
// Importation du canvas 3D
const canvas3D = document.getElementById("scene3D");

// Récupération des éléments de la scène 3D ("Déstructuration")
const { scene, camera, renderer, sourceLumineuse } = initScene(canvas3D);
const monde = initObjets(scene);

// Initialisation du nouveau post-processing avec la source
const { composer, bloomEffect, godRaysEffect } = initPostProcessing(
  renderer,
  scene,
  camera,
  sourceLumineuse,
);

// Ajout des éléments du post-processing dans l'objet monde
monde.composer = composer;
monde.bloom = bloomEffect;
monde.godRays = godRaysEffect;

// Initialisation par défaut pour éviter les crashs au démarrage
monde.paletteActuelle = Array(12)
  .fill()
  .map(() => new THREE.Color(0x404040));
monde.paletteCible = Array(12)
  .fill()
  .map(() => new THREE.Color(0x404040));

// Valeurs par défaut pour l'initialisation du bloom
monde.bloomThresholdCible = 0.2;
monde.bloomIntensityCible = 1.5;
monde.facteurAmbiance = 0.2;

// Initialisation de l'interface de contrôle
// Je n'utilise plus GUI
// initGUI(camera, monde);

// Variables pour l'animation de la caméra
let angleCamera = 0;
const distanceCamera = 25; // La distance entre la caméra et le centre
const vitesseRotation = 0.002;

// Création d'une horloge pour les animations temporelles
const timer = new Timer();
// =============================================================================

// === Animation de la scène ===================================================
function animate() {
  // Mise à jour du timer pour les animations temporelles
  timer.update();
  const delta = timer.getDelta();
  // L'ajustement de la vitesse en fonction du delta pour une animation fluide même si le framerate varie
  // la formule: Math.min(valeur * adj, 1)
  const adj = delta * 60;

  // Pour faire une transition fluide des couleurs
  if (monde.paletteActuelle && monde.paletteCible) {
    monde.paletteActuelle.forEach((couleur, i) => {
      if (monde.paletteCible[i]) {
        couleur.lerp(monde.paletteCible[i], Math.min(0.05 * adj, 1)); // 0.05 = vitesse de transition
      }
    });
  }

  // if audio est prêt et actif
  if (audioElements) {
    // --- Récupération des données audio en temps réel ------------------------
    audioElements.analyser.getByteFrequencyData(audioElements.dataArray);
    // Smoothing valeur de base 0.8 et monte jusqu'à 0.99
    audioElements.analyser.smoothingTimeConstant = 0.8;

    // --- Traitement des données audios ---------------------------------------
    const { processedData, rawData } = obtenirDonneesLog(
      audioElements.dataArray,
      monde.colonnesEQ.length,
      audioElements.audioContext.sampleRate,
    );

    // --- CANVAS DEBUG 2D -----------------------------------------------------
    const debugPanel = document.getElementById("debug-panel");
    // On ne dessine que si le panel n'est pas caché (classe 'hidden')
    if (debugPanel && !debugPanel.classList.contains("hidden")) {
      drawDebug(audioElements.analyser, audioElements.dataArray);
      drawCompareDebug(rawData, processedData);
    }

    // --- ANIM CAMÉRA ---------------------------------------------------------
    angleCamera += vitesseRotation * adj;
    camera.position.x = Math.cos(angleCamera) * distanceCamera;
    camera.position.z = Math.sin(angleCamera) * distanceCamera;
    camera.lookAt(0, 0, 0);

    // --- ANIM LUMIÈRES -------------------------------------------------------

    // --- ANIM BLOOM ----------------------------------------------------------
    if (monde.bloom) {
      // 1. On transitionne directement vers les cibles calculées dans le polling
      // Le Lerp se chargera de faire le chemin entre l'actuel et la cible.
      monde.bloom.luminanceMaterial.threshold = THREE.MathUtils.lerp(
        monde.bloom.luminanceMaterial.threshold,
        monde.bloomThresholdCible,
        Math.min(0.05 * adj, 1),
      );

      monde.bloom.intensity = THREE.MathUtils.lerp(
        monde.bloom.intensity,
        monde.bloomIntensityCible,
        Math.min(0.05 * adj, 1),
      );

      // 2. On calcule le facteur d'ambiance "en temps réel" basé sur les valeurs lissées
      // Le facteur d'ambiance est une valeur que j'utilise pour faire varier l'intensité
      // de la scène et créer un équilibre entre le socntrste de palette
      monde.facteurAmbiance =
        (monde.bloom.luminanceMaterial.threshold +
          (1.0 - monde.bloom.intensity / 2)) /
        2;
    }

    // --- ANIM SOCLES (Haut et Bas) -------------------------------------------
    // Analyse des zones de fréquences pour les socles
    let sommeLow = 0;
    for (let i = 0; i < 15; i++) {
      sommeLow += processedData[i];
    }
    const rawLow = sommeLow / 15;

    let sommeHigh = 0;
    for (let i = 40; i < 64; i++) {
      sommeHigh += processedData[i];
    }
    // Boost car les high sont moins puissant que les basses
    const rawHigh = (sommeHigh / 24) * 1.2;

    // Lissage
    monde.smoothLow = THREE.MathUtils.lerp(
      monde.smoothLow || 0,
      rawLow,
      Math.min(0.2 * adj, 1),
    );
    monde.smoothHigh = THREE.MathUtils.lerp(
      monde.smoothHigh || 0,
      rawHigh,
      Math.min(0.2 * adj, 1),
    );

    // Couleurs des socles basées sur la palette de la musique
    const colSocle = monde.paletteActuelle[1];
    const colSocle2 = monde.paletteActuelle[4];
    // Couleur de repos des socles
    const colReposSocle = new THREE.Color(0x404040);
    const colReposBase = new THREE.Color(0x303030);

    //
    const forceLow = Math.pow(monde.smoothLow, 2.5);
    //
    const forceHigh = Math.pow(monde.smoothHigh, 1.8);

    // Calcul de la "présence sonore" pour savoir si les socles doivent etre en couleur ou en mode repos
    monde.presenceSonore = THREE.MathUtils.lerp(
      monde.presenceSonore || 0,
      forceLow + forceHigh > 0.005 ? 1 : 0,
      Math.min(0.05 * adj, 1), // Vitesse de transition (0.05 = environ 1 seconde pour s'éteindre)
    );

    // Animation Socle Bas
    monde.socleBas.children.forEach((etage, i) => {
      if (i < 3) {
        // 1. Determiner le sens
        const sens = i % 2 === 0 ? 1 : -1;
        // 2. Vitesse de base
        const vitesseRepos = 0.002;
        // 3.1 Vitesse maximale
        const boostMax = 0.02;
        const cibleVitesse = vitesseRepos + forceLow * boostMax;
        // 3.2 Application avec inertie
        etage.userData.currentVitesse = THREE.MathUtils.lerp(
          etage.userData.currentVitesse || 0,
          cibleVitesse,
          Math.min(0.05 * adj, 1),
        );
        // 3.3 Application de la rotation
        etage.rotation.y +=
          etage.userData.currentVitesse * sens * (1 + i * 0.3) * adj;
        // 4.1 Cible du scale
        const multEtage = (i + 1) * 0.1;
        const cibleScaleLow = 1 - forceLow * multEtage;
        // 4.2 Anim de scale
        etage.userData.currentScale = THREE.MathUtils.lerp(
          etage.userData.currentScale || 1.0,
          cibleScaleLow,
          Math.min(0.1 * adj, 1),
        );
        // 4.3 Application du scale
        etage.scale.set(
          etage.userData.currentScale,
          etage.userData.currentScale,
          etage.userData.currentScale,
        );
        // 5 Application de la couleur
        const couleurCiblePalette = i === 1 ? colSocle2 : colSocle;
        etage.material.color
          .copy(colReposSocle)
          .lerp(couleurCiblePalette, monde.presenceSonore)
          .convertSRGBToLinear();
        etage.material.emissive.copy(couleurCiblePalette).convertSRGBToLinear();
        const EmISocleBas = THREE.MathUtils.mapLinear(
          monde.facteurAmbiance || 0.2,
          0.1,
          0.9,
          0.8,
          0.2,
        );
        etage.material.emissiveIntensity =
          monde.presenceSonore * (EmISocleBas + forceLow * 0.2);
      }
    });

    // Animation Socle Haut
    monde.socleHaut.children.forEach((etage, i) => {
      if (i < 3) {
        // 1. Determiner le sens
        const sens = i % 2 === 0 ? -1 : 1;
        // 2. Vitesse de base
        const vitesseRepos = 0.002;
        // 3.1 Vitesse maximale
        const boostMax = 0.02;
        const cibleVitesse = vitesseRepos + forceHigh * boostMax;
        // 3.2 Application avec inertie
        etage.userData.currentVitesse = THREE.MathUtils.lerp(
          etage.userData.currentVitesse || 0,
          cibleVitesse,
          Math.min(0.05 * adj, 1),
        );
        // 3.3 Application de la rotation
        etage.rotation.y +=
          etage.userData.currentVitesse * sens * (1 + i * 0.3) * adj;
        // 4.1 Cible du scale
        const multEtage = (i + 1) * 0.1;
        const cibleScaleHigh = 1.0 - forceHigh * multEtage;
        // 4.2 Anim de scale
        etage.userData.currentScale = THREE.MathUtils.lerp(
          etage.userData.currentScale || 1.0,
          cibleScaleHigh,
          Math.min(0.1 * adj, 1),
        );
        // 4.3 Application du scale
        etage.scale.set(
          etage.userData.currentScale,
          etage.userData.currentScale,
          etage.userData.currentScale,
        );
        // 5. Application de la couleur
        const couleurCiblePalette = i === 1 ? colSocle2 : colSocle;
        etage.material.color
          .copy(colReposSocle)
          .lerp(couleurCiblePalette, monde.presenceSonore)
          .convertSRGBToLinear();
        etage.material.emissive.copy(couleurCiblePalette).convertSRGBToLinear();
        const EmISocleHaut = THREE.MathUtils.mapLinear(
          monde.facteurAmbiance || 0.2,
          0.1,
          0.9,
          0.8,
          0.2,
        );
        etage.material.emissiveIntensity =
          monde.presenceSonore * (EmISocleHaut + forceLow * 0.2);
      }
    });

    // Couleur de la base des socles
    const colBaseFixe = monde.paletteActuelle[0];

    // Applique la couleur à la base fixe des socles
    monde.socleHaut.children.forEach((objet) => {
      if (objet.name === "baseFixe") {
        objet.material.color
          .copy(colReposBase)
          .lerp(colBaseFixe, monde.presenceSonore)
          .convertSRGBToLinear();
        objet.material.emissive.copy(colBaseFixe).convertSRGBToLinear();
        const EmIbaseSocle = THREE.MathUtils.mapLinear(
          monde.facteurAmbiance || 0.2,
          0.1,
          0.9,
          0.8,
          0.2,
        );
        objet.material.emissiveIntensity =
          monde.presenceSonore * (EmIbaseSocle + forceLow * 0.2);
      }
    });

    // --- ANIM MUR EQ ---------------------------------------------------------
    const nbColonnes = monde.colonnesEQ.length;

    // Boucle des colonnes du mur EQ
    monde.colonnesEQ.forEach((colonne, i) => {
      let indexData = i < nbColonnes / 2 ? i * 2 : (nbColonnes - i - 1) * 2;
      // Valeur d'intensité entre 0 et 1
      const intensite = processedData[indexData];

      // Boucle des cubes dans la colonne
      colonne.forEach((cube, j) => {
        // Seuil pour allumer le cube
        const seuilCube = j / colonne.length;
        // Détermine si le cube doit être allumé ou éteint
        const estAllume = intensite > seuilCube;
        // Cible de luminosité pour le cube (1 si allumé, 0 si éteint)
        const cibleLuminosite = estAllume ? 1 : 0;

        // Lissage de la luminosité
        // Les deux constantes varie entre 0 et 1, plus haut = plus rapideS
        const attLum = 0.5;
        const releaseLum = 0.2;
        // Condition pour choisir la vitesse de montée ou de descente
        const vitesseLum = estAllume ? attLum : releaseLum;
        // Lerp pour lisser la luminosité
        cube.userData.iLum = THREE.MathUtils.lerp(
          cube.userData.iLum || 0,
          cibleLuminosite,
          Math.min(vitesseLum * adj, 1),
        );

        // Stockage luminosité actuelle
        const intensiteLum = cube.userData.iLum;

        // Stockage du temps actuel pour gérer les délais d'extinction
        const now = Date.now();

        // Si le cube doit être allumé
        if (intensiteLum > 0.01) {
          let color;
          // Mapping de l'index de la colonne à une couleur (lows, mids, highs)
          const ratioData = indexData / nbColonnes;

          // On utilise les 3 dernières couleurs de la palette triée (les plus claires)
          if (ratioData < 0.22)
            color = monde.paletteActuelle[4]; // Basses
          else if (ratioData < 0.65)
            color = monde.paletteActuelle[6]; // Mids
          else color = monde.paletteActuelle[8]; // Highs

          // Materiaux état allumé
          cube.material.color.copy(color).convertSRGBToLinear();
          cube.material.emissive.copy(color).convertSRGBToLinear();

          const baseMur = THREE.MathUtils.mapLinear(
            monde.facteurAmbiance || 0.2,
            0.1, 0.9,
            0.1,
            0.01,
          );
          const punchMur = THREE.MathUtils.mapLinear(
            monde.facteurAmbiance || 0.2,
            0.1, 0.9,
            2.5,
            0.3,
          );

          cube.material.emissiveIntensity =
            intensiteLum * (baseMur + intensite * punchMur);

          // Animation Z de la position du cube
          const punch = 1 + intensite * 1.5;
          const amplitudeZ = 2.0 * punch; // Amplitude maximale de la translation en Z
          cube.userData.offsetZ = THREE.MathUtils.lerp(
            cube.userData.offsetZ || 0,
            amplitudeZ * intensite,
            Math.min(0.4 * adj, 1),
          );

          // Animation scale du cube
          const cibleScaleZ = 1.0 + intensite * 1.5;
          cube.userData.currentScaleZ = THREE.MathUtils.lerp(
            cube.userData.currentScaleZ || 1.0,
            cibleScaleZ,
            Math.min(0.8 * adj, 1), // On veut que l'écrasement soit instantané
          );

          // Mise à jour du temps de la dernière activation du cube
          cube.userData.lastActiveTime = now;
          // Si le cube doit être éteint
        } else {
          // Materiaux état éteint
          cube.material.color.setHex(0x121212).convertSRGBToLinear();
          cube.material.emissive.setHex(0x121212).convertSRGBToLinear();
          cube.material.emissiveIntensity = 0.05;

          // Délai avat que le cube revienne
          const delay = 300;

          // Après le délai, on fait revenir le cube à sa position de base
          if (now - (cube.userData.lastActiveTime || 0) > delay) {
            // Retour à la position de base
            cube.userData.offsetZ = THREE.MathUtils.lerp(
              cube.userData.offsetZ || 0,
              0,
              Math.min(0.02 * adj, 1),
            );

            // Retour à l'échelle de base
            cube.userData.currentScaleZ = THREE.MathUtils.lerp(
              cube.userData.currentScaleZ || 1.0,
              1.0,
              Math.min(0.01 * adj, 1),
            );
          }
        }

        // Application des transformations
        if (cube.userData.originalPos) {
          cube.position.copy(cube.userData.originalPos);
          cube.translateZ(cube.userData.offsetZ || 0);

          // Force le lookAt pour garder la forme circulaire
          cube.lookAt(0, 0, 0);

          cube.scale.set(1.0, 1.0, cube.userData.currentScaleZ || 1.0);
        }
      });
    });

    // --- ANIM FLUX CENTRAL ---------------------------------------------------
    let colFinale = new THREE.Color();
    monde.fluxCentral.children.forEach((cube) => {
      // Vérification de la présence des données originales
      if (cube.userData.originalPos && cube.userData.originalScale) {
        // Normalisation de la hauteur (-1 à 1 au lieu de -rayon à +rayon)
        const hauteurNormalisee =
          cube.userData.originalPos.y / monde.rayonSpere;
        // Conversion de -1 à 1 en 0 à 1 pour faire le lien avec les données audio
        let ratioHauteur = (hauteurNormalisee + 1) / 2;
        // Math.max pour éviter les valeurs négatives
        const indexData = Math.max(
          0,
          // Math.min pour éviter de dépasser la longueur du tableau de données audio
          Math.min(
            processedData.length - 1,
            // Mapping de la hauteur du cube à l'index du tableau de données audio
            Math.floor(ratioHauteur * processedData.length),
          ),
        );
        // Récupération de l'intensité audio pour ce cube
        const intensite = processedData[indexData];

        // On choisit une vitesse différente selon si le son monte ou descend
        // iSmooth crée dans userData pour que chaque cube ait sa propre valeur lissée dans le temps
        // Entre 0 et 1, plus haut = plus rapide
        const vitesseLerp =
          intensite > (cube.userData.iSmooth || 0)
            ? 0.8 // Vitesse de montée (attaque)
            : 0.2; // Vitesse de descente (release)

        // Application du lerp
        cube.userData.iSmooth = THREE.MathUtils.lerp(
          cube.userData.iSmooth || 0,
          intensite,
          Math.min(vitesseLerp * adj, 1),
        );

        // Stockage de l'intensité lissée pour les animations
        // Valeur entre 1 et 0
        const intensiteSmooth = cube.userData.iSmooth;

        // 1. Largeur de OriginalScale (100%) à largeurMin
        const largeurMin = 0.5;
        const largeur =
          cube.userData.originalScale +
          (largeurMin - cube.userData.originalScale) * intensiteSmooth;

        // 2. Longueur : de OriginalScale (100%) à longueurMax
        const intensitePointe = Math.pow(intensiteSmooth, 2);
        const longueurMax = 4.5;
        const longueur =
          cube.userData.originalScale +
          (longueurMax - cube.userData.originalScale) * intensitePointe;

        // 3. Appliquer la nouvelle échelle au cube (largeur et longueur)
        cube.scale.set(largeur, largeur, longueur);

        // 4.1 Animation de la position (expansion à partir du centre)
        const impulsion = Math.pow(intensiteSmooth, 1.5);
        // 4.2 Force de l'expansion (ex: 0.8 = 80% d'expansion max)
        const forceExpansion = 0.8;
        const expansion = 1.0 + impulsion * forceExpansion;
        // 4.3 multiplyScalar parfait pour faire bouger a partir du centre
        cube.position.copy(cube.userData.originalPos).multiplyScalar(expansion);

        // 5.1 Animation de la couleur
        // Choix entre 8 couleurs de la palette (index 2 à 9)
        const indexVarie = 2 + (monde.fluxCentral.children.indexOf(cube) % 10);
        const colAlbum = monde.paletteActuelle[indexVarie];
        // 5.2 Couleur de l'intensité maximale
        const colMax = monde.paletteActuelle[11];
        // 5.3 Couleur de repos
        const colRepos = cube.userData.baseColCube;
        // 5.4 Transition entre les couleurs en fonction de l'intensité
        if (intensiteSmooth < 0.5) {
          // Phase 1 : Du noir vers couleur assignée (index 2 à 9)
          colFinale.copy(colRepos).lerp(colAlbum, intensiteSmooth * 2);
        } else {
          // Phase 2 : Couleur assignée vers le blanc/climax (index 11)
          const ratioClimax = (intensiteSmooth - 0.5) * 2;
          colFinale.copy(colAlbum).lerp(colMax, ratioClimax);
        }
        // 5.5 Application de la couleur finale
        cube.material.color.copy(colFinale).convertSRGBToLinear();

        // 6. Rotation des cubes avec l'intensité ET la couleur (index)
        cube.rotation.z += (intensiteSmooth * 0.15 + indexVarie * 0.001) * adj;

        // 7.1 Animation de l'émissif (Glow)
        cube.material.emissive.copy(colFinale).convertSRGBToLinear();
        // 7.2 Courbe de l'intensité pour l'émissif
        const courbeEmissive = Math.pow(intensiteSmooth, 2);

        // 7.3 Emissive de base adaptative
        const baseEmissiveAdaptative = THREE.MathUtils.mapLinear(
          monde.facteurAmbiance,
          0.1, 0.9, // Plage du facteur d'ambiance
          0.2,
          0.05, // 0.2 pour les sombres, 0.05 pour les très clairs
        );

        // 7.4 Emissive max adaptative (Punch sonore)
        const forceEmissiveAdaptative = THREE.MathUtils.mapLinear(
          monde.facteurAmbiance,
          0.1, 0.9,
          1.2,
          0.05, // On laisse monter à 1.2 pour les sombres, on bride à 0.3 pour les blancs
        );

        // 7.5 Application de l'intensité de l'émissif avec les adaptations
        cube.material.emissiveIntensity =
          baseEmissiveAdaptative + courbeEmissive * forceEmissiveAdaptative;

        // 8.1 Animation de l'opacité
        // Calcul: 1.0 - (intensité lissée * pourcentage d'opacité à retirer)
        const cibleOpacite = 1.0 - intensiteSmooth * 0.1;
        cube.material.opacity = cibleOpacite;

        // 9.1 Animation de la rotation de la sphère entière (flux central)
        // Courbe pour ne pas avoir progression linéaire
        const courbeRotation = Math.pow(intensiteSmooth, 3);
        // 9.2 Vitesse de rotation constante + une partie qui dépend de l'intensité du son
        const vitesseConstante = 0.00002;
        const vitesseImpact = 0.00015;
        // 9.3 Application de la rotation à la sphère entière
        monde.fluxCentral.rotation.y +=
          (vitesseConstante + courbeRotation * vitesseImpact) * adj;
      }
    });
  }

  // --- RENDU FINAL ---
  composer.render();
}
// =============================================================================

// Boucle d'animation
renderer.setAnimationLoop(animate);
