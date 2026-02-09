// metadataManager.js

export async function getISRCFromDeezer(titre, artiste) {
    // On construit une requête précise pour Deezer
    const query = encodeURIComponent(`track:"${titre}" artist:"${artiste}"`);
    const url = `https://api.deezer.com/search?q=${query}&limit=1`;
    
    // Utilisation du proxy car l'API Deezer bloque souvent le direct en local
    const proxy = "https://corsproxy.io/?";

    try {
        const response = await fetch(proxy + encodeURIComponent(url));
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            const isrc = data.data[0].isrc;
            console.log(`🆔 ISRC trouvé sur Deezer pour "${titre}" : ${isrc}`);
            return isrc;
        } else {
            console.warn("⚠️ Aucun ISRC trouvé sur Deezer.");
            return null;
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de l'ISRC :", error);
        return null;
    }   
}

