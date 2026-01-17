import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Button({ children, variant = 'primary', className, ...props }) {
    const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
        danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
        success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20",
        outline: "border border-slate-700 hover:border-pokemon-500 text-slate-300 hover:text-white"
    };

    return (
        <button
            className={twMerge(base, variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
}
