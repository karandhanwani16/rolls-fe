import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BulkProductAdderProps {
  products: any[];
  onAddBulk: (productId: string, count: number) => void;
}

const BulkProductAdder = ({ products, onAddBulk }: BulkProductAdderProps) => {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [rollCount, setRollCount] = useState(1);
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (selectedProduct && rollCount > 0) {
      onAddBulk(selectedProduct, rollCount);
      setRollCount(1);
      setSelectedProduct("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto bg-white hover:bg-teal-50 border-brand-teal text-brand-teal"
        >
          <Plus className="h-4 w-4 mr-2" />
          Bulk Add Products
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Add Products</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="product">Select Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.grade_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rollCount">Number of Rolls</Label>
            <Input
              id="rollCount"
              type="number"
              min="1"
              value={rollCount === 0 ? "" : rollCount.toString()}
              onFocus={() => {
                if (rollCount === 1) setRollCount(0); // Show empty if it's the default
              }}
              onBlur={() => {
                if (!rollCount || rollCount < 1) {
                  setRollCount(1);
                }
              }}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty input (user clearing input)
                if (value === "") {
                  setRollCount(0);
                } else {
                  const num = parseInt(value);
                  setRollCount(isNaN(num) ? 0 : num);
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-brand-teal hover:bg-teal-700 text-white"
            disabled={!selectedProduct || rollCount < 1}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rolls
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkProductAdder; 