import * as THREE from 'three';

// --- 1. SETUP THREE.JS (Ton code existant) ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- 2. SETUP AUDIO & CANVAS (L'EQ) ---
let audioContext, analyser, dataArray;
const canvas = document.getElementById('oscilloscope'); // Assure-toi d'avoir cette ID dans ton HTML
const canvasCtx = canvas.getContext('2d');

async function initAudio() {
    try {
        // Capture du son (choisis "CABLE Output" dans Chrome)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Nombre de barres
        analyser.smoothingTimeConstant = 0.8; // Lissage pour un look pro
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        console.log("✅ Audio prêt !");
    } catch (err) {
        console.error("Erreur audio:", err);
    }
}

// --- 3. BOUCLE D'ANIMATION FUSIONNÉE ---
function animate() {
    requestAnimationFrame(animate);

    if (analyser) {
        // A. Récupérer les données
        analyser.getByteFrequencyData(dataArray);

        // B. Dessiner l'EQ 2D
        canvasCtx.fillStyle = 'black';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / dataArray.length);
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            let barHeight = dataArray[i] * 2; // Multiplicateur pour ton laptop
            canvasCtx.fillStyle = `rgb(0, 255, ${dataArray[i]})`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }

        // C. Faire réagir le cube 3D
        const volumeMoyen = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const scale = 1 + (volumeMoyen / 50); 
        cube.scale.set(scale, scale, scale);
        cube.rotation.y += 0.01 + (volumeMoyen / 200);
    }

    cube.rotation.x += 0.005;
    renderer.render(scene, camera);
}

// Lancer au clic pour respecter les règles du navigateur
window.addEventListener('click', () => {
    if (!audioContext) {
        initAudio();
        animate();
    }
}, { once: true });