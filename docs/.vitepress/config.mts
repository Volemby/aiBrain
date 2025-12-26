import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "AI Brain",
    description: "Repo Scanned -> Inspector Gadget",
    appearance: 'dark', // Force dark mode for that "slick" look
    cleanUrls: true,
    base: '/aiBrain/',

    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        logo: '/logo.svg', // Placeholder, we might need a logo later
        siteTitle: 'AI Brain',

        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'Reference', link: '/reference/config' }
        ],

        sidebar: [
            {
                text: 'Guide',
                items: [
                    { text: 'Getting Started', link: '/guide/getting-started' },
                    { text: 'How it Works', link: '/guide/how-it-works' }
                ]
            },
            {
                text: 'Reference',
                items: [
                    { text: 'CLI Commands', link: '/reference/cli' },
                    { text: 'Configuration', link: '/reference/config' },
                    { text: 'Rules DSL', link: '/reference/rules' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/Volemby/aiBrain' }
        ],

        footer: {
            message: 'Released under the ISC License.',
            copyright: 'Copyright © 2024 Vojtech Horak'
        },

        search: {
            provider: 'local'
        }
    }
})
