import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashRegisterService, cashSessionService, cashMovementService } from '../../services/cash';
import type {
    OpenSessionPayload,
    CloseSessionPayload,
    CreateMovementPayload,
    CashRegisterQueryParams,
} from '../../interfaces/cash';

export const useCashRegisters = (params?: CashRegisterQueryParams) => {
    return useQuery({
        queryKey: ['cash-registers', params],
        queryFn: () => cashRegisterService.getRegisters(params),
    });
};

export const useCurrentSession = (cashRegisterId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'current', cashRegisterId],
        queryFn: () => cashSessionService.getCurrentSession(cashRegisterId!),
        enabled: !!cashRegisterId,
        refetchInterval: 30000,
    });
};

export const useSessionDetail = (sessionId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'detail', sessionId],
        queryFn: () => cashSessionService.getSessionById(sessionId!),
        enabled: !!sessionId,
    });
};

export const useSessionReport = (sessionId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'report', sessionId],
        queryFn: () => cashSessionService.getSessionReport(sessionId!),
        enabled: !!sessionId,
    });
};

export const useSessionClosures = (sessionId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'closures', sessionId],
        queryFn: () => cashSessionService.getSessionClosures(sessionId!),
        enabled: !!sessionId,
    });
};

export const useOpenSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: OpenSessionPayload) => cashSessionService.openSession(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-session'] });
            queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
        },
    });
};

export const useCloseSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sessionId, payload }: { sessionId: number; payload: CloseSessionPayload }) =>
            cashSessionService.closeSession(sessionId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-session'] });
            queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
        },
    });
};

export const useResumeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (sessionId: number) => cashSessionService.resumeSession(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-session'] });
            queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
        },
    });
};

export const useCashMovements = (cashSessionId?: number) => {
    return useQuery({
        queryKey: ['cash-movements', cashSessionId],
        queryFn: () => cashMovementService.getMovements(cashSessionId),
    });
};

export const useCreateCashMovement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateMovementPayload) => cashMovementService.createMovement(payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cash-session'] });
            queryClient.invalidateQueries({ queryKey: ['cash-movements', variables.cash_session] });
        },
    });
};

export const useActiveSession = () => {
    return useQuery({
        queryKey: ['cash-session', 'active'],
        queryFn: () => cashSessionService.getActiveSession(),
    });
};
