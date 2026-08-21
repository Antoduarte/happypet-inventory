import React from 'react';
import { TrendingUp, TrendingDown, ChartNoAxesCombined } from 'lucide-react';
import { MetricCard } from '../../../components/ui/MetricCard';
import { formatCurrency } from '../../../utils/format';
import type { CashReport } from '../../../interfaces/cash';

interface CashReportSummaryProps {
    report: CashReport | null;
    isLoading: boolean;
}

/**
 * Renders the cash report summary cards: income, expense and balance.
 */
export const CashReportSummary: React.FC<CashReportSummaryProps> = ({ report, isLoading }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
                label="Ingresos de caja"
                value={report ? formatCurrency(report.total_income) : '—'}
                icon={TrendingUp}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                isLoading={isLoading}
            />
            <MetricCard
                label="Egresos de caja"
                value={report ? formatCurrency(report.total_expense) : '—'}
                icon={TrendingDown}
                iconBg="bg-rose-100"
                iconColor="text-rose-600"
                isLoading={isLoading}
            />
            <MetricCard
                label="Resultado neto"
                value={report ? formatCurrency(report.balance) : '—'}
                icon={ChartNoAxesCombined}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                isLoading={isLoading}
            />
        </div>
    );
};
