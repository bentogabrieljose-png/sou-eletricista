import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Link, useRoute } from "wouter";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CERTIFICATE_CENTER_NAME,
  CERTIFICATE_DIRECTOR_NAME,
  CERTIFICATE_DURATION_LABEL,
  CERTIFICATE_VERIFICATION_SITE,
} from "@shared/certificate";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "__/__/____";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(value));
}

export default function Verificar() {
  const [, params] = useRoute("/validar/:token");
  const certificate = trpc.public.certificate.useQuery(
    { token: params?.token || "invalid" },
    { enabled: Boolean(params?.token) }
  );
  const data = certificate.data;
  const [qrCode, setQrCode] = useState("");
  const validationUrl = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.href),
    [data?.progress.qrToken]
  );
  const siteLabel = useMemo(
    () => (typeof window === "undefined" ? "www.sou-eletricista.com" : window.location.host),
    []
  );

  useEffect(() => {
    if (!data?.progress.qrToken || !validationUrl) return;
    QRCode.toDataURL(validationUrl, { width: 220, margin: 1 })
      .then(setQrCode)
      .catch(() => setQrCode(""));
  }, [data?.progress.qrToken, validationUrl]);

  const printCertificate = () => {
    if (!qrCode) return;
    window.requestAnimationFrame(() => window.print());
  };

  return (
    <div className="certificate-page min-h-screen bg-[#f8fbff] px-4 py-8 text-[#12213a] dark:bg-[#07111f] dark:text-white sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-3 print-hide">
          <img src={LOGO} alt={CERTIFICATE_CENTER_NAME} className="h-14 w-14 rounded-full object-cover" />
          <span className="font-display font-black text-[#0b45ad] dark:text-white">{CERTIFICATE_CENTER_NAME}</span>
        </Link>
        {certificate.isLoading ? (
          <div className="mt-10 rounded-[2rem] border border-blue-100 bg-white p-10 text-center dark:border-white/10 dark:bg-white/5">A validar o certificado…</div>
        ) : !data ? (
          <div className="mt-10 rounded-[2rem] border border-red-200 bg-white p-10 text-center dark:border-red-500/30 dark:bg-white/5">
            <ShieldCheck className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-5 font-display text-3xl font-black">Certificado não encontrado</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Verifique o QR Code ou o código de validação.</p>
          </div>
        ) : (
          <>
            <div className="certificate-sheet mt-8">
              <div className="certificate-top-band" />
              <div className="certificate-heading">
                <img src={LOGO} alt={CERTIFICATE_CENTER_NAME} />
                <div><strong>{CERTIFICATE_CENTER_NAME.toUpperCase()}</strong><span>Centro de Formação Técnico Profissional</span></div>
              </div>
              <div className="certificate-title">CERTIFICADO DE CONCLUSÃO</div>
              <div className="certificate-subtitle">ESTE CERTIFICADO É CONCEDIDO A</div>
              <div className="certificate-name">{data.application.fullName}</div>
              <div className="certificate-rule" />
              <p className="certificate-copy">por ter concluído com aproveitamento o curso de</p>
              <div className="certificate-course">{data.application.courseTitle}</div>
              <p className="certificate-copy">promovido pelo Centro de Formação Técnico Profissional</p>
              <strong className="certificate-center-name">{CERTIFICATE_CENTER_NAME.toUpperCase()}</strong>
              <p className="certificate-copy certificate-copy-small">O presente certificado comprova a sua participação, dedicação<br />e compromisso com a formação profissional.</p>
              <div className="certificate-meta-grid"><div><small>DATA DE CONCLUSÃO</small><strong>{formatDate(data.progress.completedAt)}</strong></div><div><small>CARGA HORÁRIA</small><strong>{CERTIFICATE_DURATION_LABEL}</strong></div><div><small>NOTA FINAL</small><strong>{data.progress.latestScore ?? 0}%</strong></div></div>
              <div className="certificate-lower"><div className="certificate-validation"><div className="certificate-qr">{qrCode && <img src={qrCode} alt="QR Code de validação digital" />}</div><div><strong>VALIDAÇÃO DIGITAL OFICIAL</strong><span>Código: {data.progress.qrToken}</span><span>Verifique em: {CERTIFICATE_VERIFICATION_SITE || siteLabel}</span></div></div><div className="certificate-signature"><span>{CERTIFICATE_DIRECTOR_NAME}</span><small>Direção · {CERTIFICATE_CENTER_NAME}</small></div></div>
              {data.progress.latestScore === 100 && <div className="certificate-best-student-badge" aria-label="Medalha de melhor aluno: 100%"><i className="medal-ribbon medal-ribbon-left" /><i className="medal-ribbon medal-ribbon-right" /><span className="medal-disc"><b>★</b><em>100%</em></span><small>Melhor aluno</small></div>}
              <div className="certificate-bottom-band">FORMAÇÃO DE QUALIDADE · ELETRICIDADE É FUTURO</div>
            </div>

            <div className="print-hide mt-6 grid gap-4 rounded-[2rem] border border-blue-100 bg-white p-6 dark:border-white/10 dark:bg-white/5 sm:grid-cols-4">
              <div><p className="text-xs uppercase tracking-wider text-slate-500">Formando</p><p className="mt-1 font-bold">{data.application.fullName}</p></div>
              <div><p className="text-xs uppercase tracking-wider text-slate-500">Curso</p><p className="mt-1 font-bold">{data.application.courseTitle}</p></div>
              <div><p className="text-xs uppercase tracking-wider text-slate-500">Início · término</p><p className="mt-1 font-bold">{formatDate(data.progress.startedAt)} · {formatDate(data.progress.completedAt)}</p></div>
              <div><p className="text-xs uppercase tracking-wider text-slate-500">Percentagem</p><p className="mt-1 font-bold">{data.progress.latestScore ?? 0}%</p></div>
            </div>

            <div className="certificate-actions print-hide mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" /> Certificado autenticado digitalmente
              </div>
              <div className="flex flex-wrap gap-3">
                {!data.isArchived && <>
                  <a href={`/api/download/certificate/${data.progress.qrToken}`} download className="inline-flex items-center gap-2 rounded-full bg-[#f3bd08] px-6 py-3 font-extrabold text-[#082d70]"><Download className="h-4 w-4" /> Descarregar PDF final</a>
                  <button onClick={printCertificate} disabled={!qrCode} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-6 py-3 font-extrabold text-[#0b45ad] disabled:cursor-wait disabled:opacity-60 dark:border-white/20 dark:text-white" title={qrCode ? "Abrir impressão no navegador" : "A preparar o QR Code…"}>Imprimir no navegador</button>
                </>}
                <Link href={`/segunda-via/${data.progress.qrToken}`} className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-6 py-3 font-extrabold text-amber-700 dark:text-amber-200">
                  Segunda via do certificado
                </Link>
                <Link href="/inscricao" className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-6 py-3 font-extrabold text-[#0b45ad] dark:border-white/20 dark:text-white">
                  Fazer nova inscrição
                </Link>
              </div>
            </div>
            {data.isArchived && <div className="print-hide mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Este certificado está em consulta de arquivo. Para obter outra impressão, solicite uma <strong>segunda via paga</strong>; o PDF só será liberado depois da confirmação do pagamento pelo Diretor.</div>}
          </>
        )}
      </div>
    </div>
  );
}
