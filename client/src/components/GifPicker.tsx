import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { RetroButton } from "./RetroButton";
import { RetroInput } from "./RetroInput";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Failed to search GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-black border-4 border-[#00ff00] box-shadow-retro w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="bg-[#00ff00] text-black px-3 py-2 flex items-center justify-between font-bold">
          <span>GIF SEARCH</span>
          <button onClick={onClose} className="hover:text-[#ff6f61]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <RetroInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="> SEARCH GIFS..."
              className="flex-1"
              autoFocus
            />
            <RetroButton type="submit" disabled={loading}>
              <Search className="w-5 h-5" />
            </RetroButton>
          </form>

          <div className="overflow-y-auto retro-scrollbar max-h-[50vh] grid grid-cols-2 md:grid-cols-3 gap-2">
            {loading ? (
              <div className="col-span-full text-[#00ff00] text-center animate-pulse">
                LOADING_GIFS...
              </div>
            ) : gifs.length === 0 ? (
              <div className="col-span-full text-[#00ff00] text-center opacity-70">
                {search ? "NO GIFS FOUND" : "SEARCH FOR GIFS"}
              </div>
            ) : (
              gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelect(gif.images.fixed_height.url);
                    onClose();
                  }}
                  className="border-2 border-[#00ff00] hover:border-[#ff6f61] transition-colors overflow-hidden"
                >
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
