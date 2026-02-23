import { initAudio, obtenirDonneesLog } from "./modules/audioManager.js";
import { initScene, initObjets } from "./modules/sceneManager.js";
import { obtenirMetadonneesMusique } from "./modules/metaDataManager.js";
import { initGUI } from "./modules/guiManager.js";
import { drawDebug, drawCompareDebug} from "./modules/uiManager.js";


// --- Gestion resize de la fenêtre --------------------------------------------
window.addEventListener("resize", () => {
  // Mettre à jour la caméra
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Mettre à jour le rendu
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
// -----------------------------------------------------------------------------

// Importation du canvas 3D
const canvas3D = document.getElementById("scene3D");

// Vérification toutes les 10 secondes (Polling) -------------------------------
setInterval(Polling, 10000);
async function Polling() {
  const musicData = await obtenirMetadonneesMusique();
  if (musicData) {
    console.log(`Musique détectée : "${musicData.titre}" --- ${musicData.artiste}`);
    console.log(`ISRC trouvé pour "${musicData.titre}" de ${musicData.artiste} : ${musicData.isrc}`);
    console.log("Détails complets de ReccoBeats (content) :", musicData.reccobeats.content);
  }
}
// -----------------------------------------------------------------------------

// Initialisation de l'audio au clic (obligation de l'utilisateur pour démarrer l'audio)
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
// -----------------------------------------------------------------------------

// Récupération des éléments de la scène 3D ("Déstructuration")
const { scene, camera, renderer } = initScene(canvas3D);
const monde = initObjets(scene);

// Initialisation de l'interface de contrôle
initGUI(camera, monde);

// Variables pour l'animation de la caméra
let angleCamera = 0; 
const distanceCamera = 25; // La distance entre la caméra et le centre
const vitesseRotation = 0.002; 

// Animation de la scène -------------------------------------------------------
function animate() {
  // if audio est prêt et actif
  if (audioElements) { 
    // --- Récupération des données audio en temps réel ---
    audioElements.analyser.getByteFrequencyData(audioElements.dataArray);
    // Smootihng valeur de base 0.8 et monte jusqu'à 0.99
    audioElements.analyser.smoothingTimeConstant = 0.8;

    // --- Traitement des données pour le mur EQ ---
    const { processedData, rawData } = obtenirDonneesLog(
      audioElements.dataArray, 
      monde.colonnesEQ.length,
      audioElements.audioContext.sampleRate
    );

    // --- CANVAS DEBUG 2D ---
    drawDebug(audioElements.analyser, audioElements.dataArray);
    drawCompareDebug(rawData, processedData);

    // --- ANIM CAMÉRA ---
    angleCamera += vitesseRotation;
    camera.position.x = Math.cos(angleCamera) * distanceCamera;
    camera.position.z = Math.sin(angleCamera) * distanceCamera;
    camera.lookAt(0, 0, 0);

    // --- ANIM MUR EQ ---
    const nbColonnes = monde.colonnesEQ.length;

    // Boucle des colonnes du mur EQ
    monde.colonnesEQ.forEach((colonne, i) => {
      let indexData = (i < nbColonnes / 2) ? i * 2 : (nbColonnes - i - 1) * 2;
      // Valeur d'intensité entre 0 et 1
      const intensite = processedData[indexData];

      // Boucle des cubes dans la colonne
      colonne.forEach((cube, j) => {
        // Seuil pour allumer le cube
        const seuilCube = j / colonne.length; 

        if (intensite > seuilCube) {
          let color;
          const ratioData = indexData / nbColonnes;

          if (ratioData < 0.22) color = 0xff4444;      // Lows
          else if (ratioData < 0.65) color = 0x44ff44; // Mids
          else color = 0x4444ff;                       // Highs

          // État allumé
          cube.material.color.setHex(color);
          cube.material.emissive.setHex(color);
          cube.material.emissiveIntensity = 0.3 + (intensite * 0.7);
        } else {
          // État éteint
          cube.material.color.setHex(0x111111);
          cube.material.emissive.setHex(0x000000);
          cube.material.emissiveIntensity = 0;
        }
      });
    });

    // --- ANIM FLUX CENTRAL ---
    
  }

  // --- RENDU FINAL ---
  renderer.render(scene, camera);
}
// Boucle d'animation
renderer.setAnimationLoop(animate);
