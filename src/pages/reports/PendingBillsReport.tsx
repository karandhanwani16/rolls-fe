import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { salesAPI, customersAPI } from "@/services/api";
import { getRegularCustomers } from "@/lib/partyTypes";
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
import {
  Loader2,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadReportPdf,
  formatPdfAmount,
  formatPdfDate,
  formatPdfPeriod,
} from "@/lib/reportPdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/ui/sortable-header";

type AppliedCredit = {
  source_type: "PAYMENT" | "SALE_RETURN";
  amount: number;
  payment_id?: string;
  payment_date?: string;
  payment_type?: string;
  payment_category?: string;
  received_amount?: number;
  discount?: number;
  description?: string | null;
  sale_return_id?: string;
  return_no?: string;
  return_date?: string;
};

type PendingBill = {
  id: string;
  sales_no: string;
  customer_name: string;
  customer_phone?: string | null;
  date: string;
  credit_days: number;
  due_date?: string;
  total: number;
  cleared_amount: number;
  remaining_amount: number;
  payment_status: string;
  paid_via_payments: number;
  paid_via_returns: number;
  elapsed_days?: number;
  overdue_days?: number;
  items: Array<{
    product_name: string;
    roll_no?: string | null;
    shade?: string | null;
    width?: string | null;
    meters: number;
    unit: string;
    price: number;
    total: number;
  }>;
  payments: AppliedCredit[];
  sale_returns: AppliedCredit[];
};

const sortableHeadClass =
  "text-white [&_button]:text-white [&_button]:hover:text-white";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const getFinancialYearStart = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
};

const formatPaymentLabel = (credit: AppliedCredit) => {
  if (credit.source_type === "SALE_RETURN") {
    return credit.return_no ? `Return ${credit.return_no}` : "Sales return";
  }
  const type = credit.payment_type ? credit.payment_type.replace(/_/g, " ") : "Payment";
  const category =
    credit.payment_category && credit.payment_category !== "NORMAL"
      ? ` (${credit.payment_category})`
      : "";
  return `${type}${category}`;
};

