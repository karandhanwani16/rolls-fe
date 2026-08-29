import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Edit, Trash2, ArrowUpDown, Undo2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { salesReturnsAPI } from "@/services/api";

const SalesReturns = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sales-returns"],
    queryFn: async () => {
      const response = await salesReturnsAPI.getAll();
      return response.data;
    },
  });

  const filtered = data?.filter((item: any) => {
    const q = searchTerm.toLowerCase();
    return (
      item.customer_name?.toLowerCase().includes(q) ||
      item.return_no?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await salesReturnsAPI.delete(deleteId);
      toast({ title: "Sales return deleted" });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to delete sales return", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 text-red-500">Error loading sales returns.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Undo2 className="h-6 w-6" /> Sales Returns
            </h1>
            <p className="text-muted-foreground">Goods returned by customers</p>
          </div>
          <Button className="mt-4 md:mt-0" onClick={() => navigate("/sales-returns/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Sales Return
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <CardTitle>Sales Return Records</CardTitle>
                <CardDescription>
                  {isLoading ? "Loading..." : `${filtered?.length || 0} returns found`}
                </CardDescription>
              </div>
              <div className="mt-4 md:mt-0 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search returns..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                        Return # <ArrowUpDown className="ml-1 h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">Loading...</TableCell>
                    </TableRow>
                  ) : filtered?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        No sales returns found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.return_no}</TableCell>
                        <TableCell>{item.customer_name}</TableCell>
                        <TableCell>{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">₹{item.total.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{item.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => navigate(`/sales-returns/edit/${item.id}`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setDeleteId(item.id)}>
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

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Sales Return</AlertDialogTitle>
              <AlertDialogDescription>
                This will put returned stock back to sold status. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default SalesReturns;
