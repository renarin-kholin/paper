"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, X } from "lucide-react";

const QUICK_TOPICS = ["web3", "ethereum", "privacy", "ai", "defi", "writing", "design", "security"];

export function SearchBar() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return QUICK_TOPICS.slice(0, 5);
    const q = query.toLowerCase();
    return QUICK_TOPICS.filter(topic => topic.includes(q)).slice(0, 5);
  }, [query]);

  const showPanel = isFocused || query.trim().length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const closeIfOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", closeIfOutside);
    return () => document.removeEventListener("mousedown", closeIfOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSubmit = (value: string) => {
    const next = value.trim();
    if (!next) return;
    router.push(`/?q=${encodeURIComponent(next)}`);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative hidden md:block ml-4">
      <div
        className={`
          flex items-center rounded-full px-4 py-2.5 transition-all duration-200 relative group border
          ${
            showPanel
              ? "bg-white border-stone-300 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.3)] w-80"
              : "bg-stone-50 border-transparent hover:bg-stone-100 hover:shadow-[0_4px_14px_-14px_rgba(0,0,0,0.24)] w-56"
          }
        `}
      >
        <Search
          className={`w-4 h-4 mr-2 transition-all duration-200 ${
            showPanel ? "text-stone-900" : "text-stone-400 group-hover:text-stone-500"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions[activeIndex]) {
                handleSubmit(suggestions[activeIndex]);
              } else {
                handleSubmit(query);
              }
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex(prev => (prev + 1) % Math.max(suggestions.length, 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex(prev => (prev - 1 + Math.max(suggestions.length, 1)) % Math.max(suggestions.length, 1));
            }
          }}
          placeholder="Search topics"
          aria-label="Search"
          aria-keyshortcuts="meta+k"
          className="!bg-transparent !border-none !outline-none focus:!ring-0 focus-visible:!ring-0 text-sm w-full placeholder:text-stone-400"
        />

        <div className="absolute right-3 flex items-center h-full">
          {query.length > 0 ? (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:scale-95"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd
              className={`inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-medium text-stone-400 bg-stone-200/60 rounded border border-stone-200 transition-opacity ${showPanel ? "opacity-0" : "opacity-100"}`}
            >
              <span className="text-[10px] mr-0.5">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      <div
        className={`
          absolute left-0 right-0 mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_10px_20px_-16px_rgba(0,0,0,0.28)]
          transition-all duration-200 origin-top z-30
          ${showPanel ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-stone-400">Quick Search</div>
        <ul className="space-y-1">
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={suggestion}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSubmit(suggestion)}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm transition-all ${
                    isActive ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <span className="capitalize">{suggestion}</span>
                  <ArrowUpRight className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-40"}`} />
                </button>
              </li>
            );
          })}
          {suggestions.length === 0 && <li className="px-2.5 py-2 text-sm text-stone-500">No matching suggestions</li>}
        </ul>
      </div>
    </div>
  );
}
