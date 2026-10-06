import { Download, ExternalLink, FileCheck2, FileText } from "lucide-react";

export function ProofPreview({ url, name, type }: { url: string; name?: string | null; type?: string | null }) {
  const normalizedName = name?.toLowerCase() || url.toLowerCase().split("?")[0];
  const isPdf = type === "application/pdf" || normalizedName.endsWith(".pdf");
  const isImage = type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)(_|$)/i.test(normalizedName);
  const label = name || "Comprovativo enviado pelo candidato";
  return <div className="proof-preview mt-4 overflow-hidden rounded-2xl border-2 border-[#d9b21b] bg-[#fffdf3] shadow-sm dark:border-[#d9b21b]/70 dark:bg-[#102316]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadb8a] bg-[#fff4b8] px-4 py-3 dark:border-[#d9b21b]/30 dark:bg-[#263d1e]">
      <div className="flex min-w-0 items-center gap-2 text-sm font-black text-[#3d2c00] dark:text-[#fff1a6]"><FileCheck2 className="h-5 w-5 shrink-0" /> <span>Comprovativo enviado</span></div>
      <div className="flex shrink-0 gap-2"><a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#0b45ad] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#08347f]" title="Abrir o comprovativo numa nova janela"><ExternalLink className="h-3.5 w-3.5" /> Abrir</a><a href={url} download={name || undefined} className="inline-flex items-center gap-1 rounded-full border border-[#0b45ad] px-3 py-1.5 text-xs font-bold text-[#0b45ad] hover:bg-white dark:border-[#ffd326] dark:text-[#ffd326]" title="Descarregar o ficheiro original"><Download className="h-3.5 w-3.5" /> Baixar</a></div>
    </div>
    {isImage ? <div className="flex min-h-56 items-center justify-center bg-slate-100 p-3 dark:bg-[#07111f]"><img src={url} alt={`Pré-visualização de ${label}`} className="max-h-[28rem] w-full object-contain" /></div> : isPdf ? <iframe src={url} title={`Pré-visualização de ${label}`} className="h-[28rem] w-full bg-white" /> : <div className="flex min-h-40 items-center justify-center gap-3 bg-white p-6 text-center dark:bg-[#07111f]"><FileText className="h-9 w-9 text-[#0b45ad] dark:text-[#ffd326]" /><p className="text-sm font-bold text-slate-700 dark:text-slate-200">Formato não pré-visualizável. Use “Abrir” para analisar o ficheiro original.</p></div>}
    <div className="flex items-center justify-between gap-3 border-t border-[#eadb8a] px-4 py-2 text-[11px] font-semibold text-slate-600 dark:border-[#d9b21b]/30 dark:text-slate-300"><span className="truncate" title={label}>{label}</span><span className="shrink-0 uppercase">{isPdf ? "PDF" : isImage ? "Imagem" : "Ficheiro"}</span></div>
  </div>;
}
