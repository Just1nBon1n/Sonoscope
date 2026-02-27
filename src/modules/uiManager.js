// uiManager.js

// === Fonction de debug des fréquences (Ancienne version restaurée et sécurisée) ===
export function drawDebug(analyser, dataArray) {
    const canvas = document.getElementById("audioDebug");
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");

    // Important : On s'assure que le canvas a la bonne taille
    if (canvas.width !== canvas.clientWidth) {
        canvas.width = canvas.clientWidth || 400;
        canvas.height = canvas.clientHeight || 150;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    analyser.getByteFrequencyData(dataArray);

    const sampleRate = analyser.context.sampleRate;
    const fftSize = analyser.fftSize;
    const minHz = 20;
    const maxHz = sampleRate / 2;

    for (let x = 0; x < canvas.width; x++) {
        const freq = minHz * Math.pow(maxHz / minHz, x / canvas.width);
        // Formule de ton ancienne version
        const index = Math.floor(freq / (sampleRate / fftSize));
        const value = dataArray[index] || 0;
        const barHeight = (value / 255) * (canvas.height - 20);

        ctx.fillStyle = index < 20 ? "#ff4444" : index < 150 ? "#44ff44" : "#4444ff";
        ctx.fillRect(x, canvas.height - 20 - barHeight, 1, barHeight);
    }
}

// === Fonction de debug comparatif (Ancienne version restaurée) ===
export function drawCompareDebug(rawData, processedData) {
    const canvas = document.getElementById("audioCompareDebug");
    if (!canvas || !rawData) return;
    const ctx = canvas.getContext("2d");

    if (canvas.width !== canvas.clientWidth) {
        canvas.width = canvas.clientWidth || 400;
        canvas.height = canvas.clientHeight || 150;
    }

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const halfWidth = canvas.width / 2;
    const barWidth = halfWidth / processedData.length;

    // RAW (Gauche)
    for (let i = 0; i < rawData.length; i++) {
        const x = i * barWidth;
        const h = rawData[i] * (canvas.height - 25);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(x, canvas.height - 20 - h, barWidth - 1, h);
    }

    // PROCESSED (Droite)
    for (let i = 0; i < processedData.length; i++) {
        const x = halfWidth + i * barWidth;
        const h = processedData[i] * (canvas.height - 25);
        const ratio = i / processedData.length;
        ctx.fillStyle = ratio < 0.22 ? "#ff4444" : ratio < 0.65 ? "#44ff44" : "#4444ff";
        ctx.fillRect(x, canvas.height - 20 - h, barWidth - 1, h);
    }
}

// === Reste de tes fonctions UI (Palette, Toggle, etc.) ===
export function initPaletteUI() {
    const paletteContainer = document.getElementById("color-palette");
    if (!paletteContainer) return;
    paletteContainer.innerHTML = "";
    for (let i = 0; i < 12; i++) {
        const swatch = document.createElement("div");
        swatch.className = "swatch";
        paletteContainer.appendChild(swatch);
    }
}

export function updateMusiqueUI(musicData, palette) {
    const uiContainer = document.getElementById("player-ui");
    if (!uiContainer) return;
    uiContainer.classList.remove("hidden");
    
    document.getElementById("album-cover").src = musicData.pochetteUrl;
    document.getElementById("track-title").textContent = musicData.titre;
    document.getElementById("track-artist").textContent = musicData.artiste;

    const swatches = document.querySelectorAll(".swatch");
    if (palette && swatches.length > 0) {
        palette.forEach((color, i) => {
            if (swatches[i]) {
                const r = Math.round(color.r * 255);
                const g = Math.round(color.g * 255);
                const b = Math.round(color.b * 255);
                swatches[i].style.backgroundColor = `rgb(${r},${g},${b})`;
            }
        });
    }
}

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