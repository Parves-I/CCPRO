'use client';
import { renderToStaticMarkup } from 'react-dom/server';

function toBase64(str: string): string {
    if (typeof window !== 'undefined') {
        return window.btoa(str);
    }
    return Buffer.from(str).toString('base64');
}


export const svgToPng = (svgComponent: React.ReactElement, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            // Cannot render on server, return empty or placeholder
            resolve('');
            return;
        }
        
        const svgString = renderToStaticMarkup(svgComponent);
        const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svg);

        const img = new Image();
        img.width = width;
        img.height = height;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Canvas context not available'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const pngDataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(pngDataUrl);
        };

        img.onerror = (error) => {
            URL.revokeObjectURL(url);
            console.error('Error loading SVG image:', error);
            reject(error);
        };

        img.src = url;
    });
};
