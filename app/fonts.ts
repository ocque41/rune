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
