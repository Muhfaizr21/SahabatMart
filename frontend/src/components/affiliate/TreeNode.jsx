import React, { useState } from 'react';
import { formatImage } from '../../lib/api';

const TreeNode = ({ node, onDrillDown }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node?.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative group p-4 rounded-2xl border transition-all duration-500 flex flex-col items-center text-center w-48 ${hasChildren ? 'cursor-pointer' : ''}`}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderColor: node.level === 1 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {node.level > 1 && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[2px] h-12 bg-gradient-to-t from-purple-500/30 to-transparent" />
        )}

        {/* Level Indicator */}
        <div className="absolute -top-3 -left-2 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[8px] font-black text-purple-400">
          LVL {node.level}
        </div>

        <div className="relative mb-3">
          <div 
            className="w-14 h-14 rounded-2xl overflow-hidden border-2 p-0.5"
            style={{ borderColor: node.level === 1 ? '#a855f7' : 'rgba(255,255,255,0.1)' }}
          >
            {node.avatar_url ? (
              <img src={formatImage(node.avatar_url)} className="w-full h-full object-cover rounded-xl" alt="" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xl font-black text-white">
                {node.full_name?.charAt(0)}
              </div>
            )}
          </div>
          {node.level === 1 && (
            <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">DIRECT</div>
          )}
        </div>

        <h3 className="text-sm font-bold text-white truncate w-full px-2">{node.full_name}</h3>
        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{node.user_id?.slice(0, 8)}</p>

        <div className="mt-3 w-full pt-3 border-t border-white/5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500 uppercase tracking-tighter">Omset</span>
            <span className="text-green-400">{Number(node.turnover).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500 uppercase tracking-tighter">Tim</span>
            <span className="text-purple-400">{node?.children?.length || 0} Orang</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2 w-full opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={(e) => { e.stopPropagation(); onDrillDown(node); }}
            className="flex-1 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[9px] font-black text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
          >
            MASUK
          </button>
          {hasChildren && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">
                {isExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="relative pt-12 flex gap-8">
          {/* Connector Line to Children */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-12 bg-purple-500/20" />
          
          {node.children.map(child => (
            <TreeNode key={child.affiliate_id} node={child} onDrillDown={onDrillDown} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
