import { Loader2, Zap } from "lucide-react";

export function LoadingBar({ visible }: { visible: boolean }) {
  return <div aria-hidden={!visible} className={`fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-blue-100/70 transition-opacity duration-300 dark:bg-white/10 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}><div className="h-full w-1/3 animate-[loading-slide_1.1s_ease-in-out_infinite] rounded-full bg-[#f3bd08]" /></div>;
}

export function LoadingState({ label = "A carregar…" }: { label?: string }) {
  return <div className="grid min-h-screen place-items-center bg-[#f8fbff] px-6 text-[#12213a] dark:bg-[#07111f] dark:text-white"><div className="text-center"><div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0b45ad] shadow-xl shadow-blue-200/50 dark:shadow-blue-950/40"><Zap className="h-8 w-8 animate-pulse text-[#ffd326]" /><Loader2 className="absolute -right-2 -top-2 h-6 w-6 animate-spin text-[#0b45ad] dark:text-[#ffd326]" /></div><p className="mt-5 text-sm font-bold text-slate-600 dark:text-slate-300">{label}</p><div className="mx-auto mt-3 h-1.5 w-36 overflow-hidden rounded-full bg-blue-100 dark:bg-white/10"><div className="h-full w-1/2 animate-[loading-slide_1.1s_ease-in-out_infinite] rounded-full bg-[#f3bd08]" /></div></div></div>;
}
