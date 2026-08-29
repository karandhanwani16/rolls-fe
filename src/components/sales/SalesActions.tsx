import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IndianRupee } from 'lucide-react';
import { useFormSectionNavigation } from '@/lib/formKeyboardNavigation';

interface SalesActionsProps {
    formData: any;
    setFormData: (data: any) => void;
}

const calcTotal = (items: any[], transportCharges: number) => {
    const itemsTotal = (items || []).reduce(
        (sum, item) => sum + (item.total_price || 0),
        0
    );
    return Math.round(itemsTotal + (Number(transportCharges) || 0));
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

    const handleTransportChange = (value: string) => {
        const transport_charges = parseFloat(value) || 0;
        setFormData((prev: any) => ({
            ...prev,
            transport_charges,
            total_amount: calcTotal(prev.items, transport_charges),
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="items_total">Items Total (₹)</Label>
                        <Input
                            id="items_total"
                            type="number"
                            value={itemsTotal.toFixed(2)}
                            readOnly
                            className="bg-gray-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transport_charges">Transport Charges (₹)</Label>
                        <Input
                            id="transport_charges"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.transport_charges ?? 0}
                            onChange={(e) => handleTransportChange(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="total_amount">Total Amount (₹)</Label>
                        <Input
                            id="total_amount"
                            type="number"
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
