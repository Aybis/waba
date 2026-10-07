import { WorkstationState } from "../lib/state.js";

export const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";
export const inputClass =
  "min-h-10 w-full min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
export const stateClasses = {
  working: "bg-emerald-50 text-emerald-700",
  idle: "bg-slate-100 text-slate-600",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-rose-50 text-rose-700",
};
export const dotClasses = {
  working: "bg-emerald-500",
  idle: "bg-slate-400",
  warning: "bg-amber-500",
  error: "bg-rose-400",
};
export function Badge({ row, state = WorkstationState.resolve(row) }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${stateClasses[state]}`}
    >
      <span className={`size-1.5 rounded-full ${dotClasses[state]}`} />
      {WorkstationState.label(state)}
    </span>
  );
}
export function Icon({ name, className = "size-4" }) {
  const paths = {
    office: "m3 8 9-5 9 5-9 5-9-5Zm0 0v8l9 5 9-5V8M12 13v8",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    chat: "M4 4h16v12H9l-5 4V4Zm4 4h8M8 12h5",
    flow: "M3 12h5m8 0h5M8 5v14m0-14h8v14H8",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.5 1.5m9.8 9.8 1.5 1.5M5.6 18.4l1.5-1.5m9.8-9.8 1.5-1.5",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6",
    focus: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
    refresh: "M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3",
    monitor: "M3 4h18v13H3zM8 21h8m-4-4v4M7 8h3v3H7zm7 0h3v3h-3z",
    close: "m6 6 12 12M6 18 18 6",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.office} />
    </svg>
  );
}
