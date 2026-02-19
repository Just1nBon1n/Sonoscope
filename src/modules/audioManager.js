import { float } from "three/tsl";

export async function initAudio() {
  // try/catch au lieu de if/else pour gérer les erreurs sans bloquer le code
  try {
    // 1. Créer le contexte (le moteur audio)
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    // 2. Demander l'accès au flux (ton VB-Cable sélectionné dans Chrome)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 2.5 Créer la source du flux audio (le stream source)
    const source = audioContext.createMediaStreamSource(stream);

    // 3. Créer l'analyseur 
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Divise le son en bandes de fréquences (oblige detre une puissance de 2)

    // Connecter la source à l'analyseur
    source.connect(analyser);

    // 4. Créer le tableau de données (les chiffres de 0 à 255)
    // Uint8Array = tableau d'entiers non signés sur 8 bits (donc pas de latence)
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    return { audioContext, analyser, dataArray };
  } catch (err) {
    // Message derreur si l'utilisateur refuse l'accès au flux audio
    console.error("L'accès au flux audio a été refusé :", err);
    return null;
  }
}


// Convertir le tableau de fréquences en valeurs normalisées (0 à 1) pour chaque bande logarithmique
// moyennes = Float32Array = tableau de nombre decimaux (plus performant que tableau classique)
// nbBins = nombre de bandes (colonnes) 
// sampleRate = nombre de samples par seconde (ex: 44100 Hz)
export function obtenirDonneesLog(dataArray, nbBins, sampleRate) {
    const moyennes = new Float32Array(nbBins);
    const fftSize = dataArray.length; 

    // On calcule la fréquence max capturée (Nyquist)
    const maxHzCapturable = sampleRate / 2;
    
    // Fréquence cible pour les aigus (pour voir qqch)
    const cibleHauteHz = 15000; 
    
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

        // Boost adaptatif : on booste un peu plus si on est dans les aigus
        const boost = 1 + (i / nbBins) * 1.2;
        
        moyennes[i] = Math.min(valeurNormalisee * boost, 1.0);
    }

    return moyennes;
}
