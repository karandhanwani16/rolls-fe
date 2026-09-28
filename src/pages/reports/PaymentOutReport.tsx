import { useState, useEffect, useMemo } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { paymentsOutAPI } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReportPdf, formatPdfAmount, formatPdfDate } from "@/lib/reportPdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/ui/sortable-header";

const PaymentOutReport = () => {
  const [paymentsOut, setPaymentsOut] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFiltered, setDateFiltered] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentsOut();
  }, []);

  const fetchPaymentsOut = async () => {
    try {
      setLoading(true);
      const response = await paymentsOutAPI.getAll();
      const payments = response.data || [];
      setPaymentsOut(payments);
      setDateFiltered(payments);
    } catch (error) {
      console.error("Error fetching payments out:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments out data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (!startDate || !endDate) return;
    
    const filtered = paymentsOut.filter((payment) => {
      const paymentDate = new Date(payment.created_at);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    setDateFiltered(filtered);
  };

  const getSortValue = useMemo(
    () => (payment: any, key: string) => {
      switch (key) {
        case "party":
          return payment.supplier?.supplier_name || "";
        case "amount":
          return payment.amount ?? 0;
        case "type":
          return payment.type || "";
        case "cheque_date":
          return payment.cheque_date ? new Date(payment.cheque_date) : null;
        case "date":
          return payment.created_at ? new Date(payment.created_at) : null;
        default:
          return null;
      }
    },
    []
  );

  const { sort, toggleSort, rows } = useTableControls({
    data: dateFiltered,
    getSortValue,
    defaultSort: { key: "date", direction: "desc" },
  });

  const exportToPDF = () => {
    const totalAmount = rows.reduce((sum, p) => sum + (p.amount || 0), 0);

    downloadReportPdf({
      title: "Payments Out Report",
      filename: `payments_out_report_${format(new Date(), "yyyy-MM-dd")}.pdf`,
      orientation: "landscape",
      meta: [
        { label: "Entries", value: String(rows.length) },
        { label: "Generated", value: format(new Date(), "dd/MM/yyyy HH:mm") },
      ],
      summary: [
        { label: "Total Paid", value: formatPdfAmount(totalAmount), emphasize: true },
        { label: "Number of Payments", value: String(rows.length) },
      ],
      columns: [
        { header: "Supplier", align: "left" },
        { header: "Amount", width: 32, align: "right" },
        { header: "Payment Type", width: 32, align: "center" },
        { header: "Description" },
        { header: "Cheque Date", width: 28, align: "center" },
        { header: "Date", width: 28, align: "center" },
      ],
      rows: rows.map((payment) => [
        payment.supplier ? payment.supplier.supplier_name : "—",
        formatPdfAmount(payment.amount, { prefix: false }),
        payment.type || "—",
        payment.description || "—",
        payment.cheque_date ? formatPdfDate(payment.cheque_date) : "—",
        formatPdfDate(payment.created_at),
      ]),
      foot: ["Total", formatPdfAmount(totalAmount, { prefix: false }), "", "", "", ""],
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Supplier", 
      "Amount", 
      "Type", 
      "Description", 
      "Cheque Date",
      "Created Date"
    ];
    const csvContent = [
      headers.join(","),
      ...rows.map((payment) => {
        return [
          `"${payment.supplier ? payment.supplier.supplier_name : ''}"`,
          payment.amount,
          `"${payment.type || ''}"`,
          `"${payment.description || ''}"`,
          payment.cheque_date ? format(new Date(payment.cheque_date), "yyyy-MM-dd") : '-',
          format(new Date(payment.created_at), "yyyy-MM-dd")
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payments_out_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ReportLayout
      title="Payments Out Report"
      description="View and export payments made to suppliers"
      onDateChange={handleDateChange}
    >
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="Supplier" sortKey="party" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} align="right" className="text-right" />
                <SortableHeader label="Payment Type" sortKey="type" sort={sort} onSort={toggleSort} />
                <TableHead>Description</TableHead>
                <SortableHeader label="Cheque Date" sortKey="cheque_date" sort={sort} onSort={toggleSort} />
                <SortableHeader label="Created Date" sortKey="date" sort={sort} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.supplier ? payment.supplier.supplier_name : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.type}</TableCell>
                    <TableCell>{payment.description || "-"}</TableCell>
                    <TableCell>
                      {payment.cheque_date 
                        ? format(new Date(payment.cheque_date), "dd MMM yyyy") 
                        : "-"}
                    </TableCell>
                    <TableCell>{format(new Date(payment.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No payment data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      )}
    </ReportLayout>
  );
};

export default PaymentOutReport;
