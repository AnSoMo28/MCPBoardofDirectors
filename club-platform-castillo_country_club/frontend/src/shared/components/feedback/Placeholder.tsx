import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

export function Placeholder({ title, subtitle }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center">
        <Construction className="w-8 h-8 text-[var(--color-gold)]" />
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-charcoal)]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[var(--color-stone)] text-lg font-[family-name:var(--font-body)]">
          {subtitle}
        </p>
      )}
      <div className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/20">
        <p className="text-sm text-[var(--color-stone)] font-[family-name:var(--font-mono)]">
          Próximamente
        </p>
      </div>
    </div>
  );
}
