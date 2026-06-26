import React, { useState, useRef, useEffect } from 'react';

// AdminSelect: A premium drop-in replacement for native <select>
// Solves the issue of native OS dropdown menus (like macOS dark grey boxes) looking out of place.
export default function AdminSelect({ value, onChange, children, className, style, disabled, ...props }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Flatten and parse children into options
  const parseOptions = (nodes) => {
    let opts = [];
    React.Children.forEach(nodes, child => {
      if (!child) return;
      if (child.type === 'option') {
        opts.push({ 
          value: child.props.value, 
          label: child.props.children, 
          disabled: child.props.disabled 
        });
      } else if (child.type === 'optgroup') {
        opts.push({ label: child.props.label, isGroup: true });
        opts = opts.concat(parseOptions(child.props.children));
      } else if (child.props && child.props.children) {
        opts = opts.concat(parseOptions(child.props.children));
      }
    });
    return opts;
  };

  const options = parseOptions(children);
  const safeValueStr = String(value !== undefined && value !== null ? value : '');
  const selectedOption = options.find(o => String(o.value !== undefined && o.value !== null ? o.value : '') === safeValueStr);
  
  // If no value matched, fall back to the first non-group option (mimicking native select)
  const displayLabel = selectedOption 
    ? selectedOption.label 
    : (options.find(o => !o.isGroup)?.label || "Select...");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ 
        target: { 
          value: val,
          name: props.name,
          id: props.id
        } 
      });
    }
    setIsOpen(false);
  };

  // Extract layout-only classes and styles for the wrapper to prevent double-boxing
  const wrapperClass = (className || '').split(' ').filter(c => 
    /^(w-|min-w-|max-w-|flex|m[trblxy]?-|grid|col-|row-)/.test(c) || c === 'hidden' || c === 'block' || c === 'inline-block'
  ).join(' ');

  const wrapperStyle = {};
  const buttonStyle = { minHeight: style && style.height ? 'auto' : '42px' };
  
  if (style) {
    Object.keys(style).forEach(k => {
      if (['width', 'minWidth', 'maxWidth', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'flex', 'display', 'position'].includes(k)) {
        wrapperStyle[k] = style[k];
      } else if (!['border', 'padding', 'background', 'borderRadius', 'appearance', 'outline', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'boxSizing'].includes(k)) {
        buttonStyle[k] = style[k];
      }
    });
  }

  const baseClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none flex justify-between items-center transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? 'z-50' : 'z-10'} ${wrapperClass}`} style={wrapperStyle} {...props}>
      {/* Invisible native select for true form submission if needed (accessibility & hidden form inputs) */}
      <select 
        value={value} 
        onChange={onChange} 
        className="hidden" 
        disabled={disabled}
      >
        {children}
      </select>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={baseClass}
        style={buttonStyle}
      >
        <span className="truncate">{displayLabel}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 min-w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden animate-fade-in py-1 max-h-60 overflow-y-auto whitespace-nowrap">
          {options.map((opt, i) => {
            if (opt.isGroup) {
              return (
                <div key={`group-${i}`} className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1 first:mt-0">
                  {opt.label}
                </div>
              );
            }
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={`opt-${i}`}
                onClick={() => !opt.disabled && handleSelect(opt.value)}
                className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${opt.disabled ? 'text-slate-300 cursor-not-allowed' : isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
