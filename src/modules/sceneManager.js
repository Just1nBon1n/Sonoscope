// Importation de la bibliothèque Three.js
import * as THREE from 'three';


export function initScene(canvas3D) {
  // Création de la scène 3D
  const scene = new THREE.Scene();
  // Initialisation de la camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  // Recule la caméra pour ne pas être dans le cube
  camera.position.z = 5;


  // Création du renderer
  const renderer = new THREE.WebGLRenderer({ 
      canvas: canvas3D, 
      antialias: true // Lissage des bords (anti-aliasing)
  });
  // On donne au moteur la taille de la fenêtre
  renderer.setSize(window.innerWidth, window.innerHeight);


  // Création du cube 3D
  const faceGeometry = new THREE.BoxGeometry(1, 1, 1); 
  // Création du matériau du cube
  const faceMaterial = new THREE.MeshBasicMaterial({ color: 0x004400});
  // Création du mesh (géométrie + matériau)
  const cube = new THREE.Mesh(faceGeometry, faceMaterial);

  // Géométrie juste pour les edges
  const edgesGeometry = new THREE.EdgesGeometry(faceGeometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
  const wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);

  // Ajout des bordures au cube (enfant du cube)
  cube.add(wireframe);

  // Ajout du cube à la scène
  scene.add(cube);


  // Exportation des éléments de la scène
  return { scene, camera, renderer, cube };
}