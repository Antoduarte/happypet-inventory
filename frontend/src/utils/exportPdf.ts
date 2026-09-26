import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './format';
import { formatPaymentSplit, getPaymentTypeLabel } from './payment';
import type { SaleDetailRow } from '../interfaces/report';
import type { CashMovement, GeneralMovement } from '../interfaces/cash';

const BRAND: [number, number, number] = [104, 10, 125];
const MUTED = 110;

const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', hour12: false, minute: '2-digit' });
};

/** Discount and surcharge are mutually exclusive; show whichever applies. */
const formatAdjustment = (discountPct: number, surchargePct: number): string => {
    if (discountPct > 0) return `-${discountPct}%`;
    if (surchargePct > 0) return `+${surchargePct}%`;
    return '-';
};

const itemTypeLabel = (type: string, isSupply: boolean): string => {
    if (isSupply) return 'Insumo';
    return type === 'service' ? 'Servicio' : 'Producto';
};

const lastTableEndY = (doc: jsPDF): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

const addHeader = (doc: jsPDF, title: string, metaLines: string[]): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...BRAND);
    doc.text(title, 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    let y = 22;
    metaLines.forEach((line) => {
        doc.text(line, 14, y);
        y += 5;
    });
    return y + 1;
};

const addSummaryGrid = (doc: jsPDF, startY: number, summary: string[][]): number => {
    autoTable(doc, {
        startY,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: BRAND, textColor: 255, fontSize: 8.5 },
        head: [summary.map(([label]) => label)],
        body: [summary.map(([, value]) => value)],
        columnStyles: Object.fromEntries(summary.map((_, i) => [i, { halign: 'right' as const }])),
    });
    return lastTableEndY(doc);
};

