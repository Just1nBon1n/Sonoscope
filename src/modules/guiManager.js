// guiManager.js
// Ce module gère la création de la GUI pour contrôler les paramètres de la scène en temps réel
import GUI from "lil-gui";

export function initGUI(camera, monde) {
    const gui = new GUI();

    // 1. --- CAMÉRA ---
    if (camera) {
        const camFolder = gui.addFolder('Caméra');
        // Contrôle de la FOV
        camFolder.add(camera, 'fov', 10, 150).step(1).name('Zoom (FOV)').onChange(() => camera.updateProjectionMatrix());
        camFolder.close();
    }

    // 2. --- SOCLES (Haut et Bas) ---
    const soclesFolder = gui.addFolder('Socles');
    
    soclesFolder.close();

    // 3. --- MUR EQ (Le système de colonnes) ---
    const murEQFolder = gui.addFolder('Mur EQ');
    const eqControls = {
        color: 0x404040,
        rayon: 14
    };

    // Contrôle de la couleur des briques du mur EQ
    murEQFolder.addColor(eqControls, 'color').name('Couleur Briques').onChange((val) => {
        monde.colonnesEQ.flat().forEach(cube => cube.material.color.set(val));
    });

    // Contrôle du rayon du mur EQ 
    murEQFolder.add(eqControls, 'rayon', 5, 35).name('Rayon du Mur').onChange((val) => {
        monde.colonnesEQ.forEach((colonne, i) => {
            const angle = (i / monde.colonnesEQ.length) * Math.PI * 2;
            const x = Math.cos(angle) * val;
            const z = Math.sin(angle) * val;
            colonne.forEach(cube => {
                cube.position.x = x;
                cube.position.z = z;
            });
        });
    });
    
    murEQFolder.close();

    // 4. --- FLUX CENTRAL ---
    const fluxFolder = gui.addFolder('Flux Central');

    fluxFolder.close();

    // On ferme la GUI au départ pour ne pas encombrer l'écran
    gui.close();

    return gui;
}