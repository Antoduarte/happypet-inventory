import React from 'react';
import { ArrowRightLeft, CreditCard } from 'lucide-react';
import { PeriodFilterBar } from '@/components/ui/PeriodFilterBar';
import { SelectFilter } from '@/components/ui/SelectFilter';
import type { ReportGranularity, ReportPreset } from '@/interfaces/report';
import type { GeneralMovementPaymentMethod, GeneralMovementType } from '@/interfaces/cash';

const TYPE_OPTIONS = [
    { id: 1, label: 'Ingreso' },
    { id: 2, label: 'Egreso' },
];

const PAYMENT_OPTIONS = [
    { id: 1, label: 'Efectivo' },
    { id: 2, label: 'Tarjeta' },
    { id: 3, label: 'Transferencia' },
];

const typeToId = (value: '' | GeneralMovementType): number | null =>
    value === 'income' ? 1 : value === 'expense' ? 2 : null;

const idToType = (id: number | null): '' | GeneralMovementType =>
    id === 1 ? 'income' : id === 2 ? 'expense' : '';

const paymentToId = (value: '' | GeneralMovementPaymentMethod): number | null =>
    value === 'cash' ? 1 : value === 'card' ? 2 : value === 'transfer' ? 3 : null;

const idToPayment = (id: number | null): '' | GeneralMovementPaymentMethod =>
    id === 1 ? 'cash' : id === 2 ? 'card' : id === 3 ? 'transfer' : '';

interface GeneralMovementFiltersProps {
    preset: ReportPreset;
    onPresetChange: (preset: ReportPreset) => void;
    customStart: string;
    customEnd: string;
    onCustomStartChange: (value: string) => void;
    onCustomEndChange: (value: string) => void;
    granularity: ReportGranularity;
    onGranularityChange: (value: ReportGranularity) => void;
    selectedType: '' | GeneralMovementType;
    onTypeChange: (value: '' | GeneralMovementType) => void;
    selectedPaymentMethod: '' | GeneralMovementPaymentMethod;
    onPaymentMethodChange: (value: '' | GeneralMovementPaymentMethod) => void;
}

export const GeneralMovementFilters: React.FC<GeneralMovementFiltersProps> = ({
    preset,
    onPresetChange,
    customStart,
    customEnd,
    onCustomStartChange,
    onCustomEndChange,
    granularity,
    onGranularityChange,
    selectedType,
    onTypeChange,
    selectedPaymentMethod,
    onPaymentMethodChange,
}) => {
    return (
        <PeriodFilterBar
            preset={preset}
            onPresetChange={onPresetChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={onCustomStartChange}
            onCustomEndChange={onCustomEndChange}
            granularity={granularity}
            onGranularityChange={onGranularityChange}
            sellerFilter={
                <div className="flex flex-wrap items-center gap-3">
                    <SelectFilter
                        filterId="gm-type"
                        placeholder="Tipo"
                        allLabel="Todos los tipos"
                        icon={ArrowRightLeft}
                        ariaLabel="Filtrar por tipo"
                        selectedId={typeToId(selectedType)}
                        onChange={(id) => onTypeChange(idToType(id))}
                        fetchOptions={async () => ({ options: TYPE_OPTIONS })}
                    />
                    <SelectFilter
                        filterId="gm-payment-method"
                        placeholder="Método de pago"
                        allLabel="Todos los métodos"
                        icon={CreditCard}
                        ariaLabel="Filtrar por método de pago"
                        selectedId={paymentToId(selectedPaymentMethod)}
                        onChange={(id) => onPaymentMethodChange(idToPayment(id))}
                        fetchOptions={async () => ({ options: PAYMENT_OPTIONS })}
                    />
                </div>
            }
        />
    );
};

export default GeneralMovementFilters;
