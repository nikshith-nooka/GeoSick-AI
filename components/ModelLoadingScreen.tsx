import React from 'react';

interface ModelLoadingScreenProps {
  modelName?: string;
  progressPercent?: number;
  stageMessage?: string;
  onCancel?: () => void;
}

export const ModelLoadingScreen: React.FC<ModelLoadingScreenProps> = ({
  modelName = 'GeoSick Edge Neural ConvNet',
  progressPercent = 65,
  stageMessage = 'Streaming ONNX tensor weights from browser storage into WebAssembly/WebGL context...',
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-gray-900/95 text-white p-6 shadow-2xl shadow-cyan-950/60 text-center">
        {/* Animated AI Pulse Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-2xl relative">
          <span className="animate-spin absolute inset-0 rounded-2xl border-2 border-transparent border-t-cyan-400 border-r-cyan-400 opacity-60" />
          <svg className="w-8 h-8 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-white mb-1 tracking-tight">
          Preparing Sovereign AI Model
        </h3>
        <p className="text-xs text-cyan-300 font-medium mb-4">
          {modelName}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700 mb-2">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, Math.max(10, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-4 font-mono">
          <span>WebAssembly Tensor Engine</span>
          <span>{Math.round(progressPercent)}% Cached</span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed bg-gray-800/60 p-3 rounded-xl border border-gray-700/60 mb-5 text-left">
          💡 <strong className="text-gray-300">Zero Cloud Transmission:</strong> {stageMessage}
        </p>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Use lightweight offline rule engine instead
          </button>
        )}
      </div>
    </div>
  );
};

export default ModelLoadingScreen;
