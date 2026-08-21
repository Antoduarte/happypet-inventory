import { api } from '../api';
import { AppError } from '../errors';
import type {
    CashRegister,
    CashSession,
    CashSessionReport,
    CashSessionClosure,
    CashMovement,
    ActiveSessionResponse,
    OpenSessionPayload,
    CloseSessionPayload,
    CreateMovementPayload,
    CashRegisterQueryParams,
    CashMovementQueryParams,
    CashReport,
    CashReportParams,
    GeneralMovement,
    CreateGeneralMovementPayload,
    UpdateGeneralMovementPayload,
    GeneralMovementQueryParams,
    GeneralMovementSummary,
    GeneralMovementSummaryParams,
    ClosedCashSessionListItem,
    ClosedCashSessionParams,
    CashSessionUserOption,
} from '../../interfaces/cash';
import type { PaginatedResponse } from '../../interfaces/product';

const REGISTERS_URL = '/cash-registers/';
const SESSIONS_URL = '/cash-sessions/';
const MOVEMENTS_URL = '/cash-movements/';
const GENERAL_MOVEMENTS_URL = '/general-movements/';

class CashRegisterService {
    async getRegisters(params?: CashRegisterQueryParams): Promise<CashRegister[]> {
        try {
            const response = await api.get<CashRegister[] | { results: CashRegister[] }>(
                REGISTERS_URL,
                { params },
            );
            return Array.isArray(response) ? response : (response.results ?? []);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getRegisterById(id: number): Promise<CashRegister> {
        try {
            return await api.get<CashRegister>(`${REGISTERS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

class CashSessionService {
    async openSession(payload: OpenSessionPayload): Promise<CashSession> {
        try {
            return await api.post<CashSession>(`${SESSIONS_URL}open/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getCurrentSession(cashRegisterId: number): Promise<CashSession> {
        try {
            return await api.get<CashSession>(`${SESSIONS_URL}current/`, {
                params: { cash_register_id: cashRegisterId },
            });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async closeSession(sessionId: number, payload: CloseSessionPayload): Promise<CashSession> {
        try {
            return await api.post<CashSession>(`${SESSIONS_URL}${sessionId}/close/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async resumeSession(sessionId: number): Promise<CashSession> {
        try {
            return await api.post<CashSession>(`${SESSIONS_URL}${sessionId}/resume/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getSessionReport(sessionId: number): Promise<CashSessionReport> {
        try {
            return await api.get<CashSessionReport>(`${SESSIONS_URL}${sessionId}/report/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getSessionById(sessionId: number): Promise<CashSession> {
        try {
            return await api.get<CashSession>(`${SESSIONS_URL}${sessionId}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getActiveSession(): Promise<ActiveSessionResponse> {
        return await api.get<ActiveSessionResponse>(`${SESSIONS_URL}active/`);
    }

    async getSessionClosures(sessionId: number): Promise<CashSessionClosure[]> {
        try {
            return await api.get<CashSessionClosure[]>(`${SESSIONS_URL}${sessionId}/closures/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getClosedSessions(
        params?: ClosedCashSessionParams,
    ): Promise<PaginatedResponse<ClosedCashSessionListItem>> {
        try {
            return await api.get<PaginatedResponse<ClosedCashSessionListItem>>(
                `${SESSIONS_URL}closed/`,
                { params },
            );
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getCashSessionUsers(): Promise<CashSessionUserOption[]> {
        try {
            return await api.get<CashSessionUserOption[]>(`${SESSIONS_URL}users/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

class CashMovementService {
    async createMovement(payload: CreateMovementPayload): Promise<CashMovement> {
        try {
            return await api.post<CashMovement>(MOVEMENTS_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getMovements(params?: CashMovementQueryParams): Promise<PaginatedResponse<CashMovement>> {
        try {
            return await api.get<PaginatedResponse<CashMovement>>(MOVEMENTS_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

class CashReportService {
    async getCashReport(params?: CashReportParams): Promise<CashReport> {
        try {
            return await api.get<CashReport>('/reports/cash/', { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

class GeneralMovementService {
    async getMovements(
        params?: GeneralMovementQueryParams,
    ): Promise<PaginatedResponse<GeneralMovement>> {
        try {
            return await api.get<PaginatedResponse<GeneralMovement>>(GENERAL_MOVEMENTS_URL, {
                params,
            });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getMovementById(id: number): Promise<GeneralMovement> {
        try {
            return await api.get<GeneralMovement>(`${GENERAL_MOVEMENTS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getSummary(params?: GeneralMovementSummaryParams): Promise<GeneralMovementSummary> {
        try {
            return await api.get<GeneralMovementSummary>(`${GENERAL_MOVEMENTS_URL}summary/`, {
                params,
            });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async createMovement(payload: CreateGeneralMovementPayload): Promise<GeneralMovement> {
        try {
            return await api.post<GeneralMovement>(GENERAL_MOVEMENTS_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async updateMovement(
        id: number,
        payload: UpdateGeneralMovementPayload,
    ): Promise<GeneralMovement> {
        try {
            return await api.patch<GeneralMovement>(`${GENERAL_MOVEMENTS_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async deleteMovement(id: number): Promise<void> {
        try {
            await api.delete<void>(`${GENERAL_MOVEMENTS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

export const cashRegisterService = new CashRegisterService();
export const cashSessionService = new CashSessionService();
export const cashMovementService = new CashMovementService();
export const cashReportService = new CashReportService();
export const generalMovementService = new GeneralMovementService();
