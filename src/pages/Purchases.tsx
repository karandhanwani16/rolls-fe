
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { purchasesAPI } from "@/services/api";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TableToolbar } from "@/components/ui/table-toolbar";

type Purchase = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  date: string;
  purchase_no: string;
  total: number;
  description?: string;
  godown?: string;
  transport?: string;
  transport_charges?: number;
  received_by?: string;
  credit_days?: number;
  remaining_amount?: number;
  payment_status?: string;
  overdue_days?: number;
  items?: unknown[];
  created_at: string;
  updated_at: string;
};

const Purchases = () => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);

  // Fetch purchases data
  const { 
    data: purchasesData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const response = await purchasesAPI.getAll();
      return response.data;
    }
  });

  const searchFns = useMemo(
    () => [
      (purchase: Purchase) => purchase.purchase_no,
      (purchase: Purchase) => purchase.supplier_name,
      (purchase: Purchase) => purchase.description,
    ],
    []
  );

  const getSortValue = useMemo(
    () => (purchase: Purchase, key: string) => {
      switch (key) {
        case "purchase_no":
          return purchase.purchase_no;
        case "supplier_name":
          return purchase.supplier_name;
        case "date":
          return purchase.date ? new Date(purchase.date) : null;
        case "total":
          return purchase.total;
        case "remaining_amount":
          return (
            purchase.remaining_amount ??
            (purchase.payment_status === "FULL" ? 0 : purchase.total)
          );
        case "overdue_days":
          return purchase.overdue_days ?? 0;
        case "rolls":
          return purchase.items?.length ?? 0;
        default:
          return null;
      }
    },
    []
  );

  const filters = useMemo(
    () => [
      {
        key: "payment_status",
        label: "Payment Status",
        options: [
          { value: "paid", label: "Paid" },
          { value: "outstanding", label: "Outstanding" },
        ],
        predicate: (purchase: Purchase, value: string) => {
          if (value === "paid") return purchase.payment_status === "FULL";
          if (value === "outstanding") return purchase.payment_status !== "FULL";
          return true;
        },
      },
      {
        key: "overdue",
        label: "Overdue",
        options: [{ value: "overdue", label: "Overdue" }],
        predicate: (purchase: Purchase, value: string) => {
          if (value === "overdue") {
            return (
              (purchase.overdue_days || 0) > 0 &&
              purchase.payment_status !== "FULL"
            );
          }
          return true;
        },
      },
    ],
    []
  );

  const {
    searchTerm,
    setSearchTerm,
    sort,
    toggleSort,
    setFilter,
    clearFilters,
    hasActiveFilters,
    filterDefs,
    rows,
  } = useTableControls({
    data: purchasesData,
    searchFns,
    getSortValue,
    filters,
    defaultSort: { key: "date", direction: "desc" },
  });

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;
    
    try {
      await purchasesAPI.delete(purchaseToDelete);
      toast({
        title: "Purchase deleted",
        description: "The purchase has been successfully deleted.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    }
  };

  const handleDelete = (id: string) => {
    setPurchaseToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4">
          <p className="text-red-500">Error loading purchases data. Please try again.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Purchases</h1>
            <p className="text-muted-foreground">Manage your purchase records</p>
          </div>
          <Button 
            className="mt-4 md:mt-0" 
            onClick={() => navigate("/purchases/new")}
          >
            <Plus className="mr-2 h-4 w-4" /> New Purchase
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Purchase Records</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${rows.length} purchases found`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <TableToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search purchases..."
              filters={filterDefs}
              onFilterChange={setFilter}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader
                      label="Purchase #"
                      sortKey="purchase_no"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Supplier"
                      sortKey="supplier_name"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Date"
                      sortKey="date"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Rolls"
                      sortKey="rolls"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className="text-right"
                    />
                    <SortableHeader
                      label="Amount"
                      sortKey="total"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className="text-right"
                    />
                    <SortableHeader
                      label="Outstanding"
                      sortKey="remaining_amount"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className="text-right"
                    />
                    <SortableHeader
                      label="Overdue Days"
                      sortKey="overdue_days"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                      className="text-right"
                    />
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6">
                        Loading purchases data...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6">
                        No purchases found. Create your first purchase by clicking "New Purchase" above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((purchase: Purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.purchase_no}
                        </TableCell>
                        <TableCell>{purchase.supplier_name}</TableCell>
                        <TableCell>
                          {format(new Date(purchase.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {purchase.items?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{purchase.total.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          {purchase.payment_status === "FULL" ? (
                            <span className="text-green-600">Paid</span>
                          ) : (
                            `₹${(purchase.remaining_amount ?? purchase.total).toLocaleString('en-IN')}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {purchase.payment_status === "FULL" ? (
                            "—"
                          ) : (purchase.overdue_days || 0) > 0 ? (
                            <span className="text-red-600 font-medium">
                              {purchase.overdue_days} days
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {purchase.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => navigate(`/purchases/${purchase.id}`)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => navigate(`/purchases/edit/${purchase.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(purchase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this purchase? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Purchases;
