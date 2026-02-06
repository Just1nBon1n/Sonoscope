import { initAudio } from "./modules/audioManager.js";
import { initScene } from "./modules/sceneManager.js";
import {} from "./modules/spotifyAPI.js";
import {} from "./modules/uiManager.js";

// Importation du canvas 3D
const canvas3D = document.getElementById("cube3D");

// Identifiant API Last.fm
const LASTFM_API_KEY = "33b7ac1ee6fe2e3323c4a357cc426330";
const LASTFM_USER = "B0N_Z";

async function obtenirMusiqueCourante() {
  // URL de l'API Last.fm pour récupérer les morceaux récents de l'utilisateur
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;

  try {
    const reponse = await fetch(url);
    const donnees = await reponse.json();

    // Récupérer le morceau le plus récent
    const track = donnees.recenttracks.track[0];

    // Vérifier si le morceau est en cours de lecture
    // Note : Delais de 10-15 secondes de Spotify pour envoyer à Last.fm 
    const isPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';

    if (isPlaying) {
      const titre = track.name;
      const artiste = track.artist['#text'];
      
      // Retourner les informations du morceau
      console.log(`Musique en cours : ${titre} par ${artiste}`);
      } else {
        console.log("⏸️ Aucune musique détectée en direct sur Last.fm.");
      }
  } catch (erreur) {
    console.error("Erreur de connexion à Last.fm :", erreur);
  }
}

// Vérification toutes les 10 secondes (Polling)
setInterval(obtenirMusiqueCourante, 10000);

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
