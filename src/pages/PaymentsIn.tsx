import { useState, useEffect } from "react";
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
import { CreditCard, Plus, Search, Edit, Trash2 } from "lucide-react";
import { paymentsInAPI, customersAPI } from "@/services/api";
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
import { cn } from "@/lib/utils";

// Form schema
const paymentInSchema = z.object({
  receive_id: z.string().optional().nullable(),
  actual_id: z.string().min(1, "Customer is required"),
  received_amount: z.coerce.number().min(1, "Received amount is required"),
  actual_amount: z.coerce.number().min(1, "Actual amount is required"),
  charges: z.coerce.number().min(0).optional().nullable(),
  type: z.string().min(1, "Payment type is required"),
  description: z.string().optional().nullable(),
  payment_date: z.date(),
});

type PaymentInFormValues = z.infer<typeof paymentInSchema>;

// Payment types
const paymentTypes = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" }
];

const PaymentsIn = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPaymentIn, setCurrentPaymentIn] = useState<any>(null);
  const [isWatavEntry, setIsWatavEntry] = useState(false);

  const queryClient = useQueryClient();

  // Load data
  const { data: paymentsInData, isLoading: isLoadingPaymentsIn } = useQuery({
    queryKey: ['paymentsIn'],
    queryFn: async () => {
      const response = await paymentsInAPI.getAll();
      return response.data;
    }
  });

  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await customersAPI.getAll();
        return response;
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });


  // Mutations
  const addPaymentInMutation = useMutation({
    mutationFn: (data: PaymentInFormValues) => paymentsInAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsIn'] });
      toast({
        title: "Payment In Added",
        description: "Payment in has been successfully added.",
      });
      setIsAddDialogOpen(false);
      addForm.reset({
        receive_id: "",
        actual_id: "",
        received_amount: 0,
        actual_amount: 0,
        charges: 0,
        type: "",
        description: "",
        payment_date: new Date(),
      });
      setIsWatavEntry(false);
    },
    onError: (error) => {
      console.error("Error adding payment in:", error);
      toast({
        title: "Error",
        description: "Failed to add payment in.",
        variant: "destructive",
      });
    },
  });

  const updatePaymentInMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentInFormValues }) => 
      paymentsInAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsIn'] });
      toast({
        title: "Payment In Updated",
        description: "Payment in has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      editForm.reset({
        receive_id: "",
        actual_id: "",
        received_amount: 0,
        actual_amount: 0,
        charges: 0,
        type: "",
        description: "",
        payment_date: new Date(),
      });
      setIsWatavEntry(false);
    },
    onError: (error) => {
      console.error("Error updating payment in:", error);
      toast({
        title: "Error",
        description: "Failed to update payment in.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentInMutation = useMutation({
    mutationFn: (id: string) => paymentsInAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsIn'] });
      toast({
        title: "Payment In Deleted",
        description: "Payment in has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting payment in:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment in.",
        variant: "destructive",
      });
    },
  });

  // Form
  const addForm = useForm<PaymentInFormValues>({
    resolver: zodResolver(paymentInSchema),
    defaultValues: {
      receive_id: "",
      actual_id: "",
      received_amount: 0,
      actual_amount: 0,
      charges: 0,
      type: "",
      description: "",
      payment_date: new Date(),
    },
  });

  const editForm = useForm<PaymentInFormValues>({
    resolver: zodResolver(paymentInSchema),
    defaultValues: {
      receive_id: "",
      actual_id: "",
      received_amount: 0,
      actual_amount: 0,
      charges: 0,
      type: "",
      description: "",
      payment_date: new Date(),
    },
  });

  // Filter payments
  const filteredPayments = paymentsInData?.filter((payment: any) => {
    return payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.customer_type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle edit button click
  const handleEdit = (payment: any) => {
    setCurrentPaymentIn(payment);
    editForm.reset({
      receive_id: payment.receive_id || undefined,
      actual_id: payment.actual_id || undefined,
      received_amount: payment.received_amount,
      actual_amount: payment.actual_amount,
      charges: payment.charges || 0,
      type: payment.type,
      description: payment.description || "",
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

  // Add this function to calculate actual amount
  const calculateActualAmount = (receivedAmount: number, charges: number = 0) => {
    return receivedAmount - charges;
  };

  // Add this effect to update actual amount when received amount or charges change
  useEffect(() => {
    const receivedAmount = addForm.watch("received_amount");
    const charges = addForm.watch("charges") || 0;
    addForm.setValue("actual_amount", calculateActualAmount(receivedAmount, charges));
  }, [addForm.watch("received_amount"), addForm.watch("charges")]);

  useEffect(() => {
    const receivedAmount = editForm.watch("received_amount");
    const charges = editForm.watch("charges") || 0;
    editForm.setValue("actual_amount", calculateActualAmount(receivedAmount, charges));
  }, [editForm.watch("received_amount"), editForm.watch("charges")]);

  // Add this effect to sync receive_id with actual_id when not in Watav mode
  useEffect(() => {
    if (!isWatavEntry) {
      const actualId = addForm.watch("actual_id");
      addForm.setValue("receive_id", actualId);
    }
  }, [addForm.watch("actual_id"), isWatavEntry]);

  useEffect(() => {
    if (!isWatavEntry) {
      const actualId = editForm.watch("actual_id");
      editForm.setValue("receive_id", actualId);
    }
  }, [editForm.watch("actual_id"), isWatavEntry]);

  console.log("filteredPayments",filteredPayments)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <CreditCard className="mr-2" /> Payments In
          </h1>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-brand-teal hover:bg-teal-700"
          >
            <Plus className="mr-1 h-4 w-4" /> New Payment In
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Watav</TableHead>
                  <TableHead>Received Amount</TableHead>
                  <TableHead>Charges</TableHead>
                  <TableHead>Actual Amount</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPaymentsIn ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments?.length > 0 ? (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.actual_customer?.name || "N/A"}</TableCell>
                      <TableCell>
                        {payment.receive_id === payment.actual_id ? 
                          "-" : 
                          payment.receive_customer?.name || "N/A"
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(payment.received_amount)}</TableCell>
                      <TableCell>{formatCurrency(payment.charges)}</TableCell>
                      <TableCell>{formatCurrency(payment.actual_amount)}</TableCell>
                      <TableCell className="capitalize">{payment.type}</TableCell>
                      <TableCell>
                        {payment.payment_date 
                          ? format(new Date(payment.payment_date), 'dd/MM/yyyy') 
                          : "N/A"}
                      </TableCell>
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
                                deletePaymentInMutation.mutate(payment.id);
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
        <DialogContent className="max-h-[75vh] sm:max-w-[800px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Payment In</DialogTitle>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((data) => addPaymentInMutation.mutate(data))}>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant={isWatavEntry ? "default" : "outline"}
                      onClick={() => setIsWatavEntry(!isWatavEntry)}
                    >
                      {isWatavEntry ? "Normal Entry" : "Make Watav Entry"}
                    </Button>
                  </div>
                </div>

                <FormField
                  control={addForm.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? format(field.value, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {isWatavEntry ? (
                      <>
                        <FormField
                          control={addForm.control}
                          name="receive_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Receive Customer</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={isLoadingCustomers}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select receive customer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingCustomers ? (
                                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                  ) : customersData?.length > 0 ? (
                                    customersData.map((customer: any) => (
                                      <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addForm.control}
                          name="actual_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Actual Customer</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={isLoadingCustomers}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select actual customer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingCustomers ? (
                                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                  ) : customersData?.length > 0 ? (
                                    customersData.map((customer: any) => (
                                      <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      <FormField
                        control={addForm.control}
                        name="actual_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer <span className="text-red-500">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={isLoadingCustomers}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingCustomers ? (
                                  <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                ) : customersData?.length > 0 ? (
                                  customersData.map((customer: any) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="received_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Received Amount <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addForm.control}
                        name="charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Charges</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                value={field.value || 0} 
                                disabled={!isWatavEntry}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={addForm.control}
                      name="actual_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Amount <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
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
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={addPaymentInMutation.isPending}>
                  {addPaymentInMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Edit Payment In</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => 
              updatePaymentInMutation.mutate({ id: currentPaymentIn.id, data })
            )}>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant={isWatavEntry ? "default" : "outline"}
                      onClick={() => setIsWatavEntry(!isWatavEntry)}
                    >
                      {isWatavEntry ? "Normal Entry" : "Make Watav Entry"}
                    </Button>
                  </div>
                </div>

                <FormField
                  control={editForm.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? format(field.value, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {isWatavEntry ? (
                      <>
                        <FormField
                          control={editForm.control}
                          name="receive_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Receive Customer</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={isLoadingCustomers}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select receive customer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingCustomers ? (
                                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                  ) : customersData?.length > 0 ? (
                                    customersData.map((customer: any) => (
                                      <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="actual_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Actual Customer</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={isLoadingCustomers}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select actual customer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingCustomers ? (
                                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                  ) : customersData?.length > 0 ? (
                                    customersData.map((customer: any) => (
                                      <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      <FormField
                        control={editForm.control}
                        name="actual_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer <span className="text-red-500">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={isLoadingCustomers}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingCustomers ? (
                                  <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                ) : customersData?.length > 0 ? (
                                  customersData.map((customer: any) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-customers" disabled>No customers found</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="received_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Received Amount <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Charges</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                value={field.value || 0} 
                                disabled={!isWatavEntry}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="actual_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Amount <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={editForm.control}
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
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={updatePaymentInMutation.isPending}>
                  {updatePaymentInMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PaymentsIn;
