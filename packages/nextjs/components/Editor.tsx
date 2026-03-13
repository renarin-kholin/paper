"use client";

import React, { useState } from "react";
import { ETH_ADDRESS } from "~~/lib/ipfs";

interface EditorProps {
  onSubmit: (title: string, content: string, price: string, priceToken: string) => void;
  isLoading?: boolean;
}

export function Editor({ onSubmit, isLoading }: EditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [priceEth, setPriceEth] = useState("");
  const [priceToken] = useState(ETH_ADDRESS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!isFree && (!priceEth || priceEth === "")) return;

    // Convert ETH to wei (1 ETH = 10^18 wei)
    const finalPrice = isFree ? "0" : BigInt(Math.floor(parseFloat(priceEth) * 1e18)).toString();
    onSubmit(title, content, finalPrice, priceToken);
  };

  const canSubmit = () => {
    if (!title.trim() || !content.trim()) return false;
    if (isFree) return true;
    const price = parseFloat(priceEth);
    return !isNaN(price) && price >= 0.0001;
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
          onChange={e => setTitle(e.target.value)}
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
          onChange={e => setContent(e.target.value)}
          disabled={isLoading}
          required
        />
        <label className="label">
          <span className="label-text-alt">Supports Markdown formatting</span>
        </label>
      </div>

      {/* Price Section */}
      <div className="divider">Pricing</div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={isFree}
            onChange={e => setIsFree(e.target.checked)}
            disabled={isLoading}
          />
          <span className="label-text">Free Article</span>
        </label>
      </div>

      {!isFree && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Price (ETH)</span>
            <span className="label-text-alt">Min: 0.0001 ETH</span>
          </label>
          <input
            type="number"
            step="0.0001"
            placeholder="0.01"
            className="input input-bordered w-full"
            value={priceEth}
            onChange={e => setPriceEth(e.target.value)}
            disabled={isLoading}
            min="0.0001"
          />
        </div>
      )}

      <div className="form-control mt-6">
        <button type="submit" className="btn btn-primary" disabled={isLoading || !canSubmit()}>
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Publishing...
            </>
          ) : isFree ? (
            "Publish for Free"
          ) : (
            "Publish for Sale"
          )}
        </button>
      </div>
    </form>
  );
}
