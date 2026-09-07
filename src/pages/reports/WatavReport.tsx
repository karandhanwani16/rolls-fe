import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { customersAPI, paymentsInAPI } from "@/services/api";
import { getWatavVendors } from "@/lib/partyTypes";
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
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadReportPdf, formatPdfAmount, formatPdfDate, formatPdfPeriod } from "@/lib/reportPdf";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const emptySummary = {
  totalEntries: 0,
  totalReceived: 0,
  totalPaidToWatav: 0,
  totalActualAmount: 0,
  totalVendorCharges: 0,
  totalNetAmount: 0,
  pending: {
    entries: 0,
    gross: 0,
    net: 0,
    charges: 0,
    customerLinkedGross: 0,
    standaloneGross: 0,
  },
  collected: {
    entries: 0,
    gross: 0,
    net: 0,
    charges: 0,
    customerLinkedGross: 0,
    standaloneGross: 0,
  },
  customerLinked: { entries: 0, gross: 0, net: 0, charges: 0 },
  standalone: { entries: 0, gross: 0, net: 0, charges: 0 },
};

const WatavReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedWatav, setSelectedWatav] = useState<string>("");
  const [watavOpen, setWatavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [collectionFilter, setCollectionFilter] = useState<string>("ALL");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("ALL");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [byWatav, setByWatav] = useState<any[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [collectionDate, setCollectionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedWatav, collectionFilter, entryTypeFilter]);

  const fetchCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setSelectedIds([]);
      const data = await paymentsInAPI.getWatavReport({
        startDate,
        endDate,
        watavCustomerId: selectedWatav || undefined,
        collectionStatus: collectionFilter === "ALL" ? undefined : collectionFilter,
        entryType: entryTypeFilter === "ALL" ? undefined : entryTypeFilter,
      });
      setTransactions(data.data || []);
      setByWatav(data.byWatav || []);
      setSummary({ ...emptySummary, ...(data.summary || {}) });
    } catch (error) {
      console.error("Error fetching watav report:", error);
      toast({
        title: "Error",
        description: "Failed to fetch watav report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const vendorList = getWatavVendors(customers);
  const selectedWatavName =
    customers.find((c) => c.id === selectedWatav)?.name || "All Watav vendors";

  const filteredCustomers = vendorList.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingSelectable = transactions.filter((t) => t.collectionStatus !== "COLLECTED");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPending = () => {
    if (selectedIds.length === pendingSelectable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingSelectable.map((t) => t.id));
    }
  };

  const handleCollect = async () => {
    if (selectedIds.length === 0) return;
    try {
      setCollecting(true);
      await paymentsInAPI.collect({
        ids: selectedIds,
        collection_date: collectionDate,
      });
      toast({
        title: "Collected",
        description: `Marked ${selectedIds.length} entr${selectedIds.length === 1 ? "y" : "ies"} as collected.`,
      });
      await fetchReport();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark entries as collected",
        variant: "destructive",
      });
    } finally {
      setCollecting(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Sr. No.",
      "Date",
      "Watav Vendor",
      "Customer",
      "Entry Type",
      "Collection Status",
      "Collection Date",
      "Gross Amount",
      "Vendor Charges",
      "Net Amount",
      "Instrument",
      "Description",
    ];
    const csvContent = [
      headers.join(","),
      ...transactions.map((item) =>
        [
          item.srno,
          format(new Date(item.date), "yyyy-MM-dd"),
          `"${item.watavCustomerName}"`,
          `"${item.actualCustomerName || "None"}"`,
          item.entryType,
          item.collectionStatus,
          item.collectionDate ? format(new Date(item.collectionDate), "yyyy-MM-dd") : "",
          item.receivedAmount,
          item.vendorCharges,
          item.netAmount,
          `"${item.type || ""}"`,
          `"${item.description || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `watav_report_${format(new Date(startDate), "yyyyMMdd")}_to_${format(new Date(endDate), "yyyyMMdd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    downloadReportPdf({
      title: "Watav Report",
      filename: `watav_report_${format(new Date(startDate), "yyyyMMdd")}_to_${format(new Date(endDate), "yyyyMMdd")}.pdf`,
      orientation: "landscape",
      meta: [
        { label: "Vendor", value: selectedWatavName },
        { label: "Period", value: formatPdfPeriod(startDate, endDate) },
        { label: "Entries", value: String(transactions.length) },
      ],
      summary: [
        { label: "Gross", value: formatPdfAmount(summary.totalReceived) },
        { label: "Charges", value: formatPdfAmount(summary.totalVendorCharges || summary.totalPaidToWatav) },
        { label: "Pending Net", value: formatPdfAmount(summary.pending?.net || 0) },
        { label: "Net Collected", value: formatPdfAmount(summary.totalNetAmount || summary.totalActualAmount), emphasize: true },
      ],
      columns: [
        { header: "Sr.", width: 12, align: "center" },
        { header: "Date", width: 24, align: "center" },
        { header: "Vendor", width: 38 },
        { header: "Customer", align: "left" },
        { header: "Type", width: 24, align: "center" },
        { header: "Status", width: 24, align: "center" },
        { header: "Gross", width: 30, align: "right" },
        { header: "Charges", width: 28, align: "right" },
        { header: "Net", width: 30, align: "right" },
      ],
      rows: transactions.map((item) => [
        item.srno,
        formatPdfDate(item.date),
        item.watavCustomerName || "—",
        item.actualCustomerName || "None",
        item.entryType === "STANDALONE" ? "Standalone" : "Customer",
        item.collectionStatus,
        formatPdfAmount(item.receivedAmount, { prefix: false }),
        formatPdfAmount(item.vendorCharges, { prefix: false }),
        formatPdfAmount(item.netAmount, { prefix: false }),
      ]),
      foot: [
        "",
        "",
        "",
        "",
        "",
        "Total",
        formatPdfAmount(summary.totalReceived, { prefix: false }),
        formatPdfAmount(summary.totalVendorCharges || summary.totalPaidToWatav, { prefix: false }),
        formatPdfAmount(summary.totalNetAmount || summary.totalActualAmount, { prefix: false }),
      ],
    });
  };

  return (
    <ReportLayout
      title="Watav Report"
      description="Vendor account balances — pending and collected Watav entries (customer-linked and standalone)"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
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

          <Popover open={watavOpen} onOpenChange={setWatavOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={watavOpen}
                className="w-[260px] justify-between"
              >
                {selectedWatavName}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0">
              <Command>
                <CommandInput
                  placeholder="Search watav vendor..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandEmpty>No vendors found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setSelectedWatav("");
                      setWatavOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", !selectedWatav ? "opacity-100" : "opacity-0")}
                    />
                    All Watav vendors
                  </CommandItem>
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        setSelectedWatav(customer.id);
                        setWatavOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedWatav === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          <Select value={collectionFilter} onValueChange={setCollectionFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COLLECTED">Collected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Entry type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entry types</SelectItem>
              <SelectItem value="CUSTOMER_PAYMENT">Customer-linked</SelectItem>
              <SelectItem value="STANDALONE">Standalone</SelectItem>
            </SelectContent>
          </Select>

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

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-sidebar/5 rounded-lg p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Gross Watav</div>
                <div className="font-semibold text-lg">{formatAmount(summary.totalReceived)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vendor Charges</div>
                <div className="font-semibold text-lg text-amber-700">
                  {formatAmount(summary.totalVendorCharges || summary.totalPaidToWatav)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pending (Net)</div>
                <div className="font-bold text-lg text-amber-800">
                  {formatAmount(summary.pending?.net || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Customer {formatAmount(summary.pending?.customerLinkedGross || 0)} · Standalone{" "}
                  {formatAmount(summary.pending?.standaloneGross || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Collected (Net)</div>
                <div className="font-bold text-lg text-green-700">
                  {formatAmount(summary.collected?.net || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Customer {formatAmount(summary.collected?.customerLinkedGross || 0)} · Standalone{" "}
                  {formatAmount(summary.collected?.standaloneGross || 0)}
                </div>
              </div>
            </div>

            {!selectedWatav && byWatav.length > 0 && (
              <div className="rounded-md border overflow-hidden">
                <div className="bg-sidebar px-4 py-2 text-white text-sm font-medium">
                  Vendor Account Summary
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Customer / Standalone</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Charges</TableHead>
                      <TableHead className="text-right">Pending Net</TableHead>
                      <TableHead className="text-right">Collected Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byWatav.map((row) => (
                      <TableRow key={row.watavCustomerId}>
                        <TableCell className="font-medium">{row.watavCustomerName}</TableCell>
                        <TableCell className="text-right">{row.entries}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.customerLinkedEntries} / {row.standaloneEntries}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(row.totalReceived)}
                        </TableCell>
                        <TableCell className="text-right text-amber-700">
                          {formatAmount(row.totalPaidToWatav)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-800">
                          {formatAmount(row.pendingNet)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          {formatAmount(row.collectedNet)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {pendingSelectable.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border bg-amber-50/60 p-3">
                <Checkbox
                  checked={
                    selectedIds.length > 0 && selectedIds.length === pendingSelectable.length
                  }
                  onCheckedChange={toggleSelectAllPending}
                />
                <span className="text-sm">
                  Select pending entries for combined collection ({selectedIds.length} selected)
                </span>
                <Input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-[160px]"
                />
                <Button
                  size="sm"
                  disabled={selectedIds.length === 0 || collecting}
                  onClick={handleCollect}
                  className="bg-brand-teal hover:bg-teal-700"
                >
                  {collecting ? "Collecting..." : "Mark Collected"}
                </Button>
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="text-white w-10" />
                    <TableHead className="text-white">Sr.</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Vendor</TableHead>
                    <TableHead className="text-white">Customer</TableHead>
                    <TableHead className="text-white">Entry</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white text-right">Gross</TableHead>
                    <TableHead className="text-white text-right">Charges</TableHead>
                    <TableHead className="text-white text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    <>
                      {transactions.map((item) => {
                        const isPending = item.collectionStatus !== "COLLECTED";
                        return (
                          <TableRow key={item.id} className="hover:bg-sidebar/10">
                            <TableCell>
                              {isPending ? (
                                <Checkbox
                                  checked={selectedIds.includes(item.id)}
                                  onCheckedChange={() => toggleSelect(item.id)}
                                />
                              ) : null}
                            </TableCell>
                            <TableCell>{item.srno}</TableCell>
                            <TableCell>{format(new Date(item.date), "yyyy-MM-dd")}</TableCell>
                            <TableCell className="font-medium">{item.watavCustomerName}</TableCell>
                            <TableCell>
                              {item.actualCustomerName || (
                                <span className="italic text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.entryType === "STANDALONE" ? "Standalone" : "Customer"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  item.collectionStatus === "COLLECTED"
                                    ? "text-green-700 font-medium"
                                    : "text-amber-700 font-medium"
                                }
                              >
                                {item.collectionStatus === "COLLECTED" ? "Collected" : "Pending"}
                              </span>
                              {item.collectionDate && (
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(item.collectionDate), "dd/MM/yyyy")}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatAmount(item.receivedAmount)}
                            </TableCell>
                            <TableCell className="text-right text-amber-700">
                              {formatAmount(item.vendorCharges)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatAmount(item.netAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="border-t-2 border-sidebar/20">
                        <TableCell colSpan={7} className="text-right font-medium">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(summary.totalReceived)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-700">
                          {formatAmount(summary.totalVendorCharges || summary.totalPaidToWatav)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(summary.totalNetAmount || summary.totalActualAmount)}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        No watav entries found for this period
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

export default WatavReport;
