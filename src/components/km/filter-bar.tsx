"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SelectFilter {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; label: string; placeholder?: string };
  /** Snelle keuze als ‘chips’ (enkelvoudige keuze, aria-pressed) */
  chips?: { label: string; value: string; options: Option[]; onChange: (v: string) => void };
  selects?: SelectFilter[];
  views?: { label: string; value: string; options: (Option & { icon: React.ReactNode })[]; onChange: (v: string) => void };
  resultText: string;
  onReset?: () => void;
  className?: string;
}

/** FilterBar — zoeken, filters, sorteren en weergave. Het aantal resultaten wordt aangekondigd. */
export function FilterBar({ search, chips, selects, views, resultText, onReset, className }: FilterBarProps) {
  const searchId = React.useId();
  return (
    <section aria-label="Zoeken en filteren" className={cn("mb-6 flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {search && (
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor={searchId} className="text-base font-semibold text-km-green">
              {search.label}
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-km-muted" aria-hidden />
              <Input
                id={searchId}
                type="search"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder}
                className="pl-10"
              />
            </div>
          </div>
        )}
        {selects?.map((s) => (
          <FilterSelect key={s.id} filter={s} />
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {chips && (
          <div role="group" aria-label={chips.label} className="flex flex-wrap gap-2">
            {chips.options.map((o) => {
              const active = chips.value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chips.onChange(o.value)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                    active
                      ? "border-km-green bg-km-green text-white"
                      : "border-km-line bg-white text-km-green hover:border-km-green",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
        {views && (
          <div role="group" aria-label={views.label} className="flex gap-1 self-start rounded-xl bg-white p-1 ring-1 ring-km-line md:self-auto">
            {views.options.map((o) => {
              const active = views.value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => views.onChange(o.value)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                    active ? "bg-km-softgreen text-km-green" : "text-km-muted hover:text-km-green",
                  )}
                >
                  {o.icon}
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p role="status" aria-live="polite" className="text-km-muted">
          {resultText}
        </p>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="size-4" aria-hidden />
            Filters wissen
          </Button>
        )}
      </div>
    </section>
  );
}

function FilterSelect({ filter }: { filter: SelectFilter }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2 lg:w-56">
      <Label htmlFor={id} className="text-base font-semibold text-km-green">
        {filter.label}
      </Label>
      <Select value={filter.value} onValueChange={filter.onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {filter.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
