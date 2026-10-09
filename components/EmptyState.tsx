import React from 'react';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`w-full py-12 px-6 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50/70 to-slate-100/40 p-8 my-4 transition-all duration-300 ${className}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-3xl bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-3xl sm:text-4xl select-none animate-pulse">
        {typeof icon === 'string' ? <span>{icon}</span> : icon}
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mb-2">
        {title}
      </h3>

      {subtitle && (
        <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
          {subtitle}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm tracking-wide shadow-md shadow-blue-600/20 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {actionLabel}
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all duration-200"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
