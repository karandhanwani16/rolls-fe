
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
import { Loader2 } from "lucide-react";

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
      )}
    </ReportLayout>
  );
};

export default PaymentInReport;
