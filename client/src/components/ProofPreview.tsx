import { FileText } from "lucide-react";

export function ProofPreview({ url, name, type }: { url: string; name?: string | null; type?: string | null }) {
  const isPdf = type === "application/pdf" || name?.toLowerCase().endsWith(".pdf");
  const isImage = type?.startsWith("image/") || /\.(png|jpe?g)$/i.test(name || "");
  return <div className="mt-3 overflow-hidden rounded-2xl border border-blue-100 bg-white dark:border-white/10 dark:bg-[#07111f]
    ">{isImage ? <img src={url} alt={name || "Comprovativo de pagamento"} className="max-h-64 w-full object-contain" /> : isPdf ? <iframe src={url} title={name || "Comprovativo de pagamento em PDF"} className="h-64 w-full bg-white" /> : <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 text-sm font-bold text-[#0b45ad] dark:text-[#ffd326]"><FileText className="h-5 w-5" /> Abrir comprovativo{ name ? ` · ${name}` : "" }</a>}<div className="truncate border-t border-blue-100 px-3 py-2 text-[11px] font-semibold text-slate-500 dark:border-white/10">{name || "Comprovativo enviado pelo aluno"}</div></div>;
}
