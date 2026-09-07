import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  salesAPI,
  customersAPI,
  productsAPI,
  godownsAPI,
  purchasesAPI,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Printer, FileText } from "lucide-react";
import SalesDetails from "./SalesDetails";
import SalesItems from "./SalesItems";
import SalesActions from "./SalesActions";
import { printSaleDocument } from "@/lib/downloadSalePdf";
import { DEFAULT_QUANTITY_UNIT, normalizeUnit } from "@/lib/quantityUnits";
import { getRegularCustomers } from "@/lib/partyTypes";

interface SalesItem {
  sales_item_id: string;
  sales_id: string;
  product_id: string;
  product_name: string;
  roll_no: string;
  shade?: string;
  roll_id: string;
  purchase_item_id?: string;
  meters: number;
  unit?: string;
  price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
  rolls?: Array<{
    id: string;
    roll_no: string;
    meters: number;
    unit?: string;
    price: number;
  }>;
}

interface SalesFormData {
  sales_no: string;
  sales_date: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  description?: string;
  godown_no?: string;
  challan_no?: string;
  maker?: string;
  transport_charges?: number;
  discount?: number;
  credit_days?: number;
  unit?: string;
  items: SalesItem[];
}

const SalesForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [allRollsPool, setAllRollsPool] = useState<Record<string, any[]>>({});
  const [formData, setFormData] = useState<SalesFormData>({
    sales_no: "",
    sales_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    customer_name: "",
    total_amount: 0,
    maker: "",
    transport_charges: 0,
    discount: 0,
    credit_days: 0,
    unit: DEFAULT_QUANTITY_UNIT,
    items: [],
  });

  // Fetch customers data (exclude Watav vendors — managed separately)
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "for-sales"],
    queryFn: async () => {
      setLoading(true);
      const response = await customersAPI.getAll();
      setLoading(false);
      return getRegularCustomers(response || []);
    },
  });

  // Fetch sale data if editing
  const { data: sale } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => salesAPI.getById(id!),
    enabled: !!id,
  });

  // Keep the sale's current customer in the dropdown even if filtered out (e.g. legacy watav)
  const customersForSelect = useMemo(() => {
    const list = [...(customers || [])];
    const currentId = formData.customer_id;
    if (currentId && !list.some((c: any) => c.id === currentId)) {
      if (sale?.customer?.id === currentId) {
        list.unshift(sale.customer);
      } else {
        list.unshift({
          id: currentId,
          name: formData.customer_name || "Current customer",
        });
      }
    }
    return list;
  }, [customers, formData.customer_id, formData.customer_name, sale]);

  // Fetch godowns data
  const { data: godowns = [] } = useQuery({
    queryKey: ["godowns"],
    queryFn: async () => {
      setLoading(true);
      const response = await godownsAPI.getAll();
      setLoading(false);
      return response;
    },
  });

  // Fetch products data
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      setLoading(true);
      const response = await productsAPI.getAll();
      setLoading(false);
      return response;
    },
  });

  // Create/Update sale mutation
  const saleMutation = useMutation({
    mutationFn: (data: SalesFormData) => {
      setLoading(true);
      return id ? salesAPI.update(id, data) : salesAPI.create(data);
    },
    onSuccess: async (response) => {
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`Sale ${id ? "updated" : "created"} successfully`);
      navigate("/sales");
    },
    onError: (error: any) => {
      setLoading(false);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        `Failed to ${id ? "update" : "create"} sale`;
      toast.error(message);
    },
  });

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        try {
          let response = await salesAPI.getById(id);
          console.log("Loading sale data:", response);

          // First, fetch all rolls for all products in the sale
          const productRolls = await Promise.all(
            response.items.map(async (item: SalesItem) => {
              const rolls = await purchasesAPI.getRollsByProductId(
                item.product_id
              );
              return {
                productId: item.product_id,
                rolls: rolls,
              };
            })
          );

          // Initialize roll pool with all rolls
          const initialRollPool = productRolls.reduce(
            (acc, { productId, rolls }) => {
              acc[productId] = rolls;
              return acc;
            },
            {} as Record<string, any[]>
          );

          setAllRollsPool(initialRollPool);

          // Process items with their rolls
          const itemsWithRolls = response.items.map((item: SalesItem) => {
            // Get all rolls for this product
            const allRolls = initialRollPool[item.product_id] || [];

            // Get all rolls that are already selected in other items for the same product
            const selectedRolls = response.items
              .filter(
                (otherItem: any) =>
                  otherItem.sales_item_id !== item.sales_item_id &&
                  otherItem.product_id === item.product_id
              )
              .map((otherItem: any) => otherItem.roll_no);

            // Filter out already selected rolls
            let availableRolls = allRolls.filter(
              (roll: any) => !selectedRolls.includes(roll.roll_no)
            );

            // Add the current roll to available rolls if it's not already there
            // BUT only if it's a real stock roll (has purchase_item_id), not a custom roll
            if (item.roll_no && item.purchase_item_id) {
              const currentRoll = availableRolls.find(
                (r: any) => r.roll_no === item.roll_no
              );
              if (!currentRoll) {
                const rollToAdd = {
                  id: item.roll_id,
                  roll_no: item.roll_no,
                  meters: item.meters,
                  unit: item.unit || DEFAULT_QUANTITY_UNIT,
                  price: item.price,
                };
                availableRolls.push(rollToAdd);
                // Also add to the roll pool
                initialRollPool[item.product_id] = [
                  ...initialRollPool[item.product_id],
                  rollToAdd,
                ];
              }
            }

            return {
              ...item,
              shade: item.shade || "",
              total_price: parseFloat((item.meters * item.price).toFixed(2)),
              roll_id: item.roll_id,
              purchase_item_id: item.purchase_item_id || item.roll_id,
              rolls: availableRolls,
            };
          });

          console.log("Processed items with rolls:", itemsWithRolls);
          console.log("Initial roll pool:", initialRollPool);

          setFormData((prev) => ({
            ...prev,
            sales_no: response.sales_no,
            sales_date: response.date
              ? response.date.split("T")[0]
              : new Date().toISOString().split("T")[0],
            customer_id: response.customer_id || response.customer?.id || "",
            customer_name: response.customer_name || response.customer?.name || "",
            total_amount: response.total,
            description: response.description,
            godown_no: response.godown?.id || "",
            challan_no: response.challan_no,
            maker: response.maker,
            transport_charges: response.transport_charges || 0,
            discount: response.discount || 0,
            credit_days: response.credit_days || 0,
            unit: normalizeUnit(response.unit || response.items?.[0]?.unit),
            items: itemsWithRolls || [],
          }));
        } catch (error) {
          console.error("Error loading sale data:", error);
          toast.error("Failed to load sale data");
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [id]);

  // Calculate total price for each item when meters or price changes
  useEffect(() => {
    if (formData.items.length > 0) {
      let hasChanges = false;
      const updatedItems = formData.items.map((item) => {
        const expectedTotal = parseFloat((item.meters * item.price).toFixed(2));
        if (Math.abs(item.total_price - expectedTotal) > 0.01) {
          hasChanges = true;
          return {
            ...item,
            total_price: expectedTotal,
          };
        }
        return item;
      });

      if (hasChanges) {
        const itemsTotal = updatedItems.reduce(
          (sum, item) => sum + item.total_price,
          0
        );
        const totalAmount = Math.round(
          itemsTotal + (formData.transport_charges || 0) - (formData.discount || 0)
        );
        
        setFormData((prev) => ({
          ...prev,
          items: updatedItems,
          total_amount: totalAmount,
        }));
      }
    }
  }, [formData.items.map((item) => `${item.meters}-${item.price}`).join(",")]);

  // Fetch next sales number when date changes
  useEffect(() => {
    if (!id) {
      // Only fetch for new sales
      const fetchNextSalesNumber = async () => {
        try {
          setLoading(true);
          const response = await salesAPI.getNextSalesNumber(
            formData.sales_date
          );
          setFormData((prev) => ({
            ...prev,
            sales_no: response.data,
          }));
        } catch (error) {
          console.error("Error fetching next sales number:", error);
          toast.error("Failed to generate sales number");
        } finally {
          setLoading(false);
        }
      };
      fetchNextSalesNumber();
    }
  }, [formData.sales_date, id]);

  // Fetch and store all rolls for a product
  const fetchAndStoreRolls = async (productId: string) => {
    if (!allRollsPool[productId]) {
      const rolls = await purchasesAPI.getRollsByProductId(productId);
      setAllRollsPool((prev) => ({ ...prev, [productId]: rolls }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      toast.error("Please select a customer");
      return;
    }
    saleMutation.mutate(formData);
  };

  const handleItemChange = (
    index: number,
    field: keyof SalesItem,
    value: any
  ) => {
    setFormData((prevFormData) => {
      const newItems = [...prevFormData.items];

      if (field === "price") {
        // If price is being changed, update all items with the same product_id
        const currentItem = newItems[index];
        newItems.forEach((item, idx) => {
          if (item.product_id === currentItem.product_id) {
            newItems[idx] = {
              ...item,
              price: value,
              total_price: parseFloat((item.meters * value).toFixed(2)),
            };
          }
        });
      } else {
        // For other fields, just update the specific item
        newItems[index] = {
          ...newItems[index],
          [field]: value,
        };
        
        // If meters changed, recalculate total_price for this item only
        if (field === "meters") {
          newItems[index].total_price = parseFloat((value * newItems[index].price).toFixed(2));
        }
      }

      // Calculate total amount including transport charges and discount
      const itemsTotal = newItems.reduce(
        (sum, item) => sum + (item.total_price || 0),
        0
      );
      const totalAmount = Math.round(
        itemsTotal + (prevFormData.transport_charges || 0) - (prevFormData.discount || 0)
      );
      
      return {
        ...prevFormData,
        items: newItems,
        total_amount: totalAmount,
      };
    });
  };

  const handleProductChange = async (index: number, productId: string) => {
    await fetchAndStoreRolls(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setLoading(true);
      try {
        // Get available rolls from pool
        const availableRolls = allRollsPool[productId] || [];

        // If editing, include the current roll in the list if it's not already there
        // BUT only if it's a real stock roll (has purchase_item_id), not a custom roll
        const currentItem = formData.items[index];
        if (currentItem.roll_no && currentItem.purchase_item_id) {
          const currentRoll = availableRolls.find(
            (r: any) => r.roll_no === currentItem.roll_no
          );
          if (!currentRoll) {
            availableRolls.push({
              id: currentItem.roll_id,
              roll_no: currentItem.roll_no,
              meters: currentItem.meters,
              price: currentItem.price,
            });
          }
        }

        const newItems = [...formData.items];
        newItems[index] = {
          ...newItems[index],
          product_id: product.id,
          product_name: product.name,
          rolls: availableRolls,
          price: parseFloat(product.price.toFixed(2)),
          roll_no: currentItem.roll_no || "",
          roll_id: currentItem.roll_id || "",
          meters: currentItem.meters || 0,
          total_price: currentItem.total_price || 0,
        };

        setFormData({
          ...formData,
          items: newItems,
        });
      } catch (error) {
        console.error("Error fetching rolls:", error);
        toast.error("Failed to fetch available rolls");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRollChange = (index: number, rollNo: string) => {
    const item = formData.items[index];
    const selectedRoll = allRollsPool[item.product_id]?.find(
      (r) => r.roll_no === rollNo
    );

    if (selectedRoll) {
      const newItems = [...formData.items];

      // Update the current item with selected roll details
      newItems[index] = {
        ...newItems[index],
        roll_no: selectedRoll.roll_no,
        roll_id: selectedRoll.id,
        purchase_item_id: selectedRoll.id,
        shade: selectedRoll.shade || "",
        meters: selectedRoll.meters,
        unit: formData.unit || DEFAULT_QUANTITY_UNIT,
        price: selectedRoll.price,
        total_price: parseFloat(
          (selectedRoll.meters * selectedRoll.price).toFixed(2)
        ),
      };

      const itemsTotal = newItems.reduce(
        (sum, item) => sum + (item.total_price || 0),
        0
      );
      setFormData({
        ...formData,
        items: newItems,
        total_amount: Math.round(
          itemsTotal + (formData.transport_charges || 0) - (formData.discount || 0)
        ),
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          sales_item_id: "",
          sales_id: id || "",
          product_id: "",
          product_name: "",
          roll_no: "",
          shade: "",
          roll_id: "",
          purchase_item_id: null, // Changed to null for custom rolls
          meters: 0,
          unit: formData.unit || DEFAULT_QUANTITY_UNIT,
          price: 0,
          total_price: 0,
          created_at: "",
          updated_at: "",
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    const itemToRemove = formData.items[index];
    const newItems = [...formData.items];
    newItems.splice(index, 1);

    // If the removed item had a STOCK roll selected (has purchase_item_id), add it back to the pool
    // Don't add custom rolls back to the pool
    if (itemToRemove.roll_no && itemToRemove.product_id && itemToRemove.purchase_item_id) {
      const rollToAddBack = {
        id: itemToRemove.roll_id,
        roll_no: itemToRemove.roll_no,
        meters: itemToRemove.meters,
        unit: itemToRemove.unit || DEFAULT_QUANTITY_UNIT,
        price: itemToRemove.price,
      };

      setAllRollsPool((prev) => ({
        ...prev,
        [itemToRemove.product_id]: [
          ...(prev[itemToRemove.product_id] || []),
          rollToAddBack,
        ],
      }));

      // Update available rolls for remaining items with the same product
      newItems.forEach((item, idx) => {
        if (item.product_id === itemToRemove.product_id) {
          newItems[idx] = {
            ...item,
            rolls: [...(allRollsPool[item.product_id] || []), rollToAddBack],
          };
        }
      });
    }

    const itemsTotal = newItems.reduce(
      (sum, item) => sum + (item.total_price || 0),
      0
    );
    setFormData({
      ...formData,
      items: newItems,
      total_amount: Math.round(
        itemsTotal + (formData.transport_charges || 0) - (formData.discount || 0)
      ),
    });
  };

  const handleBulkAdd = async (productId: string, count: number) => {
    await fetchAndStoreRolls(productId);
    const product = products.find((p: any) => p.id === productId);

    if (!product) return;

    setLoading(true);

    try {
      // Get available rolls from pool
      const availableRolls = allRollsPool[productId] || [];

      // Create new items with available rolls from pool
      const newItems = Array(count)
        .fill(null)
        .map(() => ({
          sales_item_id: "",
          sales_id: id || "",
          product_id: product.id,
          product_name: product.name,
          roll_no: "",
          shade: "",
          roll_id: "",
          purchase_item_id: null, // Changed to null for custom rolls
          meters: 0,
          unit: formData.unit || DEFAULT_QUANTITY_UNIT,
          price: product.price || 0,
          total_price: 0,
          created_at: "",
          updated_at: "",
          rolls: availableRolls, // Use rolls from pool
        }));

      setFormData((prev: any) => ({
        ...prev,
        items: [...prev.items, ...newItems],
      }));

      toast.success(`Added ${count} rolls of ${product.name}`);
    } catch (error) {
      console.error("Error fetching rolls:", error);
      toast.error("Failed to fetch available rolls");
    } finally {
      setLoading(false);
    }
  };

  // Compute available rolls for a row
  const getAvailableRolls = useCallback((productId: string, currentIndex: number) => {
    if (!productId) return [];

    const allRolls = allRollsPool[productId] || [];
    const selectedRolls = formData.items
      .filter(
        (item, idx) =>
          idx !== currentIndex && item.product_id === productId && item.roll_no
      )
      .map((item) => item.roll_no);

    // If we're editing and the current item has a roll_no, make sure it's included
    // BUT only if it's a real stock roll (has purchase_item_id), not a custom roll
    const currentItem = formData.items[currentIndex];
    if (currentItem?.roll_no && currentItem?.purchase_item_id) {
      const currentRoll = allRolls.find(
        (r) => r.roll_no === currentItem.roll_no
      );
      if (!currentRoll) {
        allRolls.push({
          id: currentItem.roll_id,
          roll_no: currentItem.roll_no,
          meters: currentItem.meters,
          price: currentItem.price,
        });
      }
    }

    return allRolls.filter((roll) => !selectedRolls.includes(roll.roll_no));
  }, [allRollsPool, formData.items]);

  const handlePrint = async (type: "bill" | "challan") => {
    if (!id) return;
    try {
      toast.info(
        type === "challan"
          ? "Opening challan print dialog..."
          : "Opening sales bill print dialog..."
      );
      await printSaleDocument(id, formData.sales_no, type);
    } catch (error) {
      console.error("Error printing document:", error);
      toast.error(
        type === "challan"
          ? "Failed to print challan"
          : "Failed to print sales bill"
      );
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/sales")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">
            {id ? "Edit Sale" : "New Sale"}
          </h1>
          {id && (
            <Badge variant="outline" className="ml-2 text-sm">
              {formData.sales_no}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {id && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => handlePrint("challan")}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Challan
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => handlePrint("bill")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Print Sales Bill
              </Button>
            </>
          )}
          <Button
            disabled={loading}
            onClick={handleSubmit}
            className="bg-brand-teal hover:bg-teal-600"
          >
            <Save className="h-4 w-4 mr-2" />
            {id ? "Update Sale" : "Create Sale"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <SalesDetails
          formData={formData}
          setFormData={setFormData}
          customers={customersForSelect}
          godowns={godowns}
        />

        <SalesItems
          formData={formData}
          setFormData={setFormData}
          products={products}
          handleItemChange={handleItemChange}
          handleProductChange={handleProductChange}
          handleRollChange={handleRollChange}
          addItem={addItem}
          removeItem={removeItem}
          handleBulkAdd={handleBulkAdd}
          getAvailableRolls={getAvailableRolls}
        />

        <SalesActions formData={formData} setFormData={setFormData} />
      </form>
    </div>
  );
};

export default SalesForm;
