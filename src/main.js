import { initAudio } from "./modules/audioManager.js";
import { initScene, initObjets } from "./modules/sceneManager.js";
import { obtenirMetadonneesMusique } from "./modules/metaDataManager.js";
import { initGUI } from "./modules/guiManager.js";
import {} from "./modules/uiManager.js";

window.addEventListener("resize", () => {
  // Mettre à jour la caméra
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Mettre à jour le rendu
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Importation du canvas 3D
const canvas3D = document.getElementById("scene3D");

// Vérification toutes les 10 secondes (Polling)
setInterval(Polling, 10000);

async function Polling() {
  const musicData = await obtenirMetadonneesMusique();
  if (musicData) {
    console.log(`Musique détectée : "${musicData.titre}" --- ${musicData.artiste}`);
    console.log(`ISRC trouvé pour "${musicData.titre}" de ${musicData.artiste} : ${musicData.isrc}`);
    console.log("Détails complets de ReccoBeats (content) :", musicData.reccobeats.content);
  }
}

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

// Fonction de mapping entre audio et visuel
// (valeur, min_entrée, max_entrée, min_sortie, max_sortie)
const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

// Fonction pour calculer la moyenne d'un tableau entre deux indices
const getAverage = (array, start, end) => {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += array[i];
  }
  return sum / (end - start + 1);
};

// Récupération des éléments de la scène 3D ("Déstructuration")
const { scene, camera, renderer } = initScene(canvas3D);
const monde = initObjets(scene);

// Initialisation de l'interface de contrôle
initGUI(camera, monde);

let angleCamera = 0; 
const distanceCamera = 25; // La distance entre la caméra et le centre
const vitesseRotation = 0.005; 


// Animation de la scène
function animate() {
  // Si l'audio est activé
  if (audioElements) {
    // Remplir le tableau avec les sons actuels
    audioElements.analyser.getByteFrequencyData(audioElements.dataArray);

    // On récupère des moyennes de zones précises
    const bass = getAverage(audioElements.dataArray, 0, 15); // Les 10 premières cases
    const mids = getAverage(audioElements.dataArray, 20, 150); // Le milieu
    const highs = getAverage(audioElements.dataArray, 160, 500); // Les hautes fréquences

    // On mappe les valeurs pour les adapter à la scène
    const bassMapped = mapRange(bass, 0, 255, 1, 5);
    const midsMapped = mapRange(mids, 0, 200, 1, 5);
    const highsMapped = mapRange(highs, 0, 100, 1, 5);

    // Mouvement de la caméra
    angleCamera += vitesseRotation;
    camera.position.x = Math.cos(angleCamera) * distanceCamera;
    camera.position.z = Math.sin(angleCamera) * distanceCamera;
    camera.position.y = 0; 
    camera.lookAt(0, 0, 0);
  }

  // Rendu de la scène
  renderer.render(scene, camera);
}
// Boucle d'animation
renderer.setAnimationLoop(animate);
