
import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

const PaymentOutReport = () => {
  const [paymentsOut, setPaymentsOut] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
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
      setFilteredPayments(payments);
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
    
    setFilteredPayments(filtered);
  };

  const exportToCSV = () => {
    // Create CSV content
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
      ...filteredPayments.map((payment) => {
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

    // Create and download CSV file
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
      onExport={exportToCSV}
    >
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cheque Date</TableHead>
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
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
      )}
    </ReportLayout>
  );
};

export default PaymentOutReport;
