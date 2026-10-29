const currencyFormatter = new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD',
});

export const formatCurrency = (amount: string | number | null | undefined): string =>
    currencyFormatter.format(Number(amount ?? 0));

export const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);
