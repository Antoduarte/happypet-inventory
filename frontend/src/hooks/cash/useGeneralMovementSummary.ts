import { useQuery } from '@tanstack/react-query';
import { generalMovementService } from '../../services/cash';
import type { GeneralMovementSummaryParams } from '../../interfaces/cash';

export const useGeneralMovementSummary = (params?: GeneralMovementSummaryParams) => {
    return useQuery({
        queryKey: ['general-movements', 'summary', params],
        queryFn: () => generalMovementService.getSummary(params),
        enabled: !!params,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};
