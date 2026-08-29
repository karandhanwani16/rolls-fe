import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { billPaymentsAPI, customersAPI } from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CustomerOption {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  sales_no: string;
  date: string;
  total: number;
  cleared_amount: number;
  remaining_amount: number;
  status: string;
  new_cleared_amount?: number;
  can_settle?: boolean;
}

interface PaymentIn {
  id: string;
  received_amount: number;
  created_at: string;
  description: string | null;
}

const BillToBillPayment = () => {
  const { toast: toastNotification } = useToast();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [calculatedStatus, setCalculatedStatus] = useState<any[]>([]);
  const [showFullyPaid, setShowFullyPaid] = useState(false);
  
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      const customerOptions = response.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
      }));
      setCustomers(customerOptions);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toastNotification({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const fetchReconciliationData = async (customerId = selectedCustomerId) => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const response = await billPaymentsAPI.getReconciliationData(customerId);
      setReconciliationData(response.data);
      calculatePaymentStatus(response.data);
    } catch (error) {
      console.error("Error fetching reconciliation data:", error);
      toastNotification({
        title: "Error",
        description: "Failed to load reconciliation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentStatus = (data: any) => {
    const { sales, total_payment_amount } = data;
    let remainingAmount = total_payment_amount;
    const calculatedSales = sales.map((sale: Sale) => {
      // Calculate how much can be cleared for this sale
      let newClearedAmount = 0;
      let newStatus = sale.status;
      let canSettle = false;

      // If there's already a payment status, keep it as is
      if (sale.status === "FULL") {
        return {
          ...sale,
          new_cleared_amount: 0,
          new_status: "FULL",
          can_settle: false
        };
      }

      // Calculate how much can be paid for this invoice
      if (remainingAmount > 0) {
        const amountNeeded = sale.total - sale.cleared_amount;
        newClearedAmount = Math.min(remainingAmount, amountNeeded);
        remainingAmount -= newClearedAmount;
        
        // Determine the new status
        if (sale.cleared_amount + newClearedAmount >= sale.total) {
          newStatus = "FULL";
          canSettle = true;
        } else if (newClearedAmount > 0) {
          newStatus = "PARTIAL";
        } else {
          newStatus = sale.status;
        }
      }

      return {
        ...sale,
        new_cleared_amount: newClearedAmount,
        new_status: newStatus,
        can_settle: canSettle
      };
    });

    setCalculatedStatus(calculatedSales);
  };

  const handleProcessPayments = async () => {
    if (!selectedCustomerId || !reconciliationData) return;
    
    setProcessingPayment(true);
    try {
      // Filter out sales where no new payment is being made
      const salesWithPayments = calculatedStatus.filter(
        (sale) => sale.new_cleared_amount && sale.new_cleared_amount > 0
      );
      
      if (salesWithPayments.length === 0) {
        toast.info("No new payments to process");
        return;
      }
      
      // Format data for API
      const paymentData = {
        customerId: selectedCustomerId,
        overflow_amount: calculateOverflow(),
        sales: salesWithPayments.map((sale) => ({
          id: sale.id,
          cleared_amount: sale.new_cleared_amount,
          status: sale.new_status
        }))
      };
      
      // await billPaymentsAPI.processBillPayments(paymentData);
      
      toast.success("Payments processed successfully");
      // Refresh the data
      fetchReconciliationData();
    } catch (error) {
      console.error("Error processing payments:", error);
      toast.error("Failed to process payments");
    } finally {
      setProcessingPayment(false);
    }
  };

  const calculateOverflow = () => {
    if (!reconciliationData) return 0;
    
    // Calculate total new payments being made
    const totalNewPayments = calculatedStatus.reduce(
      (total, sale) => total + (sale.new_cleared_amount || 0), 
      0
    );
    
    // Calculate overflow amount (if any)
    return Math.max(0, reconciliationData.total_payment_amount - totalNewPayments);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FULL":
        return <Badge className="bg-green-500">Fully Paid</Badge>;
      case "PARTIAL":
        return <Badge className="bg-orange-500">Partially Paid</Badge>;
      default:
        return <Badge className="bg-red-500">Unpaid</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fullyPaidCount = calculatedStatus.filter(
    (sale) => sale.status === "FULL"
  ).length;
  const visibleSales = showFullyPaid
    ? calculatedStatus
    : calculatedStatus.filter((sale) => sale.status !== "FULL");

  const handleSettleBill = async (saleId: string) => {
    if (!selectedCustomerId || !reconciliationData) return;
    
    try {
      const sale = calculatedStatus.find(s => s.id === saleId);
      if (!sale) return;

      // Calculate the amount needed to settle this bill
      const amountNeeded = sale.total - sale.cleared_amount;
      
      // Calculate total amount being settled (which is the amount needed for this bill)
      const total_amount = amountNeeded;
      
      const paymentData = {
        customerId: selectedCustomerId,
        total_amount,
        overflow_amount: Math.max(0, reconciliationData.total_payment_amount - total_amount),
        description: `Settlement of bill ${sale.sales_no}`,
        sales: [{
          id: sale.id,
          cleared_amount: amountNeeded,
          status: "FULL"
        }]
      };
      
      await billPaymentsAPI.processPayments(paymentData);
      toast.success("Bill settled successfully");
      fetchReconciliationData();
    } catch (error) {
      console.error("Error settling bill:", error);
      toast.error("Failed to settle bill");
    }
  };

  const handleSettleAll = async () => {
    if (!selectedCustomerId || !reconciliationData) return;
    
    try {
      // Calculate total amount being settled
      const total_amount = calculatedStatus
        .filter(sale => sale.new_cleared_amount && sale.new_cleared_amount > 0)
        .reduce((total, sale) => total + sale.new_cleared_amount, 0);

      const paymentData = {
        customerId: selectedCustomerId,
        total_amount,
        overflow_amount: calculateOverflow(),
        description: `Settlement of ${calculatedStatus.filter(sale => sale.new_cleared_amount && sale.new_cleared_amount > 0).length} bills`,
        sales: calculatedStatus
          .filter(sale => sale.new_cleared_amount && sale.new_cleared_amount > 0)
          .map(sale => ({
            id: sale.id,
            cleared_amount: sale.new_cleared_amount,
            status: sale.new_status
          }))
      };
      
      await billPaymentsAPI.processPayments(paymentData);
      toast.success("All bills settled successfully");
      fetchReconciliationData();
    } catch (error) {
      console.error("Error settling bills:", error);
      toast.error("Failed to settle bills");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bill-to-Bill Payment</h1>
            <p className="text-gray-600">Reconcile customer payments with sales invoices</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Customer</CardTitle>
            <CardDescription>
              Choose a customer to view their sales and payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  value={selectedCustomerId}
                  onValueChange={(value) => {
                    setSelectedCustomerId(value);
                    fetchReconciliationData(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={fetchReconciliationData} disabled={!selectedCustomerId || loading}>
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Load Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {reconciliationData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Available Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(reconciliationData.total_payment_amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Includes {formatCurrency(reconciliationData.bill_overflow_amount)} overflow from previous reconciliation
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Payments Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {reconciliationData.payments_in.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Since {reconciliationData.last_clear_date ? 
                      format(new Date(reconciliationData.last_clear_date), "dd MMM yyyy") : 
                      "beginning"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Overflow After Reconciliation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculateOverflow())}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Amount that will be carried forward
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payments Available</CardTitle>
                  <CardDescription>
                    Payments received since last reconciliation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliationData.payments_in.length > 0 ? (
                          reconciliationData.payments_in.map((payment: PaymentIn) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {format(new Date(payment.created_at), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell>{payment.description || "-"}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(payment.received_amount)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              No payments available
                            </TableCell>
                          </TableRow>
                        )}
                        {reconciliationData.bill_overflow_amount > 0 && (
                          <TableRow className="bg-gray-50">
                            <TableCell>Previous Balance</TableCell>
                            <TableCell>Overflow from previous reconciliation</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(reconciliationData.bill_overflow_amount)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sales Reconciliation</CardTitle>
                    <CardDescription>
                      Bill-to-bill payment reconciliation against sales invoices
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    {fullyPaidCount > 0 && (
                      <Button
                        type="button"
                        variant={showFullyPaid ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFullyPaid((prev) => !prev)}
                      >
                        {showFullyPaid ? "Hide fully paid" : `Show fully paid (${fullyPaidCount})`}
                      </Button>
                    )}
                    <Button 
                      className="hidden"
                      onClick={handleSettleAll} 
                      disabled={processingPayment || !reconciliationData || reconciliationData.total_payment_amount <= 0}
                    >
                      {processingPayment ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Settle All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reconciliationData.total_payment_amount <= 0 && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No payment amount available for reconciliation.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No.</TableHead>
                          <TableHead>Invoice No.</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Already Cleared</TableHead>
                          <TableHead className="text-right">To Be Cleared</TableHead>
                          <TableHead>Current Status</TableHead>
                          <TableHead>New Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleSales.length > 0 ? (
                          visibleSales.map((sale, index) => (
                            <TableRow key={sale.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{sale.sales_no}</TableCell>
                              <TableCell>
                                {format(new Date(sale.date), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(sale.total)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(sale.cleared_amount)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(sale.new_cleared_amount || 0)}
                              </TableCell>
                              <TableCell>{getStatusBadge(sale.status)}</TableCell>
                              <TableCell>
                                {sale.new_status && sale.new_status !== sale.status ? (
                                  getStatusBadge(sale.new_status)
                                ) : (
                                  <span>-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {sale.can_settle && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSettleBill(sale.id)}
                                    disabled={processingPayment}
                                  >
                                    Settle
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-4">
                              {fullyPaidCount > 0
                                ? "All bills are fully paid. Turn on Show fully paid to view them."
                                : "No sales data available"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BillToBillPayment;
