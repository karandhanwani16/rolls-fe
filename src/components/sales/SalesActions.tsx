import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { IndianRupee } from 'lucide-react';
import { useFormSectionNavigation } from '@/lib/formKeyboardNavigation';

interface SalesActionsProps {
    formData: any;
    setFormData: (data: any) => void;
}

const calcTotal = (items: any[], transportCharges: number, discount: number) => {
    const itemsTotal = (items || []).reduce(
        (sum, item) => sum + (item.total_price || 0),
        0
    );
    return Math.round(
        itemsTotal + (Number(transportCharges) || 0) - (Number(discount) || 0)
    );
};

const SalesActions = ({
    formData,
    setFormData,
}: SalesActionsProps) => {
    const { containerRef, onKeyDownCapture } = useFormSectionNavigation();
    const itemsTotal = (formData.items || []).reduce(
        (sum: number, item: any) => sum + (item.total_price || 0),
        0
    );

    const handleTransportChange = (transport_charges: number) => {
        setFormData((prev: any) => ({
            ...prev,
            transport_charges,
            total_amount: calcTotal(prev.items, transport_charges, prev.discount || 0),
        }));
    };

    const handleDiscountChange = (discount: number) => {
        setFormData((prev: any) => ({
            ...prev,
            discount,
            total_amount: calcTotal(prev.items, prev.transport_charges || 0, discount),
        }));
    };

    const handleCreditDaysChange = (value: string) => {
        const credit_days = parseInt(value, 10) || 0;
        setFormData((prev: any) => ({
            ...prev,
            credit_days,
        }));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-brand-teal" />
                    Total Amount
                </CardTitle>
            </CardHeader>
            <CardContent ref={containerRef} onKeyDownCapture={onKeyDownCapture}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="items_total">Items Total (₹)</Label>
                        <CurrencyInput
                            id="items_total"
                            value={itemsTotal}
                            readOnly
                            className="bg-gray-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transport_charges">Transport Charges (₹)</Label>
                        <CurrencyInput
                            id="transport_charges"
                            value={formData.transport_charges ?? 0}
                            onChange={handleTransportChange}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="discount">Discount (₹)</Label>
                        <CurrencyInput
                            id="discount"
                            value={formData.discount ?? 0}
                            onChange={handleDiscountChange}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="credit_days">Credit Days</Label>
                        <Input
                            id="credit_days"
                            type="number"
                            min="0"
                            step="1"
                            value={formData.credit_days ?? 0}
                            onChange={(e) => handleCreditDaysChange(e.target.value)}
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="total_amount">Total Amount (₹)</Label>
                        <CurrencyInput
                            id="total_amount"
                            value={formData.total_amount}
                            readOnly
                            className="bg-gray-50 text-lg font-semibold"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SalesActions;
