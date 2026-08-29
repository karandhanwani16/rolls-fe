import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Package, Plus, Search, Edit, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { productsAPI } from "@/services/api";

// Product type definition
type Product = {
  id: string;
  name: string;
  description: string | null;
  width: string | null;
  price: number | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

// Product form schema
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().nullable(),
  width: z.string().nullable(),
  price: z.coerce.number().nullable(),
  color: z.string().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      width: "",
      price: 0,
      color: "",
    },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      color: "",
      width: "",
    },
  });

  useEffect(() => {
    if (!isAddDialogOpen) {
      form.reset();
    }
  }, [isAddDialogOpen, form]);

  useEffect(() => {
    if (selectedProduct && isEditDialogOpen) {
      editForm.reset({
        name: selectedProduct.name,
        description: selectedProduct.description,
        price: selectedProduct.price,
        color: selectedProduct.color,
        width: selectedProduct.width,
      });
    }
  }, [selectedProduct, isEditDialogOpen, editForm]);

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      return productsAPI.getAll();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching products",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = async (values: ProductFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to perform this action",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await productsAPI.create(values as { 
        name: string; 
        description?: string;
        price?: number;
        color?: string;
        width?: string;
      });
      toast({
        title: "Product added",
        description: "The product has been added successfully.",
      });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error adding product",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onEditSubmit = async (values: ProductFormValues) => {
    if (!selectedProduct || !user) {
      toast({
        title: "Error",
        description: "Invalid product selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await productsAPI.update(selectedProduct.id, values as { 
        name: string; 
        description?: string;
        price?: number;
        color?: string;
        width?: string;
      });
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error updating product",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct || !user) {
      toast({
        title: "Error",
        description: "Invalid product selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await productsAPI.delete(selectedProduct.id);
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error deleting product",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Package className="mr-2" /> Products
          </h1>
          <Button
            className="bg-brand-teal hover:bg-teal-700"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Product
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Width</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.description || "N/A"}</TableCell>
                      <TableCell>{product.width || "N/A"}</TableCell>
                      <TableCell>{product.price ? `₹${product.price.toFixed(2)}` : "N/A"}</TableCell>
                      <TableCell>
                        {product.color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: product.color }}
                            />
                            {product.color}
                          </div>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(product.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(product.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Width" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter price" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter color (e.g. Red, Blue, #FF0000)" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Width" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter price" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter color (e.g. Red, Blue, #FF0000)" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>{loading ? "Updating..." : "Update"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the product "
            {selectedProduct?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Products; 