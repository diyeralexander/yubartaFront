
import React from 'react';
import { SpinnerIcon } from './icons';

// --- DESIGN TOKENS (Yubarta Enterprise) ---
// Colors hardcoded to ensure consistency across the app without tailwind config
const COLORS = {
    primary900: "text-[#003F4A]",
    primary700: "text-[#005B6A]",
    primary500: "bg-[#007A8A]",
    primary500Hover: "hover:bg-[#005B6A]",
    neutral50: "bg-[#FAFBFC]",
    neutral100: "bg-[#F5F7F8]",
    neutral300: "border-[#D6D6D6]",
    neutral500: "text-[#7A7A7A]",
    neutral900: "text-[#0A0A0A]",
};

const STYLES = {
    card: "bg-white rounded-xl border border-[#D6D6D6] shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200",
    cardHover: "hover:shadow-[0_8px_16px_rgba(0,0,0,0.04)] hover:border-[#ADF1E2]", // Secondary 300 on hover
    headerTitle: `text-2xl md:text-3xl font-bold ${COLORS.primary900} tracking-tight`,
    headerSubtitle: `text-[#7A7A7A] text-sm mt-1 font-medium`,
    sectionTitle: `text-lg font-bold text-[#3D3D3D] mb-4 px-1 flex items-center gap-2`,
};

// --- TABLE COMPONENTS (Enterprise Style) ---
export const Table = React.memo(({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-xl border border-[#D6D6D6] overflow-hidden shadow-sm ${className}`}>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                {children}
            </table>
        </div>
    </div>
));

export const TableHead = React.memo(({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-[#F5F7F8] border-b border-[#D6D6D6]">
        <tr>{children}</tr>
    </thead>
));

export interface TableRowProps {
    children?: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

export const TableRow = React.memo(({ children, onClick, className = '' }: TableRowProps) => (
    <tr 
        onClick={onClick} 
        className={`border-b border-[#F5F7F8] last:border-0 transition-colors ${onClick ? 'cursor-pointer hover:bg-[#F5F7F8]' : ''} ${className}`}
    >
        {children}
    </tr>
));

export const TableCell = React.memo(({ children, className = '', isHeader = false, align = 'left' }: { children?: React.ReactNode, className?: string, isHeader?: boolean, align?: 'left'|'center'|'right' }) => {
    const Component = isHeader ? 'th' : 'td';
    // Header text: Neutral 700, slightly smaller, uppercase tracking
    const baseClass = isHeader 
        ? "px-6 py-4 text-xs font-semibold text-[#3D3D3D] uppercase tracking-wider" 
        : "px-6 py-4 text-sm text-[#0A0A0A] font-medium whitespace-nowrap";
    
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
        <Component className={`${baseClass} ${alignClass} ${className}`}>
            {children}
        </Component>
    );
});


// --- BUTTONS ---
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' | 'white';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.memo(({ children, variant = 'primary', isLoading, icon: Icon, className = '', disabled, fullWidth, size = 'md', ...props }: ButtonProps) => {
  const sizeClasses = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2 text-sm",
      lg: "px-6 py-3 text-base"
  };

  // Primary 500 is #007A8A
  const baseStyles = `inline-flex items-center justify-center font-medium rounded-lg transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${sizeClasses[size]}`;
  
  const variants = {
    primary: "bg-[#007A8A] text-white hover:bg-[#005B6A] shadow-sm focus:ring-[#007A8A] border border-transparent",
    secondary: "bg-white text-[#3D3D3D] hover:bg-[#F5F7F8] border border-[#D6D6D6] shadow-sm focus:ring-[#7A7A7A]",
    outline: "bg-transparent text-[#007A8A] border border-[#007A8A] hover:bg-[#D7EEF0] focus:ring-[#007A8A]",
    danger: "bg-white text-[#B63A3A] border border-[#FCEAEA] hover:bg-[#FCEAEA] focus:ring-[#B63A3A] shadow-sm",
    success: "bg-[#2E8B57] text-white hover:bg-[#257245] shadow-sm focus:ring-[#2E8B57] border border-transparent",
    ghost: "bg-transparent text-[#7A7A7A] hover:text-[#0A0A0A] hover:bg-[#F5F7F8] shadow-none",
    white: "bg-white text-[#007A8A] hover:bg-[#FAFBFC] border border-transparent shadow-md",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
});

// --- BADGES ---
// Using exact system state colors
export type BadgeVariant = 'gray' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'orange' | 'teal';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ElementType;
}

export const Badge = React.memo(({ children, variant = 'gray', className = '', icon: Icon }: BadgeProps) => {
  const variants = {
    // Neutral
    gray: "bg-[#F5F7F8] text-[#7A7A7A] border-[#D6D6D6]",
    // Success
    green: "bg-[#E6F4EC] text-[#2E8B57] border-[#2E8B57]/20",
    // Error
    red: "bg-[#FCEAEA] text-[#B63A3A] border-[#B63A3A]/20",
    // Warning
    yellow: "bg-[#FFF7DA] text-[#C98B00] border-[#C98B00]/20",
    // Info / Blue
    blue: "bg-[#D7EEF0] text-[#005B6A] border-[#005B6A]/20",
    // Custom accents
    teal: "bg-[#E3FAF6] text-[#007A8A] border-[#6FD6C2]",
    purple: "bg-[#F5F0FF] text-[#6B21A8] border-[#E9D5FF]",
    orange: "bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-3 h-3 mr-1.5 opacity-80" />}
      {children}
    </span>
  );
});

