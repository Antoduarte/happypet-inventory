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
} from '../../interfaces/cash';

const REGISTERS_URL = '/cash-registers/';
const SESSIONS_URL = '/cash-sessions/';
const MOVEMENTS_URL = '/cash-movements/';

class CashRegisterService {
    async getRegisters(params?: CashRegisterQueryParams): Promise<CashRegister[]> {
        try {
            const response = await api.get<CashRegister[]>(REGISTERS_URL, { params });
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
}

class CashMovementService {
    async createMovement(payload: CreateMovementPayload): Promise<CashMovement> {
        try {
            return await api.post<CashMovement>(MOVEMENTS_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getMovements(cashSessionId?: number): Promise<CashMovement[]> {
        try {
            const params = cashSessionId ? { cash_session: cashSessionId } : undefined;
            const response = await api.get<CashMovement[]>(MOVEMENTS_URL, { params });
            return Array.isArray(response) ? response : (response.results ?? []);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

export const cashRegisterService = new CashRegisterService();
export const cashSessionService = new CashSessionService();
export const cashMovementService = new CashMovementService();
