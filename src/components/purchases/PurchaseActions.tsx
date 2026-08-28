import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { formatInToIndianCurrency } from '@/lib/utils';

interface PurchaseActionsProps {
    formData: any;
    isPending: boolean;
    id?: string;
    navigate: (path: string) => void;
}

const PurchaseActions = ({ formData, isPending, id, navigate }: PurchaseActionsProps) => {
    return (
        <div className="flex justify-between items-center pt-4">
            <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/purchases')}
            >
                Cancel
            </Button>

            <div className="flex items-center gap-3">
                {formData.items.length > 0 && (
                    <div className="text-right mr-4">
                        <p className="text-sm text-gray-500">Total Items: {formData.items.length}</p>
                        <p className="text-lg font-bold text-brand-teal">
                            Total: {formatInToIndianCurrency(formData?.total_amount || 0)}
                        </p>
                    </div>
                )}

                <Button
                    type="submit"
                    className="bg-brand-teal hover:bg-teal-700 text-white"
                    disabled={isPending}
                >
                    <Save className="h-4 w-4 mr-2" />
                    {isPending
                        ? id ? 'Updating...' : 'Creating...'
                        : id ? 'Update Purchase' : 'Create Purchase'}
                </Button>
            </div>
        </div>
    );
};

export default PurchaseActions; 