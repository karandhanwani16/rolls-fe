import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format as formatDate } from "date-fns";
import {
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover as CommandPopover,
  PopoverContent as CommandPopoverContent,
  PopoverTrigger as CommandPopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { stockReportAPI, productsAPI, customersAPI } from "@/services/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import html2pdf from 'html2pdf.js';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  color: string | null;
  width: string | null;
}

interface StockItem {
  srNo: number;
  product_name: string;
  roll_no: string;
  meters: number;
  unit?: string;
  price: number;
  godown: string;
}

const StockReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchStockData();
  }, [selectedProducts]);


  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const fetchStockData = async () => {

    setLoading(true);
    try {
      const response = await stockReportAPI.getStockData(
        selectedProducts.map(p => p.id)
      );
      setStockData(response.data || []);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter stock data based on search query
  const filteredStockData = stockData.filter(item =>
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.godown.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.meters.toString().includes(searchQuery)
  );

  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx') => {

    try {
      if (format === 'pdf') {
        // Create HTML content for PDF
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
              .header { text-align: center; font-size: 24px; margin-bottom: 20px; }
              .date-range { text-align: center; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">Stock Report</div>
            <table>
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Product Name</th>
                  <th>Roll No.</th>
                  <th>Quantity</th>
                  <th>Godown</th>
                </tr>
              </thead>
              <tbody>
                ${stockData.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.product_name}</td>
                    <td>${item.roll_no}</td>
                    <td>${item.meters} ${item.unit || 'm'}</td>
                    <td>${item.godown}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;

        // Create a temporary div to hold the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        // Generate PDF
        const options = {
          margin: 10,
          filename: `stock-report-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(options).from(tempDiv).save();

        // Clean up
        document.body.removeChild(tempDiv);
      } else {
        // Handle other export formats (CSV, XLSX)
        const response = await fetch(`/api/stock/export/${format}?${new URLSearchParams({
          productIds: selectedProducts.map(p => p.id).join(',')
        })}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-report.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast({
        title: "Success",
        description: `Stock report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export stock data. Please try again.',
        variant: 'destructive'
      });
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Report</h1>
            <p className="text-muted-foreground">View and analyze stock details</p>
          </div>

        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-2 mt-2">
                <Input
                  type="text"
                  placeholder="Search by product name, roll number, or godown"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[300px]"
                />
                <CommandPopover open={productOpen} onOpenChange={setProductOpen}>
                  <CommandPopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productOpen}
                      className="w-[240px] justify-between"
                    >
                      {selectedProducts.length > 0
                        ? `${selectedProducts.length} product(s) selected`
                        : "Select products..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </CommandPopoverTrigger>
                  <CommandPopoverContent className="w-[240px] p-0">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {products && products.map((product) => (
                          <CommandItem
                            key={product.id}
                            onSelect={() => {
                              setSelectedProducts((current) =>
                                current.some((p) => p.id === product.id)
                                  ? current.filter((p) => p.id !== product.id)
                                  : [...current, product]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProducts.some((p) => p.id === product.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {product.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </CommandPopoverContent>
                </CommandPopover>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-sidebar ">
                  <TableRow>
                    <TableHead className="text-white rounded-tl-lg rounded-bl-lg">Sr. No.</TableHead>
                    <TableHead className="text-white">Product Name</TableHead>
                    <TableHead className="text-white">Roll No.</TableHead>
                    <TableHead className="text-white">Quantity</TableHead>
                    <TableHead className="text-white rounded-tr-lg rounded-br-lg">Godown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockData.map((item, index) => (
                    <TableRow className="hover:bg-sidebar/10 hover:cursor-pointer" key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.roll_no}</TableCell>
                      <TableCell>{item.meters} {item.unit || "m"}</TableCell>
                      <TableCell>{item.godown}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StockReport; 