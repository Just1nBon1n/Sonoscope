# Sonoscope

### Présentation du projet :
### --> https://just1nbon1n.github.io/Presentation-Sonoscope/ <--

### Vivez l'exprérience :
## --> https://just1nbon1n.github.io/Sonoscope/ <--

**Sonoscope** est un visualisateur audio 3D immersif développé avec **Three.js**. Il synchronise en temps réel un univers visuel génératif avec votre écoute musicale grâce à l'intégration de plusieurs APIs.

![Capture d'écran du projet](https://github.com/user-attachments/assets/5cd8b05f-ab58-406d-927e-78a66540e43d)

## Fonctionnalités
- **Synchronisation Last.fm** : Analyse le morceau que vous écoutez actuellement.
- **Extraction de Couleurs** : Génère une palette dynamique à partir de la pochette d'album (via ColorThief).
- **Analyse Audio Avancée** : Traitement du spectre sonore (FFT) avec échelle logarithmique, RMS Loudness et Auto-Gain intelligent.
- **Rendu 3D Réactif** : Effets de Bloom, brouillard exponentiel et transitions fluides (Lerp) entre les ambiances musicales.

## Infos Technique
- **Moteur 3D** : Three.js
- **Langage** : JavaScript
- **APIs** : Last.fm, Deezer (via Proxy CORS), ReccoBeats
- **Outil de Build** : Vite

## Installation & Lancement
1. Clonez le dépôt : `git clone [URL-DU-REPO]`
2. Installez les dépendances : `npm install`
3. Connecter votre compte Spotify à Last.fm
4. Activer un loopback sur votre ordinateur, soit par carte son ou câble virtuel
5. Lancez le serveur de développement : `npm run dev`
