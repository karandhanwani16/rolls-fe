import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface PurchaseItemRowProps {
  item: any;
  index: number;
  products: any[];
  handleItemChange: (index: number, field: string, value: any) => void;
  handleProductChange: (index: number, productId: string) => void;
  removeItem: (index: number) => void;
  setRef: (field: string, index: number) => (element: HTMLInputElement | null) => void;
  createKeyDownHandler: (
    index: number,
    field: string
  ) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const PurchaseItemRow = ({
  item,
  index,
  products,
  handleItemChange,
  handleProductChange,
  removeItem,
  setRef,
  createKeyDownHandler,
}: PurchaseItemRowProps) => {
  const [metersInput, setMetersInput] = useState(item.meters.toString());
  const [priceInput, setPriceInput] = useState(item.price.toString());

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: string
  ) => {
    createKeyDownHandler(index, field)(e);
  };

    const handleNumericChange = (value: string, field: "meters" | "price") => {
      // If the value is empty or just a minus sign, keep it as is
      if (value === "" || value === "-") {
        if (field === "meters") {
          setMetersInput(value);
        } else {
          setPriceInput(value);
        }
        handleItemChange(index, field, 0);
        return;
      }

      // Try to parse the number
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        if (field === "meters") {
          setMetersInput(value);
        } else {
          setPriceInput(value);
        }
        handleItemChange(index, field, numValue);
      }
    };

    const handleNumericBlur = (field: "meters" | "price") => {
      const value = field === "meters" ? metersInput : priceInput;
      if (value === "" || value === "-") {
        if (field === "meters") {
          setMetersInput("0");
        } else {
          setPriceInput("0");
        }
        handleItemChange(index, field, 0);
      }
    };

    const handleNumericFocus = (field: "meters" | "price") => {
      const value = field === "meters" ? metersInput : priceInput;
      if (value === "0") {
        if (field === "meters") {
          setMetersInput("");
        } else {
          setPriceInput("");
        }
      }
    };

    useEffect(() => {
      setPriceInput(item.price.toString());
    }, [item.price]);

    useEffect(() => {
      setMetersInput(item.meters.toString());
    }, [item.meters]);

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <Select
            value={item.product_id}
            onValueChange={(value) => handleProductChange(index, value)}
          >
            <SelectTrigger className="w-full focus:ring-brand-teal">
              <SelectValue placeholder="Select product..." />
            </SelectTrigger>
            <SelectContent>
              {products && Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No products available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <Input
            ref={setRef("roll_no", index)}
            value={item.roll_no}
            onChange={(e) => handleItemChange(index, "roll_no", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "roll_no")}
            placeholder="Enter roll number"
            className="focus-visible:ring-brand-teal"
            required
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <Input
            ref={setRef("meters", index)}
            type="text"
            inputMode="decimal"
            value={metersInput}
            onChange={(e) => handleNumericChange(e.target.value, "meters")}
            onBlur={() => handleNumericBlur("meters")}
            onFocus={() => handleNumericFocus("meters")}
            onKeyDown={(e) => handleKeyDown(e, "meters")}
            placeholder="0.00"
            className="focus-visible:ring-brand-teal"
            required
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <Input
            ref={setRef("price", index)}
            type="text"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => handleNumericChange(e.target.value, "price")}
            onBlur={() => handleNumericBlur("price")}
            onFocus={() => handleNumericFocus("price")}
            onKeyDown={(e) => handleKeyDown(e, "price")}
            placeholder="0.00"
            className="focus-visible:ring-brand-teal"
            required
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <Input
            type="number"
            value={item?.total_price?.toFixed(2)}
            readOnly
            className="bg-gray-50 font-medium text-brand-teal"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <Button
            type="button"
            onClick={() => removeItem(index)}
            variant="ghost"
            size="sm"
            className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );
};

export default PurchaseItemRow;
