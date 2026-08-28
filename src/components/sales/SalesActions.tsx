import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IndianRupee } from 'lucide-react';

interface SalesActionsProps {
    formData: any;
    setFormData: (data: any) => void;
}

const SalesActions = ({
    formData,
    setFormData,
}: SalesActionsProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-brand-teal" />
                    Total Amount
                </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
};

export default SalesActions; 