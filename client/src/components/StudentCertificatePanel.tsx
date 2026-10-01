import * as React from "react";
import { Download, ExternalLink, FileBadge2 } from "lucide-react";

type CertificateProgress = { latestScore?: number | null; certificateStatus?: string | null; qrToken?: string | null } | null | undefined;

export function StudentCertificatePanel({ courseTitle, progress }: { courseTitle: string; progress: CertificateProgress }) {
  const approved = progress?.certificateStatus === "approved" && Boolean(progress.qrToken);
  return (
    <section className="mt-8 rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/5" aria-labelledby="my-certificates-heading">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">Arquivo pessoal</p>
          <h2 id="my-certificates-heading" className="mt-3 font-display text-2xl font-black">Meus certificados</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">Depois da autorização do Diretor, o certificado fica disponível aqui para descarregar diretamente do servidor ou consultar online.</p>
        </div>
        <FileBadge2 className="h-10 w-10 text-[#e0a900]" />
      </div>
      <div className="mt-7 rounded-2xl bg-[#f8fbff] p-5 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-bold">{courseTitle}</p><p className="mt-1 text-sm text-slate-500">Nota final: {progress?.latestScore ?? "—"}%</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${approved ? "bg-emerald-100 text-emerald-700" : progress?.certificateStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{approved ? "Liberado" : progress?.certificateStatus === "pending" ? "Em análise" : "Ainda não emitido"}</span>
        </div>
        {approved ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={`/api/download/certificate/${encodeURIComponent(progress!.qrToken!)}`} download className="inline-flex items-center gap-2 rounded-full bg-[#f3bd08] px-5 py-3 font-extrabold text-[#082d70]"><Download className="h-4 w-4" /> Descarregar PDF do servidor</a>
            <a href={`/validar/${encodeURIComponent(progress!.qrToken!)}`} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-5 py-3 font-extrabold text-[#0b45ad] dark:border-white/20 dark:text-white"><ExternalLink className="h-4 w-4" /> Ver certificado</a>
          </div>
        ) : <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{progress?.certificateStatus === "pending" ? "O seu pedido aguarda autorização do Diretor. Esta aba é atualizada automaticamente." : "Conclua o teste e aguarde a análise para solicitar o certificado."}</p>}
      </div>
    </section>
  );
}
