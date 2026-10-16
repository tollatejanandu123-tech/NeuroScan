import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { ClassificationResult } from '../types';

interface ClassificationCardProps {
  classification: ClassificationResult;
}

const CLASS_COLORS: Record<string, string> = {
  'Glioma': '#ef4444',            // Red
  'Meningioma': '#f59e0b',        // Amber
  'Pituitary tumour': '#8b5cf6',   // Purple
  'No Tumour': '#10b981',         // Green
};

export const ClassificationCard: React.FC<ClassificationCardProps> = ({ classification }) => {
  const chartData = classification.probabilities.map((item) => ({
    name: item.class_name,
    probability: Math.round(item.probability * 1000) / 10,
    color: CLASS_COLORS[item.class_name] || '#06b6d4',
  }));

  const primaryColor = CLASS_COLORS[classification.predicted_class] || '#06b6d4';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Tumour Classification</h3>
              <p className="text-xs text-slate-400">Transfer-Learning CNN Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{classification.inference_time_ms} ms</span>
          </div>
        </div>

        {/* Prediction Hero Badge */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Predicted Diagnosis
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xl font-bold text-white tracking-tight">
                {classification.predicted_class}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Model Confidence
            </span>
            <div className="text-2xl font-extrabold text-cyan-400">
              {(classification.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Recharts Probability Distribution */}
        <div className="space-y-2 mb-4">
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            Posterior Probability Distribution
          </span>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Probability']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="probability" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400 italic">
        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>
          Classifier confidence reflects mathematical softmax probability, not confirmed clinical certainty.
        </span>
      </div>
    </div>
  );
};
