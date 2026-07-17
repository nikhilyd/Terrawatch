"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Clock, Zap, AlertTriangle, Info } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth();

const YEARS_PAST   = Array.from({ length: currentYear - 2014 }, (_, i) => 2015 + i).reverse();
const YEARS_FUTURE = Array.from({ length: 6 }, (_, i) => currentYear + i);

const SCAN_COUNTS = [2, 4, 6, 8, 10];

interface FlexibleDatePickerProps {
  onDatesChange: (dates: string[], mode: "historical" | "monitoring") => void;
  onScanCountChange?: (count: number) => void;
  bbox?: number[];
  disabled?: boolean;
  /** forceFuture=true -> Monitoring mode: FROM >= today, past dates disabled */
  forceFuture?: boolean;
}

const distribute = (startDate: Date, endDate: Date, count: number): Date[] => {
  const dates: Date[] = [];
  const totalMs = endDate.getTime() - startDate.getTime();
  const MIN_GAP  = 5 * 24 * 60 * 60 * 1000;
  const gapMs    = count > 1 ? totalMs / (count - 1) : 0;
  const actual   = gapMs > 0 && gapMs < MIN_GAP
    ? Math.max(2, Math.floor(totalMs / MIN_GAP) + 1)
    : count;
  const realGap  = actual > 1 ? totalMs / (actual - 1) : 0;
  for (let i = 0; i < actual; i++) {
    dates.push(new Date(startDate.getTime() + i * realGap));
  }
  return dates;
};

const fmtDate  = (d: Date) => d.toISOString().split("T")[0];
const fmtShort = (d: Date) => `${MONTH_SHORT[d.getMonth()]}'${String(d.getFullYear()).slice(2)}`;

const daysUntil = (d: Date): number =>
  Math.ceil((d.getTime() - Date.now()) / 86400000);

