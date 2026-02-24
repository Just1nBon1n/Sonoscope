// === Fichier principal de l'application ======================================
// Importation des fonctions des modules 
import { initAudio, obtenirDonneesLog } from "./modules/audioManager.js";
import { initScene, initObjets } from "./modules/sceneManager.js";
import { obtenirMetadonneesMusique } from "./modules/metaDataManager.js";
import { initGUI } from "./modules/guiManager.js";
import { drawDebug, drawCompareDebug } from "./modules/uiManager.js";

// === Importation de la bibliothèque Three.js et des modules ==================
import * as THREE from "three";
import { max } from "three/tsl";

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

// Importation du canvas 3D
const canvas3D = document.getElementById("scene3D");

// === Vérification toutes les 10 secondes (Polling) ===========================
setInterval(Polling, 10000);
async function Polling() {
  const musicData = await obtenirMetadonneesMusique();
  if (musicData) {
    console.log(
      `Musique détectée : "${musicData.titre}" --- ${musicData.artiste}`,
    );
    console.log(
      `ISRC trouvé pour "${musicData.titre}" de ${musicData.artiste} : ${musicData.isrc}`,
    );
    console.log(
      "Détails complets de ReccoBeats (content) :",
      musicData.reccobeats.content,
    );
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

// Récupération des éléments de la scène 3D ("Déstructuration")
const { scene, camera, renderer } = initScene(canvas3D);
const monde = initObjets(scene);

// Initialisation de l'interface de contrôle
initGUI(camera, monde);

// Variables pour l'animation de la caméra
let angleCamera = 0;
const distanceCamera = 25; // La distance entre la caméra et le centre
const vitesseRotation = 0.002;

// === Animation de la scène ===================================================
function animate() {
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
    drawDebug(audioElements.analyser, audioElements.dataArray);
    drawCompareDebug(rawData, processedData);

    // --- ANIM CAMÉRA ---------------------------------------------------------
    angleCamera += vitesseRotation;
    camera.position.x = Math.cos(angleCamera) * distanceCamera;
    camera.position.z = Math.sin(angleCamera) * distanceCamera;
    camera.lookAt(0, 0, 0);

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

        if (intensite > seuilCube) {
          let color;
          const ratioData = indexData / nbColonnes;

          if (ratioData < 0.22)
            color = 0xff4444; // Lows
          else if (ratioData < 0.65)
            color = 0x44ff44; // Mids
          else color = 0x4444ff; // Highs

          // Materiaux état allumé
          cube.material.color.setHex(color);
          cube.material.emissive.setHex(color);
          cube.material.emissiveIntensity = 0.3 + intensite * 0.7;
        } else {
          // Materiaux état éteint
          cube.material.color.setHex(0x111111);
          cube.material.emissive.setHex(0x000000);
          cube.material.emissiveIntensity = 0;
        }
      });
    });

    // --- ANIM FLUX CENTRAL ---------------------------------------------------
    monde.fluxCentral.children.forEach((cube) => {
      // Vérification de la présence des données originales
      if (cube.userData.originalPos && cube.userData.originalScale) {
        // Normalisation de la hauteur (-1 à 1 au lieu de -rayon à +rayon)
        const hauteurNormalisee = cube.userData.originalPos.y / monde.rayonSpere;
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
        const longueurMax = 5.0;
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
        maxColor = 80; 
        // 4.2 Calcul de la luminosité actuelle 
        const currentLightness =
          // min = baseColor max = maxColor
          cube.userData.baseColor + (maxColor - cube.userData.baseColor) * courbeCouleur;
        // 4.3 On applique la nouvelle couleur au matériau
        // .setHSL(hue, saturation, lightness) attend des valeurs entre 0 et 1
        cube.material.color.setHSL(0, 0, currentLightness / 100);
        cube.material.emissive.setHSL(0, 0, currentLightness / 100);
        // 4.4 Animation de l'intensité de l'emissive 
        cube.material.emissiveIntensity = intensiteSmooth * 3;
      }
    });
  }

  // --- RENDU FINAL ---
  renderer.render(scene, camera);
}
// =============================================================================

// Boucle d'animation
renderer.setAnimationLoop(animate);
