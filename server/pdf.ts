import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { storageGetSignedUrl } from "./storage";
import { CERTIFICATE_CENTER_NAME, CERTIFICATE_DIRECTOR_NAME, CERTIFICATE_DURATION_LABEL, CERTIFICATE_TEMPLATE_ASSET, CERTIFICATE_VERIFICATION_SITE } from "../shared/certificate";

const A4 = { width: 595.28, height: 841.89 };
const BLUE = rgb(0.04, 0.22, 0.55);
const GOLD = rgb(0.92, 0.68, 0.02);

function textFit(text: string, max: number, size: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function fitSize(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, maxWidth: number, initial: number, minimum: number) {
  let size = initial;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.25;
  return size;
}
function topY(top: number, size: number) { return A4.height - top - size; }
async function officialBackground() {
  const path = CERTIFICATE_TEMPLATE_ASSET.replace(/^\/manus-storage\//, "");
  const signed = await storageGetSignedUrl(path);
  const response = await fetch(signed);
  if (!response.ok) throw new Error(`Certificate artwork unavailable (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
async function qrPng(url: string) {
  const data = await QRCode.toDataURL(url, { width: 320, margin: 1 });
  return Buffer.from(data.split(",")[1], "base64");
}

export async function generateCertificatePdf(input: { fullName: string; courseTitle: string; completedAt?: Date | string | null; score?: number | null; qrToken: string; validationUrl: string }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.width, A4.height]);
  const background = await pdf.embedPng(await officialBackground());
  page.drawImage(background, { x: 0, y: 0, width: A4.width, height: A4.height });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const center = (text: string, y: number, size: number, f = font, color = BLUE) => page.drawText(text, { x: (A4.width - f.widthOfTextAtSize(text, size)) / 2, y, size, font: f, color });
  const centerIn = (text: string, x: number, width: number, y: number, size: number, f = font) => page.drawText(text, { x: x + (width - f.widthOfTextAtSize(text, size)) / 2, y, size, font: f, color: BLUE });
  const date = input.completedAt ? new Intl.DateTimeFormat("pt-PT").format(new Date(input.completedAt)) : "__/__/____";
  // These white blocks cover only the template's sample values; all final text is drawn as PDF text.
  page.drawRectangle({ x: 78, y: 485, width: 440, height: 42, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 70, y: 382, width: 455, height: 55, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 78, y: 230, width: 440, height: 44, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 45, y: 52, width: 330, height: 135, color: rgb(1, 1, 1) });
  center(textFit(input.fullName.toUpperCase(), 42, 19), 497, 19);
  const courseSize = fitSize(input.courseTitle, font, 430, 13, 8);
  center(input.courseTitle, 400, courseSize);
  centerIn(date, 92, 125, 247, 10, regular);
  centerIn(CERTIFICATE_DURATION_LABEL, 235, 125, 247, 10, regular);
  centerIn(`${input.score ?? 0}%`, 380, 125, 247, 10, regular);
  const qr = await pdf.embedPng(await qrPng(input.validationUrl));
  page.drawImage(qr, { x: 62, y: 94, width: 68, height: 68 });
  page.drawText("Validação digital oficial · Código", { x: 145, y: 148, size: 7.2, font: regular, color: BLUE });
  page.drawText(input.qrToken, { x: 145, y: 136, size: 8.2, font, color: BLUE });
  page.drawText("Verifique a autenticidade em:", { x: 145, y: 119, size: 7.2, font: regular, color: BLUE });
  page.drawText(CERTIFICATE_VERIFICATION_SITE, { x: 145, y: 107, size: 7.4, font, color: BLUE });
  page.drawText(CERTIFICATE_DIRECTOR_NAME, { x: 370, y: 205, size: 10, font: regular, color: BLUE });
  page.drawLine({ start: { x: 365, y: 200 }, end: { x: 535, y: 200 }, thickness: 0.7, color: BLUE });
  page.drawText(`Direção · ${CERTIFICATE_CENTER_NAME}`, { x: 393, y: 188, size: 6.5, font, color: BLUE });
  return Buffer.from(await pdf.save());
}

export async function generateEnrollmentReceiptPdf(input: { applicationNumber: string; fullName: string; email: string; nif: string; phone: string; courseTitle: string; paymentMethod: string; createdAt?: Date | string | null }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.width, A4.height]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: rgb(0.97, 0.985, 1) });
  page.drawRectangle({ x: 0, y: 760, width: A4.width, height: 82, color: BLUE });
  page.drawText(CERTIFICATE_CENTER_NAME.toUpperCase(), { x: 45, y: 795, size: 22, font, color: rgb(1, 1, 1) });
  page.drawText("COMPROVATIVO DE INSCRIÇÃO", { x: 45, y: 775, size: 10, font: regular, color: rgb(0.84, 0.9, 1) });
  page.drawText("Candidatura recebida para análise", { x: 45, y: 710, size: 18, font, color: BLUE });
  page.drawText("O presente documento confirma o envio dos dados de inscrição.", { x: 45, y: 682, size: 10, font: regular, color: rgb(0.25, 0.3, 0.4) });
  const rows = [["Código da inscrição", input.applicationNumber], ["Nome completo", input.fullName], ["E-mail", input.email], ["NIF", input.nif], ["Telefone", input.phone], ["Curso", input.courseTitle], ["Meio de pagamento", input.paymentMethod], ["Data de envio", input.createdAt ? new Intl.DateTimeFormat("pt-PT").format(new Date(input.createdAt)) : new Intl.DateTimeFormat("pt-PT").format(new Date())], ["Estado", "Pendente de análise pela Coordenação"]];
  let y = 625;
  for (const [label, value] of rows) { page.drawText(label, { x: 55, y, size: 9, font, color: BLUE }); page.drawText(textFit(value, 75, 11), { x: 205, y, size: 10.5, font: regular, color: rgb(0.12, 0.16, 0.24) }); page.drawLine({ start: { x: 55, y: y - 9 }, end: { x: 540, y: y - 9 }, thickness: 0.4, color: rgb(0.78, 0.84, 0.92) }); y -= 40; }
  page.drawRectangle({ x: 45, y: 120, width: 505, height: 75, color: rgb(0.91, 0.95, 1) });
  page.drawText("Guarde este ficheiro", { x: 65, y: 168, size: 13, font, color: BLUE });
  page.drawText("Depois da aprovação, o código da inscrição será usado para aceder à Área do Aluno.", { x: 65, y: 145, size: 9, font: regular, color: BLUE });
  page.drawText("Documento digital emitido pelo sistema Sou Eletricista", { x: 45, y: 65, size: 8, font: regular, color: rgb(0.35, 0.4, 0.5) });
  return Buffer.from(await pdf.save());
}
