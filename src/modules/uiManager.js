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

    // Dessin barre par barre sur la largeur du canvas
    for (let x = 0; x < debugCanvas.width; x++) {
        // 1. On calcule la fréquence correspondant à cette position X sur le canvas (Log)
        // Formule : f = min * (max/min)^(x/width)
        const freq = minHz * Math.pow(maxHz / minHz, x / debugCanvas.width);

        // 2. On trouve l'index (bin) correspondant dans le dataArray
        const index = Math.floor(freq / (sampleRate / fftSize));

        // 3. On récupère la valeur (0-255)
        const value = dataArray[index] || 0;
        const barHeight = (value / 255) * (debugCanvas.height - 20);

        // 4. Couleur selon l'index d'origine 
        debugCtx.fillStyle = index < 20 ? "#ff4444" : (index < 150 ? "#44ff44" : "#4444ff");
        
        debugCtx.fillRect(x, debugCanvas.height - 20 - barHeight, 1, barHeight);
    }

    // --- ENCOCHES LOGARITHMIQUES ---
    debugCtx.fillStyle = "white";
    const markers = [60, 250, 1000, 4000, 10000, 20000];
    markers.forEach(hz => {
        // Replace le texte selon la même formule log
        const x = debugCanvas.width * (Math.log(hz / minHz) / Math.log(maxHz / minHz));
        
        // Dessin d'une petite encoche et le label de fréquence
        if (x >= 0 && x <= debugCanvas.width) {
            debugCtx.fillRect(x, debugCanvas.height - 25, 1, 10);
            const label = hz >= 1000 ? (hz / 1000) + "k" : hz;
            debugCtx.fillText(label, x, debugCanvas.height - 5);
        }
    });
}


const debugCompare = document.getElementById("audioCompareDebug");
const debugCtx2 = debugCompare.getContext("2d");
    
export function drawCompareDebug(rawData, processedData) {
    if (!debugCtx2) return;
    
    // 1. Nettoyage
    debugCtx2.fillStyle = '#111';
    debugCtx2.fillRect(0, 0, debugCompare.width, debugCompare.height);

    // 2. Calcul de la largeur pour chaque section
    const halfWidth = debugCompare.width / 2;
    const barWidth = halfWidth / processedData.length;
    const nbBins = processedData.length;

    // --- ZONE GAUCHE : RAW ---
    for (let i = 0; i < rawData.length; i++) {
        const x = i * barWidth;
        const h = rawData[i] * (debugCompare.height - 25);
        
        debugCtx2.fillStyle = 'rgba(255, 255, 255, 0.3)'; 
        debugCtx2.fillRect(x, debugCompare.height - 20 - h, barWidth - 1, h);
    }

    // --- ZONE DROITE : PROCESSED ---
    for (let i = 0; i < nbBins; i++) {
        const x = halfWidth + (i * barWidth);
        const h = processedData[i] * (debugCompare.height - 25);
        const ratio = i / nbBins;

        // Application des couleurs
        if (ratio < 0.22) {
            debugCtx2.fillStyle = "#ff4444"; // Lows (Rouge)
        } else if (ratio < 0.65) {
            debugCtx2.fillStyle = "#44ff44"; // Mids (Vert)
        } else {
            debugCtx2.fillStyle = "#4444ff"; // Highs (Bleu)
        }
        
        debugCtx2.fillRect(x, debugCompare.height - 20 - h, barWidth - 1, h);
    }

    // --- ÉLÉMENTS VISUELS ---
    debugCtx2.fillStyle = "white";
    debugCtx2.font = "bold 10px Inter, sans-serif";
    
    // Séparateur vertical discret
    debugCtx2.globalAlpha = 0.2;
    debugCtx2.fillRect(halfWidth, 0, 1, debugCompare.height);
    debugCtx2.globalAlpha = 1.0;

    debugCtx2.fillText("PRE-MIXING (RAW)", 10, 15);
    debugCtx2.fillText("POST-MIXING (PROCESSED)", halfWidth + 10, 15);
}


