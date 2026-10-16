import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { QualityAssessmentResult, QACheckItem } from '../types';

interface QualityAssessmentCardProps {
  qa: QualityAssessmentResult;
}

export const QualityAssessmentCard: React.FC<QualityAssessmentCardProps> = ({ qa }) => {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  const toggleExpand = (checkId: string) => {
    setExpandedCheck(expandedCheck === checkId ? null : checkId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTABLE_FOR_REVIEW':
        return {
          bg: 'bg-teal-950/80 border-teal-600/50 text-teal-300',
          icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
          label: 'Acceptable for Review',
        };
      case 'NEEDS_REVIEW':
        return {
          bg: 'bg-amber-950/80 border-amber-600/50 text-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: 'Needs Secondary Review',
        };
      default:
        return {
          bg: 'bg-rose-950/80 border-rose-600/50 text-rose-300',
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
          label: 'Processing Inconclusive / Failed',
        };
    }
  };

  const badge = getStatusBadge(qa.overall_status);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Automated Quality Assessment</h3>
              <p className="text-xs text-slate-400">8 Rule-Based Clinical Heuristic Audits</p>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badge.bg}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>

        {/* Quality Score Gauge & Next Action */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
          <div className="sm:col-span-1 text-center sm:text-left border-b sm:border-b-0 sm:border-r border-slate-800 pb-3 sm:pb-0 sm:pr-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Quality Score
            </span>
            <div className="text-3xl font-extrabold text-cyan-400 mt-0.5">
              {qa.overall_score}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </div>
          </div>

          <div className="sm:col-span-3 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Suggested Radiological Action
            </span>
            <p className="text-xs font-medium text-slate-200 mt-1 leading-relaxed">
              {qa.suggested_action}
            </p>
          </div>
        </div>

        {/* Warnings list if any */}
        {qa.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Flagged Technical Discrepancies ({qa.warnings.length})</span>
            </div>
            <ul className="text-xs text-amber-200/90 space-y-1 pl-5 list-disc">
              {qa.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 8 Check Items Accordion */}
        <div className="space-y-1.5 mb-4">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Diagnostic Verification Checks
          </span>
          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
            {qa.checks.map((item) => {
              const isExpanded = expandedCheck === item.check_id;
              return (
                <div key={item.check_id} className="transition-colors hover:bg-slate-900/50">
                  <div
                    onClick={() => toggleExpand(item.check_id)}
                    className="flex items-center justify-between p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.status === 'passed' && (
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      )}
                      {item.status === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      {item.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-200">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.metric_value && (
                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                          {item.metric_value}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 text-xs text-slate-300 bg-slate-900/40 space-y-1 border-t border-slate-800/40">
                      <p>{item.details}</p>
                      {item.threshold && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          Target Threshold: {item.threshold}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400 italic">
        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>{qa.disclaimer}</span>
      </div>
    </div>
  );
};
