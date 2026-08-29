import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { salesReturnsAPI, customersAPI } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Download, FileText, FileSpreadsheet, Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

const SalesReturnReport = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState<any[]>([]);
  const { toast } = useToast();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customerOpen, setCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    customersAPI.getAll().then(setCustomers).catch(() =>
      toast({ title: "Error", description: "Failed to fetch customers", variant: "destructive" })
    );
    fetchReturns();
  }, []);

  useEffect(() => {
    filterRows();
  }, [returns, selectedCustomers, startDate, endDate]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await salesReturnsAPI.getAll();
      const data = response.data || [];
      setReturns(data);
      setFiltered(data);
    } catch {
      toast({ title: "Error", description: "Failed to fetch sales returns", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterRows = () => {
    setFiltered(
      returns.filter((row) => {
        const d = new Date(row.date);
        const inRange = d >= new Date(startDate) && d <= new Date(endDate + "T23:59:59");
        const matchCustomer = selectedCustomers.length === 0 || selectedCustomers.includes(row.customer_id);
        return inRange && matchCustomer;
      })
    );
  };

  const exportToCSV = () => {
    const csv = [
      ["Return No", "Customer", "Date", "Total", "Description"].join(","),
      ...filtered.map((row) =>
        [`"${row.return_no}"`, `"${row.customer_name}"`, format(new Date(row.date), "yyyy-MM-dd"), row.total, `"${row.description || ""}"`].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_return_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Mohit Traders", 105, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text("Sales Return Report", 105, 25, { align: "center" });
    autoTable(doc, {
      startY: 40,
      head: [["Return No", "Customer", "Date", "Total"]],
      body: filtered.map((row) => [
        row.return_no,
        row.customer_name,
        format(new Date(row.date), "dd/MM/yyyy"),
        formatAmount(row.total),
      ]),
    });
    doc.save(`sales_return_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const filteredCustomers = customers.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const total = filtered.reduce((sum, row) => sum + (row.total || 0), 0);

  return (
    <ReportLayout title="Sales Return Report" description="View and export sales returns">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap gap-4">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[180px]" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[180px]" />
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-[240px] justify-between">
                {selectedCustomers.length > 0 ? `${selectedCustomers.length} customer(s)` : "Select customers..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder="Search customers..." value={searchQuery} onValueChange={setSearchQuery} />
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() =>
                        setSelectedCustomers((prev) =>
                          prev.includes(customer.id) ? prev.filter((id) => id !== customer.id) : [...prev, customer.id]
                        )
                      }
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedCustomers.includes(customer.id) ? "opacity-100" : "opacity-0")} />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selectedCustomers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCustomers.map((id) => {
              const customer = customers.find((c) => c.id === id);
              return customer ? (
                <Badge key={id} variant="secondary" className="flex items-center gap-1">
                  {customer.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCustomers((prev) => prev.filter((c) => c !== id))} />
                </Badge>
              ) : null;
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            <div className="bg-sidebar/5 rounded-lg p-4 flex justify-between">
              <span className="text-sm text-muted-foreground">Total Sales Returns</span>
              <span className="font-medium">{formatAmount(total)}</span>
            </div>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="text-white">Return No</TableHead>
                    <TableHead className="text-white">Customer</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Total</TableHead>
                    <TableHead className="text-white">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    <>
                      {filtered.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.return_no}</TableCell>
                          <TableCell>{row.customer_name}</TableCell>
                          <TableCell>{format(new Date(row.date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{formatAmount(row.total)}</TableCell>
                          <TableCell>{row.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                        <TableCell className="font-medium">{formatAmount(total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">No sales returns found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
};

export default SalesReturnReport;
