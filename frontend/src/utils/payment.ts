import { ArrowLeftRight, Banknote, CreditCard, Split, Wallet, type LucideIcon } from 'lucide-react';

export const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credit: 'Crédito',
    mixed: 'Mixto',
};

export const PAYMENT_ICONS: Record<string, LucideIcon> = {
    cash: Banknote,
    card: CreditCard,
    transfer: ArrowLeftRight,
    credit: Wallet,
    mixed: Split,
};

export const getPaymentTypeLabel = (type: string): string => PAYMENT_LABELS[type] ?? type;

export const formatPaymentSplit = (split: { method: string; amount: number | string }[]): string =>
    split
        .map(
            (entry) => `${getPaymentTypeLabel(entry.method)}: C$${Number(entry.amount).toFixed(2)}`,
        )
        .join(' / ');
