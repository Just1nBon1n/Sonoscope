// colorManager.js
// Ce module gère les couleurs de la scène en fonction des métadonnées de la musique
import ColorThief from "colorthief";
import * as THREE from "three";

// Instanciation de ColorThief
const colorThief = new ColorThief();

// === Fonction d'extraction des couleurs principales de l'image de l'album ====
export async function extractionCouleurs(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        // Extraction de la palette de couleurs (12 couleurs, 15 pour accélérer le processus)
        const rgbPalette = colorThief.getPalette(img, 12, 15); 

        // Conversion THREE.js 
        const paletteThree = rgbPalette.map((rgb) =>
          new THREE.Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255),
        );
        
        // Tri de la palette par luminance (du plus sombre au plus clair)
        resolve(paletteThree);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
  });
}
// =============================================================================

// === Fonction de tri de la palette ===========================================
export function trierPaletteParLuminance(palette) {
    return palette.sort((a, b) => {
        // Formule de luminance perçue : 0.299*R + 0.587*G + 0.114*B
        const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
        const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
        return lumA - lumB; // Du plus petit (noir) au plus grand (blanc)
    });
}
// =============================================================================

// === Fonction d'analyse de la palette ========================================
export function analyserPalette(palette) {
  // Somme de la lumiance
  let sommeLum = 0;
  // Somme de la saturation
  let sommeSat = 0;

  // Parcours de la palette pour calculer les moyennes de luminosité et de saturation
  palette.forEach(c => {
    const hsl = {};
    c.getHSL(hsl);
    sommeLum += hsl.l;
    sommeSat += hsl.s;
  });

  // Retour d'un objet avec les moyennes de luminosité et de saturation
  return {
    moyenneLum: sommeLum / palette.length,
    moyenneSat: sommeSat / palette.length
  };
}
// =============================================================================

// === Création des binômes par proximité de teinte ============================
export function genererBinomesMur(palette) {
  // Indices des couleurs de base (1, 3, 6) 
  const indexBases = [1, 3, 6]; 
  
  // Cherche pour chaque index une couleur plus lumineuse et proche en teinte
  return indexBases.map(idx => {
    const couleurBase = palette[idx];
    const hslBase = {};
    couleurBase.getHSL(hslBase);

    let couleurSommet = null;
    let scoreProximiteMax = -1;

    palette.forEach(c => {
      const hslC = {};
      c.getHSL(hslC);

      // condition 1 : Il faut que ce soit plus lumineux que la base (+15% minimum)
      if (hslC.l > hslBase.l + 0.15) {
        
        // condition 2 : Calcul de la proximité de teinte (Hue)
        const diffHue = Math.abs(hslBase.h - hslC.h);
        const distanceHue = Math.min(diffHue, 1 - diffHue); 
        const scoreTeinte = 1 - distanceHue;

        // On cherche le score le plus haut (la teinte la plus proche)
        if (scoreTeinte > scoreProximiteMax) {
          scoreProximiteMax = scoreTeinte;
          couleurSommet = c;
        }
      }
    });

    // Index 11 si aucune couleur ne correspond aux critères 
    if (!couleurSommet) couleurSommet = palette[11];

    // Retour du binôme : [couleur de base, couleur sommet]
    return [couleurBase, couleurSommet];
  });
}
