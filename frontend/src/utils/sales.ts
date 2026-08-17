import type { PaymentOption } from '@/interfaces/sale';
import { CreditCard, Wallet, Banknote, ArrowLeftRight } from 'lucide-react';

export const PAYMENT_OPTIONS: PaymentOption[] = [
    {
        value: 'cash',
        label: 'Efectivo',
        icon: Banknote,
        activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200',
        iconClass: 'text-emerald-200',
        splittable: true,
    },
    {
        value: 'card',
        label: 'Tarjeta',
        icon: CreditCard,
        activeClass: 'border-brand bg-brand text-white shadow-md shadow-brand/25',
        iconClass: 'text-violet-200',
        splittable: true,
    },
    {
        value: 'transfer',
        label: 'Transferencia',
        icon: ArrowLeftRight,
        activeClass: 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-200',
        iconClass: 'text-violet-200',
        splittable: true,
    },
    {
        value: 'credit',
        label: 'Crédito',
        icon: Wallet,
        activeClass: 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-200',
        iconClass: 'text-amber-100',
        splittable: false,
    },
];
