import React, { useState, useEffect } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Maximize2
} from 'lucide-react';
import { fetchSliceData } from '../services/api';
import { SliceDataResponse } from '../types';

interface MRIViewer2DProps {
  resultId: string;
  is3D: boolean;
  totalSlices: number;
  initialSliceIndex: number;
}

export const MRIViewer2D: React.FC<MRIViewer2DProps> = ({
  resultId,
  is3D,
  totalSlices,
  initialSliceIndex,
}) => {
  const [sliceIndex, setSliceIndex] = useState(initialSliceIndex);
  const [sliceData, setSliceData] = useState<SliceDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overlay' | 'original' | 'mask'>('overlay');
  const [opacity, setOpacity] = useState(55);
  const [showMask, setShowMask] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [activeSubregions, setActiveSubregions] = useState({
    enhancing: true,
    core: true,
    edema: true,
  });

  // Fetch slice on sliceIndex change or mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchSliceData(resultId, sliceIndex)
      .then((data) => {
        if (isMounted) {
          setSliceData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching slice:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resultId, sliceIndex]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      {/* Viewer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Interactive 2D MRI Viewer</h3>
            <p className="text-xs text-slate-400">
              {is3D ? `Volumetric Axial Slice Navigation (${totalSlices} slices)` : '2D Planar MRI Analysis'}
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'overlay'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overlay
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'original'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Original MRI
          </button>
          <button
            onClick={() => setViewMode('mask')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'mask'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mask Only
          </button>
        </div>
      </div>

      {/* Main Image Canvas Container */}
      <div className="relative w-full aspect-square bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center select-none">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {sliceData ? (
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-150 cursor-grab active:cursor-grabbing"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Base Image */}
            <img
              src={
                viewMode === 'mask'
                  ? sliceData.mask_image_base64
                  : viewMode === 'original'
                  ? sliceData.original_image_base64
                  : sliceData.original_image_base64
              }
              alt="Brain MRI Slice"
              className="max-h-full max-w-full object-contain filter contrast-110"
              draggable={false}
            />

            {/* Overlay Mask with Opacity */}
            {viewMode === 'overlay' && showMask && (
              <img
                src={sliceData.mask_image_base64}
                alt="Segmentation Overlay"
                className="absolute inset-0 max-h-full max-w-full m-auto object-contain pointer-events-none transition-opacity duration-150"
                style={{ opacity: opacity / 100 }}
                draggable={false}
              />
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-sm">Loading MRI buffer...</div>
        )}

        {/* Floating Zoom / Reset Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-md shadow-md z-10">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="px-1 text-[11px] font-mono text-slate-400">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Slice Navigation Overlay Badge */}
        {is3D && (
          <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300 backdrop-blur-md shadow-md z-10">
            Slice {sliceIndex + 1} / {totalSlices}
          </div>
        )}
      </div>

      {/* Slicing Slider for 3D scans */}
      {is3D && totalSlices > 1 && (
        <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Axial Slice Navigation
            </span>
            <span className="font-mono text-cyan-400">
              Z = {sliceIndex + 1} of {totalSlices}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSliceIndex((prev) => Math.max(0, prev - 1))}
              disabled={sliceIndex <= 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={0}
              max={totalSlices - 1}
              value={sliceIndex}
              onChange={(e) => setSliceIndex(Number(e.target.value))}
              className="flex-1 accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <button
              onClick={() => setSliceIndex((prev) => Math.min(totalSlices - 1, prev + 1))}
              disabled={sliceIndex >= totalSlices - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Overlay Opacity & Visibility Controls */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
        {viewMode === 'overlay' && (
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <button
                onClick={() => setShowMask(!showMask)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {showMask ? <Eye className="w-3.5 h-3.5 text-teal-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>{showMask ? 'Hide Mask' : 'Show Mask'}</span>
              </button>
              <span>Mask Opacity</span>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <input
                type="range"
                min={10}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="font-mono text-slate-400 w-8 text-right">{opacity}%</span>
            </div>
          </div>
        )}

        {/* BraTS Subregions Color Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Subregions:
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
            <span className="text-slate-200 font-medium">Enhancing Tumour (ET)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-slate-200 font-medium">Tumour Core (TC)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-slate-200 font-medium">Peritumoral Oedema (ED)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
