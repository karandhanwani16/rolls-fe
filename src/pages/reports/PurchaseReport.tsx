import { useState, useEffect } from "react";
import ReportLayout from "@/components/reports/ReportLayout";
import { purchasesAPI, suppliersAPI } from "@/services/api";
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

const PurchaseReport = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredPurchases, setFilteredPurchases] = useState<any[]>([]);
  const { toast } = useToast();
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSuppliers();
    // Pre-load data for all suppliers
    fetchPurchases([]);
  }, []);

  useEffect(() => {
    if (selectedSuppliers.length > 0) {
      fetchPurchases(selectedSuppliers);
    }
  }, [selectedSuppliers, startDate, endDate]);

  const fetchSuppliers = async () => {
    try {
      const data = await suppliersAPI.getAll();
      setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch supplier data",
        variant: "destructive",
      });
    }
  };

  const fetchPurchases = async (supplierIds: string[]) => {
    try {
      setLoading(true);
      const data = await purchasesAPI.getReport({
        supplierIds,
        startDate,
        endDate
      });
      // Transform the data to match the expected structure
      const transformedData = data.data.map((purchase: any) => ({
        ...purchase,
        supplier_name: purchase.supplier.name
      }));
      setFilteredPurchases(transformedData);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast({
        title: "Error",
        description: "Failed to fetch purchases data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPurchases = () => {
    fetchPurchases(selectedSuppliers);
  };

  const exportToCSV = () => {
    const headers = [
      "Purchase No", 
      "Supplier Name", 
      "Date", 
      "Total", 
      "Godown",
      "Transport",
      "Transport Charges",
      "Discount",
      "Received By"
    ];
    const csvContent = [
      headers.join(","),
      ...filteredPurchases.map((purchase) => {
        return [
          `"${purchase.purchase_no || ''}"`,
          `"${purchase.supplier_name || ''}"`,
          format(new Date(purchase.date), "yyyy-MM-dd"),
          purchase.total,
          `"${purchase.godown || ''}"`,
          `"${purchase.transport || ''}"`,
          purchase.transport_charges || 0,
          purchase.discount || 0,
          `"${purchase.received_by || ''}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `purchases_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const selectedSupplierNames = selectedSuppliers.length > 0
      ? suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => s.name).join(", ")
      : "All Suppliers";
    const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);

    downloadReportPdf({
      title: "Purchase Report",
      filename: `purchases_report_${format(new Date(startDate), "yyyyMMdd")}_to_${format(new Date(endDate), "yyyyMMdd")}.pdf`,
      orientation: "landscape",
      meta: [
        { label: "Suppliers", value: selectedSupplierNames },
        { label: "Period", value: formatPdfPeriod(startDate, endDate) },
        { label: "Bills", value: String(filteredPurchases.length) },
      ],
      summary: [
        { label: "Total Purchases", value: formatPdfAmount(totalAmount), emphasize: true },
        { label: "Number of Purchases", value: String(filteredPurchases.length) },
      ],
      columns: [
        { header: "Purchase No", width: 28, align: "center" },
        { header: "Supplier", align: "left" },
        { header: "Date", width: 26, align: "center" },
        { header: "Total", width: 34, align: "right" },
        { header: "Godown", width: 36 },
        { header: "Received By", width: 36 },
      ],
      rows: filteredPurchases.map((purchase) => [
        purchase.purchase_no || "—",
        purchase.supplier_name || "—",
        formatPdfDate(purchase.date),
        formatPdfAmount(purchase.total, { prefix: false }),
        purchase.godown || "—",
        purchase.received_by || "—",
      ]),
      foot: ["", "", "Total", formatPdfAmount(totalAmount, { prefix: false }), "", ""],
    });
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ReportLayout
      title="Purchase Report"
      description="View and export purchase information"
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
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierOpen}
                  className="w-[240px] justify-between"
                >
                  {selectedSuppliers.length > 0
                    ? `${selectedSuppliers.length} supplier(s) selected`
                    : "Select suppliers..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search suppliers..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandEmpty>No suppliers found.</CommandEmpty>
                  <CommandGroup>
                    {filteredSuppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        onSelect={() => {
                          setSelectedSuppliers(prev =>
                            prev.includes(supplier.id)
                              ? prev.filter(id => id !== supplier.id)
                              : [...prev, supplier.id]
                          );
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSuppliers.includes(supplier.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {supplier.name}
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

        {selectedSuppliers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSuppliers.map((supplierId) => {
              const supplier = suppliers.find(s => s.id === supplierId);
              return supplier ? (
                <Badge
                  key={supplierId}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {supplier.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedSuppliers(prev => prev.filter(id => id !== supplierId))}
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
            {filteredPurchases.length > 0 && (
              <div className="sticky top-0 z-10 bg-background pb-4">
                <div className="bg-sidebar/5 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total Purchases</span>
                    <span className="font-medium">
                      {formatAmount(filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Number of Purchases</span>
                    <span className="font-medium">{filteredPurchases.length}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="text-white rounded-tl-lg">Purchase No</TableHead>
                    <TableHead className="text-white">Supplier</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Total</TableHead>
                    <TableHead className="text-white">Godown</TableHead>
                    <TableHead className="text-white rounded-tr-lg">Received By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.length > 0 ? (
                    <>
                      {filteredPurchases.map((purchase) => (
                        <TableRow key={purchase.id} className="hover:bg-sidebar/10">
                          <TableCell className="font-medium">{purchase.purchase_no}</TableCell>
                          <TableCell>{purchase.supplier_name}</TableCell>
                          <TableCell>{format(new Date(purchase.date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(purchase.total)}
                          </TableCell>
                          <TableCell>{purchase.godown || "-"}</TableCell>
                          <TableCell>{purchase.received_by || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-sidebar/20">
                        <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0))}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No purchase data found
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

export default PurchaseReport;
