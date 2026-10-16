import React from 'react';
import { Ruler, Activity, Layers, AlertCircle } from 'lucide-react';
import { MeasurementsResult } from '../types';

interface MeasurementsTableProps {
  measurements: MeasurementsResult;
}

export const MeasurementsTable: React.FC<MeasurementsTableProps> = ({ measurements }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Quantitative Tumour Metrics</h3>
              <p className="text-xs text-slate-400">
                {measurements.is_3d ? 'Volumetric 3D Spatial Quantification' : '2D Planar Pixel Morphometry'}
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300">
            {measurements.is_3d ? 'Physical Spacing Calibrated' : 'Pixel-Level Planar'}
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {measurements.is_3d ? (
            <>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Total Volume
                </span>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {measurements.total_volume_ml !== null ? `${measurements.total_volume_ml} mL` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">
                  {measurements.total_volume_cm3} cm³
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Segmented Voxels
                </span>
                <div className="text-xl font-bold text-white mt-1">
                  {measurements.total_count.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500">3D Matrix Voxels</span>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Max 3D Extent
                </span>
                <div className="text-xl font-bold text-teal-400 mt-1">
                  {measurements.max_extent_mm
                    ? `${measurements.max_extent_mm.maximum_diagonal_mm} mm`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">Diagonal Dimension</span>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Pixel Count
                </span>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {measurements.total_count.toLocaleString()} px
                </div>
                <span className="text-[10px] text-slate-500">Positive Segmented Pixels</span>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  FOV Occupancy
                </span>
                <div className="text-xl font-bold text-teal-400 mt-1">
                  {measurements.area_percentage_2d}%
                </div>
                <span className="text-[10px] text-slate-500">Of Slice Area</span>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Physical mm
                </span>
                <div className="text-sm font-semibold text-slate-400 mt-2">
                  Not Calibrated
                </div>
                <span className="text-[10px] text-slate-500">2D format missing spacing</span>
              </div>
            </>
          )}
        </div>

        {/* Subregion Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-2">Subregion</th>
                <th className="pb-2 text-right">Elements</th>
                {measurements.is_3d && <th className="pb-2 text-right">Volume (mL)</th>}
                <th className="pb-2 text-right">Share of Tumour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {measurements.subregions.map((sub) => (
                <tr key={sub.subregion_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color_hex }}
                    />
                    <span className="font-medium text-slate-200">{sub.name}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono">{sub.count.toLocaleString()}</td>
                  {measurements.is_3d && (
                    <td className="py-2.5 text-right font-mono text-cyan-300">
                      {sub.volume_ml !== null ? `${sub.volume_ml} mL` : '—'}
                    </td>
                  )}
                  <td className="py-2.5 text-right font-mono font-semibold">
                    {sub.percentage_of_tumour}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="pt-4 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400 italic">
        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>{measurements.disclaimer}</span>
      </div>
    </div>
  );
};
