import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { salesAPI, customersAPI } from "@/services/api";
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
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const SalesReport = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const { toast } = useToast();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customerOpen, setCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
    fetchSales();
  }, []);

  useEffect(() => {
    if (selectedCustomers.length > 0) {
      filterSales();
    }
  }, [selectedCustomers, startDate, endDate]);

  const fetchCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive",
      });
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll();
      const salesData = response.data || [];
      setSales(salesData);
      setFilteredSales(salesData);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sales data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    const filtered = sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      const isInDateRange = saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
      const isSelectedCustomer = selectedCustomers.length === 0 || selectedCustomers.includes(sale.customer_id);
      return isInDateRange && isSelectedCustomer;
    });
    setFilteredSales(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      "Sales No", 
      "Customer Name", 
      "Date", 
      "Total", 
      "Description",
      "Hamaal",
      "Challan No",
      "Transport Charges",
      "Discount",
      "Credit Days",
      "Outstanding",
      "Overdue Days"
    ];
    const csvContent = [
      headers.join(","),
      ...filteredSales.map((sale) => {
        return [
          `"${sale.sales_no || ''}"`,
          `"${sale.customer_name || ''}"`,
          format(new Date(sale.date), "yyyy-MM-dd"),
          sale.total,
          `"${sale.description || ''}"`,
          `"${sale.hamaal || ''}"`,
          `"${sale.challan_no || ''}"`,
          sale.transport_charges || 0,
          sale.discount || 0,
          sale.credit_days || 0,
          sale.remaining_amount ?? sale.total,
          sale.overdue_days || 0,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
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
    doc.text("Mohit Traders", pageWidth / 2, 15, { align: "center" });

    // Add report title
    doc.setFontSize(14);
    doc.text("Sales Report", pageWidth / 2, 25, { align: "center" });

    // Add customer details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const selectedCustomerNames = selectedCustomers.length > 0
      ? customers
          .filter(c => selectedCustomers.includes(c.id))
          .map(c => c.name)
          .join(", ")
      : "All Customers";
    doc.text(`Customers: ${selectedCustomerNames}`, margin, 35);

    // Add date range
    doc.text(`Period: ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`, margin, 42);

    // Add summary section
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Sales: ₹${formatAmount(totalAmount)}`, margin, 59);
    doc.text(`Number of Sales: ${filteredSales.length}`, margin, 66);

    // Add sales table
    autoTable(doc, {
      startY: 75,
      head: [["Sales No", "Customer", "Date", "Total", "Outstanding", "Overdue", "Credit"]],
      body: filteredSales.map((sale) => [
        sale.sales_no,
        sale.customer_name,
        format(new Date(sale.date), "dd/MM/yyyy"),
        `₹${formatAmount(sale.total)}`,
        `₹${formatAmount(sale.remaining_amount ?? sale.total)}`,
        String(sale.overdue_days || 0),
        String(sale.credit_days || 0),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        font: 'helvetica',
        fontStyle: 'normal',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        font: 'helvetica',
        halign: 'center',
        valign: 'middle',
        cellPadding: 5,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
        font: 'helvetica',
        fontStyle: 'normal',
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      theme: 'grid',
      didDrawPage: function(data) {
        // Add page number
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${data.pageNumber}`,
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
    });

    // Generate filename with date range
    const filename = `sales_report_${format(new Date(startDate), 'yyyyMMdd')}_to_${format(new Date(endDate), 'yyyyMMdd')}.pdf`;
    doc.save(filename);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ReportLayout
      title="Sales Report"
      description="View and export sales information"
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
                    : "Select customers..."}
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
                          setSelectedCustomers(prev =>
                            prev.includes(customer.id)
                              ? prev.filter(id => id !== customer.id)
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
              const customer = customers.find(c => c.id === customerId);
              return customer ? (
                <Badge
                  key={customerId}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {customer.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCustomers(prev => prev.filter(id => id !== customerId))}
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
            {filteredSales.length > 0 && (
              <div className="sticky top-0 z-10 bg-background pb-4">
                <div className="bg-sidebar/5 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total Sales</span>
                    <span className="font-medium">
                      {formatAmount(filteredSales.reduce((sum, sale) => sum + sale.total, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Number of Sales</span>
                    <span className="font-medium">{filteredSales.length}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="text-white rounded-tl-lg">Sales No</TableHead>
                    <TableHead className="text-white">Customer</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Total</TableHead>
                    <TableHead className="text-white">Outstanding</TableHead>
                    <TableHead className="text-white">Credit Days</TableHead>
                    <TableHead className="text-white rounded-tr-lg">Overdue Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? (
                    <>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-sidebar/10">
                          <TableCell className="font-medium">{sale.sales_no}</TableCell>
                          <TableCell>{sale.customer_name}</TableCell>
                          <TableCell>{format(new Date(sale.date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(sale.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.payment_status === "FULL"
                              ? "Paid"
                              : formatAmount(sale.remaining_amount ?? sale.total)}
                          </TableCell>
                          <TableCell className="text-right">{sale.credit_days ?? 0}</TableCell>
                          <TableCell className="text-right">
                            {sale.payment_status === "FULL" ? (
                              "—"
                            ) : (sale.overdue_days || 0) > 0 ? (
                              <span className="text-red-600 font-medium">{sale.overdue_days}</span>
                            ) : (
                              0
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-sidebar/20">
                        <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(filteredSales.reduce((sum, sale) => sum + sale.total, 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(
                            filteredSales.reduce(
                              (sum, sale) =>
                                sum + (sale.payment_status === "FULL" ? 0 : (sale.remaining_amount ?? sale.total)),
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No sales data found
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

export default SalesReport;
