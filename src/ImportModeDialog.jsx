import React from 'react';
import { X, RefreshCw, PlusCircle, AlertTriangle } from 'lucide-react';

/**
 * ImportModeDialog — Reusable dialog that asks the user whether to
 * "Replace All" (delete existing, then insert) or "Append" (add to existing)
 * when importing data from a file.
 *
 * Props:
 *  - isOpen: boolean
 *  - fileName: string (name of the file being imported)
 *  - recordCount: number (how many new records were parsed)
 *  - existingCount: number (how many records currently exist)
 *  - onReplace: () => void
 *  - onAppend: () => void
 *  - onCancel: () => void
 */
export default function ImportModeDialog({ isOpen, fileName, recordCount, existingCount, onReplace, onAppend, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            Import Options
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            You are importing <span className="font-semibold text-slate-900">{recordCount} record{recordCount !== 1 ? 's' : ''}</span> from 
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded ml-1">{fileName}</span>.
          </p>
          {existingCount > 0 && (
            <p className="text-sm text-slate-500">
              There are currently <span className="font-semibold text-slate-700">{existingCount}</span> existing records in the database.
            </p>
          )}
          <p className="text-sm text-slate-600 font-medium">How would you like to proceed?</p>

          <div className="grid grid-cols-1 gap-3 pt-2">
            {/* Replace Option */}
            <button
              onClick={onReplace}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 transition-all text-left group"
            >
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                <RefreshCw size={20} className="text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-red-800 text-sm">Replace All</div>
                <div className="text-xs text-red-600 mt-0.5">Delete all existing records and import the new ones</div>
              </div>
            </button>

            {/* Append Option */}
            <button
              onClick={onAppend}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 transition-all text-left group"
            >
              <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                <PlusCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <div className="font-semibold text-emerald-800 text-sm">Append</div>
                <div className="text-xs text-emerald-600 mt-0.5">Keep existing records and add the new ones</div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
