/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        },
        extend: {
            colors: {
                bg: {
                    primary: '#06090C',
                    surface: '#0F1419',
                    elevated: '#161D26',
                },
                brand: {
                    primary: '#1ED760',
                    secondary: '#3B82F6',
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#D1D5DB',
                    muted: '#9CA3AF',
                },
                danger: '#EF4444',
            },
            spacing: {
                xs: '8px',
                sm: '12px',
                md: '16px',
                lg: '24px',
                xl: '32px',
                safe: 'env(safe-area-inset-bottom, 0px)',
                'safe-top': 'env(safe-area-inset-top, 0px)',
            },
            borderRadius: {
                card: '16px',
                'card-lg': '20px',
                pill: '999px',
            },
            fontSize: {
                'timer': ['80px', { lineHeight: '1', fontWeight: '700' }],
                'timer-sm': ['64px', { lineHeight: '1', fontWeight: '700' }],
                'timer-lg': ['96px', { lineHeight: '1', fontWeight: '700' }],
                'distance': ['48px', { lineHeight: '1.05', fontWeight: '700' }],
                'distance-lg': ['56px', { lineHeight: '1.05', fontWeight: '700' }],
                'metric': ['36px', { lineHeight: '1.1', fontWeight: '700' }],
                'metric-lg': ['40px', { lineHeight: '1.1', fontWeight: '700' }],
                'display-lg': ['56px', { lineHeight: '1.2', fontWeight: '700' }],
                'display-md': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
                'hero': ['44px', { lineHeight: '1.05', fontWeight: '700' }],
                'hero-lg': ['56px', { lineHeight: '1.05', fontWeight: '700' }],
                'title': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
                'subtitle': ['17px', { lineHeight: '1.4', fontWeight: '400' }],
                'label': ['11px', { lineHeight: '1.3', fontWeight: '600' }],
                'label-cap': ['10px', { lineHeight: '1.3', fontWeight: '600' }],
            },
            boxShadow: {
                'button': '0 12px 40px -8px rgba(30, 215, 96, 0.5), 0 0 0 2px rgba(255,255,255,0.12)',
                'button-glow': '0 0 60px -8px rgba(30, 215, 96, 0.55)',
                'card': '0 8px 32px rgba(0, 0, 0, 0.5), 0 1px 0 0 rgba(255,255,255,0.06)',
                'card-hover': '0 12px 40px rgba(0, 0, 0, 0.55), 0 1px 0 0 rgba(255,255,255,0.08)',
                'stop': '0 12px 36px -6px rgba(239, 68, 68, 0.5), 0 0 0 2px rgba(255,255,255,0.1)',
                'stop-ring': '0 0 0 4px rgba(239, 68, 68, 0.25), 0 16px 48px -12px rgba(0,0,0,0.5)',
                'bar': '0 -4px 24px rgba(0, 0, 0, 0.35)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
            },
            animation: {
                'run-pulse': 'run-pulse 2s ease-in-out infinite',
            },
            keyframes: {
                'run-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.88' },
                },
            },
            maxWidth: {
                'app': '480px',
                'app-lg': '640px',
            },
        },
    },
    plugins: [],
};
