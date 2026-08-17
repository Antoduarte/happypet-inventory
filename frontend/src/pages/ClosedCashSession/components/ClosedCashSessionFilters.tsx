import React, { useCallback } from 'react';
import { User } from 'lucide-react';
import { PeriodFilterBar } from '../../../components/ui/PeriodFilterBar';
import { SelectFilter } from '../../../components/ui/SelectFilter';
import { cashSessionService } from '../../../services/cash';
import type { ReportGranularity, ReportPreset } from '../../../interfaces/report';

interface ClosedCashSessionFiltersProps {
    preset: ReportPreset;
    onPresetChange: (preset: ReportPreset) => void;
    customStart: string;
    customEnd: string;
    onCustomStartChange: (value: string) => void;
    onCustomEndChange: (value: string) => void;
    userId: number | null;
    onUserIdChange: (id: number | null) => void;
}

export const ClosedCashSessionFilters: React.FC<ClosedCashSessionFiltersProps> = ({
    preset,
    onPresetChange,
    customStart,
    customEnd,
    onCustomStartChange,
    onCustomEndChange,
    userId,
    onUserIdChange,
}) => {
    const fetchUserOptions = useCallback(async () => {
        try {
            const users = await cashSessionService.getCashSessionUsers();
            return { options: users.map((u) => ({ id: u.id, label: u.name })) };
        } catch {
            return { options: [], error: 'Error al cargar los usuarios' };
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
            granularity={'day' as ReportGranularity}
            onGranularityChange={() => undefined}
            hideGranularity
            sellerFilter={
                <SelectFilter
                    filterId="closed-session-user"
                    placeholder="Usuario"
                    allLabel="Todos los usuarios"
                    icon={User}
                    ariaLabel="Filtrar por usuario"
                    selectedId={userId}
                    onChange={onUserIdChange}
                    fetchOptions={fetchUserOptions}
                />
            }
        />
    );
};
