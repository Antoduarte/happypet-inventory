/**
 * SaleTicket constants
 *
 * Physical ticket dimensions and formatting constants for POS thermal printers.
 * Based on standard 80mm thermal roll format (~40 chars per line).
 */

export const SALE_TICKET_WIDTH_MM = 80;

export const SALE_TICKET_CHARS_PER_LINE = 40;

export const SALE_TICKET_FONT_FAMILY = "'Courier New', Courier, monospace";

export const SALE_TICKET_LINE_CHAR = '-';

export const SALE_TICKET_SOLID_LINE_CHAR = '=';

export const SALE_TICKET_FOOTER_MESSAGE = '¡Gracias por su compra!';

export const SALE_TICKET_BUSINESS_NAME = 'HappyPet';

export const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    qr: 'QR',
    credit: 'Crédito',
};
