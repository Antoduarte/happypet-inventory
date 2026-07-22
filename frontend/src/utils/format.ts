/** Formats a number/decimal-string as Nicaraguan córdoba (C$). */
export const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const safe = Number.isFinite(num) ? num : 0;
    return `C$ ${safe.toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};
