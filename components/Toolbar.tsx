import React from 'react';
import { ToolType } from '../types';
import { TOOL_CONFIGS } from '../constants';

interface ToolbarProps {
  onDragStart: (type: ToolType) => void;
  disabled: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onDragStart, disabled }) => {
  return (
    <div className="w-32 bg-slate-900 border-r border-slate-700 flex flex-col gap-6 p-4 items-center shadow-2xl z-20 h-full">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inventário</div>
      {(Object.keys(TOOL_CONFIGS) as ToolType[]).map((type) => {
        const config = TOOL_CONFIGS[type];
        return (
          <div
            key={type}
            draggable={!disabled}
            onDragStart={(e) => {
              if (disabled) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData('toolType', type);
              onDragStart(type);
            }}
            className={`
              group relative flex flex-col items-center gap-2 p-2 w-full rounded-xl cursor-grab active:cursor-grabbing transition-all border border-transparent
              ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-slate-800 hover:border-slate-600'}
            `}
          >
            <div 
              className="w-14 h-14 flex items-center justify-center text-3xl bg-slate-800 rounded-full border-2 border-slate-600 shadow-lg group-hover:border-blue-400 transition-colors group-hover:scale-110"
              style={{ borderColor: disabled ? undefined : config.color }}
            >
              {config.icon}
            </div>
            <span className="text-[10px] font-bold text-slate-400 text-center leading-tight group-hover:text-white">
              {config.label}
            </span>
            
            {/* Tooltip - Now to the right */}
            <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2 w-48 bg-slate-950 text-slate-200 text-xs p-3 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-left shadow-xl">
              <strong className="block text-blue-400 mb-1">{config.label}</strong>
              {config.description}
            </div>
          </div>
        );
      })}
      
      <div className="mt-auto text-[10px] text-slate-600 text-center">
        Arraste para a área de teste
      </div>
    </div>
  );
};

export default Toolbar;