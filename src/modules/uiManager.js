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


export function drawDebug2(analyser, dataArray) {
    if (!debugCtx2) return;

    debugCtx2.clearRect(0, 0, debugCanvas2.width, debugCanvas2.height);
    analyser.getByteFrequencyData(dataArray);

    const numColonnes = 64;
    const barWidth = debugCanvas2.width / numColonnes;
    
    // Paramètres Log
    const minHz = 20;
    const maxHz = 16000; // On s'arrête à 16k car après c'est souvent vide
    const sampleRate = analyser.context.sampleRate;
    const binSize = sampleRate / analyser.fftSize;

    for (let i = 0; i < numColonnes; i++) {
        // 1. Trouver la plage de fréquences pour cette colonne (Log)
        const fLow = minHz * Math.pow(maxHz / minHz, i / numColonnes);
        const fHigh = minHz * Math.pow(maxHz / minHz, (i + 1) / numColonnes);

        // 2. Convertir ces fréquences en index du dataArray
        const indexDebut = Math.floor(fLow / binSize);
        const indexFin = Math.ceil(fHigh / binSize);

        // 3. Calculer la moyenne sur cette plage
        let somme = 0;
        let compte = 0;
        for (let j = indexDebut; j <= indexFin; j++) {
            somme += dataArray[j];
            compte++;
        }
        const moyenne = somme / (compte || 1);

        // 4. Dessiner la barre
        const barHeight = (moyenne / 255) * (debugCanvas2.height - 20);
        
        // Couleur verte 
        debugCtx2.fillStyle = "#44ff44";
        debugCtx2.fillRect(i * barWidth, debugCanvas2.height - 20 - barHeight, barWidth - 1, barHeight);
    }

    // On garde les labels pour se repérer
    debugCtx2.fillStyle = "white";
    debugCtx2.font = "10px Arial";
    [60, 500, 2000, 7000, 16000].forEach(hz => {
        const x = debugCanvas2.width * (Math.log(hz / minHz) / Math.log(maxHz / minHz));
        debugCtx2.fillText(hz >= 1000 ? (hz/1000)+"k" : hz, x, debugCanvas2.height - 5);
    });
}