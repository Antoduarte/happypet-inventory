export function formatStock(stock: string | number | null | undefined): string {
    if (stock === null || stock === undefined) return '0';
    const num = typeof stock === 'string' ? parseFloat(stock) : stock;
    if (isNaN(num)) return '0';
    return String(num);
}
