// Importation de la bibliothèque lil-gui pour les contrôles de l'interface
import GUI from "lil-gui";

export function initGUI(socle, formes) {
    const gui = new GUI();

    
    // Fonction pour ajouter Position, Rotation et Scale d'un coup
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

        folder.close();
    };

    // Ajout des contrôles pour le socle et les formes
    addTransform(gui.addFolder('Socle'), socle);
    addTransform(gui.addFolder('Cube'), formes.cube);
    addTransform(gui.addFolder('Pyramide'), formes.pyramide);
    addTransform(gui.addFolder('Sphère'), formes.sphere);

    gui.close();

    return gui;
}