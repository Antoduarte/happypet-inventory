import type { PaymentMethod, PaymentOptionValue } from '@/interfaces/sale';
import { PAYMENT_OPTIONS } from '@/utils/sales';

interface PaymentOptionsProps {
    watchedPaymentType: string;
    selectedMethods: PaymentMethod[];
    handleToggleMethod: (method: PaymentOptionValue) => void;
}

export const PaymentOptions = ({
    watchedPaymentType,
    selectedMethods,
    handleToggleMethod,
}: PaymentOptionsProps) => {
    return (
        <div
            className="grid grid-cols-2 md:flex md:flex-wrap md:gap-2"
            role="group"
            aria-label="Métodos de pago"
        >
            {PAYMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive =
                    opt.value === 'credit'
                        ? watchedPaymentType === 'credit'
                        : selectedMethods.includes(opt.value);
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="checkbox"
                        aria-checked={isActive}
                        onClick={() => handleToggleMethod(opt.value)}
                        className={[
                            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                            isActive
                                ? opt.activeClass
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                    >
                        <Icon size={15} className={isActive ? opt.iconClass : ''} aria-hidden />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};
