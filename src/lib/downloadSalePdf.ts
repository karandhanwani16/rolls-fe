import html2pdf from "html2pdf.js";
import { salesAPI } from "@/services/api";

export type SaleDocumentType = "bill" | "challan";

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

function stretchInvoiceToPage(page: HTMLElement) {
  page.style.width = `${PAGE_WIDTH_PX}px`;
  page.style.height = `${PAGE_HEIGHT_PX}px`;
  page.style.boxSizing = "border-box";
  page.style.display = "flex";
  page.style.flexDirection = "column";

  const tableWrap = page.querySelector(".table-wrap") as HTMLElement | null;
  if (!tableWrap) return;

  const header = page.querySelector(".header") as HTMLElement | null;
  const details = page.querySelector(".details-row") as HTMLElement | null;
  const wrapHeight = Math.max(
    1,
    page.clientHeight - (header?.offsetHeight || 0) - (details?.offsetHeight || 0)
  );
  tableWrap.style.flex = "none";
  tableWrap.style.height = `${wrapHeight}px`;
  tableWrap.style.minHeight = `${wrapHeight}px`;
}

export async function downloadSalePdf(
  id: string,
  salesNo: string,
  type: SaleDocumentType
) {
  const htmlResponse = await salesAPI.getInvoiceHTML(id, type);
  if (!htmlResponse.success || !htmlResponse.data) {
    throw new Error("Failed to get document HTML");
  }

  const tempDiv = document.createElement("div");
  tempDiv.style.position = "fixed";
  tempDiv.style.left = "-10000px";
  tempDiv.style.top = "0";
  tempDiv.style.width = `${PAGE_WIDTH_PX}px`;
  tempDiv.style.height = `${PAGE_HEIGHT_PX}px`;
  tempDiv.innerHTML = htmlResponse.data;
  document.body.appendChild(tempDiv);

  const page = (tempDiv.querySelector(".page") as HTMLElement) || tempDiv;
  stretchInvoiceToPage(page);

  const prefix = type === "challan" ? "challan" : "sales_bill";
  const options = {
    margin: 0,
    filename: `${prefix}_${salesNo}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, windowWidth: PAGE_WIDTH_PX, windowHeight: PAGE_HEIGHT_PX },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: [] as string[] },
  };

  try {
    await html2pdf().set(options).from(page).save();
  } finally {
    if (tempDiv.parentNode) {
      document.body.removeChild(tempDiv);
    }
  }
}
