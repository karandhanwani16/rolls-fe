import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { customersAPI, paymentsInAPI } from "@/services/api";
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
import { Loader2, Download, FileText, FileSpreadsheet, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { cn } from "@/lib/utils";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatAmountForPDF = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const WatavReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedWatav, setSelectedWatav] = useState<string>("");
  const [watavOpen, setWatavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [transactions, setTransactions] = useState<any[]>([]);
  const [byWatav, setByWatav] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalEntries: 0,
    totalReceived: 0,
    totalPaidToWatav: 0,
    totalActualAmount: 0,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedWatav]);

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
      const data = await paymentsInAPI.getWatavReport({
        startDate,
        endDate,
        watavCustomerId: selectedWatav || undefined,
      });
      setTransactions(data.data || []);
      setByWatav(data.byWatav || []);
      setSummary(
        data.summary || {
          totalEntries: 0,
          totalReceived: 0,
          totalPaidToWatav: 0,
          totalActualAmount: 0,
        }
      );
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

  const selectedWatavName =
    customers.find((c) => c.id === selectedWatav)?.name || "All Watav customers";

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = [
      "Sr. No.",
      "Date",
      "Watav Customer",
      "Actual Customer",
      "Received Amount",
      "Paid to Watav",
      "Actual Amount",
      "Type",
      "Description",
    ];
    const csvContent = [
      headers.join(","),
      ...transactions.map((item) =>
        [
          item.srno,
          format(new Date(item.date), "yyyy-MM-dd"),
          `"${item.watavCustomerName}"`,
          `"${item.actualCustomerName}"`,
          item.receivedAmount,
          item.paidToWatav,
          item.actualAmount,
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Mohit Traders", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text("Watav Report — Amount Paid to Watav", pageWidth / 2, 25, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Watav: ${selectedWatavName}`, margin, 35);
    doc.text(
      `Period: ${format(new Date(startDate), "dd/MM/yyyy")} to ${format(new Date(endDate), "dd/MM/yyyy")}`,
      margin,
      42
    );

    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Entries: ${summary.totalEntries}`, margin, 59);
    doc.text(`Total Received: ₹${formatAmountForPDF(summary.totalReceived)}`, margin, 66);
    doc.text(`Total Paid to Watav: ₹${formatAmountForPDF(summary.totalPaidToWatav)}`, margin, 73);
    doc.text(`Total Actual Amount: ₹${formatAmountForPDF(summary.totalActualAmount)}`, margin, 80);

    autoTable(doc, {
      startY: 88,
      head: [["Sr.", "Date", "Watav", "Customer", "Received", "Paid to Watav", "Actual"]],
      body: transactions.map((item) => [
        item.srno,
        format(new Date(item.date), "dd/MM/yyyy"),
        item.watavCustomerName,
        item.actualCustomerName,
        `₹${formatAmountForPDF(item.receivedAmount)}`,
        `₹${formatAmountForPDF(item.paidToWatav)}`,
        `₹${formatAmountForPDF(item.actualAmount)}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2, font: "helvetica" },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
      margin: { left: margin, right: margin },
      theme: "grid",
    });

    doc.save(
      `watav_report_${format(new Date(startDate), "yyyyMMdd")}_to_${format(new Date(endDate), "yyyyMMdd")}.pdf`
    );
  };

  return (
    <ReportLayout
      title="Watav Report"
      description="See what you paid to watav customers (charges) on watav payment entries"
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
                  placeholder="Search watav customer..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setSelectedWatav("");
                      setWatavOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedWatav ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Watav customers
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
                      {customer.type === "watav" ? " (Watav)" : ""}
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

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-sidebar/5 rounded-lg p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Received</div>
                <div className="font-semibold text-lg">{formatAmount(summary.totalReceived)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Paid to Watav</div>
                <div className="font-bold text-lg text-amber-700">
                  {formatAmount(summary.totalPaidToWatav)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Actual Amount</div>
                <div className="font-semibold text-lg">{formatAmount(summary.totalActualAmount)}</div>
              </div>
            </div>

            {!selectedWatav && byWatav.length > 0 && (
              <div className="rounded-md border overflow-hidden">
                <div className="bg-sidebar px-4 py-2 text-white text-sm font-medium">
                  Paid to Watav — by customer
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Watav Customer</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Paid to Watav</TableHead>
                      <TableHead className="text-right">Actual Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byWatav.map((row) => (
                      <TableRow key={row.watavCustomerId}>
                        <TableCell className="font-medium">{row.watavCustomerName}</TableCell>
                        <TableCell className="text-right">{row.entries}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.totalReceived)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-700">
                          {formatAmount(row.totalPaidToWatav)}
                        </TableCell>
                        <TableCell className="text-right">{formatAmount(row.totalActualAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="text-white rounded-tl-lg">Sr.</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Watav Customer</TableHead>
                    <TableHead className="text-white">Actual Customer</TableHead>
                    <TableHead className="text-white text-right">Received</TableHead>
                    <TableHead className="text-white text-right">Paid to Watav</TableHead>
                    <TableHead className="text-white text-right">Actual</TableHead>
                    <TableHead className="text-white rounded-tr-lg">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    <>
                      {transactions.map((item) => (
                        <TableRow key={item.id} className="hover:bg-sidebar/10">
                          <TableCell>{item.srno}</TableCell>
                          <TableCell>{format(new Date(item.date), "yyyy-MM-dd")}</TableCell>
                          <TableCell className="font-medium">{item.watavCustomerName}</TableCell>
                          <TableCell>{item.actualCustomerName}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.receivedAmount)}</TableCell>
                          <TableCell className="text-right font-semibold text-amber-700">
                            {formatAmount(item.paidToWatav)}
                          </TableCell>
                          <TableCell className="text-right">{formatAmount(item.actualAmount)}</TableCell>
                          <TableCell className="capitalize">{item.type}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-sidebar/20">
                        <TableCell colSpan={4} className="text-right font-medium">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(summary.totalReceived)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-700">
                          {formatAmount(summary.totalPaidToWatav)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(summary.totalActualAmount)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No watav payment entries found for this period
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