const savePdf = (doc: jsPDF, filename: string): void => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Pagina ${i} de ${pages}`,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'right' },
        );
    }
    doc.save(filename);
};

// ---------------------------------------------------------------------------
// Sales detail report
// ---------------------------------------------------------------------------

export const exportSalesDetailPdf = (
    rows: SaleDetailRow[],
    start: string,
    end: string,
    dateBasis: 'sale' | 'payment' = 'sale',
): void => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const generatedAt = new Date().toLocaleString('es-NI');
    const startY = addHeader(doc, 'Detalle de Ventas', [
        `Desde ${formatDate(start)}   Hasta ${formatDate(end)}   |   Generado: ${generatedAt}`,
        `Criterio de fecha: ${dateBasis === 'payment' ? 'Fecha de cobro' : 'Fecha de venta'}`,
    ]);

    const body: (string | number)[][] = [];
    rows.forEach((sale) => {
        const paymentSplitText =
            sale.payment_type === 'mixed' && sale.payment_split
                ? formatPaymentSplit(sale.payment_split)
                : '';
        sale.items.forEach((item) => {
            body.push([
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
                String(Number(item.quantity)),
                formatCurrency(item.price_per_item),
                formatAdjustment(item.discount_percentage, item.surcharge_percentage),
                formatCurrency(item.total_price),
                formatAdjustment(sale.discount_percentage, sale.surcharge_percentage),
                formatCurrency(sale.total_price),
            ]);
        });
    });

    autoTable(doc, {
        startY,
        margin: { left: 14, right: 14 },
        theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 1.2 },
        headStyles: { fillColor: BRAND, textColor: 255 },
        head: [
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
                'Cant.',
                'P. Unit',
                'Desc./Rec. item',
                'Total linea',
                'Desc./Rec. venta',
                'Total ticket',
            ],
        ],
        body,
        columnStyles: {
            6: { cellWidth: 18 },
            7: { cellWidth: 30 },
            10: { halign: 'right' },
            11: { halign: 'right', cellWidth: 18 },
            12: { halign: 'right' },
            13: { halign: 'right', cellWidth: 18 },
            14: { halign: 'right' },
            15: { halign: 'right', cellWidth: 18 },
        },
    });

    savePdf(doc, `detalle-ventas-${start}_${end}.pdf`);
};

// ---------------------------------------------------------------------------
// Cash movements report
// ---------------------------------------------------------------------------

export interface CashMovementsExportPayload {
    movements: CashMovement[];
    start: string;
    end: string;
    /** Optional aggregate totals from the cash report for the same period. */
    totals?: { total_income: string; total_expense: string; balance: string } | null;
    typeFilter?: string;
    cashierId?: number | null;
}

export const exportCashMovementsPdf = ({
    movements,
    start,
    end,
    totals,
    typeFilter,
    cashierId,
}: CashMovementsExportPayload): void => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const generatedAt = new Date().toLocaleString('es-NI');
    const typeText =
        typeFilter === 'income' ? 'Ingresos' : typeFilter === 'expense' ? 'Egresos' : 'Todos';
    const metaLines = [
        `Desde ${formatDate(start)}   Hasta ${formatDate(end)}   |   Generado: ${generatedAt}`,
    ];
    if (cashierId != null) {
        metaLines.push(`Cajero ID: ${cashierId}`);
    }
    let y = addHeader(doc, 'Movimientos de Caja', metaLines);

    if (totals) {
        y = addSummaryGrid(doc, y, [
            ['Ingresos', 'Egresos', 'Saldo'],
            [
                formatCurrency(totals.total_income),
                formatCurrency(totals.total_expense),
                formatCurrency(totals.balance),
            ],
        ]);
    }
    if (typeFilter) {
        doc.setFontSize(8.5);
        doc.setTextColor(MUTED);
        doc.text(`Filtro de tipo aplicado: ${typeText}`, 14, y + 4);
        y += 2;
    }

    const body = movements.map((movement) => [
        formatDate(movement.created_at),
        formatTime(movement.created_at),
        movement.type === 'income' ? 'Ingreso' : 'Egreso',
        movement.reason,
        `${movement.type === 'income' ? '+' : '-'}${formatCurrency(movement.amount)}`,
        movement.created_by_name,
    ]);

    autoTable(doc, {
        startY: y + 3,
        margin: { left: 14, right: 14 },
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: BRAND, textColor: 255 },
        head: [['Fecha', 'Hora', 'Tipo', 'Motivo', 'Monto', 'Registrado por']],
        body,
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 14 },
            2: { cellWidth: 18 },
            4: { halign: 'right', cellWidth: 28 },
        },
    });

    savePdf(doc, `movimientos-caja-${start}_${end}.pdf`);
};

// ---------------------------------------------------------------------------
// General movements (income / expense) report
// ---------------------------------------------------------------------------

export interface GeneralMovementsExportPayload {
    movements: GeneralMovement[];
    start: string;
    end: string;
    summary?: {
        total_income: string;
        total_expense: string;
        balance: string;
    } | null;
    typeFilter?: string;
    paymentMethodFilter?: string;
}

export const exportGeneralMovementsPdf = ({
    movements,
    start,
    end,
    summary,
    typeFilter,
    paymentMethodFilter,
}: GeneralMovementsExportPayload): void => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const generatedAt = new Date().toLocaleString('es-NI');
    const typeText =
        typeFilter === 'income' ? 'Ingresos' : typeFilter === 'expense' ? 'Egresos' : 'Todos';
    const methodText = paymentMethodFilter ? getPaymentTypeLabel(paymentMethodFilter) : 'Todos';
    const metaLines = [
        `Desde ${formatDate(start)}   Hasta ${formatDate(end)}   |   Generado: ${generatedAt}`,
        `Tipo: ${typeText}   |   Metodo: ${methodText}`,
    ];
    let y = addHeader(doc, 'Ingresos y Egresos', metaLines);

    if (summary) {
        y = addSummaryGrid(doc, y, [
            ['Ingresos', 'Egresos', 'Resultado neto'],
            [
                formatCurrency(summary.total_income),
                formatCurrency(summary.total_expense),
                formatCurrency(summary.balance),
            ],
        ]);
    }

    const body = movements.map((movement) => [
        movement.type === 'income' ? 'Ingreso' : 'Egreso',
        movement.name,
        movement.description || '-',
        `${movement.type === 'income' ? '+' : '-'}${formatCurrency(movement.amount)}`,
        getPaymentTypeLabel(movement.payment_method),
        formatDate(movement.date),
        movement.created_by_name,
    ]);

    autoTable(doc, {
        startY: y + 3,
        margin: { left: 14, right: 14 },
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: BRAND, textColor: 255 },
        head: [['Tipo', 'Nombre', 'Descripcion', 'Monto', 'Metodo', 'Fecha', 'Registrado por']],
        body,
        columnStyles: {
            0: { cellWidth: 16 },
            3: { halign: 'right', cellWidth: 26 },
            4: { cellWidth: 24 },
            5: { cellWidth: 22 },
        },
    });

    savePdf(doc, `ingresos-egresos-${start}_${end}.pdf`);
};
