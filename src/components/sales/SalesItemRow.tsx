import React, { useEffect, useState } from 'react';
import { X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import QuantityUnitSelect from '@/components/ui/quantity-unit-select';
import { DEFAULT_QUANTITY_UNIT, getUnitMeta } from '@/lib/quantityUnits';

interface SalesItemRowProps {
  item: any;
  index: number;
  products: any[];
  handleItemChange: (index: number, field: string, value: any) => void;
  handleProductChange: (index: number, productId: string) => void;
  handleRollChange: (index: number, rollNo: string) => void;
  removeItem: (index: number) => void;
  availableRolls: any[];
  defaultCustomRoll?: boolean;
  setRef: (field: string, index: number) => (element: HTMLInputElement | null) => void;
  createKeyDownHandler: (
    index: number,
    field: string
  ) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const SalesItemRow: React.FC<SalesItemRowProps> = ({
  item,
  index,
  products,
  handleItemChange,
  handleProductChange,
  handleRollChange,
  removeItem,
  availableRolls,
  defaultCustomRoll = true,
  setRef,
  createKeyDownHandler,
}) => {
  const [isCustomRoll, setIsCustomRoll] = useState(() => {
    const isNewItem = !item.roll_no && !item.purchase_item_id;

    if (isNewItem) {
      return defaultCustomRoll;
    }

    // For existing items, detect if this should be treated as a custom roll:
    // 1. Has no purchase_item_id (definitely custom)
    // 2. Has a roll_no but it's not in the available rolls (stock roll no longer available)
    const hasNoPurchaseItemId = item.purchase_item_id === null || item.purchase_item_id === undefined || item.purchase_item_id === '';
    const rollNotInAvailable = item.roll_no && !availableRolls.some(roll => roll.roll_no === item.roll_no);

    return hasNoPurchaseItemId || rollNotInAvailable;
  });

  // Auto-detect if this should be custom mode when availableRolls change
  // But only for existing items, not new ones
  useEffect(() => {
    // Use the same logic as in useState
    const isNewItem = !item.roll_no && !item.purchase_item_id;
    
    console.log('🔄 useEffect triggered:', {
      isNewItem,
      currentIsCustomRoll: isCustomRoll,
      sales_item_id: item.sales_item_id,
      roll_no: item.roll_no,
      purchase_item_id: item.purchase_item_id
    });
    
    // Don't auto-switch for new items - let user manually toggle
    if (isNewItem) {
      console.log('⏸️ Skipping auto-switch for new item');
      return;
    }
    
    const hasNoPurchaseItemId = item.purchase_item_id === null || item.purchase_item_id === undefined || item.purchase_item_id === '';
    const rollNotInAvailable = item.roll_no && !availableRolls.some(roll => roll.roll_no === item.roll_no);
    
    console.log('🔍 useEffect detection:', {
      hasNoPurchaseItemId,
      rollNotInAvailable,
      shouldBeCustom: hasNoPurchaseItemId || rollNotInAvailable,
      currentIsCustomRoll: isCustomRoll
    });
    
    // Set to custom mode if:
    // 1. It's a custom roll (no purchase_item_id), OR
    // 2. It has a roll_no but that roll is not available in dropdown
    if ((hasNoPurchaseItemId || rollNotInAvailable) && !isCustomRoll) {
      console.log('✅ Setting to custom mode');
      setIsCustomRoll(true);
    }
    // If it's a stock roll that IS available in dropdown, switch back to dropdown mode
    else if (!hasNoPurchaseItemId && item.roll_no && availableRolls.some(roll => roll.roll_no === item.roll_no) && isCustomRoll) {
      console.log('🔄 Setting to dropdown mode');
      setIsCustomRoll(false);
    }
  }, [availableRolls, item.purchase_item_id, item.roll_no, item.sales_item_id]);

  const handleToggleCustomRoll = () => {
    const newIsCustom = !isCustomRoll;
    setIsCustomRoll(newIsCustom);
    
    if (newIsCustom) {
      // Switching to custom mode - clear roll selection
      handleItemChange(index, 'roll_no', '');
      handleItemChange(index, 'roll_id', '');
      handleItemChange(index, 'purchase_item_id', null);
      handleItemChange(index, 'meters', 0);
    } else {
      // Switching to select mode - clear custom data
      handleItemChange(index, 'roll_no', '');
      handleItemChange(index, 'roll_id', '');
      handleItemChange(index, 'purchase_item_id', null);
      handleItemChange(index, 'meters', 0);
    }
  };

  const handleCustomRollChange = (value: string) => {
    handleItemChange(index, 'roll_no', value);
    handleItemChange(index, 'roll_id', '');
    handleItemChange(index, 'purchase_item_id', null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: string
  ) => {
    createKeyDownHandler(index, field)(e);
  };

  const metersEditable = isCustomRoll || !item.roll_no;

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <Select
          value={item.product_id}
          onValueChange={(value) => handleProductChange(index, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-2">
          {/* Toggle for custom roll */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {isCustomRoll ? 'Custom Roll' : 'From Stock'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleCustomRoll}
              disabled={!item.product_id}
              className="h-6 px-2"
            >
              {isCustomRoll ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          
          {isCustomRoll ? (
            <div className="flex flex-col space-y-1">
              <Input
                type="text"
                ref={setRef('roll_no', index)}
                value={item.roll_no || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  handleCustomRollChange(newValue);
                }}
                onKeyDown={(e) => handleKeyDown(e, 'roll_no')}
                placeholder="Enter custom roll no"
                disabled={!item.product_id}
              />
              <Badge variant="outline" className="text-xs self-start">
                Custom
              </Badge>
            </div>
          ) : (
            <Select
              value={item.roll_no}
              onValueChange={(value) => handleRollChange(index, value)}
              disabled={!item.product_id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select roll" />
              </SelectTrigger>
              <SelectContent>
                {availableRolls && availableRolls.length > 0 ? (
                  availableRolls.map((roll: any) => (
                    <SelectItem key={roll.roll_no} value={roll.roll_no}>
                      {roll.roll_no} - {roll.meters}{getUnitMeta(roll.unit).abbr} @ ₹{roll.price}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    {item.product_id ? 'No rolls available' : 'Select a product first'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Input
          type="text"
          ref={setRef('shade', index)}
          value={item.shade || ''}
          onChange={(e) => handleItemChange(index, 'shade', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'shade')}
          placeholder="Shade"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            ref={metersEditable ? setRef('meters', index) : undefined}
            value={item.meters || ''}
            onChange={(e) => handleItemChange(index, 'meters', parseFloat(e.target.value) || 0)}
            onKeyDown={metersEditable ? (e) => handleKeyDown(e, 'meters') : undefined}
            placeholder="Qty"
            readOnly={!metersEditable}
            className={!metersEditable ? 'bg-gray-50 min-w-[90px]' : 'min-w-[90px]'}
          />
          <QuantityUnitSelect
            value={item.unit || DEFAULT_QUANTITY_UNIT}
            onChange={(unit) => handleItemChange(index, 'unit', unit)}
            disabled={!metersEditable}
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Input
          type="number"
          ref={setRef('price', index)}
          value={item.price || ''}
          onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, 'price')}
          placeholder="Price/Meter"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Input
          type="number"
          value={item.total_price || ''}
          readOnly
          className="bg-gray-50"
          placeholder="Total"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={
            (e) => {
              e.preventDefault();
              removeItem(index)
            }
        }
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

export default SalesItemRow;