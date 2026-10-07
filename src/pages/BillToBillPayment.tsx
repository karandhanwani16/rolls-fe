import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  billPaymentsAPI,
  customersAPI,
  suppliersAPI,
  supplierBillPaymentsAPI,
} from "@/services/api";
import { getRegularCustomers } from "@/lib/partyTypes";
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
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableControls } from "@/hooks/useTableControls";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PartyOption {
  id: string;
  name: string;
}

interface BillRow {
  id: string;
  bill_no: string;
  date: string;
  total: number;
  credit_days?: number;
  cleared_amount: number;
  remaining_amount: number;
  overdue_days?: number;
  due_date?: string;
  status: string;
  is_bill_paid?: boolean;
  payment_source?: string;
  new_cleared_amount?: number;
  new_status?: string;
  can_settle?: boolean;
}

interface PoolPayment {
  id: string;
  amount: number;
  created_at: string;
  description: string | null;
}

type PartyType = "customer" | "supplier";

const BillToBillPayment = () => {
  const { toast: toastNotification } = useToast();
  const [partyType, setPartyType] = useState<PartyType>("customer");
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [calculatedStatus, setCalculatedStatus] = useState<BillRow[]>([]);
  const [showFullyPaid, setShowFullyPaid] = useState(false);

  useEffect(() => {
    fetchParties();
  }, [partyType]);

  const fetchParties = async () => {
    try {
      if (partyType === "customer") {
        const response = await customersAPI.getAll();
        setParties(
          getRegularCustomers(response || []).map((customer: any) => ({
            id: customer.id,
            name: customer.name,
          }))
        );
      } else {
        const response = await suppliersAPI.getAll();
        setParties(
          (response || []).map((supplier: any) => ({
            id: supplier.id,
            name: supplier.name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching parties:", error);
      toastNotification({
        title: "Error",
        description: `Failed to load ${partyType === "customer" ? "customers" : "suppliers"}`,
        variant: "destructive",
      });
    }
  };

  const handlePartyTypeChange = (value: string) => {
    setPartyType(value as PartyType);
    setSelectedPartyId("");
    setReconciliationData(null);
    setCalculatedStatus([]);
  };

  const fetchReconciliationData = async (partyId = selectedPartyId) => {
    if (!partyId) return;

    setLoading(true);
    try {
      const response =
        partyType === "customer"
          ? await billPaymentsAPI.getReconciliationData(partyId)
          : await supplierBillPaymentsAPI.getReconciliationData(partyId);
      const data = response.data;
      setReconciliationData(data);
      calculatePaymentStatus(data);
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

  const normalizeBills = (data: any): BillRow[] => {
    if (partyType === "customer") {
      return (data.sales || []).map((sale: any) => ({
        id: sale.id,
        bill_no: sale.sales_no,
        date: sale.date,
        total: sale.total,
        credit_days: sale.credit_days,
        cleared_amount: sale.cleared_amount,
        remaining_amount: sale.remaining_amount,
        overdue_days: sale.overdue_days,
        due_date: sale.due_date,
        status: sale.status,
        is_bill_paid: sale.is_bill_paid,
        payment_source: sale.payment_source,
      }));
    }
    return (data.purchases || []).map((purchase: any) => ({
      id: purchase.id,
      bill_no: purchase.purchase_no,
      date: purchase.date,
      total: purchase.total,
      credit_days: purchase.credit_days,
      cleared_amount: purchase.cleared_amount,
      remaining_amount: purchase.remaining_amount,
      overdue_days: purchase.overdue_days,
      due_date: purchase.due_date,
      status: purchase.status,
      is_bill_paid: purchase.is_bill_paid,
      payment_source: purchase.payment_source,
    }));
  };

  const normalizePoolPayments = (data: any): PoolPayment[] => {
    if (partyType === "customer") {
      return (data.payments_in || []).map((payment: any) => ({
        id: payment.id,
        amount: Number(payment.received_amount || 0) + Number(payment.discount || 0),
        created_at: payment.created_at,
        description: payment.description,
      }));
    }
    return (data.payments_out || []).map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      created_at: payment.created_at,
      description: payment.description,
    }));
  };

  const calculatePaymentStatus = (data: any) => {
    const bills = normalizeBills(data);
    let remainingAmount = data.total_payment_amount;
    const calculatedBills = bills.map((bill) => {
      let newClearedAmount = 0;
      let newStatus = bill.status;
      let canSettle = false;

      if (bill.status === "FULL" || bill.is_bill_paid) {
        return {
          ...bill,
          new_cleared_amount: 0,
          new_status: "FULL",
          can_settle: false,
        };
      }

      if (remainingAmount > 0) {
        const amountNeeded = bill.total - bill.cleared_amount;
        newClearedAmount = Math.min(remainingAmount, amountNeeded);
        remainingAmount -= newClearedAmount;

        if (bill.cleared_amount + newClearedAmount >= bill.total) {
          newStatus = "FULL";
          canSettle = true;
        } else if (newClearedAmount > 0) {
          newStatus = "PARTIAL";
        } else {
          newStatus = bill.status;
        }
      }

      return {
        ...bill,
        new_cleared_amount: newClearedAmount,
        new_status: newStatus,
        can_settle: canSettle,
      };
    });

    setCalculatedStatus(calculatedBills);
  };

  const calculateOverflow = () => {
    if (!reconciliationData) return 0;
    const totalNewPayments = calculatedStatus.reduce(
      (total, bill) => total + (bill.new_cleared_amount || 0),
      0
    );
    return Math.max(0, reconciliationData.total_payment_amount - totalNewPayments);
  };

  const getStatusBadge = (status: string, isBillPaid?: boolean) => {
    if (isBillPaid || status === "FULL") {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-green-500 w-fit">Fully Paid</Badge>
          {isBillPaid && (
            <Badge variant="outline" className="w-fit text-emerald-700 border-emerald-300">
              Bill payment
            </Badge>
          )}
        </div>
      );
    }
    if (status === "PARTIAL") {
      return <Badge className="bg-orange-500">Partially Paid</Badge>;
    }
    return <Badge className="bg-red-500">Unpaid</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fullyPaidCount = calculatedStatus.filter(
    (bill) => bill.status === "FULL" || bill.is_bill_paid
  ).length;
  const visibleBills = showFullyPaid
    ? calculatedStatus
    : calculatedStatus.filter((bill) => bill.status !== "FULL" && !bill.is_bill_paid);

  const getBillsSortValue = useMemo(
    () => (bill: any, key: string) => {
      switch (key) {
        case "bill_no":
          return bill.bill_no;
        case "date":
          return bill.date ? new Date(bill.date) : null;
        case "credit_days":
          return bill.credit_days ?? 0;
        case "overdue_days":
          return bill.status === "FULL" || bill.is_bill_paid ? -1 : bill.overdue_days ?? 0;
        case "total":
          return bill.total ?? 0;
        case "cleared_amount":
          return bill.cleared_amount ?? 0;
        case "remaining_amount":
          return bill.remaining_amount ?? 0;
        case "new_cleared_amount":
          return bill.new_cleared_amount ?? 0;
        case "status":
          return bill.status;
        case "new_status":
          return bill.new_status;
        default:
          return null;
      }
    },
    []
  );

  const {
    sort: billsSort,
    toggleSort: toggleBillsSort,
    rows: sortedBills,
  } = useTableControls({
    data: visibleBills,
    getSortValue: getBillsSortValue,
  });

  const handleSettleBill = async (billId: string) => {
    if (!selectedPartyId || !reconciliationData) return;

    try {
      const bill = calculatedStatus.find((row) => row.id === billId);
      if (!bill) return;

      const amountNeeded = bill.total - bill.cleared_amount;
      const total_amount = amountNeeded;

      if (partyType === "customer") {
        await billPaymentsAPI.processPayments({
          customerId: selectedPartyId,
          total_amount,
          overflow_amount: Math.max(
            0,
            reconciliationData.total_payment_amount - total_amount
          ),
          description: `Settlement of bill ${bill.bill_no}`,
          sales: [
            {
              id: bill.id,
              cleared_amount: amountNeeded,
              status: "FULL",
            },
          ],
        });
      } else {
        await supplierBillPaymentsAPI.processPayments({
          supplierId: selectedPartyId,
          total_amount,
          overflow_amount: Math.max(
            0,
            reconciliationData.total_payment_amount - total_amount
          ),
          description: `Settlement of bill ${bill.bill_no}`,
          purchases: [
            {
              id: bill.id,
              cleared_amount: amountNeeded,
              status: "FULL",
            },
          ],
        });
      }

      toast.success("Bill settled successfully");
      fetchReconciliationData();
    } catch (error) {
      console.error("Error settling bill:", error);
      toast.error("Failed to settle bill");
    }
  };

  const handleSettleAll = async () => {
    if (!selectedPartyId || !reconciliationData) return;

    try {
      setProcessingPayment(true);
      const payable = calculatedStatus.filter(
        (bill) => bill.new_cleared_amount && bill.new_cleared_amount > 0
      );
      const total_amount = payable.reduce(
        (total, bill) => total + (bill.new_cleared_amount || 0),
        0
      );

      if (partyType === "customer") {
        await billPaymentsAPI.processPayments({
          customerId: selectedPartyId,
          total_amount,
          overflow_amount: calculateOverflow(),
          description: `Settlement of ${payable.length} bills`,
          sales: payable.map((bill) => ({
            id: bill.id,
            cleared_amount: bill.new_cleared_amount,
            status: bill.new_status,
          })),
        });
      } else {
        await supplierBillPaymentsAPI.processPayments({
          supplierId: selectedPartyId,
          total_amount,
          overflow_amount: calculateOverflow(),
          description: `Settlement of ${payable.length} bills`,
          purchases: payable.map((bill) => ({
            id: bill.id,
            cleared_amount: bill.new_cleared_amount,
            status: bill.new_status,
          })),
        });
      }

      toast.success("All bills settled successfully");
      fetchReconciliationData();
    } catch (error) {
      console.error("Error settling bills:", error);
      toast.error("Failed to settle bills");
    } finally {
      setProcessingPayment(false);
    }
  };

  const poolPayments = reconciliationData
    ? normalizePoolPayments(reconciliationData)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bill-to-Bill Payment</h1>
            <p className="text-gray-600">
              Reconcile {partyType === "customer" ? "customer payments with sales" : "supplier payments with purchases"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Party</CardTitle>
            <CardDescription>
              Choose customer or supplier reconciliation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={partyType} onValueChange={handlePartyTypeChange}>
              <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
                <TabsTrigger value="customer">Customers</TabsTrigger>
                <TabsTrigger value="supplier">Suppliers</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  value={selectedPartyId}
                  onValueChange={(value) => {
                    setSelectedPartyId(value);
                    fetchReconciliationData(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        partyType === "customer"
                          ? "Select a customer"
                          : "Select a supplier"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => fetchReconciliationData()}
                  disabled={!selectedPartyId || loading}
                >
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
                    Includes {formatCurrency(reconciliationData.bill_overflow_amount)} overflow
                    from previous reconciliation. Full-bill payments are excluded.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Payments Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{poolPayments.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Since{" "}
                    {reconciliationData.last_clear_date
                      ? format(new Date(reconciliationData.last_clear_date), "dd MMM yyyy")
                      : "beginning"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Overflow After Reconciliation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(calculateOverflow())}</p>
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
                    Unallocated payments since last reconciliation (full-bill payments excluded)
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
                        {poolPayments.length > 0 ? (
                          poolPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {format(new Date(payment.created_at), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell>{payment.description || "-"}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(payment.amount)}
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
                    <CardTitle>
                      {partyType === "customer" ? "Sales" : "Purchase"} Reconciliation
                    </CardTitle>
                    <CardDescription>
                      Bill-to-bill payment reconciliation against{" "}
                      {partyType === "customer" ? "sales" : "purchase"} invoices
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
                        {showFullyPaid
                          ? "Hide fully paid"
                          : `Show fully paid (${fullyPaidCount})`}
                      </Button>
                    )}
                    <Button
                      className="hidden"
                      onClick={handleSettleAll}
                      disabled={
                        processingPayment ||
                        !reconciliationData ||
                        reconciliationData.total_payment_amount <= 0
                      }
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
                          <SortableHeader
                            label="Invoice No."
                            sortKey="bill_no"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                          />
                          <SortableHeader
                            label="Date"
                            sortKey="date"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                          />
                          <SortableHeader
                            label="Credit Days"
                            sortKey="credit_days"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                            align="right"
                            className="text-right"
                          />
                          <SortableHeader
                            label="Overdue Days"
                            sortKey="overdue_days"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                            align="right"
                            className="text-right"
                          />
                          <SortableHeader
                            label="Total Amount"
                            sortKey="total"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                            align="right"
                            className="text-right"
                          />
                          <SortableHeader
                            label="Already Cleared"
                            sortKey="cleared_amount"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                            align="right"
                            className="text-right"
                          />
                          <SortableHeader
                            label="To Be Cleared"
                            sortKey="remaining_amount"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                            align="right"
                            className="text-right"
                          />
                          <SortableHeader
                            label="Current Status"
                            sortKey="status"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                          />
                          <SortableHeader
                            label="New Status"
                            sortKey="new_status"
                            sort={billsSort}
                            onSort={toggleBillsSort}
                          />
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedBills.length > 0 ? (
                          sortedBills.map((bill, index) => (
                            <TableRow key={bill.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{bill.bill_no}</TableCell>
                              <TableCell>
                                {format(new Date(bill.date), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {bill.credit_days ?? 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {bill.status === "FULL" || bill.is_bill_paid ? (
                                  "—"
                                ) : (bill.overdue_days || 0) > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {bill.overdue_days}
                                  </span>
                                ) : (
                                  0
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(bill.total)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(bill.cleared_amount)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(bill.remaining_amount ?? 0)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(bill.status, bill.is_bill_paid)}
                              </TableCell>
                              <TableCell>
                                {bill.new_status &&
                                bill.new_status !== bill.status &&
                                !bill.is_bill_paid ? (
                                  getStatusBadge(bill.new_status)
                                ) : (
                                  <span>-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {bill.can_settle && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSettleBill(bill.id)}
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
                            <TableCell colSpan={11} className="text-center py-4">
                              {fullyPaidCount > 0
                                ? "All bills are fully paid. Turn on Show fully paid to view them."
                                : "No bill data available"}
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
