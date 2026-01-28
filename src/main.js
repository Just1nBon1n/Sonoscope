import * as THREE from 'three';

// 1. La Scène
const scene = new THREE.Scene();

// 2. La Caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 3. Le Rendu (Renderer)
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. Un Cube pour tester
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. Animation
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.005;
  cube.rotation.y += 0.005;
  renderer.render(scene, camera);
}
animate();