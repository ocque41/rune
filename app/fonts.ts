import localFont from 'next/font/local'

export const anonymousPro = localFont({
    src: [
        {
            path: '../public/AnonymousPro-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../public/AnonymousPro-Italic.ttf',
            weight: '400',
            style: 'italic',
        },
        {
            path: '../public/AnonymousPro-Bold.ttf',
            weight: '700',
            style: 'normal',
        },
        {
            path: '../public/AnonymousPro-BoldItalic.ttf',
            weight: '700',
            style: 'italic',
        },
    ],
    variable: '--font-anonymous',
    display: 'swap',
})

export const draftingMono = localFont({
    src: [
        {
            path: '../public/DraftingMono-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../public/DraftingMono-Italic.ttf',
            weight: '400',
            style: 'italic',
        },
        {
            path: '../public/DraftingMono-Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../public/DraftingMono-MediumItalic.ttf',
            weight: '500',
            style: 'italic',
        },
        {
            path: '../public/DraftingMono-SemiBold.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../public/DraftingMono-SemiBoldItalic.ttf',
            weight: '600',
            style: 'italic',
        },
    ],
    variable: '--font-drafting',
    display: 'swap',
})
