import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Users, Plus, Search, Mail, Phone, FileText, Edit, Trash, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { customersAPI } from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  description: string | null;
  city: string | null;
  type: string | null;
  opening_balance: number;
  opening_balance_date: string | null;
  credit_days: number;
  created_at: string;
  updated_at: string;
  // Frontend-only properties
  invoices?: number;
  totalSpent?: number;
};

// Customer form schema
const customerFormSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().nullable(),
  description: z.string().nullable(),
  city: z.string().nullable(),
  type: z.string().nullable(),
  opening_balance: z.coerce.number().default(0),
  opening_balance_date: z.string().nullable(),
  credit_days: z.coerce.number().int().min(0).default(0),
}).refine(
  (data) => data.opening_balance === 0 || (data.opening_balance_date && data.opening_balance_date.length > 0),
  {
    message: "Opening balance date is required when opening balance is set",
    path: ["opening_balance_date"],
  }
);

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      description: "",
      city: "",
      type: "",
      opening_balance: 0,
      opening_balance_date: "",
      credit_days: 0,
    },
  });

  const editForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      description: "",
      city: "",
      type: "",
      opening_balance: 0,
      opening_balance_date: "",
      credit_days: 0,
    },
  });

  useEffect(() => {
    if (!isAddDialogOpen) {
      form.reset();
    }
  }, [isAddDialogOpen, form]);

  useEffect(() => {
    if (selectedCustomer && isEditDialogOpen) {
      editForm.reset({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        description: selectedCustomer.description,
        city: selectedCustomer.city,
        type: selectedCustomer.type,
        opening_balance: selectedCustomer.opening_balance ?? 0,
        opening_balance_date: selectedCustomer.opening_balance_date
          ? selectedCustomer.opening_balance_date.slice(0, 10)
          : "",
        credit_days: selectedCustomer.credit_days ?? 0,
      });
    }
  }, [selectedCustomer, isEditDialogOpen, editForm]);

  const { data: customers, isLoading, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        const response = await customersAPI.getAll();
        // Check if the response has a data property (common API response structure)
        const data = response.data || response;


        return data.map((customer: Customer) => ({
          ...customer
        }));
      } catch (error: any) {
        console.error("Error fetching customers:", error);
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch customers");
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching customers",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredCustomers = customers?.filter(customer => {
    return (
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to perform this action",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const backendData = {
        customer_name: values.name,
        customer_phone: values.phone,
        customer_description: values.description,
        customer_city: values.city,
        customer_type: values.type,
        opening_balance: values.opening_balance,
        opening_balance_date: values.opening_balance_date || null,
        credit_days: values.credit_days || 0,
      };
      await customersAPI.create(backendData);
      toast({
        title: "Customer added",
        description: "The customer has been added successfully.",
      });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error adding customer",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (values: CustomerFormValues) => {
    if (!selectedCustomer || !user) {
      toast({
        title: "Error",
        description: "Invalid customer selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const backendData = {
        customer_name: values.name,
        customer_phone: values.phone,
        customer_description: values.description,
        customer_city: values.city,
        customer_type: values.type,
        opening_balance: values.opening_balance,
        opening_balance_date: values.opening_balance_date || null,
        credit_days: values.credit_days || 0,
      };
      await customersAPI.update(selectedCustomer.id, backendData);
      toast({
        title: "Customer updated",
        description: "The customer has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error updating customer",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer || !user) {
      toast({
        title: "Error",
        description: "Invalid customer selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await customersAPI.delete(selectedCustomer.id);
      toast({
        title: "Customer deleted",
        description: "The customer has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error deleting customer",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Users className="mr-2" /> Customers
          </h1>
          <Button
            className="bg-brand-teal hover:bg-teal-700"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Credit Days</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="capitalize">{customer.type || "N/A"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" /> {customer.phone}
                            </div>
                          )}

                        </div>
                      </TableCell>
                      <TableCell>{customer.city && (
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1" /> {customer.city}
                        </div>
                      )}</TableCell>
                      <TableCell>
                        {customer.opening_balance ? (
                          <div className="text-sm">
                            <div>{formatCurrency(customer.opening_balance)}</div>
                            {customer.opening_balance_date && (
                              <div className="text-xs text-muted-foreground">
                                as on {customer.opening_balance_date.slice(0, 10)}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{customer.credit_days ?? 0}</TableCell>
                      <TableCell>{customer.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* <Button size="sm" variant="outline" className="h-8">
                            <FileText className="h-4 w-4 mr-1" /> View Invoices
                          </Button> */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              setSelectedCustomer(customer);
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
                              setSelectedCustomer(customer);
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
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter customer name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="watav">Watav</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter phone number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="opening_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="opening_balance_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credit_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        placeholder="0"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Enter description"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
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
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter customer name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="watav">Watav</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter phone number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="opening_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="opening_balance_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="credit_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        placeholder="0"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Enter description"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the customer "
            {selectedCustomer?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Customers;
