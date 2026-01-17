import React from 'react';
import { twMerge } from 'tailwind-merge';

export function Card({ children, className, ...props }) {
    return (
        <div className={twMerge("bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl", className)} {...props}>
            {children}
        </div>
    );
}
