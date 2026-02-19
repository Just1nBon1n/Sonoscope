import { initAudio, obtenirDonneesLog } from "./modules/audioManager.js";
import { initScene, initObjets } from "./modules/sceneManager.js";
import { obtenirMetadonneesMusique } from "./modules/metaDataManager.js";
import { initGUI } from "./modules/guiManager.js";
import { drawDebug, drawDebug2} from "./modules/uiManager.js";


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

let angleCamera = 0; 
const distanceCamera = 25; // La distance entre la caméra et le centre
const vitesseRotation = 0.002; 


// Animation de la scène -------------------------------------------------------
function animate() {
  // Si l'audio est activé
  if (audioElements) {

    // EQ en haut pour voir les fréquences brutes
    drawDebug(audioElements.analyser, audioElements.dataArray);

    // 
    const fluxData = obtenirDonneesLog(
      audioElements.dataArray, 
      monde.colonnesEQ.length,
      audioElements.audioContext.sampleRate
    );

    // EQ en bas pour le regroupement en 64 colonnes logarithmiques
    drawDebug2(fluxData);

    // Remplir le tableau avec les sons actuels
    audioElements.analyser.getByteFrequencyData(audioElements.dataArray);

    // Mouvement de la caméra
    angleCamera += vitesseRotation;
    camera.position.x = Math.cos(angleCamera) * distanceCamera;
    camera.position.z = Math.sin(angleCamera) * distanceCamera;
    camera.position.y = 0; 
    camera.lookAt(0, 0, 0);
  }

  // ---------------------------------------------------------------------------
  if (audioElements && monde.colonnesEQ) {
    // 1. Récupération des données traitées (0 à 1)
    audioElements.analyser.getByteFrequencyData(audioElements.dataArray);
    const fluxData = obtenirDonneesLog(
        audioElements.dataArray, 
        monde.colonnesEQ.length, // 64
        audioElements.audioContext.sampleRate
    );

    // 2. Animation du Mur EQ
    monde.colonnesEQ.forEach((colonne, i) => {
      const intensite = fluxData[i]; // L'énergie de la colonne (0.0 à 1.0)

      colonne.forEach((cube, j) => {
        // Le "seuil" d'activation pour ce cube précis (de 0 à 1)
        const seuilCube = j / colonne.length;

        if (intensite > seuilCube) {
          // --- ÉTAT ALLUMÉ ---
          // On définit une couleur selon la zone (Lows, Mids, Highs) 
          // pour correspondre à ton debug canvas
          let color;
          if (i / 64 < 0.12) color = 0xff4444;      // Rouge
          else if (i / 64 < 0.65) color = 0x44ff44; // Vert
          else color = 0x4444ff;                    // Bleu

          cube.material.color.setHex(color);
          cube.material.emissive.setHex(color);
          // On peut même faire varier l'intensité lumineuse pour plus de punch
          cube.material.emissiveIntensity = 0.5 + (intensite * 0.5);
        } else {
          // --- ÉTAT ÉTEINT ---
          cube.material.color.setHex(0x222222); // Gris très sombre
          cube.material.emissive.setHex(0x000000);
          cube.material.emissiveIntensity = 0;
        }
      });
    });

    // 3. Animation du Flux Central (Optionnel : fait tourner les cubes)
    monde.cubesFlux.forEach(cube => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        // On peut même les faire "pulser" sur les basses (fluxData[0])
        const s = 1 + fluxData[0] * 1.5;
        cube.scale.set(s, s, s);
    });
  }
  // ---------------------------------------------------------------------------


  // Rendu de la scène
  renderer.render(scene, camera);
}
// Boucle d'animation
renderer.setAnimationLoop(animate);
