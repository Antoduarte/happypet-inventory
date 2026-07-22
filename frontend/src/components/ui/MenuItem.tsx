interface IProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className?: string;
}

export const MenuItem = ({ onClick, icon, label, className }: IProps) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-2.5 text-base cursor-pointer transition-colors w-full rounded-none ${className}`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
};
