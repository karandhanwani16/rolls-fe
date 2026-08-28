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
import { gradesAPI } from "@/services/api";

// Grade type definition
type Grade = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

// Grade form schema
const gradeFormSchema = z.object({
  name: z.string().min(1, "Grade name is required"),
});

type GradeFormValues = z.infer<typeof gradeFormSchema>;

const Grades = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const editForm = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!isAddDialogOpen) {
      form.reset();
    }
  }, [isAddDialogOpen, form]);

  useEffect(() => {
    if (selectedGrade && isEditDialogOpen) {
      editForm.reset({
        name: selectedGrade.name,
      });
    }
  }, [selectedGrade, isEditDialogOpen, editForm]);

  const {
    data: grades,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      return gradesAPI.getAll();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching grades",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredGrades = grades?.filter((grade) =>
    grade.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = async (values: GradeFormValues) => {
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
      await gradesAPI.create(values);
      toast({
        title: "Grade added",
        description: "The grade has been added successfully.",
      });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error adding grade",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (values: GradeFormValues) => {
    if (!selectedGrade || !user) {
      toast({
        title: "Error",
        description: "Invalid grade selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await gradesAPI.update(selectedGrade.id, values);
      toast({
        title: "Grade updated",
        description: "The grade has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedGrade(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error updating grade",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGrade || !user) {
      toast({
        title: "Error",
        description: "Invalid grade selected or authentication required",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await gradesAPI.delete(selectedGrade.id);
      toast({
        title: "Grade deleted",
        description: "The grade has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedGrade(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error deleting grade",
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
            <FileText className="mr-2" /> Grades
          </h1>
          <Button
            className="bg-brand-teal hover:bg-teal-700"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Grade
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search grades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading grades...
                    </TableCell>
                  </TableRow>
                ) : filteredGrades.length > 0 ? (
                  filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">
                        {grade.name}
                      </TableCell>
                      <TableCell>
                        {new Date(grade.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(grade.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              setSelectedGrade(grade);
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
                              setSelectedGrade(grade);
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
                      No grades found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Grade Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Grade</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter grade name" />
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

      {/* Edit Grade Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grade</DialogTitle>
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
                    <FormLabel>Grade Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter grade name" />
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

      {/* Delete Grade Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Grade</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the grade "
            {selectedGrade?.name}"? This action cannot be undone.
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

export default Grades;
