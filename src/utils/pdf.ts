import { generatePdf } from "html-pdf-node"; // ES Module import

export async function generatePdfFromHtml(html) {
  const file = { content: html };
  const options = { format: "A4" };
  const pdfBuffer = await generatePdf(file, options);
  return pdfBuffer;
}