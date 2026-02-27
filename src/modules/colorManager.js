// colorManager.js
// Ce module gère les couleurs de la scène en fonction des métadonnées de la musique
import ColorThief from "colorthief";
import * as THREE from "three";

// Instanciation de ColorThief
const colorThief = new ColorThief();

// === Fonction d'extraction des couleurs principales de l'image de l'album ====
export async function extractionCouleurs(imageUrl) {
  // Retour d'une promesse pour gérer l'asynchronité
  return new Promise((resolve, reject) => {
    // Création d'une image pour charger la pochette de l'album
    const img = new Image();
    // Anonyme pour contourner les CORS
    img.crossOrigin = "Anonymous";
    // Liason de l'image à l'URL de la pochette
    img.src = imageUrl;

    // Lorsque l'image est chargée
    img.onload = () => {
      // Try/catch pour ne pas faire planter le code
      try {
        // Extraction de la palette de couleurs : (img, nombre de couleurs, qualité)
        const rgbPalette = colorThief.getPalette(img, 12, 1); 
        // Conversion de la palette RGB (0-255) en palette Three.js (0-1)
        const paletteThree = rgbPalette.map((rgb) =>
          new THREE.Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255),
        );
        // Résolution de la promesse dans main.js
        resolve(paletteThree);
      } catch (err) {
        reject(err);
      }
    };
    // En cas d'erreur de chargement de l'image
    img.onerror = (err) => reject(err);
  });
}
// =============================================================================
