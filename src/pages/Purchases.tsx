
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  ArrowUpDown 
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  created_at: string;
  updated_at: string;
};

const Purchases = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filter purchases based on search term
  const filteredPurchases = purchasesData?.filter((purchase: Purchase) => {
    const searchString = searchTerm.toLowerCase();
    return (
      purchase.supplier_name.toLowerCase().includes(searchString) ||
      purchase.purchase_no.toLowerCase().includes(searchString) ||
      (purchase.description && purchase.description.toLowerCase().includes(searchString))
    );
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
            <div className="flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <CardTitle>Purchase Records</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${filteredPurchases?.length || 0} purchases found`}
                </CardDescription>
              </div>
              <div className="mt-4 md:mt-0 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search purchases..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center">
                        Purchase # <ArrowUpDown className="ml-1 h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        Loading purchases data...
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        No purchases found. Create your first purchase by clicking "New Purchase" above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases?.map((purchase: Purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.purchase_no}
                        </TableCell>
                        <TableCell>{purchase.supplier_name}</TableCell>
                        <TableCell>
                          {format(new Date(purchase.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{purchase.total.toLocaleString('en-IN')}
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
