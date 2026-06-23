import React, { useState, useEffect, useRef } from 'react';

export default function SearchHistoryInput({ 
  value, 
  onChange, 
  placeholder, 
  className,
  storageKey = 'recent_searches'
}) {
  const [history, setHistory] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, [storageKey]);

  useEffect(() => {
    // Click outside handler
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveSearch = (term) => {
    if (!term || term.trim() === '') return;
    const trimmed = term.trim();
    const newHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem(storageKey, JSON.stringify(newHistory));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveSearch(value);
      setShowDropdown(false);
    }
  };

  const handleDelete = (e, itemToRemove) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== itemToRemove);
    setHistory(newHistory);
    localStorage.setItem(storageKey, JSON.stringify(newHistory));
  };

  const handleSelect = (item) => {
    onChange(item);
    saveSearch(item);
    setShowDropdown(false);
  };

  const handleFocus = () => {
    if (history.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        autoComplete="off"
        className={`pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-navy w-full [&::-webkit-search-cancel-button]:cursor-pointer ${className || ''}`}
      />
      {showDropdown && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <span>সাম্প্রতিক অনুসন্ধান (Recent Searches)</span>
            <span className="text-[10px] font-normal text-gray-400">Press Enter to save</span>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {history.map((item, idx) => (
              <li 
                key={idx}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                onClick={() => handleSelect(item)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="truncate">{item}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, item)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete from history"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
