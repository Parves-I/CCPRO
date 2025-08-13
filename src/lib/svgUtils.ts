'use client';
import { renderToStaticMarkup } from 'react-dom/server';

function toBase64(str: string): string {
    if (typeof window !== 'undefined') {
        return window.btoa(unescape(encodeURIComponent(str)));
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
        const svgDataUrl = `data:image/svg+xml;base64,${toBase64(svgString)}`;


        const img = new Image();
        img.width = width;
        img.height = height;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const pngDataUrl = canvas.toDataURL('image/png');
            resolve(pngDataUrl);
        };

        img.onerror = (error) => {
            console.error('Error loading SVG image:', error);
            reject(error);
        };

        img.src = svgDataUrl;
    });
};
