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

    // 3. Créer l'analyseur (le traducteur)
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // Divise le son en bandes de fréquences (oblige detre une puissance de 2)

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
