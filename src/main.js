// Sonoscope - Visualiseur de musique en temps réel
// Fichier principal : src/main.js
// Ce fichier initialise la scène 3D, gère l'audio et lance l'animation
// === Fichier principal de l'application ======================================
// Importation des fonctions des modules
import { initAudio, obtenirDonneesLog } from "./modules/audioManager.js";
import { extractionCouleurs } from "./modules/colorManager.js";
import { initGUI } from "./modules/guiManager.js";
import { obtenirMetadonneesMusique, setLastFmUser } from "./modules/metaDataManager.js";
import { initScene, initObjets } from "./modules/sceneManager.js";
import { updateMusiqueUI, initPaletteUI, setupDebugToggle, drawDebug, drawCompareDebug} from "./modules/uiManager.js";

// === Importation de la bibliothèque Three.js et des modules ==================
import * as THREE from "three";
import ColorThief from "colorthief";
import GUI from "lil-gui";

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
const welcomeScreen = document.getElementById("welcome-screen");
// Bouton de démarrage
const startBtn = document.getElementById("start-app");
// Input du pseudo dans le démarrage
const initialInput = document.getElementById("initial-user-input");
// Input du pseudo dans le player
const playerInput = document.getElementById("lastfm-input");

// Si un pseudo est présent (URL ou mémoire), on l'utilise dans les inputs
if (pseudoAuDemarrage) {
  initialInput.value = pseudoAuDemarrage;
  playerInput.value = pseudoAuDemarrage;
}