// --- CARDS ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card = React.memo(({ children, className = '', onClick, hoverable, ...props }: CardProps) => (
  <div 
    onClick={onClick}
    className={`${STYLES.card} ${onClick || hoverable ? STYLES.cardHover + ' cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
));

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}

export const CardHeader = React.memo(({ title, subtitle, action, icon: Icon }: CardHeaderProps) => (
  <div className="px-6 py-5 border-b border-[#F5F7F8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FAFBFC] rounded-t-xl">
    <div className="flex items-center gap-3">
        {Icon && (
            <div className="p-2 bg-white border border-[#D6D6D6] rounded-lg text-[#7A7A7A] shadow-sm">
                <Icon className="w-5 h-5"/>
            </div>
        )}
        <div>
            <h3 className="text-lg font-bold text-[#0A0A0A] leading-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-[#7A7A7A] font-medium">{subtitle}</p>}
        </div>
    </div>
    {action && <div>{action}</div>}
  </div>
));

export interface CardContentProps {
  children?: React.ReactNode;
  className?: string;
}

export const CardContent = React.memo(({ children, className = '' }: CardContentProps) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
));

// --- TABS ---
export interface TabItem {
    id: string;
    label: string;
    count?: number;
    icon?: React.ElementType;
}

export const Tabs = React.memo(({ tabs, activeTab, onChange }: { tabs: TabItem[], activeTab: string, onChange: (id: any) => void }) => {
    return (
        <div className="bg-white p-1 rounded-xl border border-[#D6D6D6] inline-flex shadow-sm mb-8 overflow-x-auto max-w-full">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button 
                        key={tab.id} 
                        onClick={() => onChange(tab.id)} 
                        className={`
                            flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap gap-2
                            ${isActive 
                                ? 'bg-[#003F4A] text-white shadow-sm' 
                                : 'text-[#7A7A7A] hover:text-[#0A0A0A] hover:bg-[#F5F7F8]'
                            }
                        `}
                    >
                        {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7A7A7A]'}`} />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ml-1 ${isActive ? 'bg-[#005B6A] text-[#D7EEF0]' : 'bg-[#F5F7F8] text-[#7A7A7A] border border-[#D6D6D6]'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    );
});

// --- PAGE LAYOUTS ---
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backAction?: () => void;
}

export const PageHeader = React.memo(({ title, subtitle, actions, backAction }: PageHeaderProps) => (
  <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6 animate-fade-in">
    <div>
        {backAction && (
            <button onClick={backAction} className="text-sm font-semibold text-[#007A8A] hover:text-[#005B6A] mb-3 flex items-center gap-1 transition-colors">
                <span>&larr;</span> Volver
            </button>
        )}
        <h1 className={STYLES.headerTitle}>{title}</h1>
        {subtitle && <p className={STYLES.headerSubtitle}>{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
));

export interface SectionProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Section = React.memo(({ title, children, className = '', action }: SectionProps) => (
  <section className={`mb-10 ${className} animate-fade-in`}>
    {(title || action) && (
        <div className="flex justify-between items-end mb-4 px-1">
            {title && <h2 className={STYLES.sectionTitle}>{title}</h2>}
            {action && <div>{action}</div>}
        </div>
    )}
    {children}
  </section>
));

// --- EMPTY STATES ---
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}

export const EmptyState = React.memo(({ title, description, action, icon: Icon }: EmptyStateProps) => (
  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#D6D6D6] flex flex-col items-center justify-center">
    <div className="h-14 w-14 bg-[#FAFBFC] rounded-full flex items-center justify-center text-[#D6D6D6] mb-4 border border-[#F5F7F8]">
      {Icon ? <Icon className="w-7 h-7" /> : (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 06.586 13H4" />
          </svg>
      )}
    </div>
    <h3 className="text-lg font-bold text-[#0A0A0A]">{title}</h3>
    <p className="mt-1 text-sm text-[#7A7A7A] max-w-sm mx-auto mb-6 leading-relaxed">{description}</p>
    {action}
  </div>
));

// --- STAT CARD ---
export const StatCard = React.memo(({ label, value, icon: Icon, color = 'indigo', subValue }: { label: string, value: string | number, icon: React.ElementType, color?: string, subValue?: string }) => {
    // Mapping generic color names to Yubarta Palette if needed, or keeping standard Tailwind for variety
    const colorClasses: Record<string, string> = {
        teal: "bg-[#D7EEF0] text-[#005B6A]",
        amber: "bg-[#FFF7DA] text-[#C98B00]",
        indigo: "bg-[#E3FAF6] text-[#007A8A]", // Mapping indigo prop to Secondary style for consistency
        rose: "bg-[#FCEAEA] text-[#B63A3A]",
    };
    
    return (
        <Card className="p-6 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">{label}</span>
                <div className={`p-2.5 rounded-lg ${colorClasses[color] || colorClasses.indigo}`}>
                    <Icon className="w-5 h-5"/>
                </div>
            </div>
            <div>
                <span className="text-3xl font-bold text-[#0A0A0A] tracking-tight">{value}</span>
                {subValue && <p className="text-sm font-medium text-[#7A7A7A] mt-1">{subValue}</p>}
            </div>
        </Card>
    )
});
