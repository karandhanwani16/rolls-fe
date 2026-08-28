import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Plus, Search, Edit, Trash2, Calendar } from "lucide-react";
import { paymentsOutAPI, suppliersAPI } from "@/services/api";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";

// Form schema
const paymentOutSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  amount: z.coerce.number().min(1, "Amount is required"),
  description: z.string().optional().nullable(),
  type: z.string().min(1, "Payment type is required"),
  cheque_date: z.date().optional().nullable(),
  payment_date: z.date({
    required_error: "Payment date is required",
  }),
});

type PaymentOutFormValues = z.infer<typeof paymentOutSchema>;

// Payment types
const paymentTypes = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" }
];

const PaymentsOut = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPaymentOut, setCurrentPaymentOut] = useState<any>(null);

  const queryClient = useQueryClient();

  // Load data
  const { data: paymentsOutData, isLoading: isLoadingPaymentsOut } = useQuery({
    queryKey: ['paymentsOut'],
    queryFn: async () => {
      const response = await paymentsOutAPI.getAll();
      return response.data;
    }
  });


  const { data: suppliersData, isLoading: isLoadingSuppliers, error: suppliersError } = useQuery({
    queryKey: ['suppliers-payments-out'],
    queryFn: async () => {
      const response = await suppliersAPI.getAll();
      return response;
    }
  });

  // Mutations
  const addPaymentOutMutation = useMutation({
    mutationFn: (data: PaymentOutFormValues) => paymentsOutAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsOut'] });
      toast({
        title: "Payment Out Added",
        description: "Payment out has been successfully added.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error adding payment out:", error);
      toast({
        title: "Error",
        description: "Failed to add payment out.",
        variant: "destructive",
      });
    },
  });

  const updatePaymentOutMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentOutFormValues }) =>
      paymentsOutAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsOut'] });
      toast({
        title: "Payment Out Updated",
        description: "Payment out has been successfully updated.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating payment out:", error);
      toast({
        title: "Error",
        description: "Failed to update payment out.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentOutMutation = useMutation({
    mutationFn: (id: string) => paymentsOutAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsOut'] });
      toast({
        title: "Payment Out Deleted",
        description: "Payment out has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting payment out:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment out.",
        variant: "destructive",
      });
    },
  });

  // Form
  const addForm = useForm<PaymentOutFormValues>({
    resolver: zodResolver(paymentOutSchema),
    defaultValues: {
      supplier_id: "",
      amount: 0,
      type: "",
      description: "",
      cheque_date: null,
      payment_date: new Date(),
    },
  });

  const editForm = useForm<PaymentOutFormValues>({
    resolver: zodResolver(paymentOutSchema),
    defaultValues: {
      supplier_id: "",
      amount: 0,
      type: "",
      description: "",
      cheque_date: null,
      payment_date: new Date(),
    },
  });

  // Watch form values to show/hide cheque date field
  const addFormType = addForm.watch("type");
  const editFormType = editForm.watch("type");

  // Filter payments
  const filteredPayments = paymentsOutData?.filter((payment: any) => {
    return payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle edit button click
  const handleEdit = (payment: any) => {
    setCurrentPaymentOut(payment);
    editForm.reset({
      supplier_id: payment.supplier_id,
      amount: payment.amount,
      type: payment.type,
      description: payment.description || "",
      cheque_date: payment.cheque_date ? new Date(payment.cheque_date) : null,
      payment_date: payment.payment_date ? new Date(payment.payment_date) : new Date(),
    });
    setIsEditDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <CreditCard className="mr-2" /> Payments Out
          </h1>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-brand-teal hover:bg-teal-700"
          >
            <Plus className="mr-1 h-4 w-4" /> New Payment Out
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Cheque Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPaymentsOut ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments?.length > 0 ? (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.supplier?.name || "N/A"}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="capitalize">{payment.type}</TableCell>
                      <TableCell>
                        {payment.payment_date
                          ? format(new Date(payment.payment_date), 'dd/MM/yyyy')
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {payment.cheque_date
                          ? format(new Date(payment.cheque_date), 'dd/MM/yyyy')
                          : "N/A"}
                      </TableCell>
                      <TableCell>{payment.description || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this payment?")) {
                                deletePaymentOutMutation.mutate(payment.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No payments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Payment Out</DialogTitle>
          </DialogHeader>

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((data) => addPaymentOutMutation.mutate(data))}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={addForm.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSuppliers ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : suppliersError ? (
                            <SelectItem value="error">Error loading suppliers</SelectItem>
                          ) : (
                            suppliersData?.map((supplier: any) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Type <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {addFormType === 'cheque' && (
                  <FormField
                    control={addForm.control}
                    name="cheque_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cheque Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={
                                  "pl-3 text-left font-normal flex justify-between items-center"
                                }
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={addForm.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter payment description"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={addPaymentOutMutation.isPending}>
                  {addPaymentOutMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Out</DialogTitle>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) =>
              updatePaymentOutMutation.mutate({ id: currentPaymentOut.id, data })
            )}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={editForm.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingSuppliers ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : suppliersError ? (
                            <SelectItem value="error">Error loading suppliers</SelectItem>
                          ) : (
                            suppliersData?.map((supplier: any) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                      <FormLabel>Payment Type <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editFormType === 'cheque' && (
                  <FormField
                    control={editForm.control}
                    name="cheque_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cheque Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={
                                  "pl-3 text-left font-normal flex justify-between items-center"
                                }
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={editForm.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
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
                          placeholder="Enter payment description"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={updatePaymentOutMutation.isPending}>
                  {updatePaymentOutMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PaymentsOut;