const PendingBillsReport = () => {
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [summary, setSummary] = useState({
    bill_count: 0,
    total_outstanding: 0,
    total_cleared: 0,
    unpaid_count: 0,
    partial_count: 0,
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(getFinancialYearStart());
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customerOpen, setCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(getRegularCustomers(data || []));
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchPendingBills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getPendingBillsReport({
        customerIds: selectedCustomers.length ? selectedCustomers : undefined,
        startDate,
        endDate,
      });
      setBills(response.data || []);
      setSummary(
        response.summary || {
          bill_count: 0,
          total_outstanding: 0,
          total_cleared: 0,
          unpaid_count: 0,
          partial_count: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching pending bills:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pending bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCustomers, startDate, endDate, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchPendingBills();
  }, [fetchPendingBills]);

  const getSortValue = useMemo(
    () => (bill: PendingBill, key: string) => {
      switch (key) {
        case "sales_no":
          return bill.sales_no;
        case "customer":
          return bill.customer_name;
        case "date":
          return bill.date ? new Date(bill.date) : null;
        case "total":
          return bill.total;
        case "cleared":
          return bill.cleared_amount;
        case "outstanding":
          return bill.remaining_amount;
        case "status":
          return bill.payment_status;
        default:
          return null;
      }
    },
    []
  );

  const { sort, toggleSort, rows } = useTableControls({
    data: bills,
    getSortValue,
    defaultSort: { key: "date", direction: "desc" },
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Sales No",
      "Customer",
      "Bill Date",
      "Bill Total",
      "Paid Amount",
      "Outstanding",
      "Status",
      "Payment Details",
    ];
    const csvContent = [
      headers.join(","),
      ...rows.map((bill) => {
        const paymentLines = [
          ...bill.payments.map(
            (p) =>
              `${formatPaymentLabel(p)} ${p.amount} on ${p.payment_date ? format(new Date(p.payment_date), "yyyy-MM-dd") : ""}`
          ),
          ...bill.sale_returns.map(
            (r) =>
              `${formatPaymentLabel(r)} ${r.amount} on ${r.return_date ? format(new Date(r.return_date), "yyyy-MM-dd") : ""}`
          ),
        ].join("; ");
        return [
          `"${bill.sales_no || ""}"`,
          `"${bill.customer_name || ""}"`,
          format(new Date(bill.date), "yyyy-MM-dd"),
          bill.total,
          bill.cleared_amount,
          bill.remaining_amount,
          `"${bill.payment_status}"`,
          `"${paymentLines}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `pending_bills_report_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const selectedCustomerNames =
      selectedCustomers.length > 0
        ? customers
            .filter((c) => selectedCustomers.includes(c.id))
            .map((c) => c.name)
            .join(", ")
        : "All Customers";

    downloadReportPdf({
      title: "Customer Pending Bills",
      filename: `pending_bills_${format(new Date(startDate), "yyyyMMdd")}_to_${format(new Date(endDate), "yyyyMMdd")}.pdf`,
      orientation: "landscape",
      meta: [
        { label: "Customers", value: selectedCustomerNames },
        { label: "Period", value: formatPdfPeriod(startDate, endDate) },
      ],
      summary: [
        {
          label: "Total Outstanding",
          value: formatPdfAmount(summary.total_outstanding),
          emphasize: true,
        },
        { label: "Pending Bills", value: String(summary.bill_count) },
        { label: "Partially Paid", value: String(summary.partial_count) },
      ],
      columns: [
        { header: "Sales No", width: 28, align: "center" },
        { header: "Customer", align: "left" },
        { header: "Date", width: 26, align: "center" },
        { header: "Bill Total", width: 32, align: "right" },
        { header: "Paid", width: 32, align: "right" },
        { header: "Outstanding", width: 36, align: "right" },
        { header: "Status", width: 28, align: "center" },
      ],
      rows: rows.map((bill) => [
        bill.sales_no || "—",
        bill.customer_name || "—",
        formatPdfDate(bill.date),
        formatPdfAmount(bill.total, { prefix: false }),
        formatPdfAmount(bill.cleared_amount, { prefix: false }),
        formatPdfAmount(bill.remaining_amount, { prefix: false }),
        bill.payment_status,
      ]),
      foot: [
        "",
        "",
        "Total",
        "",
        formatPdfAmount(summary.total_cleared, { prefix: false }),
        formatPdfAmount(summary.total_outstanding, { prefix: false }),
        "",
      ],
    });
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ReportLayout
      title="Customer Pending Bills"
      description="All unpaid and partially paid customer bills with line items and applied payments"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[180px]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[180px]"
            />
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-[240px] justify-between"
                >
                  {selectedCustomers.length > 0
                    ? `${selectedCustomers.length} customer(s) selected`
                    : "All customers"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search customers..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandEmpty>No customers found.</CommandEmpty>
                  <CommandGroup>
                    {filteredCustomers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        onSelect={() => {
                          setSelectedCustomers((prev) =>
                            prev.includes(customer.id)
                              ? prev.filter((id) => id !== customer.id)
                              : [...prev, customer.id]
                          );
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCustomers.includes(customer.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {customer.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

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
        </div>

        {selectedCustomers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCustomers.map((customerId) => {
              const customer = customers.find((c) => c.id === customerId);
              return customer ? (
                <Badge
                  key={customerId}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {customer.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setSelectedCustomers((prev) =>
                        prev.filter((id) => id !== customerId)
                      )
                    }
                  />
                </Badge>
              ) : null;
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="sticky top-0 z-10 bg-background pb-4">
              <div className="bg-sidebar/5 rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex justify-between items-center md:flex-col md:items-start md:gap-1">
                  <span className="text-sm text-muted-foreground">
                    Total Outstanding
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatAmount(summary.total_outstanding)}
                  </span>
                </div>
                <div className="flex justify-between items-center md:flex-col md:items-start md:gap-1">
                  <span className="text-sm text-muted-foreground">
                    Pending Bills
                  </span>
                  <span className="font-medium">{summary.bill_count}</span>
                </div>
                <div className="flex justify-between items-center md:flex-col md:items-start md:gap-1">
                  <span className="text-sm text-muted-foreground">
                    Partially Paid
                  </span>
                  <span className="font-medium">{summary.partial_count}</span>
                </div>
                <div className="flex justify-between items-center md:flex-col md:items-start md:gap-1">
                  <span className="text-sm text-muted-foreground">
                    Unpaid
                  </span>
                  <span className="font-medium">{summary.unpaid_count}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="w-10 text-white rounded-tl-lg" />
                    <SortableHeader
                      label="Sales No"
                      sortKey="sales_no"
                      sort={sort}
                      onSort={toggleSort}
                      className={sortableHeadClass}
                    />
                    <SortableHeader
                      label="Customer"
                      sortKey="customer"
                      sort={sort}
                      onSort={toggleSort}
                      className={sortableHeadClass}
                    />
                    <SortableHeader
                      label="Bill Date"
                      sortKey="date"
                      sort={sort}
                      onSort={toggleSort}
                      className={sortableHeadClass}
                    />
                    <SortableHeader
                      label="Bill Total"
                      sortKey="total"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className={`text-right ${sortableHeadClass}`}
                    />
                    <SortableHeader
                      label="Paid"
                      sortKey="cleared"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className={`text-right ${sortableHeadClass}`}
                    />
                    <SortableHeader
                      label="Outstanding"
                      sortKey="outstanding"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className={`text-right ${sortableHeadClass}`}
                    />
                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      sort={sort}
                      onSort={toggleSort}
                      className={`rounded-tr-lg ${sortableHeadClass}`}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? (
                    <>
                      {rows.map((bill) => {
                        const expanded = expandedIds.has(bill.id);
                        const hasCredits =
                          bill.payments.length > 0 ||
                          bill.sale_returns.length > 0;
                        return (
                          <Fragment key={bill.id}>
                            <TableRow
                              className="hover:bg-sidebar/10 cursor-pointer"
                              onClick={() => toggleExpanded(bill.id)}
                            >
                              <TableCell className="w-10">
                                {expanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {bill.sales_no}
                              </TableCell>
                              <TableCell>{bill.customer_name}</TableCell>
                              <TableCell>
                                {format(new Date(bill.date), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatAmount(bill.total)}
                              </TableCell>
                              <TableCell className="text-right">
                                {bill.cleared_amount > 0 ? (
                                  <span className="text-green-700 font-medium">
                                    {formatAmount(bill.cleared_amount)}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatAmount(bill.remaining_amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    bill.payment_status === "PARTIAL"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {bill.payment_status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            {expanded && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={8} className="p-4">
                                  <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">
                                        Bill line items
                                      </h4>
                                      <div className="rounded border bg-background overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Product</TableHead>
                                              <TableHead>Roll</TableHead>
                                              <TableHead className="text-right">
                                                Qty
                                              </TableHead>
                                              <TableHead className="text-right">
                                                Rate
                                              </TableHead>
                                              <TableHead className="text-right">
                                                Amount
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {bill.items.map((item, idx) => (
                                              <TableRow key={idx}>
                                                <TableCell>
                                                  {item.product_name}
                                                  {item.shade
                                                    ? ` · ${item.shade}`
                                                    : ""}
                                                </TableCell>
                                                <TableCell>
                                                  {item.roll_no || "—"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {item.meters} {item.unit}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {formatAmount(item.price)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {formatAmount(item.total)}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">
                                        Payments & credits applied
                                      </h4>
                                      {hasCredits ? (
                                        <div className="rounded border bg-background overflow-hidden">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Particulars</TableHead>
                                                <TableHead className="text-right">
                                                  Applied
                                                </TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {bill.payments.map((credit, idx) => (
                                                <TableRow key={`p-${idx}`}>
                                                  <TableCell>
                                                    {credit.payment_date
                                                      ? format(
                                                          new Date(
                                                            credit.payment_date
                                                          ),
                                                          "dd MMM yyyy"
                                                        )
                                                      : "—"}
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="font-medium">
                                                      {formatPaymentLabel(credit)}
                                                    </div>
                                                    {credit.received_amount !=
                                                      null && (
                                                      <div className="text-xs text-muted-foreground">
                                                        Received{" "}
                                                        {formatAmount(
                                                          credit.received_amount
                                                        )}
                                                        {(credit.discount || 0) >
                                                          0 &&
                                                          ` + discount ${formatAmount(credit.discount || 0)}`}
                                                      </div>
                                                    )}
                                                    {credit.description && (
                                                      <div className="text-xs text-muted-foreground">
                                                        {credit.description}
                                                      </div>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-right font-medium text-green-700">
                                                    {formatAmount(credit.amount)}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                              {bill.sale_returns.map(
                                                (credit, idx) => (
                                                  <TableRow key={`r-${idx}`}>
                                                    <TableCell>
                                                      {credit.return_date
                                                        ? format(
                                                            new Date(
                                                              credit.return_date
                                                            ),
                                                            "dd MMM yyyy"
                                                          )
                                                        : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                      {formatPaymentLabel(credit)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-green-700">
                                                      {formatAmount(credit.amount)}
                                                    </TableCell>
                                                  </TableRow>
                                                )
                                              )}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground rounded border bg-background p-4">
                                          No payments recorded against this bill
                                          yet.
                                        </p>
                                      )}
                                      {bill.payment_status === "PARTIAL" && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Paid via payments:{" "}
                                          {formatAmount(bill.paid_via_payments)}
                                          {bill.paid_via_returns > 0 &&
                                            ` · via returns: ${formatAmount(bill.paid_via_returns)}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                      <TableRow className="border-t-2 border-sidebar/20">
                        <TableCell colSpan={6} className="text-right font-medium">
                          Total Outstanding
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatAmount(summary.total_outstanding)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No pending bills found for the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
};

export default PendingBillsReport;
