import { initAudio } from "./modules/audioManager.js";
import { initScene } from "./modules/sceneManager.js";
import { obtenirMetadonneesMusique } from "./modules/metaDataManager.js";
import {} from "./modules/uiManager.js";

// Importation du canvas 3D
const canvas3D = document.getElementById("cube3D");



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
const { scene, camera, renderer, cube } = initScene(canvas3D);

// Animation de la scène
function animate() {
  // Si l'audio est activé
  if (audioElements) {
    // Remplir le tableau avec les sons actuels
    audioElements.analyser.getByteFrequencyData(audioElements.dataArray);

    // On récupère des moyennes de zones précises
    const bass = getAverage(audioElements.dataArray, 0, 10); // Les 10 premières cases
    const mids = getAverage(audioElements.dataArray, 15, 40); // Le milieu
    const highs = getAverage(audioElements.dataArray, 60, 100); // Les hautes fréquences

    // On mappe les valeurs pour les adapter à la scène
    const bassMapped = mapRange(bass, 0, 255, 1, 5);
    const midsMapped = mapRange(mids, 0, 255, 1, 5);
    const highsMapped = mapRange(highs, 0, 255, 1, 5);

    // On applique les valeurs mappées à l'échelle du cube
    cube.scale.x = bassMapped;
    cube.scale.y = midsMapped;
    cube.scale.z = highsMapped;
  }

  // Rotation du cube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  // Rendu de la scène
  renderer.render(scene, camera);
}
// Boucle d'animation
renderer.setAnimationLoop(animate);
