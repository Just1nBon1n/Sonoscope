// metadataManager.js
// Ce module gère la récupération des métadonnées de la musique qui joue actuellement
// Lasf.fm -> Deezer (ISRC) -> Reccobeats (BPM, énergie, etc.)
// Variable pour stockage des dernières données 
let dernierTitreArtiste = null;
let dernierIsrc = null;
// === Fonction principale de fetching =========================================
/**
 * Obtiens les métadonnées de la musique actuellement jouée en combinant les données de Last.fm, Deezer et Reccobeats.
 *
 * @returns {Promise<Object|null>} Un objet contenant le titre, l'artiste, l'ISRC, 
 * la pochette et les audio features, ou null en cas d'erreur.
 * * @example
 * const musicData = await obtenirMetadonneesMusique();
 * if (musicData) console.log(musicData.titre);
 */
export async function obtenirMetadonneesMusique() {
  // 1. Last.fm
  const trackInfo = await obtenirMusiqueCourante();
  if (!trackInfo) return null;

  const musiqueActuelle = `${trackInfo.titre}-${trackInfo.artiste}`;

  // Vérification de la musique actuelle par rapport à la dernière musique traitée
  // Évite les doubles appels à Deezer et Reccobeats si la musique n'a pas changé
  // Très pratique pour les problèmes de CORS de Deezer
  if (musiqueActuelle === dernierTitreArtiste) {
    return { isrc: dernierIsrc }; 
  }

  // 2. Deezer
  const deezerData = await obtenirISRCDeDeezer(trackInfo.titre, trackInfo.artiste, trackInfo.album);
  if (!deezerData) return null;

  dernierTitreArtiste = musiqueActuelle;
  dernierIsrc = deezerData.isrc;

  // 3. Reccobeats
  const audioFeatures = await obtenirReccobeatsData(deezerData.isrc);
  
  // Renvoie des métadonnées complètes pour la musique actuelle
  return {
    titre: trackInfo.titre,
    artiste: trackInfo.artiste,
    isrc: deezerData.isrc,
    pochetteUrl: deezerData.pochette,
    reccobeats: audioFeatures,
  };
}
// =============================================================================
    
// === Last.fm =================================================================
// Identifiant API Last.fm
const LASTFM_API_KEY = "33b7ac1ee6fe2e3323c4a357cc426330";
export let LASTFM_USER = "B0N_Z";

// Fonction pour mettre à jour l'utilisateur cible de Last.fm
export function setLastFmUser(newUser) {
  if (newUser && newUser.trim() !== "") {
    LASTFM_USER = newUser.trim();
    console.log(`Utilisateur cible modifié : ${LASTFM_USER}`);
  }
}

async function obtenirMusiqueCourante() {
  // URL de l'API Last.fm pour récupérer les morceaux récents de l'utilisateur
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;

  try {
    const reponse = await fetch(url);
    const donnees = await reponse.json();
    // Récupérer le morceau le plus récent
    const track = donnees.recenttracks.track[0];

    // Si aucun morceau n'est trouvé, retourner null et message dans la console
    if (!track) {
      console.warn(`L'utilisateur ${LASTFM_USER} est introuvable ou n'a pas d'historique.`);
      return null; 
    }

    // Vérifier si le morceau est en cours de lecture
    // Note : Delais de 10-15 secondes de Spotify pour envoyer à Last.fm
    const isPlaying = track["@attr"] && track["@attr"].nowplaying === "true";

    // Vérifier si le morceau a été joué récemment 
    let isRecent = false;
    if (track.date && track.date.uts) {
      const maintenant = Math.floor(Date.now() / 1000);
      isRecent = (maintenant - parseInt(track.date.uts)) < 300; 
    }

    // Si musique joue ou a été jouée récemment, retourner les métadonnées
    if (isPlaying || isRecent) {
      return {
        titre: track.name,
        artiste: track.artist["#text"], 
        album: track.album["#text"]
      };
    } else {
      console.log("Aucune musique détectée en direct sur Last.fm.");
      return null;
    }
  } catch (erreur) {
    console.error("Erreur de connexion à Last.fm :", erreur);
    return null;
  }
}
// =============================================================================

// === Deezer API ==============================================================
async function obtenirISRCDeDeezer(titre, artiste, album, tentative = 1) {
  const titreNettoyé = titre.split(' - ')[0].split(' (')[0].trim();
  const artisteNettoyé = artiste.split(' (')[0].trim();

  let query;
  const proxy = "https://corsproxy.io/?";

  if (tentative === 1) {
    // Tentative 1: recherche stricte avec guillemets pour forcer la correspondance exacte
    query = `track:"${titreNettoyé}" artist:"${artisteNettoyé}"`;
  } else if (tentative === 2) {
    // Tentative 2: recherche plus large sans guillemets pour permettre des correspondances partielles
    query = `${titreNettoyé} ${artisteNettoyé}`;
  } else {
    // Tentative 3: recherche très large 
    query = `${titre} ${artiste}`;
  }

  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;

  try {
    // Envoie de la requête au proxy qui la redirige vers Deezer
    const reponse = await fetch(proxy + encodeURIComponent(url));
    const reponseDeezer = await reponse.json();

    // Si on trouve un résultat, retourne l'ISRC
    if (reponseDeezer.data && reponseDeezer.data.length > 0) {
      const isrc = reponseDeezer.data[0].isrc;
      return {
        // ISRC + image de la pochette
        isrc: isrc,
        // Si jamais XL n'existe pas prend big
        pochette: reponseDeezer.data[0].album.cover_xl || reponseDeezer.data[0].album.cover_big
      }
    } 

    // Si aucune correspondance n'est trouvée, tentative++
    if (tentative < 3) {
      console.log(`Tentative ${tentative} échouée pour ${titre}, on élargit la recherche...`);
      return obtenirISRCDeDeezer(titre, artiste, album, tentative + 1);
    }

    console.warn("Aucun résultat trouvé sur Deezer pour :", query);
    return null; 
  } catch (error) {
    console.error("Erreur lors de la récupération de l'ISRC :", error);
    return null;
  }
}
// =============================================================================

// === Reccobeats API ==========================================================
async function obtenirReccobeatsData(isrc) {
  // Configuration officielle de la documentation
  const myHeaders = new Headers();
  myHeaders.append("Accept", "application/json");

  // Objet de configuration pour la requête (méthode, headers, redirections)
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow"
  };

  try {
    // On utilise l'endpoint audio-features avec le ISRC
    const response = await fetch(`https://api.reccobeats.com/v1/audio-features?ids=${isrc}`, requestOptions);
    const result = await response.json(); 
    return result; 
  } catch (error) {
    console.error("Erreur Audio Features :", error);
    return null;
  }
}
// =============================================================================
