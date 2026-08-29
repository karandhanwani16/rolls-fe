import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { salesAPI } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingBag,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  Printer,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { downloadSalePdf } from "@/lib/downloadSalePdf";

const Sales = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast: toastNotification } = useToast();
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll();
      setSales(response.data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toastNotification({
        title: "Error",
        description: "Failed to fetch sales data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await salesAPI.delete(id);
      toast.success("Sale deleted successfully");
      fetchSales();
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Failed to delete sale");
    }
  };

  const handleViewSale = async (id: string) => {
    try {
      const response = await salesAPI.getById(id);
      setSelectedSale(response);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching sale details:", error);
      toast.error("Failed to fetch sale details");
    }
  };

  const handleDownloadDocument = async (
    id: string,
    type: "bill" | "challan"
  ) => {
    try {
      toast.info(
        type === "challan"
          ? "Generating challan PDF..."
          : "Generating sales bill PDF..."
      );

      const sale = sales.find((s) => s.id === id) || selectedSale;
      if (!sale) {
        throw new Error("Sale not found");
      }

      await downloadSalePdf(id, sale.sales_no, type);

      toast.success(
        type === "challan"
          ? "Challan downloaded successfully"
          : "Sales bill downloaded successfully"
      );
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error(
        type === "challan"
          ? "Failed to download challan"
          : "Failed to download sales bill"
      );
    }
  };

  const filteredSales = sales.filter(
    (sale) =>
      sale.sales_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <ShoppingBag className="mr-2" /> Sales
          </h1>
          <Button onClick={() => navigate("/sales/new")}>
            <Plus className="mr-1 h-4 w-4" /> New Sale
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Description</TableHead>

                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.sales_no}
                        </TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>
                          {format(new Date(sale.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(sale.total)}
                        </TableCell>
                        <TableCell>{sale.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/sales/edit/${sale.id}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewSale(sale.id)}
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadDocument(sale.id, "challan")
                                  }
                                >
                                  <Printer className="mr-2 h-4 w-4" /> Print
                                  Challan
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadDocument(sale.id, "bill")
                                  }
                                >
                                  <FileText className="mr-2 h-4 w-4" /> Print
                                  Sales Bill
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSale(sale.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No sales found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* View Sale Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details - {selectedSale?.sales_no}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedSale.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.date), "dd MMMM yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Challan No</p>
                  <p className="font-medium">
                    {selectedSale.challan_no || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transport Charges</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 2,
                    }).format(selectedSale.transport_charges || 0)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Items</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Shade</TableHead>
                        <TableHead className="text-right">Meters</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.roll_no || "-"}</TableCell>
                            <TableCell>{item.shade || "-"}</TableCell>
                            <TableCell className="text-right">
                              {item.meters.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{item.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{(item.total_price ?? item.total)?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No items found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  {selectedSale.description && (
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p>{selectedSale.description}</p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(selectedSale.total)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    handleDownloadDocument(selectedSale.id, "challan")
                  }
                >
                  <Printer className="mr-1 h-4 w-4" /> Print Challan
                </Button>
                <Button
                  onClick={() =>
                    handleDownloadDocument(selectedSale.id, "bill")
                  }
                >
                  <FileText className="mr-1 h-4 w-4" /> Print Sales Bill
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Sales;
