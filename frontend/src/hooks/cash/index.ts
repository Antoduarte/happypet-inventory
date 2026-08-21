import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    cashRegisterService,
    cashSessionService,
    cashMovementService,
    generalMovementService,
} from '../../services/cash';
import type {
    OpenSessionPayload,
    CloseSessionPayload,
    CreateMovementPayload,
    CashRegisterQueryParams,
    CashMovementQueryParams,
    CreateGeneralMovementPayload,
    UpdateGeneralMovementPayload,
    GeneralMovementQueryParams,
    ClosedCashSessionParams,
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
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useSessionDetail = (sessionId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'detail', sessionId],
        queryFn: () => cashSessionService.getSessionById(sessionId!),
        enabled: !!sessionId,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useSessionReport = (sessionId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'report', sessionId],
        queryFn: () => cashSessionService.getSessionReport(sessionId!),
        enabled: !!sessionId,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useSessionClosures = (sessionId: number | null) => {
    return useQuery({
        queryKey: ['cash-session', 'closures', sessionId],
        queryFn: () => cashSessionService.getSessionClosures(sessionId!),
        enabled: !!sessionId,
    });
};

export const useClosedCashSessions = (params?: ClosedCashSessionParams) => {
    return useQuery({
        queryKey: ['cash-session', 'closed', params],
        queryFn: () => cashSessionService.getClosedSessions(params),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useCashSessionUsers = () => {
    return useQuery({
        queryKey: ['cash-session', 'users'],
        queryFn: () => cashSessionService.getCashSessionUsers(),
        staleTime: 60_000,
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

export const useCashMovements = (params?: CashMovementQueryParams) => {
    return useQuery({
        queryKey: ['cash-movements', params],
        queryFn: () => cashMovementService.getMovements(params),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
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
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useGeneralMovements = (params?: GeneralMovementQueryParams) => {
    return useQuery({
        queryKey: ['general-movements', params],
        queryFn: () => generalMovementService.getMovements(params),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useGeneralMovement = (id: number | null) => {
    return useQuery({
        queryKey: ['general-movements', 'detail', id],
        queryFn: () => generalMovementService.getMovementById(id!),
        enabled: id !== null,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
};

export const useCreateGeneralMovement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateGeneralMovementPayload) =>
            generalMovementService.createMovement(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['general-movements'] });
        },
    });
};

export const useUpdateGeneralMovement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateGeneralMovementPayload }) =>
            generalMovementService.updateMovement(id, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['general-movements'] });
            queryClient.invalidateQueries({
                queryKey: ['general-movements', 'detail', variables.id],
            });
        },
    });
};

export const useDeleteGeneralMovement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => generalMovementService.deleteMovement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['general-movements'] });
        },
    });
};

export { useGeneralMovementFilters } from './useGeneralMovementFilters';
export { useGeneralMovementSummary } from './useGeneralMovementSummary';
export { useCashReport } from './useCashReport';
