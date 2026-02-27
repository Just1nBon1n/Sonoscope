// uiManager.js
// Fichier qui gère l'interface utilisateur : affichage des infos de la musique, palette de couleurs, et debug des fréquences

// === Fonction de debug des fréquences ========================================
export function drawDebug(analyser, dataArray) {
    const canvas = document.getElementById("audioDebug");
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");

    // Efface le canvas avant de redessiner
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    analyser.getByteFrequencyData(dataArray);

    // Calcul de la fréquence pour chaque pixel horizontal
    const sampleRate = analyser.context.sampleRate;
    const fftSize = analyser.fftSize;
    const minHz = 20;
    const maxHz = sampleRate / 2;

    // Affichage des barres de fréquences
    for (let x = 0; x < canvas.width; x++) {
        const freq = minHz * Math.pow(maxHz / minHz, x / canvas.width);
        // Trouve l'index de la fréquence dans le tableau de données
        const index = Math.floor(freq / (sampleRate / fftSize));
        const value = dataArray[index] || 0;
        const barHeight = (value / 255) * (canvas.height - 20);

        // Couleur basée sur la position : rouge pour les basses, vert pour les médiums, bleu pour les aigus
        ctx.fillStyle = index < 20 ? "#ff4444" : index < 150 ? "#44ff44" : "#4444ff";
        ctx.fillRect(x, canvas.height - barHeight, 1, barHeight);
    }
}
// =============================================================================

// === Fonction de debug comparatif ============================================
export function drawCompareDebug(rawData, processedData) {
    const canvas = document.getElementById("audioCompareDebug");
    if (!canvas || !rawData) return;
    const ctx = canvas.getContext("2d");

    // Efface le canvas avant de redessiner
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Affiche les tableau de données
    const halfWidth = canvas.width / 2;
    const barWidth = halfWidth / processedData.length;

    // Raw (Gauche)
    for (let i = 0; i < rawData.length; i++) {
        const x = i * barWidth;
        const h = rawData[i] * (canvas.height - 25);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(x, canvas.height - h, barWidth - 1, h);
    }

    // Processed (Droite)
    for (let i = 0; i < processedData.length; i++) {
        const x = halfWidth + i * barWidth;
        const h = processedData[i] * (canvas.height - 25);
        const ratio = i / processedData.length;
        ctx.fillStyle = ratio < 0.22 ? "#ff4444" : ratio < 0.65 ? "#44ff44" : "#4444ff";
        ctx.fillRect(x, canvas.height - h, barWidth - 1, h);
    }
}
// =============================================================================

// === Initialisation de la palette de couleurs ================================
export function initPaletteUI() {
    // Crée 12 swatches vides pour la palette de couleurs
    const paletteContainer = document.getElementById("color-palette");
    if (!paletteContainer) return;
    paletteContainer.innerHTML = "";
    for (let i = 0; i < 12; i++) {
        const swatch = document.createElement("div");
        swatch.className = "swatch";
        paletteContainer.appendChild(swatch);
    }
}
// =============================================================================

// === Mise à jour de l'UI avec les infos de la musique et la palette ==========
export function updateMusiqueUI(musicData, palette) {
    const uiContainer = document.getElementById("player-ui");
    if (!uiContainer) return;
    uiContainer.classList.remove("hidden");
    
    document.getElementById("album-cover").src = musicData.pochetteUrl;
    document.getElementById("track-title").textContent = musicData.titre;
    document.getElementById("track-artist").textContent = musicData.artiste;

    // Mise à jour des swatches de la palette de couleurs
    const swatches = document.querySelectorAll(".swatch");
    if (palette && swatches.length > 0) {
        palette.forEach((color, i) => {
            // Convertit les couleurs de 0-1 à 0-255 (RGB)
            if (swatches[i]) {
                const r = Math.round(color.r * 255);
                const g = Math.round(color.g * 255);
                const b = Math.round(color.b * 255);
                swatches[i].style.backgroundColor = `rgb(${r},${g},${b})`;
            }
        });
    }
}
// =============================================================================

// === Toggle du panneau de debug ==============================================
export function setupDebugToggle() {
    const btn = document.getElementById('toggle-debug');
    const panel = document.getElementById('debug-panel');
    if (btn && panel) {
        btn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            btn.textContent = panel.classList.contains('hidden') ? "Afficher Debug" : "Masquer Debug";
        });
    }
}
// =============================================================================