import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSale } from '../../hooks/useSale';
import { SaleTicket } from '../../components/ui/SaleTicket';

export const SaleTicketPrintPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { currentSale, isLoading, error, fetchSaleById } = useSale();

    useEffect(() => {
        if (!id) return;
        fetchSaleById(Number(id));
    }, [id, fetchSaleById]);

    useEffect(() => {
        if (!currentSale || isLoading || error) return;
        window.print();
    }, [currentSale, isLoading, error]);

    if (isLoading) {
        return (
            <div style={{ fontFamily: 'Courier New', padding: 10, fontSize: 12 }}>
                Cargando ticket...
            </div>
        );
    }

    if (error || !currentSale) {
        return (
            <div style={{ fontFamily: 'Courier New', padding: 10, fontSize: 12 }}>
                No se pudo cargar la venta.
            </div>
        );
    }

    return <SaleTicket sale={currentSale} />;
};
