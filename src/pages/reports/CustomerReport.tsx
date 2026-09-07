import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { customersAPI } from "@/services/api";
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
import { Loader2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const CustomerReport = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerType, setCustomerType] = useState<string>("all");
  const [transactions, setTransactions] = useState<{ data: any[]; summary?: any }>({ data: [] });
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customerOpen, setCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
    // Pre-load data for all customers
    fetchTransactions([]);
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchTransactions([selectedCustomer]);
    }
  }, [selectedCustomer, startDate, endDate, customerType]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersAPI.getAll();
      setCustomers(getRegularCustomers(data || []));
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (customerIds: string[]) => {
    try {
      setLoading(true);
      const data = await customersAPI.getSalesAndPayments({
        customerIds,
        startDate,
        endDate,
        customerType: customerType === "all" ? undefined : customerType
      });
      setTransactions({
        data: data.data || [],
        summary: data.summary,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClosingBalance = () => {
    if (transactions.summary?.closingBalance !== undefined) {
      return transactions.summary.closingBalance;
    }
    return transactions.data.reduce((sum, item) => sum + item.debit - item.credit, 0);
  };

  const getOpeningBalance = () => transactions.summary?.openingBalance ?? 0;

  const exportToCSV = () => {
    const headers = ["Sr. No.", "Date", "Particulars", "Voucher No.", "Debit", "Credit", "Balance"];
    const csvContent = [
      headers.join(","),
      ...transactions.data.map((item) => {
        return [
          item.srno,
          format(new Date(item.date), "yyyy-MM-dd"),
          `"${item.particulars}"`,
          `"${item.voucherNo}"`,
          formatAmount(item.debit),
          formatAmount(item.credit),
          formatAmount(item.balance ?? 0),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customer_transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);
    
    // Set default font for entire document
    doc.setFont("helvetica");
    
    // Add company header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("T. A. TEX", pageWidth / 2, 15, { align: "center" });
    
    // Add report title
    doc.setFontSize(14);
    doc.text("Customer Transactions Report", pageWidth / 2, 25, { align: "center" });
    
    // Add customer details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const customerName = customers.find(c => c.id === selectedCustomer)?.name || "All Customers";
    doc.text(`Customer: ${customerName}`, margin, 35);
    
    // Add date range
    doc.text(`Period: ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`, margin, 42);
    
    // Add summary section
    const totalDebit = transactions.summary?.totalDebit ?? transactions.data.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = transactions.summary?.totalCredit ?? transactions.data.reduce((sum, item) => sum + item.credit, 0);
    const openingBalance = getOpeningBalance();
    const balance = getClosingBalance();
    
    // Format amounts without currency symbol for PDF
    const formatAmountForPDF = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    };
    
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Opening Balance: ₹${formatAmountForPDF(openingBalance)}`, margin, 59);
    doc.text(`Total Debit: ₹${formatAmountForPDF(totalDebit)}`, margin, 66);
    doc.text(`Total Credit: ₹${formatAmountForPDF(totalCredit)}`, margin, 73);
    doc.setFont("helvetica", "bold");
    doc.text(`Closing Balance: ₹${formatAmountForPDF(balance)}`, margin, 80);
    
    // Add transactions table
    autoTable(doc, {
      startY: 87,
      head: [["Sr. No.", "Date", "Particulars", "Voucher No.", "Debit", "Credit", "Balance"]],
      body: transactions.data.map((item) => [
        item.srno,
        format(new Date(item.date), "dd/MM/yyyy"),
        item.particulars,
        item.voucherNo,
        `₹${formatAmountForPDF(item.debit)}`,
        `₹${formatAmountForPDF(item.credit)}`,
        `₹${formatAmountForPDF(item.balance ?? 0)}`,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        font: 'helvetica',
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
        font: 'helvetica',
        fontStyle: 'normal'
      },
      columnStyles: {
        0: { cellWidth: 15, font: 'helvetica' },
        1: { cellWidth: 25, font: 'helvetica' },
        2: { cellWidth: 'auto', font: 'helvetica' },
        3: { cellWidth: 25, font: 'helvetica' },
        4: { cellWidth: 25, halign: 'right', font: 'helvetica' },
        5: { cellWidth: 25, halign: 'right', font: 'helvetica' },
        6: { cellWidth: 25, halign: 'right', font: 'helvetica' }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      theme: 'grid'
    });

    // Add footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
      doc.text(
        `Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    }

    // Generate filename with customer name and date range
    const filename = `${customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transactions_${format(new Date(startDate), 'yyyyMMdd')}_to_${format(new Date(endDate), 'yyyyMMdd')}.pdf`;
    doc.save(filename);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCustomerName = customers.find(c => c.id === selectedCustomer)?.name || "Select customer...";

  return (
    <ReportLayout
      title="Customer Transactions Report"
      description="View and export customer transaction information"
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
          {/* </div>

          <div className="flex items-center gap-4"> */}
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-[240px] justify-between"
                >
                  {selectedCustomerName}
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
                          setSelectedCustomer(customer.id);
                          setCustomerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCustomer === customer.id
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

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {transactions.data.length > 0 && (
              <div className="sticky top-0 z-10 bg-background pb-4">
                <div className="bg-sidebar/5 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Opening Balance</span>
                    <span className="font-medium">
                      {formatAmount(getOpeningBalance())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total Debit</span>
                    <span className="font-medium">
                      {formatAmount(transactions.summary?.totalDebit ?? transactions.data.reduce((sum, item) => sum + item.debit, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total Credit</span>
                    <span className="font-medium">
                      {formatAmount(transactions.summary?.totalCredit ?? transactions.data.reduce((sum, item) => sum + item.credit, 0))}
                    </span>
                  </div>
                  {(transactions.summary?.normalPayments != null ||
                    transactions.summary?.vatavPayments != null) && (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Normal Payments</span>
                        <span className="font-medium">
                          {formatAmount(transactions.summary?.normalPayments || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Watav Payments</span>
                        <span className="font-medium">
                          {formatAmount(transactions.summary?.vatavPayments || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Total Payments</span>
                        <span className="font-medium">
                          {formatAmount(transactions.summary?.totalPayments || 0)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-sidebar/20 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Closing Balance</span>
                    <span className={cn(
                      "font-bold text-lg",
                      getClosingBalance() >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}>
                      {formatAmount(getClosingBalance())}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="text-white rounded-tl-lg">Sr. No.</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Particulars</TableHead>
                    <TableHead className="text-white">Voucher No.</TableHead>
                    <TableHead className="text-white">Debit</TableHead>
                    <TableHead className="text-white">Credit</TableHead>
                    <TableHead className="text-white rounded-tr-lg">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data.length > 0 ? (
                    <>
                      {transactions.data.map((item) => (
                        <TableRow
                          key={item.srno}
                          className={cn(
                            "hover:bg-sidebar/10",
                            (item.isOpeningBalance || item.isBroughtForward) && "bg-amber-50/50 font-medium"
                          )}
                        >
                          <TableCell>{item.srno}</TableCell>
                          <TableCell>{format(new Date(item.date), "yyyy-MM-dd")}</TableCell>
                          <TableCell>{item.particulars}</TableCell>
                          <TableCell>{item.voucherNo}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.debit)}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.credit)}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.balance ?? 0)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-sidebar/20">
                        <TableCell colSpan={4} className="text-right font-medium">Total</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(transactions.summary?.totalDebit ?? transactions.data.reduce((sum, item) => sum + item.debit, 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(transactions.summary?.totalCredit ?? transactions.data.reduce((sum, item) => sum + item.credit, 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(getClosingBalance())}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No data found
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

export default CustomerReport;
