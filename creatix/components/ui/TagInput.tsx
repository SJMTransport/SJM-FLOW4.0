"use client";

import React, { useState, KeyboardEvent } from "react";

interface TagInputProps {
  label?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ label, tags, onChange, placeholder = "Tambah tag..." }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text">{label}</label>}
      <div className="flex flex-wrap gap-1.5 items-center bg-surface border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors min-h-[40px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:opacity-70 transition-opacity leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-text placeholder:text-subtle outline-none"
        />
      </div>
    </div>
  );
}