export function FlexibleDatePicker({
  onDatesChange,
  onScanCountChange,
  bbox,
  disabled,
  forceFuture = false,
}: FlexibleDatePickerProps) {

  const defaultFromMonth = forceFuture ? currentMonth     : 0;
  const defaultFromYear  = forceFuture ? currentYear      : currentYear - 1;
  const defaultToMonth   = forceFuture ? (currentMonth + 6) % 12 : currentMonth;
  const defaultToYear    = forceFuture
    ? currentYear + (currentMonth + 6 >= 12 ? 1 : 0)
    : currentYear;

  const [fromMonth, setFromMonth] = useState(defaultFromMonth);
  const [fromYear,  setFromYear]  = useState(defaultFromYear);
  const [toMonth,   setToMonth]   = useState(defaultToMonth);
  const [toYear,    setToYear]    = useState(defaultToYear);
  const [scanCount, setScanCount] = useState(4);

  const yearOptions = forceFuture ? YEARS_FUTURE : YEARS_PAST;

  const fromMonthOptions = MONTHS.map((m, i) => {
    const isDisabled = forceFuture && fromYear === currentYear && i < currentMonth;
    return { label: m, value: i, disabled: isDisabled };
  });

  const startDate = useMemo(() => new Date(fromYear, fromMonth, 1),  [fromMonth, fromYear]);
  const endDate   = useMemo(() => new Date(toYear,   toMonth,   28), [toMonth,   toYear]);

  const mode: "historical" | "monitoring" = forceFuture
    ? "monitoring"
    : endDate > new Date() ? "monitoring" : "historical";

  const dates = useMemo(() => {
    if (startDate >= endDate) return [];
    return distribute(startDate, endDate, scanCount);
  }, [startDate, endDate, scanCount]);

  const gapDays = dates.length > 1
    ? Math.round((dates[1].getTime() - dates[0].getTime()) / 86400000)
    : 0;

  const areaWarning = useMemo(() => {
    if (!bbox || bbox.length < 4) return null;
    const [lngMin, latMin, lngMax, latMax] = bbox;
    const latMid   = (latMin + latMax) / 2;
    const wKm = Math.abs(lngMax - lngMin) * 111.32 * Math.cos((latMid * Math.PI) / 180);
    const hKm = Math.abs(latMax - latMin) * 110.574;
    const km2 = wKm * hKm;
    return km2 > 500 ? `Zone is ${km2.toFixed(0)} km2 -- use 20m or 30m resolution to save API quota.` : null;
  }, [bbox]);

  useEffect(() => {
    if (dates.length > 0) onDatesChange(dates.map(fmtDate), mode);
  }, [dates, mode]);

  useEffect(() => {
    onScanCountChange?.(dates.length);
  }, [dates.length]);

  const applyQuick = (months: number) => {
    const base = forceFuture ? new Date() : startDate;
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + months);
    setToMonth(newEnd.getMonth());
    setToYear(newEnd.getFullYear());
    if (forceFuture) {
      setFromMonth(currentMonth);
      setFromYear(currentYear);
    }
  };

  const validRange = startDate < endDate;

  const nextFutureScan = forceFuture
    ? dates.find(d => daysUntil(d) > 0)
    : null;

  return (
    <div className="space-y-5">

      {forceFuture && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-300/80 space-y-0.5">
            <p className="font-semibold text-emerald-300">Scheduled Monitoring -- Future Dates Only</p>
            <p className="text-emerald-400/60">
              First scan (baseline) runs immediately. Remaining scans auto-execute on their scheduled dates via the hourly cron scheduler.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {forceFuture ? "Start" : "From"}
          </label>
          <div className="flex gap-2">
            <SelectWithDisabled
              value={fromMonth}
              onChange={v => {
                if (forceFuture && fromYear === currentYear && v < currentMonth) return;
                setFromMonth(v);
              }}
              options={fromMonthOptions}
              disabled={disabled}
            />
            <Select
              value={fromYear}
              onChange={setFromYear}
              options={yearOptions.map(y => ({ label: String(y), value: y }))}
              disabled={disabled}
              small
            />
          </div>
          {forceFuture && (
            <p className="text-[10px] text-white/30">Baseline scan runs on this date</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {forceFuture ? "End" : "To"}
          </label>
          <div className="flex gap-2">
            <Select value={toMonth} onChange={setToMonth} options={MONTHS.map((m, i) => ({ label: m, value: i }))} disabled={disabled} />
            <Select value={toYear}  onChange={setToYear}  options={yearOptions.map(y => ({ label: String(y), value: y }))} disabled={disabled} small />
          </div>
          {forceFuture && (
            <p className="text-[10px] text-white/30">Final scheduled scan date</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-white/40 flex items-center gap-1"><Zap className="w-3 h-3" />Quick:</span>
        {[{ label: "+3M", months: 3 }, { label: "+6M", months: 6 }, { label: "+1Y", months: 12 }, { label: "+2Y", months: 24 }].map(q => (
          <button
            key={q.label}
            onClick={() => applyQuick(q.months)}
            disabled={disabled}
            className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-white/70 hover:text-emerald-300 transition-all disabled:opacity-40"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
          <Clock className="w-3 h-3" /> Number of Scans
        </label>
        <div className="flex gap-2">
          {SCAN_COUNTS.map(c => (
            <button
              key={c}
              onClick={() => setScanCount(c)}
              disabled={disabled}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40 ${
                scanCount === c
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {validRange ? (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            mode === "historical"
              ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            {mode === "historical" ? "Historical Mode" : "Monitoring Mode"}
            <span className="text-white/40">
              {mode === "historical" ? " -- fetches past data now" : " -- auto-executes on scheduled dates"}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-300">
            Start date must be before end date
          </span>
        )}

        {validRange && gapDays > 0 && (
          <span className="text-xs text-white/40">
            ~{gapDays} {forceFuture ? "days between scheduled scans" : "day gap between scans"}
          </span>
        )}
      </div>

      <AnimatePresence>
        {areaWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
          >
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-300">{areaWarning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {validRange && dates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {forceFuture ? "Scheduled scan timeline" : "Auto-distributed dates"} ({dates.length} scans)
          </p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {dates.map((d, i) => {
              const days = daysUntil(d);
              const isFuture = days > 0;
              return (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      i === 0              ? "bg-emerald-400" :
                      isFuture && forceFuture ? "bg-white/20"   :
                      "bg-white/30"
                    }`} />
                    <span className="text-[10px] text-white/50 mt-1 whitespace-nowrap">{fmtShort(d)}</span>
                    {forceFuture && i > 0 && isFuture && (
                      <span className="text-[9px] text-white/25 whitespace-nowrap">{days}d</span>
                    )}
                  </div>
                  {i < dates.length - 1 && (
                    <div className="w-6 h-px bg-white/10 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          {forceFuture && nextFutureScan && (
            <p className="text-[10px] text-emerald-400/70">
              Next scheduled scan: {fmtDate(nextFutureScan)} ({daysUntil(nextFutureScan)} days away)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SelectWithDisabled({
  value, onChange, options, disabled,
}: {
  value:    number;
  onChange: (v: number) => void;
  options:  { label: string; value: number; disabled?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-40 pr-7"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled} className="bg-gray-900">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
    </div>
  );
}

function Select({
  value, onChange, options, disabled, small,
}: {
  value:    number;
  onChange: (v: number) => void;
  options:  { label: string; value: number }[];
  disabled?: boolean;
  small?:    boolean;
}) {
  return (
    <div className={`relative ${small ? "w-20" : "flex-1"}`}>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-40 pr-7"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
    </div>
  );
}
