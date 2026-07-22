import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { DataTable } from '../../../components/ui/DataTable';
import type { CashMovement } from '../../../interfaces/cash';

interface MovementsTableProps {
    movements: CashMovement[];
}

export const MovementsTable: React.FC<MovementsTableProps> = ({ movements }) => {
    return (
        <Card>
            <p className="text-sm font-semibold text-slate-700 mb-4">Movimientos de Caja</p>
            <DataTable
                data={movements}
                columns={[
                    {
                        accessorKey: 'type',
                        header: 'Tipo',
                        cell: (row) => (
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                            >
                                {row.type === 'income' ? (
                                    <TrendingUp size={12} />
                                ) : (
                                    <TrendingDown size={12} />
                                )}
                                {row.type_display}
                            </span>
                        ),
                    },
                    {
                        accessorKey: 'amount',
                        header: 'Monto',
                        cell: (row) => `C$${parseFloat(row.amount).toFixed(2)}`,
                    },
                    { accessorKey: 'reason', header: 'Motivo' },
                    { accessorKey: 'created_by_name', header: 'Creado por' },
                    {
                        accessorKey: 'created_at',
                        header: 'Fecha',
                        cell: (row) => new Date(row.created_at).toLocaleString(),
                    },
                ]}
            />
        </Card>
    );
};