// Événement de clic sur le bouton de démarrage (Agit comme le clic initial pour activer l'audio)
startBtn.addEventListener("click", async () => {
  // On utilise le pseudo défini au démarrage 
  // trim pour éviter les espaces vides
  const user = initialInput.value.trim();
  if (user) {
    // Ajout du pseudo dans la mémoire locale 
    localStorage.setItem("sonoscope_user", user);
    
    // Mise à jour de l'URL
    const newUrl = `${window.location.origin}${window.location.pathname}?user=${user}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Mise a jour de l'utilisateur dans metaDataManager
    setLastFmUser(user);
    welcomeScreen.classList.add("fade-out");
    
    // initialisation de l'audio et lancement du polling
    audioElements = await initAudio();
    polling();
    setInterval(polling, 10000);
  }
});

// Bouton GO (dans le player)
document.getElementById("update-user").addEventListener("click", () => {
  const nouveauPseudo = playerInput.value.trim();
  if (nouveauPseudo !== "") {
    setLastFmUser(nouveauPseudo);
    
    // FIX 2 : On met aussi à jour la mémoire et l'URL ici !
    localStorage.setItem("sonoscope_user", nouveauPseudo);
    const newUrl = `${window.location.origin}${window.location.pathname}?user=${nouveauPseudo}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    
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
  console.log(
    `Nouvelle musique : "${musicData.titre}" --- ${musicData.artiste}`,
  );
  // Affichage de l'ISRC dans la console
  console.log(`ISRC : ${musicData.isrc}`);

  // Extraction des couleurs de la pochette de l'album
  if (musicData.pochetteUrl) {
    try {
      const nouvellePalette = await extractionCouleurs(musicData.pochetteUrl);

      // On stocke les couleurs pour la 3D
      monde.paletteCible = nouvellePalette;
      if (!monde.paletteActuelle) {
        monde.paletteActuelle = nouvellePalette.map((c) => c.clone());
      }

      // Mise à jour de l'UI avec les nouvelles métadonnées et couleurs
      updateMusiqueUI(musicData, nouvellePalette);
    } catch (err) {
      console.error("Erreur lors de l'extraction des couleurs :", err);
    }
  }

  if (musicData.reccobeats && musicData.reccobeats.content) {
    // Affichage des audio features de ReccoBeats
    console.log("Détails ReccoBeats :", musicData.reccobeats.content);
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
const { scene, camera, renderer } = initScene(canvas3D);
const monde = initObjets(scene);

// Initialisation par défaut pour éviter les crashs au démarrage
monde.paletteActuelle = Array(12).fill().map(() => new THREE.Color(0x404040));
monde.paletteCible = Array(12).fill().map(() => new THREE.Color(0x404040));

// Initialisation de l'interface de contrôle
initGUI(camera, monde);

// Variables pour l'animation de la caméra
let angleCamera = 0;
const distanceCamera = 25; // La distance entre la caméra et le centre
const vitesseRotation = 0.002;
// =============================================================================

// === Animation de la scène ===================================================
function animate() {
  if (monde.paletteActuelle && monde.paletteCible) {
    monde.paletteActuelle.forEach((couleur, i) => {
      if (monde.paletteCible[i]) {
        couleur.lerp(monde.paletteCible[i], 0.05); // 0.05 = vitesse de transition
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
    if (debugPanel && !debugPanel.classList.contains('hidden')) {
        drawDebug(audioElements.analyser, audioElements.dataArray);
        drawCompareDebug(rawData, processedData);
    }

    // --- ANIM CAMÉRA ---------------------------------------------------------
    angleCamera += vitesseRotation;
    camera.position.x = Math.cos(angleCamera) * distanceCamera;
    camera.position.z = Math.sin(angleCamera) * distanceCamera;
    camera.lookAt(0, 0, 0);

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
    const rawHigh = sommeHigh / 24;

    // Lissage
    monde.smoothLow = THREE.MathUtils.lerp(monde.smoothLow || 0, rawLow, 0.1);
    monde.smoothHigh = THREE.MathUtils.lerp(
      monde.smoothHigh || 0,
      rawHigh,
      0.2,
    );

    // Animation Socle Bas
    const forceLow = Math.pow(monde.smoothLow, 2.5);
    monde.socleBas.children.forEach((etage, i) => {
      if (i < 3) {
        // 1. Determiner le sens
        const sens = i % 2 === 0 ? 1 : -1;
        // 2. Vitesse de base
        const vitesseRepos = 0.002;
        // 3. Vitesse maximale
        const boostMax = 0.01;
        const cibleVitesse = vitesseRepos + forceLow * boostMax;
        // 4. Application avec inertie
        etage.userData.currentVitesse = THREE.MathUtils.lerp(
          etage.userData.currentVitesse || 0,
          cibleVitesse,
          0.05,
        );
        // 5. Application de la rotation
        etage.rotation.y +=
          etage.userData.currentVitesse * sens * (1 + i * 0.3);
      }
    });

    // Animation Socle Haut
    const forceHigh = Math.pow(monde.smoothHigh, 2.5);
    monde.socleHaut.children.forEach((etage, i) => {
      if (i < 3) {
        // 1. Determiner le sens
        const sens = i % 2 === 0 ? -1 : 1;
        // 2. Vitesse de base
        const vitesseRepos = 0.003;
        // 3. Vitesse maximale
        const boostMax = 0.01;
        const cibleVitesse = vitesseRepos + forceHigh * boostMax;
        // 4. Application avec inertie
        etage.userData.currentVitesse = THREE.MathUtils.lerp(
          etage.userData.currentVitesse || 0,
          cibleVitesse,
          0.05,
        );
        // 5. Application de la rotation
        etage.rotation.y +=
          etage.userData.currentVitesse * sens * (1 + i * 0.3);
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
          vitesseLum,
        );

        // Stockage luminosité actuelle
        const intensiteLum = cube.userData.iLum;

        // Stockage du temps actuel pour gérer les délais d'extinction
        const now = Date.now();

        if (intensiteLum > 0.01) {
          let color;
          // Mapping de l'index de la colonne à une couleur (lows, mids, highs)
          const ratioData = indexData / nbColonnes;

          if (ratioData < 0.22)
            color = 0xff4444; // Lows
          else if (ratioData < 0.65)
            color = 0x44ff44; // Mids
          else color = 0x4444ff; // Highs

          // Materiaux état allumé
          cube.material.color.setHex(color);
          cube.material.emissive.setHex(color);
          cube.material.emissiveIntensity =
            intensiteLum * (0.3 + intensite * 0.7);

          // Animation de la position du cube
          cube.userData.offsetZ = THREE.MathUtils.lerp(
            cube.userData.offsetZ || 0,
            2.0,
            0.8,
          );

          // Mise à jour du temps de la dernière activation du cube
          cube.userData.lastActiveTime = now;
        } else {
          // Materiaux état éteint
          cube.material.color.setHex(0x404040);
          cube.material.emissive.setHex(0x000000);
          cube.material.emissiveIntensity = 0;

          // Délai avat que le cube revienne
          const delay = 300;

          if (now - (cube.userData.lastActiveTime || 0) > delay) {
            // Retour à la position de base
            cube.userData.offsetZ = THREE.MathUtils.lerp(
              cube.userData.offsetZ || 0,
              0,
              0.05,
            );
          }
        }

        // Application de la translation en Z local du cube
        if (cube.userData.originalPos) {
          // Retour a la position originale (avant translation)
          cube.position.copy(cube.userData.originalPos);
          // Translation en Z local
          cube.translateZ(cube.userData.offsetZ);
        }
      });
    });

    // --- ANIM FLUX CENTRAL ---------------------------------------------------
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
            ? 0.4 // Vitesse de montée (attaque)
            : 0.2; // Vitesse de descente (release)

        // Application du lerp
        cube.userData.iSmooth = THREE.MathUtils.lerp(
          cube.userData.iSmooth || 0,
          intensite,
          vitesseLerp,
        );

        // Stockage de l'intensité lissée pour les animations
        // Valeur entre 1 et 0
        const intensiteSmooth = cube.userData.iSmooth;

        // 1. Animation de rotation du cube en fonction de l'intensité
        cube.rotation.z += intensiteSmooth * 0.1;

        // 2.1 Largeur de OriginalScale (100%) à largeurMin
        const largeurMin = 0.5;
        const largeur =
          cube.userData.originalScale +
          (largeurMin - cube.userData.originalScale) * intensiteSmooth;

        // 2.2 Longueur : de OriginalScale (100%) à longueurMax
        const longueurMax = 4.5;
        const longueur =
          cube.userData.originalScale +
          (longueurMax - cube.userData.originalScale) * intensiteSmooth;

        // 2.3 Appliquer la nouvelle échelle au cube
        cube.scale.set(largeur, largeur, longueur);

        // 3. Animation de la position (expansion à partir du centre)
        // Force de l'expansion (ex: 0.8 = 80% d'expansion max)
        const forceExpansion = 0.8;
        const expansion = 1.0 + intensiteSmooth * forceExpansion;
        // multiplyScalar parfait pour faire bouger a partir du centre
        cube.position.copy(cube.userData.originalPos).multiplyScalar(expansion);

        // 4.1 Animation de la couleur
        // Courbe pour ne pas avoir progression linéaire
        const courbeCouleur = Math.pow(intensiteSmooth, 2.5);
        // Valeur max de la luminosité (L dans HSL)
        const maxColor = 100;
        // 4.2 Calcul de la luminosité actuelle
        const currentLightness =
          // min = baseColor max = maxColor
          cube.userData.baseColor +
          (maxColor - cube.userData.baseColor) * courbeCouleur;
        // 4.3 On applique la nouvelle couleur au matériau
        // .setHSL(hue, saturation, lightness) attend des valeurs entre 0 et 1
        cube.material.color.setHSL(0, 0, currentLightness / 100);
        cube.material.emissive.setHSL(0, 0, currentLightness / 100);
        // 4.4 Animation de l'intensité de l'emissive
        const courbeEmissive = Math.pow(intensiteSmooth, 3);
        const maxEmissive = 2.5;
        const baseEmissive = 0.5;
        cube.material.emissiveIntensity =
          (maxEmissive + baseEmissive) * courbeEmissive;

        // 5.1 Animation de la rotation de la sphère entière (flux central)
        // Courbe pour ne pas avoir progression linéaire
        const courbeRotation = Math.pow(intensiteSmooth, 3);
        // 5.2 Vitesse de rotation constante + une partie qui dépend de l'intensité du son
        const vitesseConstante = 0.00001;
        const vitesseImpact = 0.0001;
        // 5.3 Application de la rotation à la sphère entière
        monde.fluxCentral.rotation.y +=
          vitesseConstante + courbeRotation * vitesseImpact;
      }
    });
  }

  // --- RENDU FINAL ---
  renderer.render(scene, camera);
}
// =============================================================================

// Boucle d'animation
renderer.setAnimationLoop(animate);
