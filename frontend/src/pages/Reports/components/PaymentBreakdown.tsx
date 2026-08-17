import React from 'react';
import type { ReportPaymentRow } from '../../../interfaces/report';
import {
    PaymentMethodBreakdown,
    type PaymentBreakdownRow,
} from '../../../components/ui/PaymentMethodBreakdown';

interface PaymentBreakdownProps {
    data: ReportPaymentRow[];
}

export const PaymentBreakdown: React.FC<PaymentBreakdownProps> = ({ data }) => {
    const rows: PaymentBreakdownRow[] = data
        .filter((row) => row.type !== 'credit')
        .map((row) => ({ type: row.type, label: row.label, total: row.total }));

    return <PaymentMethodBreakdown data={rows} />;
};

export default PaymentBreakdown;
