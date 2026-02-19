const debugCanvas = document.getElementById("audioDebug");
const debugCtx = debugCanvas.getContext("2d");

export function drawDebug(analyser, dataArray) {
    if (!debugCtx) return;

    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    analyser.getByteFrequencyData(dataArray);

    const sampleRate = analyser.context.sampleRate;
    const fftSize = analyser.fftSize;

    // Paramètres pour l'échelle log
    const minHz = 20; 
    const maxHz = sampleRate / 2; // ~22000 Hz

    // On dessine barre par barre sur la largeur du canvas
    for (let x = 0; x < debugCanvas.width; x++) {
        // 1. On calcule la fréquence correspondant à cette position X sur le canvas (Log)
        // Formule : f = min * (max/min)^(x/width)
        const freq = minHz * Math.pow(maxHz / minHz, x / debugCanvas.width);

        // 2. On trouve l'index (bin) correspondant dans le dataArray
        const index = Math.floor(freq / (sampleRate / fftSize));

        // 3. On récupère la valeur (0-255)
        const value = dataArray[index] || 0;
        const barHeight = (value / 255) * (debugCanvas.height - 20);

        // Couleur selon l'index d'origine (pour garder tes repères)
        debugCtx.fillStyle = index < 20 ? "#ff4444" : (index < 150 ? "#44ff44" : "#4444ff");
        
        debugCtx.fillRect(x, debugCanvas.height - 20 - barHeight, 1, barHeight);
    }

    // --- ENCOCHES LOGARITHMIQUES ---
    debugCtx.fillStyle = "white";
    const markers = [60, 250, 1000, 4000, 10000, 20000];
    markers.forEach(hz => {
        // On replace le texte selon la même formule log
        const x = debugCanvas.width * (Math.log(hz / minHz) / Math.log(maxHz / minHz));
        
        if (x >= 0 && x <= debugCanvas.width) {
            debugCtx.fillRect(x, debugCanvas.height - 25, 1, 10);
            const label = hz >= 1000 ? (hz / 1000) + "k" : hz;
            debugCtx.fillText(label, x, debugCanvas.height - 5);
        }
    });
}


const debugCanvas2 = document.getElementById("audioDebug2");
const debugCtx2 = debugCanvas2.getContext("2d");

export function drawDebug2(moyennesLog) {
    if (!debugCtx2 || !moyennesLog) return;

    debugCtx2.clearRect(0, 0, debugCanvas2.width, debugCanvas2.height);
    const nbBins = moyennesLog.length;
    const barWidth = debugCanvas2.width / nbBins;

    for (let i = 0; i < nbBins; i++) {
        const value = moyennesLog[i];
        const barHeight = value * (debugCanvas2.height - 20);

        // --- CALIBRAGE DES COULEURS ---
        // On ajuste les ratios pour coller au découpage du canvas du haut
        // Basses (Rouge) : ~12% | Médiums (Vert) : ~53% | Aigus (Bleu) : le reste
        let color;
        const ratio = i / nbBins;

        if (ratio < 0.12) {
            color = "#ff4444"; 
        } else if (ratio < 0.65) {
            color = "#44ff44"; 
        } else {
            color = "#4444ff"; 
        }

        if (value <= 0) {
            debugCtx2.fillStyle = "#333";
            debugCtx2.fillRect(i * barWidth, debugCanvas2.height - 21, barWidth - 1, 1);
            continue;
        }

        debugCtx2.fillStyle = color;
        debugCtx2.fillRect(i * barWidth, debugCanvas2.height - 20 - barHeight, barWidth - 1, barHeight);
    }
}


