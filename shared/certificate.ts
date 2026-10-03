export const CERTIFICATE_DURATION_HOURS = 72;
export const CERTIFICATE_DURATION_LABEL = "72 horas (3 dias)";
export const CERTIFICATE_DIRECTOR_NAME = "Gabriel Carlos Cambinza";
export const CERTIFICATE_CENTER_NAME = "Sou Eletricista";
export const CERTIFICATE_TEMPLATE_VERSION = "sou-eletricista-official-unsigned-pdf-2026-09";
export const CERTIFICATE_TEMPLATE_ASSET = "/manus-storage/certificate-official-unsigned_510fe9c1.png";
export const CERTIFICATE_VERIFICATION_SITE = "eletriforma-snqurkmb.manus.space";
export const CERTIFICATE_REGISTRATION_PREFIX = "SE-REG";

/** Registration is sequential because it derives from the immutable application id. */
export function formatCertificateRegistration(applicationId: number | null | undefined, certificateNumber?: string | null) {
  if (certificateNumber) return certificateNumber.replace(/^SE-CERT-/, `${CERTIFICATE_REGISTRATION_PREFIX}-`);
  if (!applicationId) return `${CERTIFICATE_REGISTRATION_PREFIX}-PENDING`;
  return `${CERTIFICATE_REGISTRATION_PREFIX}-${new Date().getFullYear()}-${String(applicationId).padStart(6, "0")}`;
}

export function isValidCertificateRegistration(value: string | null | undefined, applicationId: number) {
  return Boolean(value && value === formatCertificateRegistration(applicationId));
}
