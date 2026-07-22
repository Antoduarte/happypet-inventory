import React from 'react';
import type { Sale, SaleItem } from '../../interfaces/sale';
import {
    SALE_TICKET_FOOTER_MESSAGE,
    SALE_TICKET_BUSINESS_NAME,
    PAYMENT_LABELS,
} from './SaleTicket.constants';
import './SaleTicket.css';

interface SaleTicketProps {
    sale: Sale;
}

const formatPrice = (value: string): string => `C${parseFloat(value).toFixed(2)}`;

const formatDate = (isoDate: string): string => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatTime = (isoDate: string): string => {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const SaleTicketHeader: React.FC<{ sale: Sale }> = ({ sale }) => (
    <div className="sale-ticket__header">
        <div className="sale-ticket__row sale-ticket__row--center">{SALE_TICKET_BUSINESS_NAME}</div>
        <div className="sale-ticket__line sale-ticket__line--solid" />
        <div className="sale-ticket__meta">
            <span>Venta #{sale.id}</span>
            <span>
                {formatDate(sale.sale_date)} {formatTime(sale.sale_date)}
            </span>
        </div>
        <div className="sale-ticket__meta">
            <span>Método: {PAYMENT_LABELS[sale.payment_type] ?? sale.payment_type}</span>
        </div>
    </div>
);

const SaleTicketItemRow: React.FC<{ item: SaleItem }> = ({ item }) => {
    const name =
        item.type === 'product'
            ? (item.product?.name ?? item.presentation_name ?? '—')
            : (item.service?.name ?? '—');

    const qty = parseFloat(item.quantity).toFixed(2);
    const price = formatPrice(item.total_price);

    return (
        <div className="sale-ticket__item">
            <span className="sale-ticket__item-name">{name}</span>
            <span className="sale-ticket__item-qty">x{qty}</span>
            <span className="sale-ticket__item-price">{price}</span>
        </div>
    );
};

const SaleTicketItems: React.FC<{ items: SaleItem[] }> = ({ items }) => (
    <div className="sale-ticket__items">
        <div className="sale-ticket__line" />
        {items.map((item) => (
            <SaleTicketItemRow key={item.id} item={item} />
        ))}
    </div>
);

const SaleTicketTotals: React.FC<{ sale: Sale }> = ({ sale }) => {
    const subtotal = parseFloat(sale.subtotal);
    const discount = sale.discount_percentage;
    const surcharge = sale.surcharge_percentage;

    return (
        <div className="sale-ticket__totals">
            <div className="sale-ticket__line" />

            <div className="sale-ticket__row">
                <span>Subtotal</span>
                <span>{formatPrice(sale.subtotal)}</span>
            </div>

            {discount > 0 && (
                <div className="sale-ticket__adjustment">
                    <span>Descuento ({discount}%)</span>
                    <span>-{formatPrice(((subtotal * discount) / 100).toFixed(2))}</span>
                </div>
            )}

            {surcharge > 0 && (
                <div className="sale-ticket__adjustment">
                    <span>Recargo ({surcharge}%)</span>
                    <span>+{formatPrice(((subtotal * surcharge) / 100).toFixed(2))}</span>
                </div>
            )}

            {sale.surcharge_reason && surcharge > 0 && (
                <div className="sale-ticket__adjustment">
                    <span>{sale.surcharge_reason}</span>
                </div>
            )}

            <div className="sale-ticket__line sale-ticket__line--solid" />
            <div className="sale-ticket__total-row">
                <span>TOTAL</span>
                <span>{formatPrice(sale.total_price)}</span>
            </div>
        </div>
    );
};

const SaleTicketFooter: React.FC = () => (
    <div className="sale-ticket__footer">
        <div className="sale-ticket__line sale-ticket__line--solid" />
        {SALE_TICKET_FOOTER_MESSAGE}
        <div className="sale-ticket__line sale-ticket__line--solid" />
    </div>
);

export const SaleTicket: React.FC<SaleTicketProps> = ({ sale }) => {
    const ticketItems = sale.items.filter(
        (item) => !item.parent_service_item && (item.type === 'product' || item.type === 'service'),
    );

    return (
        <div className="sale-ticket">
            <SaleTicketHeader sale={sale} />
            <SaleTicketItems items={ticketItems} />
            <SaleTicketTotals sale={sale} />
            <SaleTicketFooter />
        </div>
    );
};
