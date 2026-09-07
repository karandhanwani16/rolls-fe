
import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { paymentsInAPI } from "@/services/api";
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

const PaymentInReport = () => {
  const [paymentsIn, setPaymentsIn] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentsIn();
  }, []);

  const fetchPaymentsIn = async () => {
    try {
      setLoading(true);
      const response = await paymentsInAPI.getAll();
      const payments = response.data || [];
      setPaymentsIn(payments);
      setFilteredPayments(payments);
    } catch (error) {
      console.error("Error fetching payments in:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments in data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (!startDate || !endDate) return;
    
    const filtered = paymentsIn.filter((payment) => {
      const paymentDate = new Date(payment.created_at);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    setFilteredPayments(filtered);
  };

  const exportToPDF = () => {
    const totalReceived = filteredPayments.reduce((sum, p) => sum + (p.received_amount || 0), 0);
    const totalActual = filteredPayments.reduce((sum, p) => sum + (p.actual_amount || 0), 0);
    const totalCharges = filteredPayments.reduce((sum, p) => sum + (p.charges || 0), 0);

    downloadReportPdf({
      title: "Payments In Report",
      filename: `payments_in_report_${format(new Date(), "yyyy-MM-dd")}.pdf`,
      orientation: "landscape",
      meta: [
        { label: "Entries", value: String(filteredPayments.length) },
        { label: "Generated", value: format(new Date(), "dd/MM/yyyy HH:mm") },
      ],
      summary: [
        { label: "Received", value: formatPdfAmount(totalReceived) },
        { label: "Charges", value: formatPdfAmount(totalCharges) },
        { label: "Actual Amount", value: formatPdfAmount(totalActual), emphasize: true },
      ],
      columns: [
        { header: "Customer", align: "left" },
        { header: "Type", width: 32 },
        { header: "Received", width: 32, align: "right" },
        { header: "Actual", width: 32, align: "right" },
        { header: "Charges", width: 28, align: "right" },
        { header: "Payment Type", width: 32, align: "center" },
        { header: "Date", width: 28, align: "center" },
      ],
      rows: filteredPayments.map((payment) => [
        payment.customer ? payment.customer.name : "—",
        payment.customer_type || "—",
        formatPdfAmount(payment.received_amount, { prefix: false }),
        formatPdfAmount(payment.actual_amount, { prefix: false }),
        formatPdfAmount(payment.charges || 0, { prefix: false }),
        payment.type || "—",
        formatPdfDate(payment.created_at),
      ]),
      foot: [
        "",
        "Total",
        formatPdfAmount(totalReceived, { prefix: false }),
        formatPdfAmount(totalActual, { prefix: false }),
        formatPdfAmount(totalCharges, { prefix: false }),
        "",
        "",
      ],
    });
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = [
      "Customer Type", 
      "Customer", 
      "Received Amount", 
      "Actual Amount", 
      "Charges", 
      "Type", 
      "Date"
    ];
    const csvContent = [
      headers.join(","),
      ...filteredPayments.map((payment) => {
        return [
          `"${payment.customer_type || ''}"`,
          `"${payment.customer ? payment.customer.name : ''}"`,
          payment.received_amount,
          payment.actual_amount,
          payment.charges || 0,
          `"${payment.type || ''}"`,
          format(new Date(payment.created_at), "yyyy-MM-dd")
        ].join(",");
      }),
    ].join("\n");

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payments_in_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ReportLayout
      title="Payments In Report"
      description="View and export payments received information"
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
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Received Amount</TableHead>
                <TableHead className="text-right">Actual Amount</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.customer ? payment.customer.name : "-"}
                    </TableCell>
                    <TableCell>{payment.customer_type}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(payment.received_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(payment.actual_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(payment.charges || 0)}
                    </TableCell>
                    <TableCell>{payment.type}</TableCell>
                    <TableCell>{format(new Date(payment.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
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

export default PaymentInReport;
