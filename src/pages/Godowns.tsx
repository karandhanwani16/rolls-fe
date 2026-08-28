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
import { FileText, Plus, Search, Edit, Trash, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { godownsAPI } from "@/services/api";

// Godown type definition
type Godown = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

// Godown form schema
const godownFormSchema = z.object({
  godown_name: z.string().min(1, "Godown name is required"),
});

type GodownFormValues = z.infer<typeof godownFormSchema>;

const Godowns = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGodown, setSelectedGodown] = useState<Godown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<GodownFormValues>({
    resolver: zodResolver(godownFormSchema),
    defaultValues: {
      godown_name: "",
    },
  });

  const editForm = useForm<GodownFormValues>({
    resolver: zodResolver(godownFormSchema),
    defaultValues: {
      godown_name: "",
    },
  });

  useEffect(() => {
    if (!isAddDialogOpen) {
      form.reset();
    }
  }, [isAddDialogOpen, form]);

  useEffect(() => {
    if (selectedGodown && isEditDialogOpen) {
      editForm.reset({
        godown_name: selectedGodown.name,
      });
    }
  }, [selectedGodown, isEditDialogOpen, editForm]);

  const {
    data: godowns,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["godowns"],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      return godownsAPI.getAll();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching godowns",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredGodowns = godowns?.filter((godown) => {
    return godown.name.toLowerCase().includes(searchTerm.toLowerCase())
  }
  ) || [];

  const onSubmit = async (values: GodownFormValues) => {
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
      await godownsAPI.create(values);
      toast({
        title: "Godown added",
        description: "The godown has been added successfully.",
      });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error adding godown",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (values: GodownFormValues) => {
    if (!selectedGodown || !user) {
      toast({
        title: "Error",
        description: "Invalid godown selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await godownsAPI.update(selectedGodown.id, values);
      toast({
        title: "Godown updated",
        description: "The godown has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedGodown(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error updating godown",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGodown || !user) {
      toast({
        title: "Error",
        description: "Invalid godown selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await godownsAPI.delete(selectedGodown.id);
      toast({
        title: "Godown deleted",
        description: "The godown has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedGodown(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error deleting godown",
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
            <FileText className="mr-2" /> Godowns
          </h1>
          <Button
            className="bg-brand-teal hover:bg-teal-700"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Godown
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search godowns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Godown Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading godowns...
                    </TableCell>
                  </TableRow>
                ) : filteredGodowns.length > 0 ? (
                  filteredGodowns.map((godown) => (
                    <TableRow key={godown.godown_id}>
                      <TableCell className="font-medium">
                        {godown.name}
                      </TableCell>
                      <TableCell>
                        {new Date(godown.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(godown.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              setSelectedGodown(godown);
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
                              setSelectedGodown(godown);
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
                    <TableCell colSpan={4} className="h-24 text-center">
                      No godowns found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Godown Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Godown</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="godown_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Godown Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter godown name" />
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

      {/* Edit Godown Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Godown</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="godown_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Godown Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter godown name" />
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

      {/* Delete Godown Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Godown</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the godown "
            {selectedGodown?.name}"? This action cannot be undone.
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

export default Godowns;
