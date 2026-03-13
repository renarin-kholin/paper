"use client";

import React, { useState } from "react";

interface EditorProps {
  onSubmit: (title: string, content: string) => void;
  isLoading?: boolean;
}

export function Editor({ onSubmit, isLoading }: EditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onSubmit(title, content);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Title</span>
        </label>
        <input
          type="text"
          placeholder="Enter your article title..."
          className="input input-bordered w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Content (Markdown)</span>
        </label>
        <textarea
          className="textarea textarea-bordered h-64 font-mono text-sm"
          placeholder="Write your article in Markdown..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isLoading}
          required
        />
        <label className="label">
          <span className="label-text-alt">Supports Markdown formatting</span>
        </label>
      </div>

      <div className="form-control mt-6">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !title.trim() || !content.trim()}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Publishing...
            </>
          ) : (
            "Publish Article"
          )}
        </button>
      </div>
    </form>
  );
}
