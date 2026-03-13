"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function SearchBar() {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`
        hidden md:flex items-center rounded-full px-4 py-2.5 ml-4 transition-all duration-300 ease-out-smooth relative group
        ${isFocused ? "bg-white ring-2 ring-stone-900/10 shadow-sm w-72" : "bg-stone-50 hover:bg-stone-100 w-56"}
      `}
    >
      <Search
        className={`w-4 h-4 mr-2 transition-colors duration-300 ${
          isFocused ? "text-stone-900" : "text-stone-400 group-hover:text-stone-500"
        }`}
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Search"
        aria-label="Search"
        aria-keyshortcuts="meta+k"
        className="!bg-transparent !border-none !outline-none focus:!ring-0 focus-visible:!ring-0 focus:!outline-none focus-visible:!outline-none text-sm w-full placeholder:text-stone-400"
      />

      {/* Keyboard shortcut hint / Clear button */}
      <div className="absolute right-3 flex items-center h-full">
        {query.length > 0 ? (
          <button
            type="button"
            onMouseDown={e => {
              // use onMouseDown to prevent blur before clear
              e.preventDefault();
              setQuery("");
              inputRef.current?.focus();
            }}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <div
            className={`flex items-center gap-0.5 transition-opacity duration-300 ${isFocused ? "opacity-0" : "opacity-100"}`}
          >
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-medium text-stone-400 bg-stone-200/50 rounded border border-stone-200">
              <span className="text-[10px] mr-0.5">⌘</span>K
            </kbd>
          </div>
        )}
      </div>
    </div>
  );
}
