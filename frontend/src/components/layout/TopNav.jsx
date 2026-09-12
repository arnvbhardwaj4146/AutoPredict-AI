import React from 'react';
import { RefreshCw, Radio, Sparkles, Menu } from 'lucide-react';

export const TopNav = ({
  activeTitle,
  presets = [],
  selectedPresetId,
  onSelectPreset,
  onRunPredict,
  isPredicting,
  backendConnected,
  onToggleMobileMenu,
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#090D16]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Toggle */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-4 h-4 text-cyan-400" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight truncate">
            {activeTitle}
          </h1>
        </div>

        {/* Backend health pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs shrink-0">
          <span className="relative flex h-2 w-2">
            {backendConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                backendConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-mono text-slate-300">
            {backendConnected ? 'API Connected (FastAPI)' : 'Backend Offline'}
          </span>
        </div>
      </div>

      {/* Preset Selector & Quick Analyze */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {presets.length > 0 && (
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 hidden xl:block" />
            <span className="text-xs text-slate-400 hidden xl:inline font-mono">Scenario:</span>
            <select
              value={selectedPresetId || ''}
              onChange={(e) => onSelectPreset(e.target.value)}
              aria-label="Select Telemetry Scenario Preset"
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 sm:px-3 py-1.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono cursor-pointer max-w-[125px] sm:max-w-[190px] truncate"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={onRunPredict}
          disabled={isPredicting}
          className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-semibold px-3 sm:px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        >
          {isPredicting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{isPredicting ? 'Evaluating...' : 'Run Analysis'}</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
