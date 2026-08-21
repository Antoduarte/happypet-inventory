import React from 'react';
import { ArrowRightLeft, User } from 'lucide-react';
import { PeriodFilterBar } from '../../../components/ui/PeriodFilterBar';
import { SelectFilter } from '../../../components/ui/SelectFilter';
import { cashSessionService } from '../../../services/cash';
import type { ReportGranularity, ReportPreset } from '../../../interfaces/report';
import type { MovementType } from '../../../interfaces/cash';

const TYPE_OPTIONS = [
    { id: 1, label: 'Ingreso' },
    { id: 2, label: 'Egreso' },
];

const typeToId = (value: '' | MovementType): number | null =>
    value === 'income' ? 1 : value === 'expense' ? 2 : null;

const idToType = (id: number | null): '' | MovementType =>
    id === 1 ? 'income' : id === 2 ? 'expense' : '';

interface CashReportFiltersProps {
    preset: ReportPreset;
    onPresetChange: (preset: ReportPreset) => void;
    customStart: string;
    customEnd: string;
    onCustomStartChange: (value: string) => void;
    onCustomEndChange: (value: string) => void;
    granularity: ReportGranularity;
    onGranularityChange: (value: ReportGranularity) => void;
    selectedType: '' | MovementType;
    onTypeChange: (value: '' | MovementType) => void;
    selectedCashierId: number | null;
    onCashierChange: (id: number | null) => void;
}

/**
 * Filter bar for the cash report: period, granularity, movement type and cashier.
 */
export const CashReportFilters: React.FC<CashReportFiltersProps> = ({
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
    selectedCashierId,
    onCashierChange,
}) => {
    const fetchCashierOptions = React.useCallback(async () => {
        try {
            const users = await cashSessionService.getCashSessionUsers();
            return { options: users.map((u) => ({ id: u.id, label: u.name })) };
        } catch {
            return { options: [], error: 'Error al cargar los cajeros' };
        }
    }, []);

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
                        filterId="cash-report-type"
                        placeholder="Tipo"
                        allLabel="Todos los tipos"
                        icon={ArrowRightLeft}
                        ariaLabel="Filtrar por tipo de movimiento"
                        selectedId={typeToId(selectedType)}
                        onChange={(id) => onTypeChange(idToType(id))}
                        fetchOptions={async () => ({ options: TYPE_OPTIONS })}
                    />
                    <SelectFilter
                        filterId="cash-report-cashier"
                        placeholder="Cajero"
                        allLabel="Todos los cajeros"
                        icon={User}
                        ariaLabel="Filtrar por cajero"
                        selectedId={selectedCashierId}
                        onChange={onCashierChange}
                        fetchOptions={fetchCashierOptions}
                    />
                </div>
            }
        />
    );
};
