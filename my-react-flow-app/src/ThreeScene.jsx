

import * as THREE from 'three';
import React, { useEffect, useRef } from 'react';

export default function ThreeScene({ sliderValue }) {
    const canvasRef = useRef(null);
    const rendererRef = useRef(null); // Store a reference to the renderer
  
    useEffect(() => {
      
      if (!rendererRef.current) {
        // Create a Three.js scene only if the renderer doesn't exist
  
        const renderer = new THREE.WebGLRenderer({ antialias: true });
  
        // Set up renderer
        renderer.setSize(300, 300); // Set the size of the rendered scene
        canvasRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
  
        // Create a cube and add it to the scene
      }
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const geometry = new THREE.BoxGeometry(sliderValue);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
  
        // Position the camera
        camera.position.z = 5;
  
        // Store the renderer reference
  
        // Render the scene
        const animate = () => {
          requestAnimationFrame(animate);
          cube.rotation.x += 0.01
          cube.rotation.y += 0.01 
          rendererRef.current.render(scene, camera);
        };
        animate();
      
  
      return () => {
        // Clean up if needed
      };
    }, [sliderValue]);
  
    return <div ref={canvasRef} />;
  }