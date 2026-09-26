import * as XLSX from 'xlsx';
import { getPaymentTypeLabel, formatPaymentSplit } from './payment';
import type { SaleDetailRow } from '../interfaces/report';
import type { CashMovement, GeneralMovement } from '../interfaces/cash';

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', hour12: false, minute: '2-digit' });
};

const toNumber = (value: string | number | null | undefined): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatAdjustment = (discountPct: number, surchargePct: number): string => {
    if (discountPct > 0) return `-${discountPct}%`;
    if (surchargePct > 0) return `+${surchargePct}%`;
    return '-';
};

const itemTypeLabel = (type: string, isSupply: boolean): string => {
    if (isSupply) return 'Insumo';
    return type === 'service' ? 'Servicio' : 'Producto';
};

const saveWorkbook = (workbook: XLSX.WorkBook, filename: string): void => {
    XLSX.writeFile(workbook, filename);
};

const createWorkbook = (sheet: XLSX.WorkSheet, sheetName: string): XLSX.WorkBook => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    return workbook;
};

// ---------------------------------------------------------------------------
// Sales detail report
// ---------------------------------------------------------------------------

export const exportSalesDetailExcel = (rows: SaleDetailRow[], start: string, end: string): void => {
    const data: (string | number)[][] = [
        [
            'Ticket',
            'Fecha',
            'Hora',
            'Fecha cobro',
            'Hora cobro',
            'Vendedor',
            'Pago',
            'Desglose Pago',
            'Tipo',
            'Detalle',
            'Cantidad',
            'P. Unitario',
            'Desc./Rec. item',
            'Total linea',
            'Desc./Rec. venta',
            'Total ticket',
        ],
    ];

    rows.forEach((sale) => {
        const paymentSplitText =
            sale.payment_type === 'mixed' && sale.payment_split
                ? formatPaymentSplit(sale.payment_split)
                : '';

        sale.items.forEach((item) => {
            data.push([
                `#${sale.id}`,
                formatDate(sale.sale_date),
                formatTime(sale.sale_date),
                sale.paid_at ? formatDate(sale.paid_at) : '-',
                sale.paid_at ? formatTime(sale.paid_at) : '-',
                sale.seller_name,
                getPaymentTypeLabel(sale.payment_type),
                paymentSplitText,
                itemTypeLabel(item.type, item.is_supply),
                item.name,
                toNumber(item.quantity),
                toNumber(item.price_per_item),
                formatAdjustment(item.discount_percentage, item.surcharge_percentage),
                toNumber(item.total_price),
                formatAdjustment(sale.discount_percentage, sale.surcharge_percentage),
                toNumber(sale.total_price),
            ]);
        });
    });

    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [
        { wch: 10 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 8 },
        { wch: 22 },
        { wch: 16 },
        { wch: 28 },
        { wch: 12 },
        { wch: 30 },
        { wch: 10 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
    ];

    const workbook = createWorkbook(sheet, 'Detalle de Ventas');
    saveWorkbook(workbook, `detalle-ventas-${start}_${end}.xlsx`);
};

// ---------------------------------------------------------------------------
// Cash movements report
// ---------------------------------------------------------------------------

export interface CashMovementsExcelPayload {
    movements: CashMovement[];
    start: string;
    end: string;
    totals?: { total_income: string; total_expense: string; balance: string } | null;
    typeFilter?: string;
    cashierId?: number | null;
}

export const exportCashMovementsExcel = ({
    movements,
    start,
    end,
    totals,
    typeFilter,
    cashierId,
}: CashMovementsExcelPayload): void => {
    const summary: (string | number)[][] = [
        ['Reporte', 'Movimientos de Caja'],
        ['Desde', start],
        ['Hasta', end],
        [
            'Filtro de tipo',
            typeFilter === 'income' ? 'Ingresos' : typeFilter === 'expense' ? 'Egresos' : 'Todos',
        ],
        ['Cajero ID', cashierId ?? 'Todos'],
    ];

    if (totals) {
        summary.push(
            [],
            ['Ingresos', toNumber(totals.total_income)],
            ['Egresos', toNumber(totals.total_expense)],
            ['Saldo', toNumber(totals.balance)],
        );
    }

    const detail: (string | number)[][] = [
        ['Fecha', 'Hora', 'Tipo', 'Motivo', 'Monto', 'Registrado por'],
        ...movements.map((movement) => [
            formatDate(movement.created_at),
            formatTime(movement.created_at),
            movement.type === 'income' ? 'Ingreso' : 'Egreso',
            movement.reason,
            toNumber(movement.amount) * (movement.type === 'income' ? 1 : -1),
            movement.created_by_name,
        ]),
    ];

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    const detailSheet = XLSX.utils.aoa_to_sheet(detail);
    detailSheet['!cols'] = [
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 40 },
        { wch: 14 },
        { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Movimientos');

    saveWorkbook(workbook, `movimientos-caja-${start}_${end}.xlsx`);
};

// ---------------------------------------------------------------------------
// General movements report
// ---------------------------------------------------------------------------

export interface GeneralMovementsExcelPayload {
    movements: GeneralMovement[];
    start: string;
    end: string;
    summary?: { total_income: string; total_expense: string; balance: string } | null;
    typeFilter?: string;
    paymentMethodFilter?: string;
}

export const exportGeneralMovementsExcel = ({
    movements,
    start,
    end,
    summary,
    typeFilter,
    paymentMethodFilter,
}: GeneralMovementsExcelPayload): void => {
    const summaryRows: (string | number)[][] = [
        ['Reporte', 'Ingresos y Egresos'],
        ['Desde', start],
        ['Hasta', end],
        [
            'Filtro de tipo',
            typeFilter === 'income' ? 'Ingresos' : typeFilter === 'expense' ? 'Egresos' : 'Todos',
        ],
        [
            'Método de pago',
            paymentMethodFilter ? getPaymentTypeLabel(paymentMethodFilter) : 'Todos',
        ],
    ];

    if (summary) {
        summaryRows.push(
            [],
            ['Ingresos', toNumber(summary.total_income)],
            ['Egresos', toNumber(summary.total_expense)],
            ['Resultado neto', toNumber(summary.balance)],
        );
    }

    const detail: (string | number)[][] = [
        ['Tipo', 'Nombre', 'Descripción', 'Monto', 'Método', 'Fecha', 'Registrado por'],
        ...movements.map((movement) => [
            movement.type === 'income' ? 'Ingreso' : 'Egreso',
            movement.name,
            movement.description || '-',
            toNumber(movement.amount) * (movement.type === 'income' ? 1 : -1),
            getPaymentTypeLabel(movement.payment_method),
            formatDate(movement.date),
            movement.created_by_name,
        ]),
    ];

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    const detailSheet = XLSX.utils.aoa_to_sheet(detail);
    detailSheet['!cols'] = [
        { wch: 12 },
        { wch: 28 },
        { wch: 40 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Movimientos');

    saveWorkbook(workbook, `ingresos-egresos-${start}_${end}.xlsx`);
};
