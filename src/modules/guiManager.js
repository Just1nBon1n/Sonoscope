// Importation de la bibliothèque lil-gui pour les contrôles de l'interface
import GUI from "lil-gui";

export function initGUI(camera, monde) {
    const gui = new GUI();

    // --- CAMÉRA ---
    if (camera) {
        const camFolder = gui.addFolder('Caméra');
        
        // FOV (Field of View)
        camFolder.add(camera, 'fov', 10, 150).step(1).name('Zoom (FOV)').onChange(() => {
            camera.updateProjectionMatrix(); // OBLIGATOIRE pour voir le changement
        });

        camFolder.close();
    }

    // --- FONCITON DE TRANSFORMATION ---
    const addTransform = (folder, object) => {
        const pos = folder.addFolder('Position');
        pos.add(object.position, 'x', -10, 10);
        pos.add(object.position, 'y', -10, 10);
        pos.add(object.position, 'z', -10, 10);
        pos.close();

        const rot = folder.addFolder('Rotation');
        rot.add(object.rotation, 'x', 0, Math.PI * 2);
        rot.add(object.rotation, 'y', 0, Math.PI * 2);
        rot.add(object.rotation, 'z', 0, Math.PI * 2);
        rot.close();

        const sca = folder.addFolder('Scale');
        sca.add(object.scale, 'x', 0.1, 5);
        sca.add(object.scale, 'y', 0.1, 5);
        sca.add(object.scale, 'z', 0.1, 5);
        sca.close();

        folder.addColor(object.material, 'color').name('Couleur');

        folder.add(object.material, 'wireframe').name('Wireframe');

        folder.close();
    };

    // --- SOCLE BAS ---
    const socleBasFolder = gui.addFolder('Socle Bas');
    for (let i = 0; i < monde.socleBas.children.length; i++) {
        addTransform(socleBasFolder.addFolder(`Socle Bas ${i + 1}`), monde.socleBas.children[i]);
    }

    // --- SOCLE HAUT ---
    const socleHautFolder = gui.addFolder('Socle Haut');
    for (let i = 0; i < monde.socleHaut.children.length; i++) {
        addTransform(socleHautFolder.addFolder(`Socle Haut ${i + 1}`), monde.socleHaut.children[i]);
    }

    gui.close();

    return gui;
}