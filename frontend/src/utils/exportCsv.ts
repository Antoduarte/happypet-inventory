import type { SaleDetailRow } from '../interfaces/report';

/** Escapes a value for safe inclusion in a CSV cell. */
const escapeCell = (value: string | number): string => {
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const rowsToCsv = (rows: (string | number)[][]): string =>
    rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

/** Triggers a client-side download of a CSV file. */
const downloadCsv = (content: string, filename: string): void => {
    // Prepend BOM so Excel detects UTF-8 (correct accents in español).
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    qr: 'QR',
    credit: 'Crédito',
};

const itemTypeLabel = (type: string, isSupply: boolean): string => {
    if (isSupply) return 'Insumo';
    return type === 'service' ? 'Servicio' : 'Producto';
};

const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Builds a CSV from the ticket-level sales detail (one row per item line,
 * ticket context repeated) and downloads it. Generated fully client-side.
 */
export const exportSalesDetailCsv = (rows: SaleDetailRow[], start: string, end: string): void => {
    const csvRows: (string | number)[][] = [];

    csvRows.push(['Detalle de Ventas']);
    csvRows.push(['Desde', start, 'Hasta', end]);
    csvRows.push([]);

    csvRows.push([
        'Ticket',
        'Fecha',
        'Hora',
        'Vendedor',
        'Pago',
        'Tipo',
        'Detalle',
        'Cantidad',
        'P. Unit',
        'Total línea',
        'Total ticket',
    ]);

    rows.forEach((sale) => {
        sale.items.forEach((item) => {
            csvRows.push([
                `#${sale.id}`,
                formatDate(sale.sale_date),
                formatTime(sale.sale_date),
                sale.seller_name,
                PAYMENT_LABELS[sale.payment_type] ?? sale.payment_type,
                itemTypeLabel(item.type, item.is_supply),
                item.name,
                String(Number(item.quantity)),
                item.price_per_item,
                item.total_price,
                sale.total_price,
            ]);
        });
    });

    downloadCsv(rowsToCsv(csvRows), `detalle-ventas-${start}_${end}.csv`);
};
