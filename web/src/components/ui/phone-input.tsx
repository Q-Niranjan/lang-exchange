"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import {
  type Country,
  countryFlag,
  detectCountryCode,
  formatE164,
  getCountry,
  parsePhoneNumber,
  sortedCountries,
} from "@/lib/countries";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
};

export function PhoneInput({ value, onChange, required, disabled, id }: Props) {
  const [country, setCountry] = useState<Country>(() => getCountry(detectCountryCode()));
  const [national, setNational] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value (e.g. after paste or form reset)
  useEffect(() => {
    if (!value) return;
    const parsed = parsePhoneNumber(value);
    setCountry(parsed.country);
    setNational(parsed.national);
  }, [value]);

  // Auto-detect country on first mount when empty
  useEffect(() => {
    if (!value) {
      setCountry(getCountry(detectCountryCode()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function update(nextCountry: Country, nextNational: string) {
    setCountry(nextCountry);
    setNational(nextNational);
    onChange(formatE164(nextCountry, nextNational));
  }

  function onNationalChange(raw: string) {
    const trimmed = raw.trim();

    // Pasted or typed full international number
    if (trimmed.startsWith("+") || trimmed.replace(/\D/g, "").length > 12) {
      const parsed = parsePhoneNumber(trimmed);
      update(parsed.country, parsed.national);
      return;
    }

    const digits = raw.replace(/\D/g, "");
    update(country, digits);
  }

  function selectCountry(c: Country) {
    update(c, national);
    setOpen(false);
    setSearch("");
  }

  const list = sortedCountries(search);

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex overflow-hidden rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring ${
          disabled ? "opacity-50" : ""
        }`}
      >
        {/* Country selector */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 border-r border-input px-2.5 py-2.5 text-sm hover:bg-secondary transition-colors"
          aria-label="Select country code"
        >
          <span className="text-lg leading-none">{countryFlag(country.code)}</span>
          <span className="text-xs font-semibold text-foreground">+{country.dial}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* National number */}
        <input
          id={id}
          required={required}
          disabled={disabled}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="Mobile number"
          value={national}
          onChange={(e) => onNationalChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Country dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country"
                autoFocus
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {list.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">No countries found</li>
            ) : (
              list.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors ${
                      c.code === country.code ? "bg-secondary/80" : ""
                    }`}
                  >
                    <span className="text-lg leading-none">{countryFlag(c.code)}</span>
                    <span className="flex-1 truncate font-medium text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">+{c.dial}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
