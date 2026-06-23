'use client'

interface LanguageSelectorProps {
    value: string
    onChange: (lang: string) => void
    label?: string
}

const LANGUAGES: Record<string, string> = {
    ja: 'Japanese',
    en: 'English',
    zh: 'Chinese',
    ko: 'Korean',
}

export default function LanguageSelector({ value, onChange, label }: LanguageSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            {label && <span className="text-xs text-[var(--color-text-muted)]">{label}</span>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 focus:ring-2 focus:ring-blue-300 focus:outline-none text-[var(--color-text)]"
            >
                {Object.entries(LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                ))}
            </select>
        </div>
    )
}
