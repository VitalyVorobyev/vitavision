export type ThemeVariant = 'aubergine' | 'pine' | 'oxblood';

export const THEME_VARIANTS: ThemeVariant[] = ['aubergine', 'pine', 'oxblood'];

export const VARIANT_SWATCHES: Record<ThemeVariant, { accent: string; label: string }> = {
    aubergine: { accent: '#5B2B82', label: 'Aubergine' },
    pine:      { accent: '#0F766E', label: 'Pine'      },
    oxblood:   { accent: '#7A1F2B', label: 'Oxblood'   },
};
