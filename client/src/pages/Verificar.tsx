import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Link, useRoute } from "wouter";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CERTIFICATE_CENTER_NAME,
  CERTIFICATE_DIRECTOR_NAME,
  CERTIFICATE_DURATION_LABEL,
  CERTIFICATE_TEMPLATE_ASSET,
  CERTIFICATE_VERIFICATION_SITE,
} from "@shared/certificate";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";
const CERTIFICATE_TEMPLATE = CERTIFICATE_TEMPLATE_ASSET;

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
              <img src={CERTIFICATE_TEMPLATE} alt="Modelo oficial de certificado Sou Eletricista" className="certificate-art" />
              <div className="certificate-cover certificate-cover-name" />
              <div className="certificate-cover certificate-cover-course" />
              <div className="certificate-cover certificate-cover-meta" />
              <div className="certificate-cover certificate-cover-validation" />
              <div className="certificate-cover certificate-cover-signature" />
              <div className="certificate-field certificate-name">{data.application.fullName}</div>
              <div className="certificate-field certificate-course">{data.application.courseTitle}</div>
              <div className="certificate-field certificate-date">{formatDate(data.progress.completedAt)}</div>
              <div className="certificate-field certificate-duration">{CERTIFICATE_DURATION_LABEL}</div>
              <div className="certificate-field certificate-score">{data.progress.latestScore ?? 0}%</div>
              <div className="certificate-qr">{qrCode && <img src={qrCode} alt="QR Code de validação digital" />}</div>
              <div className="certificate-field certificate-code">{data.progress.qrToken}</div>
              <div className="certificate-field certificate-site">{CERTIFICATE_VERIFICATION_SITE || siteLabel}</div>
              <div className="certificate-signature">
                <span>{CERTIFICATE_DIRECTOR_NAME}</span>
                <small>Direção · {CERTIFICATE_CENTER_NAME}</small>
              </div>
            </div>

            <div className="certificate-actions print-hide mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" /> Certificado autenticado digitalmente
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`/api/download/certificate/${data.progress.qrToken}`} download className="inline-flex items-center gap-2 rounded-full bg-[#f3bd08] px-6 py-3 font-extrabold text-[#082d70]">
                  <Download className="h-4 w-4" /> Descarregar PDF final
                </a>
                <button onClick={printCertificate} disabled={!qrCode} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-6 py-3 font-extrabold text-[#0b45ad] disabled:cursor-wait disabled:opacity-60 dark:border-white/20 dark:text-white" title={qrCode ? "Abrir impressão no navegador" : "A preparar o QR Code…"}>
                  Imprimir no navegador
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
