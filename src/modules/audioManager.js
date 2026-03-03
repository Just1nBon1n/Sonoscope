// audioManager.js
// Ce module gère la capture du flux audio et l'extraction des données de fréquence en temps réel
import { float, gain } from "three/tsl";

// === Fonction d'initialisation de l'audio ====================================
export async function initAudio() {
  // try/catch au lieu de if/else pour gérer les erreurs sans bloquer le code
  try {
    // 1. Créer le contexte (le moteur audio)
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // 2. Demander l'accès au flux (ton VB-Cable sélectionné dans Chrome)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    // 2.5 Créer la source du flux audio (le stream source)
    const source = audioContext.createMediaStreamSource(stream);

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;

    // 3. Créer l'analyseur
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Divise le son en bandes de fréquences (oblige detre une puissance de 2)

    // Connecter la source à l'analyseur
    source.connect(gainNode);
    gainNode.connect(analyser);

    // 4. Créer le tableau de données (les chiffres de 0 à 255)
    // Uint8Array = tableau d'entiers non signés sur 8 bits (donc pas de latence)
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    return { audioContext, analyser, dataArray, gainNode };
  } catch (err) {
    // Message derreur si l'utilisateur refuse l'accès au flux audio
    console.error("L'accès au flux audio a été refusé :", err);
    return null;
  }
}
// =============================================================================

// === Convertir le tableau de fréquences en valeurs normalisées (0 à 1) pour chaque bande logarithmique ===
// moyennes = Float32Array = tableau de nombre decimaux (plus performant que tableau classique)
// nbBins = nombre de bandes (colonnes)
// sampleRate = nombre de samples par seconde (ex: 44100 Hz)
export function obtenirDonneesLog(dataArray, nbBins, sampleRate) {
  const processedData = new Float32Array(nbBins);
  const rawData = new Float32Array(nbBins);
  const fftSize = dataArray.length;

  // --- LOUDNESS RMS ---
  let sommeCarres = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const amp = dataArray[i] / 255;
    sommeCarres += amp * amp;
  }
  const loudnessRMS = Math.sqrt(sommeCarres / dataArray.length);

  // --- AUTO-GAIN INTELLIGENT ---
  const cibleRMS = 0.4; // Plus c'est bas, plus le gain intelligent sera "strict"
  const compression = 0.8; // Entre 0 et 1. 1 = écrase fort, 0.5 = plus doux
  let autoGain = 1.0;
  if (loudnessRMS > cibleRMS) {
    // On calcule de combien on dépasse
    const depassement = loudnessRMS - cibleRMS;
    // On réduit le gain proportionnellement au dépassement
    autoGain = 1.0 / (1.0 + depassement * compression * 5);
  }

  // --- VOLUME GLOBAL (MOYENNE) ---
  let sommeEnergie = 0;
  for (let i = 0; i < dataArray.length; i++) {
    // Somme denergie totale
    sommeEnergie += dataArray[i];
  }

  // Normalisé entre 0 et 1
  const volumeGlobale = sommeEnergie / dataArray.length / 255;

  // On calcule la fréquence max capturée (Nyquist)
  const maxHzCapturable = sampleRate / 2;

  // Fréquence max des aigus pour couper les fréquences inaudibles 
  const cibleHauteHz = 12000;

  // On trouve l'index correspondant à cette cible dans le tableau FFT
  // Formule : index = (freq / maxHz) * fftSize
  const indexMaxHz = Math.floor((cibleHauteHz / maxHzCapturable) * fftSize);

  // Bornes logarithmiques
  const minLog = Math.log(1); // On commence à l'index 1 (évite le bruit 0Hz)
  const maxLog = Math.log(indexMaxHz);

  for (let i = 0; i < nbBins; i++) {
    // Calcul de l'index avec interpolation pour la fluidité
    const logIndex = Math.exp(minLog + (i / nbBins) * (maxLog - minLog));

    const indexBas = Math.floor(logIndex);
    const indexHaut = Math.ceil(logIndex);
    const fraction = logIndex - indexBas;

    const valBas = dataArray[indexBas] || 0;
    const valHaut = dataArray[indexHaut] || 0;

    // Le "Lerp" (Linear Interpolation)
    let valeurInterpolee = valBas + (valHaut - valBas) * fraction;

    // Normalisation (0 à 1)
    let valeurNormalisee = valeurInterpolee / 255;

    // Valeurs finales sans mixage
    rawData[i] = valeurNormalisee;

    // --- TRAITEMENT DES DONNÉES ---
    // 1. Exposant de dynamique pour nuancer le sons (compression)
    // Range: 1.0 à 2.5 (1.0 = linéaire, 1.4-1.6 = musical/naturel, 2.5 = très contrasté)
    let finalValue = Math.pow(valeurNormalisee, 1.8);

    // 2. Noise gate pour couper les sons faible
    // Range: 0.02 à 0.9 (0.02 = très sensible, 0.15 = coupe presque tout)
    if (valeurNormalisee < 0.06) finalValue = 0;

    // 3. Auto-gain pour compenser les différences de volume 
    const gainBase = 0.8; 
    // Mix des gains et du volume global pour un résultat plus équilibré
    const finalGain = (gainBase + volumeGlobale * 0.4) * autoGain;
    finalValue *= finalGain;

    // 4. High-shelf (Boost des aigus))
    // Range : 0.2 à 1.5 (0.2 = aigus discret, 0.6 = standard, 2+ = aigus domiants)
    finalValue *= 1 + (i / nbBins) * 0.8;

    // Valeurs finales avec mixage des traitements
    processedData[i] = Math.min(finalValue, 1.0);
  }

  return {
    processedData,
    rawData,
  };
}
