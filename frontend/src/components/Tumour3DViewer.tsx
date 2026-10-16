import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  RotateCcw,
  Download,
  Layers,
  Info,
  Maximize2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { fetchMeshData, getExportUrls } from '../services/api';
import { MeshData } from '../types';

interface Tumour3DViewerProps {
  resultId: string;
  is3D: boolean;
  totalVolumeMl?: number | null;
}

export const Tumour3DViewer: React.FC<Tumour3DViewerProps> = ({
  resultId,
  is3D,
  totalVolumeMl,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [meshData, setMeshData] = useState<MeshData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mesh visibility toggles
  const [showBrainReference, setShowBrainReference] = useState(true);
  const [showWholeTumour, setShowWholeTumour] = useState(true);
  const [showEnhancing, setShowEnhancing] = useState(true);
  const [showCore, setShowCore] = useState(true);

  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshObjectsRef = useRef<{ [key: string]: THREE.Object3D }>({});
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Fetch mesh data on mount or resultId change
  useEffect(() => {
    if (!is3D) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchMeshData(resultId)
      .then((data) => {
        if (!isMounted) return;
        if (data.is_available) {
          setMeshData(data);
        } else {
          setError(data.reason || '3D mesh is unavailable for this scan.');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve 3D reconstruction.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resultId, is3D]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || !meshData || !meshData.is_available) return;

    const container = mountRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a14);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -180, 120);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(100, 150, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 0.8);
    dirLight2.position.set(-100, -150, -100);
    scene.add(dirLight2);

    // 5. Add Meshes
    meshObjectsRef.current = {};

    // Tumour Subregions
    if (meshData.subregions) {
      meshData.subregions.forEach((sub) => {
        const geom = new THREE.BufferGeometry();
        const verts = new Float32Array(sub.vertices);
        const faces = new Uint32Array(sub.faces);

        geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geom.setIndex(new THREE.BufferAttribute(faces, 1));
        if (sub.normals && sub.normals.length === sub.vertices.length) {
          geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(sub.normals), 3));
        } else {
          geom.computeVertexNormals();
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(sub.color_hex),
          roughness: 0.35,
          metalness: 0.25,
          transparent: sub.name === 'Whole Tumour',
          opacity: sub.name === 'Whole Tumour' ? 0.75 : 0.95,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geom, mat);
        scene.add(mesh);
        meshObjectsRef.current[sub.name] = mesh;
      });
    }

    // Cranial Reference Envelope
    if (meshData.brain_reference) {
      const brainRef = meshData.brain_reference;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(brainRef.vertices, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x334155,
        size: 2.0,
        transparent: true,
        opacity: 0.35,
      });
      const points = new THREE.Points(geom, mat);
      scene.add(points);
      meshObjectsRef.current['Cranial Reference'] = points;
    }

    // 6. Interactive Mouse Orbital Dragging
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      Object.values(meshObjectsRef.current).forEach((obj) => {
        obj.rotation.z += deltaX * 0.01;
        obj.rotation.x += deltaY * 0.01;
      });

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.15;
      camera.position.y -= e.deltaY * 0.2;
      camera.position.z = Math.max(50, Math.min(350, camera.position.z));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 7. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      // Gentle idle turntable rotation
      if (!isDraggingRef.current) {
        Object.values(meshObjectsRef.current).forEach((obj) => {
          obj.rotation.z += 0.002;
        });
      }
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [meshData]);

  // Visibility toggle effects
  useEffect(() => {
    if (meshObjectsRef.current['Whole Tumour']) {
      meshObjectsRef.current['Whole Tumour'].visible = showWholeTumour;
    }
  }, [showWholeTumour]);

  useEffect(() => {
    if (meshObjectsRef.current['Enhancing Tumour']) {
      meshObjectsRef.current['Enhancing Tumour'].visible = showEnhancing;
    }
  }, [showEnhancing]);

  useEffect(() => {
    if (meshObjectsRef.current['Tumour Core']) {
      meshObjectsRef.current['Tumour Core'].visible = showCore;
    }
  }, [showCore]);

  useEffect(() => {
    if (meshObjectsRef.current['Cranial Reference']) {
      meshObjectsRef.current['Cranial Reference'].visible = showBrainReference;
    }
  }, [showBrainReference]);

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, -180, 120);
      cameraRef.current.lookAt(0, 0, 0);
    }
    Object.values(meshObjectsRef.current).forEach((obj) => {
      obj.rotation.set(0, 0, 0);
    });
  };

  const exportUrls = getExportUrls(resultId);

  // If 2D Scan
  if (!is3D) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">3D Volumetric Reconstruction</h3>
            <p className="text-xs text-slate-400">Marching Cubes Isosurface Extraction</p>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center my-6 space-y-3">
          <div className="p-3 bg-slate-900 rounded-full text-slate-500">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">
            3D Mesh Disabled for 2D Planar Scans
          </h4>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Patient-specific 3D surface reconstruction and volumetric measurements require multi-slice volumetric MRI data (e.g. NIfTI .nii/.nii.gz).
            A single 2D slice cannot produce an accurate anatomical depth geometry.
          </p>
          <div className="pt-2 text-[11px] text-cyan-400 font-mono">
            Upload a volumetric scan to view interactive 3D marching cubes meshes.
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-xs text-slate-500">
          Spatial requirement: Minimum 16 axial slices with verified mm voxel spacing.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Interactive 3D Tumour Mesh</h3>
              <p className="text-xs text-slate-400">Marching Cubes Surface Extraction (Three.js)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Camera</span>
            </button>
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div className="relative w-full aspect-square bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center mb-4">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Computing 3D isosurface mesh...</span>
            </div>
          )}

          {error && (
            <div className="text-amber-400 text-xs p-4 text-center max-w-xs">{error}</div>
          )}

          {/* Mount Three.js canvas */}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Interaction Hint Overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 backdrop-blur-md pointer-events-none">
            Drag to Rotate • Scroll to Zoom
          </div>
        </div>

        {/* Subregion Visibility Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setShowWholeTumour(!showWholeTumour)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              showWholeTumour
                ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950 border border-slate-800 text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Whole Tumour</span>
          </button>

          <button
            onClick={() => setShowEnhancing(!showEnhancing)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              showEnhancing
                ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border border-slate-800 text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
            <span>Enhancing Core</span>
          </button>

          <button
            onClick={() => setShowCore(!showCore)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              showCore
                ? 'bg-blue-950/80 border border-blue-500/40 text-blue-300'
                : 'bg-slate-950 border border-slate-800 text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            <span>Tumour Core</span>
          </button>

          <button
            onClick={() => setShowBrainReference(!showBrainReference)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              showBrainReference
                ? 'bg-slate-800 border border-slate-700 text-slate-300'
                : 'bg-slate-950 border border-slate-800 text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Cranial Cage</span>
          </button>
        </div>
      </div>

      {/* Export Mesh Actions */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {meshData?.bounding_box_mm && (
            <span>
              Extent: {meshData.bounding_box_mm.x_span_mm} × {meshData.bounding_box_mm.y_span_mm} ×{' '}
              {meshData.bounding_box_mm.z_span_mm} mm
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportUrls.stl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export STL (3D Print)</span>
          </a>

          <a
            href={exportUrls.obj}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export OBJ</span>
          </a>
        </div>
      </div>
    </div>
  );
};
