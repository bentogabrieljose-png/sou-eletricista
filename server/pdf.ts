import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
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
async function logoPng() {
  const path = "sou-eletricista-logo_a1bfc7b7.png";
  const signed = await storageGetSignedUrl(path);
  const response = await fetch(signed);
  if (!response.ok) throw new Error(`Certificate logo unavailable (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
async function qrPng(url: string) {
  const data = await QRCode.toDataURL(url, { width: 320, margin: 1 });
  return Buffer.from(data.split(",")[1], "base64");
}
function wrapLines(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export async function generateCertificatePdf(input: { fullName: string; courseTitle: string; completedAt?: Date | string | null; score?: number | null; qrToken: string; validationUrl: string; isBestStudent?: boolean }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.width, A4.height]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const blue = rgb(0.03, 0.20, 0.55);
  const navy = rgb(0.02, 0.10, 0.32);
  const gold = rgb(0.93, 0.70, 0.03);
  const teal = rgb(0.02, 0.48, 0.55);
  const bronze = rgb(0.62, 0.30, 0.10);
  const bronzeLight = rgb(0.86, 0.56, 0.22);
  const pale = rgb(0.97, 0.985, 1);
  page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: pale });
  page.drawRectangle({ x: 0, y: 0, width: 12, height: A4.height, color: teal });
  page.drawRectangle({ x: A4.width - 12, y: 0, width: 12, height: A4.height, color: teal });
  page.drawRectangle({ x: 14, y: 14, width: A4.width - 28, height: A4.height - 28, borderColor: gold, borderWidth: 3 });
  page.drawRectangle({ x: 24, y: 24, width: A4.width - 48, height: A4.height - 48, borderColor: blue, borderWidth: 1 });
  page.drawLine({ start: { x: 42, y: 670 }, end: { x: 553, y: 670 }, thickness: 1.2, color: teal, opacity: .35 });
  page.drawLine({ start: { x: 42, y: 186 }, end: { x: 553, y: 186 }, thickness: 1.2, color: teal, opacity: .35 });
  page.drawRectangle({ x: 0, y: 0, width: A4.width, height: 54, color: navy });
  page.drawRectangle({ x: 0, y: A4.height - 16, width: A4.width, height: 16, color: gold });
  const logo = await pdf.embedPng(await logoPng());
  page.drawImage(logo, { x: 42, y: 690, width: 92, height: 92 });
  page.drawText(CERTIFICATE_CENTER_NAME.toUpperCase(), { x: 150, y: 755, size: 19, font, color: blue });
  page.drawText("CENTRO DE FORMAÇÃO TÉCNICO PROFISSIONAL", { x: 151, y: 736, size: 8.5, font: regular, color: blue });
  const center = (text: string, y: number, size: number, f = font, color = blue, maxWidth = 520) => {
    const actual = fitSize(text, f, maxWidth, size, Math.max(7, size * .55));
    page.drawText(text, { x: (A4.width - f.widthOfTextAtSize(text, actual)) / 2, y, size: actual, font: f, color });
  };
  center("CERTIFICADO DE CONCLUSÃO", 650, 25, font, navy, 500);
  center("ESTE CERTIFICADO É CONCEDIDO A", 610, 9, regular, blue, 400);
  const name = input.fullName.trim().toUpperCase();
  center(name, 566, 22, font, blue, 480);
  page.drawLine({ start: { x: 72, y: 550 }, end: { x: 523, y: 550 }, thickness: 1.2, color: gold });
  center("por ter concluído com aproveitamento o curso de", 510, 10, regular, blue, 460);
  const courseLines = wrapLines(input.courseTitle, font, 18, 470);
  courseLines.forEach((line, i) => center(line, 475 - i * 24, 18, font, navy, 470));
  center("promovido pelo Centro de Formação Técnico Profissional", 416, 9, regular, blue, 470);
  center(CERTIFICATE_CENTER_NAME.toUpperCase(), 397, 13, font, blue, 300);
  center("O presente certificado comprova a sua participação, dedicação", 345, 10, regular, blue, 480);
  center("e compromisso com a formação profissional.", 328, 10, regular, blue, 480);
  const date = input.completedAt ? new Intl.DateTimeFormat("pt-PT").format(new Date(input.completedAt)) : "__/__/____";
  const cells = [{ label: "DATA DE CONCLUSÃO", value: date }, { label: "CARGA HORÁRIA", value: CERTIFICATE_DURATION_LABEL }, { label: "NOTA FINAL", value: `${input.score ?? 0}%` }];
  cells.forEach((cell, i) => {
    const x = 58 + i * 165;
    page.drawRectangle({ x, y: 220, width: 145, height: 78, color: rgb(0.94, 0.97, 1), borderColor: rgb(0.78, 0.85, 0.96), borderWidth: .6 });
    page.drawText(cell.label, { x: x + 10, y: 269, size: 7.2, font, color: blue });
    const valueSize = fitSize(cell.value, regular, 125, 11, 7);
    page.drawText(cell.value, { x: x + (145 - regular.widthOfTextAtSize(cell.value, valueSize)) / 2, y: 241, size: valueSize, font: regular, color: navy });
  });
  const qr = await pdf.embedPng(await qrPng(input.validationUrl));
  page.drawImage(qr, { x: 58, y: 82, width: 82, height: 82 });
  page.drawText("VALIDAÇÃO DIGITAL OFICIAL", { x: 158, y: 150, size: 8, font, color: blue });
  page.drawText(`Código: ${input.qrToken}`, { x: 158, y: 134, size: 8, font: regular, color: navy });
  page.drawText("Verifique a autenticidade em:", { x: 158, y: 116, size: 8, font: regular, color: blue });
  page.drawText(CERTIFICATE_VERIFICATION_SITE, { x: 158, y: 101, size: 8, font, color: blue });
  page.drawText(CERTIFICATE_DIRECTOR_NAME, { x: 370, y: 128, size: 10, font: regular, color: blue });
  page.drawLine({ start: { x: 355, y: 119 }, end: { x: 535, y: 119 }, thickness: .8, color: blue });
  page.drawText(`Direção · ${CERTIFICATE_CENTER_NAME}`, { x: 389, y: 105, size: 7, font, color: blue });
  if (input.isBestStudent || input.score === 100) {
    page.drawRectangle({ x: 500, y: 756, width: 12, height: 35, color: rgb(.82, .08, .12), rotate: degrees(-10) });
    page.drawRectangle({ x: 524, y: 756, width: 12, height: 35, color: rgb(.98, .76, .08), rotate: degrees(10) });
    page.drawEllipse({ x: 518, y: 731, xScale: 31, yScale: 31, color: bronze, borderColor: gold, borderWidth: 2.5 });
    page.drawEllipse({ x: 518, y: 731, xScale: 24, yScale: 24, color: bronzeLight, borderColor: rgb(.45, .20, .06), borderWidth: 1 });
    page.drawText("TOP", { x: 507, y: 734, size: 9, font, color: rgb(1, .92, .45) });
    page.drawText("100%", { x: 505, y: 717, size: 7, font, color: rgb(1, .98, .88) });
    page.drawText("MELHOR ALUNO", { x: 479, y: 686, size: 7, font, color: bronze });
  }
  page.drawText("FORMAÇÃO DE QUALIDADE · ELETRICIDADE É FUTURO", { x: 125, y: 31, size: 8, font, color: rgb(1, .84, .15) });
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
