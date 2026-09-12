import React from 'react';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Wrench,
  LineChart,
  Cpu,
  Car,
  ChevronRight,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analysis', label: 'Vehicle Analysis', icon: Activity },
  { id: 'prediction', label: 'Failure Prediction', icon: AlertTriangle },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'analytics', label: 'Analytics', icon: LineChart },
];

export const Sidebar = ({
  activeTab,
  onSelectTab,
  vehicleId,
  healthScore = 84,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Main Navigation"
        className={`fixed inset-y-0 left-0 w-64 h-screen bg-[#070A12] border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-50 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand & Logo */}
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center shadow-glow-cyan">
                <Car className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-white text-base">
                    AutoPredict
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Predictive Telemetry</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation links */}
          <div className="px-3 py-6">
            <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-3 font-semibold">
              Telemetry Navigation
            </p>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400/80" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Active Vehicle Snapshot & Model Indicator */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-mono">Vehicle ID</span>
              <span className="font-mono text-cyan-400 font-semibold">{vehicleId || 'VH-MVP-8410'}</span>
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Health Index</span>
              <span className="font-mono font-bold text-emerald-400">{Math.round(healthScore)} / 100</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>ML Inference Ready</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
