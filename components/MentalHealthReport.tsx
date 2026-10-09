import React from 'react';
import type { MentalHealthResult } from '../types';
import { SummaryIcon, HazardIcon, ShieldCheckIcon, BrainCircuitIcon } from './icons';
import { useI18n } from './I18n';

interface MentalHealthReportProps {
  result: MentalHealthResult;
}

export const MentalHealthReport: React.FC<MentalHealthReportProps> = ({ result }) => {
  const { t } = useI18n();
  const potentialConcerns = result.potentialConcerns || [];
  const copingStrategies = result.copingStrategies || [];
  const confidence = result.confidenceScore || 0.85;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6 animate-fade-in space-y-6">
        {/* Acute Psychological Distress / Suicide Prevention Emergency Banner */}
        {result.isEmergency && (
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 rounded-2xl shadow-xl border-2 border-red-300 space-y-3">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🆘</span>
                    <div>
                        <h4 className="text-lg font-black tracking-wide">
                            Immediate Emotional Crisis Support Is Here For You
                        </h4>
                        <p className="text-xs text-red-100">
                            You do not have to carry this alone. Free, confidential clinical counselors are standing by 24 hours a day.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <a
                        href="tel:08046110007"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 transition-all text-left"
                    >
                        <div>
                            <span className="text-xs font-bold block text-white">NIMHANS Tele-MANAS</span>
                            <span className="text-[11px] text-red-100">Govt. of India 24x7 Helpline</span>
                        </div>
                        <span className="text-xs font-mono font-bold bg-white text-red-700 px-2.5 py-1 rounded-lg">
                            080-46110007
                        </span>
                    </a>

                    <a
                        href="tel:18602662345"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 transition-all text-left"
                    >
                        <div>
                            <span className="text-xs font-bold block text-white">Vandrevala Foundation</span>
                            <span className="text-[11px] text-red-100">Multilingual Crisis Counsel</span>
                        </div>
                        <span className="text-xs font-mono font-bold bg-white text-red-700 px-2.5 py-1 rounded-lg">
                            1860-2662-345
                        </span>
                    </a>
                </div>
            </div>
        )}

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start">
                    <SummaryIcon className="w-6 h-6 mr-3 mt-1 text-indigo-500 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-base text-indigo-800">{t('wellness_reflection_label')}</h3>
                        <p className="mt-1 text-sm text-indigo-700">{result.summary || 'Summary unavailable.'}</p>
                    </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex-shrink-0">
                    Sentiment Match: {confidencePercent}%
                </span>
            </div>
        </div>

        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <BrainCircuitIcon className="w-6 h-6 text-indigo-500" />
                {t('areas_reflection_label')}
            </h3>
            <div className="space-y-3">
                {potentialConcerns.length > 0 ? (
                    potentialConcerns.map((concern, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                           <p className="font-bold text-slate-800">{concern.name}</p>
                           <p className="text-sm text-slate-600 mt-1">{concern.explanation}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 italic">No specific areas for reflection identified.</p>
                )}
            </div>
        </div>

        <div>
             <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-green-500"/>
                {t('coping_strategies_label')}
            </h3>
            <div className="space-y-4">
                {copingStrategies.length > 0 ? (
                    copingStrategies.map((strategy, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                           <div className="mt-1 flex-shrink-0"><ShieldCheckIcon className="w-5 h-5 text-green-500" /></div>
                           <div>
                                <p className="font-bold text-slate-800 text-sm">{strategy.title}</p>
                                <p className="text-sm text-slate-700 leading-relaxed mt-0.5">{strategy.description}</p>
                           </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 italic">No specific coping strategies recommended.</p>
                )}
            </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg" role="alert">
            <div className="flex">
                <div className="py-1"><HazardIcon className="w-6 h-6 text-blue-500 mr-3"/></div>
                <div>
                    <p className="font-bold">Recommendation</p>
                    <p className="text-sm">{result.recommendation || 'Focus on your daily well-being.'}</p>
                </div>
            </div>
        </div>

        {/* Clinical Psychology Disclaimer */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 shadow-sm text-xs space-y-1">
            <p className="font-bold uppercase tracking-wide text-amber-800">
                ⚠️ Mental Health Screening & Crisis Notice
            </p>
            <p className="leading-relaxed text-amber-900/90">
                {result.disclaimer || 'This conversational sentiment screening provides cognitive self-reflection and coping pointers. It is NOT psychiatric diagnosis, psychotherapy, or clinical suicide risk assessment. In an acute emergency, please contact 108 or Tele-MANAS (080-46110007) immediately.'}
            </p>
        </div>
    </div>
  );
};

export default MentalHealthReport;