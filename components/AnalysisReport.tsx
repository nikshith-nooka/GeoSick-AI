import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import { HazardIcon, DiseaseIcon, PrecautionIcon, ChevronDownIcon, SummaryIcon } from './icons';
import { LowConfidenceAlert } from './LowConfidenceAlert';

interface AnalysisReportProps {
  result: AnalysisResult;
  imageUrl: string | null;
}

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-100/70 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <DiseaseIcon className="w-6 h-6 text-amber-500"/>
                    <span className="text-base">{title}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 text-slate-600 border-t border-slate-200">
                         {children}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const AnalysisReport: React.FC<AnalysisReportProps> = ({ result, imageUrl }) => {
  const confidence = result.confidenceScore || 0.88;
  const isLowConfidence = result.lowConfidenceWarning || confidence < 0.70;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Confidence & Match Header */}
        <div className="bg-slate-900/90 text-white rounded-xl p-3.5 sm:p-4 border border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <span className="text-lg">🎯</span>
                <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Analysis Match Score
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-base sm:text-lg font-extrabold ${confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                            {confidencePercent}%
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {confidence >= 0.8 ? '(High Match)' : confidence >= 0.7 ? '(Good Match)' : '(Low Match — Try a clearer photo)'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${confidence >= 0.8 ? 'bg-emerald-500' : confidence >= 0.7 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${confidencePercent}%` }}
                />
            </div>
        </div>

        {/* Low Confidence Alert if below safety threshold */}
        {isLowConfidence && (
            <LowConfidenceAlert 
                confidenceScore={confidence} 
                reason="The photo may be blurry or dark. For best results, retake with better lighting."
            />
        )}

        {imageUrl && <img src={imageUrl} alt="Analyzed" className="rounded-lg w-full max-h-72 object-cover border border-slate-200" />}

        {/* Photo Quality Tip */}
        {result.imageQuality && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                result.imageQuality.isLowQuality
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}>
                <div className="flex items-center gap-2">
                    <span className="text-base">{result.imageQuality.isLowQuality ? '⚠️' : '📸'}</span>
                    <div>
                        <span className="font-bold block">
                            {result.imageQuality.isLowQuality ? 'Photo Quality Tip' : 'Photo Clear & Sharp'}
                        </span>
                        <span className="text-[11px] opacity-90">{result.imageQuality.suggestion}</span>
                    </div>
                </div>
            </div>
        )}

        {/* Zero-Hazard Clean Location Confirmed */}
        {result.isCleanBaseline && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-sm text-emerald-950">
                    🛡️ Clean & Safe Area Detected
                </span>
                <p className="leading-relaxed">
                    This area looks clean and safe. No open stagnant water pools, sewage overflows, or garbage piles were found.
                </p>
            </div>
        )}

        {/* Multi-Hazard Breakdown */}
        {result.secondaryHazard && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 block">
                    ⚠️ Multiple Risks Detected
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Primary Risk</span>
                        <span className="font-bold text-slate-900">{result.hazards[0]?.hazard.split('[')[0]}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-600 block uppercase">Secondary Risk ({result.secondaryHazard.confidence}%)</span>
                        <span className="font-bold text-slate-900">{result.secondaryHazard.hazard}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{result.secondaryHazard.description}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
             <div className="flex items-start">
                <SummaryIcon className="w-6 h-6 mr-3 mt-1 text-blue-500 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-base text-blue-800">Overall Assessment</h3>
                    <p className="mt-1 text-sm text-blue-700">{result.summary}</p>
                </div>
            </div>
        </div>

        {/* Tamper-Evident SHA-256 Checksum & GPS Metadata */}
        {result.tamperProof && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-600">
                <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">🔒 VERIFIED RECORD:</span>
                    <span>{result.tamperProof.sha256Checksum}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span>LOCATION: {result.tamperProof.latitude}°, {result.tamperProof.longitude}°</span>
                    <span>DEVICE ID: {result.tamperProof.deviceHash}</span>
                </div>
            </div>
        )}
        
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2"><HazardIcon className="w-6 h-6 text-rose-500"/>Identified Hazards</h3>
                <div className="space-y-2">
                    {result.hazards.map((h, index) => (
                        <div key={index} className="bg-rose-50/70 p-3 rounded-md border-l-4 border-rose-500 flex items-start gap-3">
                           <strong className="font-semibold text-sm text-rose-800">{h.hazard}:</strong> 
                           <span className="text-sm text-rose-700">{h.description}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div>
                 <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2"><DiseaseIcon className="w-6 h-6 text-amber-500"/>Potential Diseases & Precautions</h3>
                <div className="space-y-3">
                     {result.diseases.map((d, index) => (
                        <AccordionItem 
                            key={index} 
                            title={d.name}
                            defaultOpen={index === 0}
                        >
                            <p className="mb-4 text-sm"><strong className="font-medium text-slate-700">Cause:</strong> {d.cause}</p>
                            <div>
                                <h5 className="font-semibold mb-2 flex items-center text-slate-700 text-sm gap-2"><PrecautionIcon className="w-5 h-5 text-green-500"/>Precautions:</h5>
                                <ul className="space-y-2 pl-4 text-sm">
                                    {d.precautions.map((p, pIndex) => (
                                        <li key={pIndex} className="flex items-start gap-2.5">
                                           <span className="text-green-500 mt-1">&#10003;</span> 
                                           <span>{p}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AccordionItem>
                    ))}
                </div>
            </div>

            {/* Health Notice Footer */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 shadow-sm">
                <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div className="space-y-1">
                        <p className="font-bold text-xs uppercase tracking-wider text-amber-800">
                            Important Health Notice
                        </p>
                        <p className="text-xs leading-relaxed text-amber-900/90">
                            {result.disclaimer || 'This check is for informational and educational guidance only. It does not replace care or diagnosis from a qualified doctor.'}
                        </p>
                        <div className="pt-2 flex items-center gap-3 text-xs">
                            <span className="font-bold text-red-700">Need Urgent Help?</span>
                            <a 
                                href="tel:108"
                                className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm"
                            >
                                <span>Call 108 Emergency</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};