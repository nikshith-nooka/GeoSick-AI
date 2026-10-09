import React, { useState } from 'react';
import type { PrescriptionAnalysisResult, Facility } from '../types';
import { findFacilitiesByCoordinates } from '../services/geminiService';
import { PrecautionIcon, SummaryIcon, BuildingOfficeIcon, DirectionsIcon, CrosshairsIcon, MapIcon, ChevronRightIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { useI18n } from './I18n';
import { LowConfidenceAlert } from './LowConfidenceAlert';

interface PrescriptionReportProps {
  result: PrescriptionAnalysisResult;
  imageUrl: string;
}

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const rlat1 = lat1 * (Math.PI / 180);
    const rlat2 = lat2 * (Math.PI / 180);
    const difflat = rlat2 - rlat1;
    const difflon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(difflat / 2) * Math.sin(difflat / 2) +
        Math.cos(rlat1) * Math.cos(rlat2) *
        Math.sin(difflon / 2) * Math.sin(difflon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const PrescriptionReport: React.FC<PrescriptionReportProps> = ({ result, imageUrl }) => {
  const { t } = useI18n();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [findStatus, setFindStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [findError, setFindError] = useState<string | null>(null);
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Human-in-the-Loop Editable Medicines & Verification State
  const [editableMedicines, setEditableMedicines] = useState(
    (result?.medicines || []).map(m => ({
      ...m,
      isUserVerified: m.isUserVerified || false
    }))
  );
  const [isVerifiedByPatient, setIsVerifiedByPatient] = useState(result?.verifiedByUser || false);
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');

  // Safety checks
  const precautions = result?.precautions || [];
  const videos = result?.videos || [];

  const handleFindFacilities = async () => {
    setFindStatus('loading');
    setFacilities([]);
    setFindError(null);
    setSearchCoords(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setSearchCoords(coords);
        try {
            const facilitiesFromApi = await findFacilitiesByCoordinates(coords);
            if (!Array.isArray(facilitiesFromApi)) throw new Error("Invalid response.");

            const nearbyFacilities = facilitiesFromApi
                .map(facility => ({
                    ...facility,
                    distance: getDistanceInKm(coords.lat, coords.lng, facility.lat, facility.lng)
                }))
                .sort((a, b) => a.distance - b.distance)
                .map(f => ({ ...f, distance: `${f.distance.toFixed(1)} km` }));
            
            setFacilities(nearbyFacilities);
            setFindStatus('success');
        } catch (error) {
            setFindError(t('chatbot_error'));
            setFindStatus('error');
        }
      },
      (error) => {
        setFindError("Location access denied.");
        setFindStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getPharmacySearchUrl = () => {
    if (searchCoords) {
        return `https://www.google.com/maps/search/pharmacy+medical+shop/@${searchCoords.lat},${searchCoords.lng},14z`;
    }
    return `https://www.google.com/maps/search/pharmacy+near+me`;
  };

  const confidence = result?.confidenceScore || 0.89;
  const isLowConfidence = result?.lowConfidenceWarning || confidence < 0.70;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6 animate-fade-in space-y-6">
        {/* Confidence & Accuracy Header */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 border border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
                <span className="text-lg">💊</span>
                <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Prescription Read Score
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                        {confidencePercent}% Match Accuracy
                    </span>
                </div>
            </div>
            <div className="text-xs text-slate-400">
                <span>Verification Status: </span>
                <span className={`font-semibold ${isVerifiedByPatient ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {isVerifiedByPatient ? 'Confirmed by you ✓' : 'Please check details'}
                </span>
            </div>
        </div>

        {isLowConfidence && (
            <LowConfidenceAlert 
                confidenceScore={confidence}
                reason="The handwriting was hard to read in some spots. Please double-check the medicine names below."
            />
        )}

        {imageUrl && <img src={imageUrl} alt="Uploaded Prescription" className="rounded-lg w-full max-h-72 object-contain border border-slate-200 bg-slate-50" />}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
             <div className="flex items-start">
                <SummaryIcon className="w-6 h-6 mr-3 mt-1 text-blue-500 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-base text-blue-800">{t('prescription_summary_label')}</h3>
                    <p className="mt-1 text-sm text-blue-700">{result?.summary || 'Summary unavailable.'}</p>
                </div>
            </div>
        </div>

        {/* Human-in-the-Loop Medicine Editor & Verification */}
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.477 2.387a2 2 0 00.547 1.022l2.387 2.387a2 2 0 001.022.547l2.387.477a2 2 0 001.96-1.414l.477-2.387a2 2 0 00-.547-1.022l-2.387-2.387zM5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                    {t('medicines_label')}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {editableMedicines.length} Detected
                    </span>
                </h3>
                <button
                    type="button"
                    onClick={() => setIsAddingMed(!isAddingMed)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                    {isAddingMed ? 'Cancel' : '+ Add Medication'}
                </button>
            </div>

            {/* Quick Add Medicine Form */}
            {isAddingMed && (
                <div className="mb-4 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-fade-in">
                    <p className="text-xs font-bold text-blue-900 uppercase">Manual Prescription Entry (Add Missed Item)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Medicine Name (e.g. Azithromycin 500mg)"
                            value={newMedName}
                            onChange={(e) => setNewMedName(e.target.value)}
                            className="text-xs p-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="Dosage & Frequency (e.g. 1 tab daily for 3 days)"
                            value={newMedDosage}
                            onChange={(e) => setNewMedDosage(e.target.value)}
                            className="text-xs p-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!newMedName.trim()) return;
                            setEditableMedicines(prev => [
                                ...prev,
                                {
                                    name: newMedName.trim(),
                                    dosage: newMedDosage.trim() || 'As directed by physician',
                                    isUserVerified: true
                                }
                            ]);
                            setNewMedName('');
                            setNewMedDosage('');
                            setIsAddingMed(false);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                        Save Medicine
                    </button>
                </div>
            )}

            {/* Editable Medicine List */}
            <div className="space-y-3">
                {editableMedicines.length > 0 ? (
                    editableMedicines.map((med, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-blue-300 transition-colors">
                           <div className="min-w-0 flex-1 space-y-1">
                               <input
                                    type="text"
                                    value={med.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEditableMedicines(prev => prev.map((m, i) => i === index ? { ...m, name: val } : m));
                                    }}
                                    className="font-bold text-base text-slate-800 w-full bg-transparent hover:bg-slate-50 focus:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-blue-400 focus:outline-none transition-colors"
                                />
                               <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Dosage</span>
                                    <input
                                        type="text"
                                        value={med.dosage}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditableMedicines(prev => prev.map((m, i) => i === index ? { ...m, dosage: val } : m));
                                        }}
                                        className="text-xs text-slate-600 font-medium w-full bg-transparent hover:bg-slate-50 focus:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-blue-400 focus:outline-none transition-colors"
                                    />
                               </div>
                           </div>
                           <div className="flex items-center gap-2 self-end sm:self-center">
                               <button
                                    type="button"
                                    onClick={() => {
                                        setEditableMedicines(prev => prev.filter((_, i) => i !== index));
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                    title="Remove misread or incorrect medicine"
                               >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                               </button>
                           </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-500 italic">No medicines in prescription. Click "+ Add Medication" above to add.</p>
                    </div>
                )}
            </div>

            {/* Human Verification Card */}
            <div className={`mt-4 p-4 rounded-2xl border transition-all ${isVerifiedByPatient ? 'bg-emerald-50/70 border-emerald-300' : 'bg-amber-50/70 border-amber-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isVerifiedByPatient}
                        onChange={(e) => setIsVerifiedByPatient(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                        <span className="text-xs font-bold text-slate-900 block">
                            {isVerifiedByPatient ? '🛡️ Checked and Confirmed by You' : '⚠️ Please Check Your Medicines'}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {isVerifiedByPatient
                                ? 'You confirmed that these medicines match your doctor’s paper prescription.'
                                : 'Doctor handwriting can be tricky! Please check the names and dosages above, edit if anything looks off, and tick this box.'
                            }
                        </p>
                    </div>
                </label>
            </div>
        </div>

        {videos.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z"/></svg>
                    {t('safety_guides_label')}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {videos.map((video, idx) => (
                        <a key={idx} href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all group">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800 truncate">{video.title}</p>
                                <p className="text-xs text-blue-600 font-semibold mt-0.5">Watch Tutorial &rarr;</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        )}
        
        <div>
             <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <PrecautionIcon className="w-6 h-6 text-green-500"/>
                {t('precautions_label')}
            </h3>
            <ul className="space-y-3 pl-2">
                {precautions.length > 0 ? (
                    precautions.map((p, pIndex) => (
                        <li key={pIndex} className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                           <span className="text-green-500 mt-1 flex-shrink-0 font-bold">&#10003;</span> 
                           <span className="text-sm text-slate-700 leading-relaxed">{p}</span>
                        </li>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 italic">No specific medical precautions extracted.</p>
                )}
            </ul>

            {/* Medical References */}
            {result?.clinicalCitations && result.clinicalCitations.length > 0 && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        📚 Medical Guidelines & Sources
                    </span>
                    <div className="space-y-2">
                        {result.clinicalCitations.map((cite, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="font-bold text-blue-600 min-w-[36px]">• [{cite.source.split(' ')[0]}]</span>
                                <div>
                                    <span className="font-semibold text-slate-800">{cite.guideline}</span>
                                    {cite.year && <span className="text-slate-400 ml-1.5">({cite.year})</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        
        <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800">{t('nearby_pharmacies_label')}</h3>
                    <p className="text-xs text-slate-500">{t('locate_pharmacies_desc')}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                   <MapIcon className="w-5 h-5 text-blue-500" />
                   <a 
                        href={getPharmacySearchUrl()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-blue-600 hover:underline"
                    >
                        {t('explore_on_maps')}
                    </a>
                </div>
            </div>

            {findStatus === 'idle' && (
                <button onClick={handleFindFacilities} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg transform active:scale-95">
                    <CrosshairsIcon className="w-5 h-5 mr-2" /> {t('find_nearby_shops_button')}
                </button>
            )}

            <div className="mt-4">
                {findStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 animate-pulse">
                        <LoadingSpinner />
                        <p className="mt-3 text-sm font-medium">{t('location_finding_facilities')}</p>
                    </div>
                )}
                {findStatus === 'success' && (
                    <div className="space-y-4 animate-fade-in">
                        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            {facilities.map((facility, index) => {
                                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;
                                return (
                                <li key={index} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <div className="min-w-0 pr-4">
                                        <p className="font-bold text-slate-800 text-base truncate">{facility.name}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">{facility.type} • {facility.distance}</p>
                                    </div>
                                    <a 
                                        href={directionsUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-200 transition-all whitespace-nowrap flex items-center gap-2"
                                    >
                                        <DirectionsIcon className="w-5 h-5" />
                                        {t('directions_button')}
                                    </a>
                                </li>
                            )})}
                        </ul>
                        <div className="flex gap-3">
                            <button onClick={() => setFindStatus('idle')} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Reset Search</button>
                            <a href={getPharmacySearchUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 text-sm font-bold text-center text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100">View All Shops</a>
                        </div>
                    </div>
                )}
                {findStatus === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                        <p className="text-sm text-red-600 font-medium">{findError}</p>
                        <button onClick={handleFindFacilities} className="mt-2 text-xs font-bold text-red-700 underline underline-offset-4">Try Again</button>
                    </div>
                )}
            </div>
        </div>

        {/* Medicine Reminder Notice */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 shadow-sm text-xs space-y-1">
            <p className="font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                <span>⚠️ Important Medicine Reminder</span>
            </p>
            <p className="leading-relaxed text-amber-900/90">
                {result?.disclaimer || 'This tool helps you read and organize your medicines. It is not an official prescription. Always double-check your medicines with your doctor or pharmacist before taking them.'}
            </p>
        </div>
    </div>
  );
};