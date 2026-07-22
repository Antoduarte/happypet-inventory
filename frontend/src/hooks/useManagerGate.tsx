import React from 'react';
import { usePermission } from './usePermission';
import { useAuth } from './useAuth';
import { ManagerAuthModal } from '../pages/InventoryMovement/ManagerAuthModal';

type GatedAction = (code?: string) => void | Promise<void>;

/**
 * useManagerGate
 *
 * Encapsula el requisito de "código de autorización de gerente/admin" para acciones
 * de cajeros (editar/eliminar productos y servicios, cancelar ventas, movimientos de stock).
 *
 * - Si el usuario NO es cajero → la acción se ejecuta de inmediato (sin código).
 * - Si es cajero y ya autorizó en esta sesión de login (`managerCode` cacheado) → la acción
 *   se ejecuta reutilizando ese código, sin volver a preguntar.
 * - Si es cajero y aún no hay código → se abre `ManagerAuthModal`; al validar, se cachea el
 *   código y se ejecuta la acción diferida.
 *
 * Uso:
 *   const { requireAuthorization, managerGateModal } = useManagerGate();
 *   requireAuthorization((code) => updateProduct(id, code ? { ...payload, manager_code: code } : payload));
 *   // ...y renderizar {managerGateModal} en el JSX de la página.
 */
export function useManagerGate(message?: string) {
    const { isCashier } = usePermission();
    const { managerCode, setManagerAuthorization } = useAuth();
    const [open, setOpen] = React.useState(false);
    const pending = React.useRef<GatedAction | null>(null);

    const requireAuthorization = React.useCallback(
        (action: GatedAction) => {
            if (!isCashier) {
                void action(undefined);
                return;
            }
            if (managerCode) {
                void action(managerCode);
                return;
            }
            pending.current = action;
            setOpen(true);
        },
        [isCashier, managerCode],
    );

    const managerGateModal = (
        <ManagerAuthModal
            isOpen={open}
            onClose={() => {
                pending.current = null;
                setOpen(false);
            }}
            onSuccess={(code) => {
                setManagerAuthorization(code); // cachea para el resto de la sesión de login
                setOpen(false);
                const action = pending.current;
                pending.current = null;
                if (action) void action(code);
            }}
            message={message}
        />
    );

    return { requireAuthorization, managerGateModal };
}
