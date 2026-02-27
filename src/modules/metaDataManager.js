// metadataManager.js
// Ce module gère la récupération des métadonnées de la musique qui joue actuellement
// Lasf.fm -> Deezer (ISRC) -> Reccobeats (BPM, énergie, etc.)

// === Fonction principale de fetching =========================================
export async function obtenirMetadonneesMusique() {
    // Last.fm
    const trackInfo = await obtenirMusiqueCourante();
    if (!trackInfo) return null;

    // Deezer
    const deezerData = await obtenirISRCDeDeezer(trackInfo.titre, trackInfo.artiste);
    if (!deezerData) return null;

    // Reccobeats
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

    // Si musique joue, retourner le titre et l'artiste
    if (isPlaying) {
      return { titre: track.name, artiste: track.artist["#text"] };
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
async function obtenirISRCDeDeezer(titre, artiste) {
  // On construit une requête précise pour Deezer
  const query = encodeURIComponent(`track:"${titre}" artist:"${artiste}"`);
  // URL de l'API Deezer pour rechercher un morceau, limit=1 pour rapidité (on veut juste le premier résultat)
  const url = `https://api.deezer.com/search?q=${query}&limit=1`;
  // Utilisation du proxy car l'API Deezer ne supporte pas les requêtes directes depuis le navigateur (CORS)
  const proxy = "https://corsproxy.io/?";

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
    } else {
      console.warn("Aucun ISRC trouvé sur Deezer.");
      return null;
    }
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
