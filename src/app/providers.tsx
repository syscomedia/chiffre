'use client';

import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apollo-client';

export default function Providers({ children }: { children: React.ReactNode }) {
    // Suppress noisy extension errors (like "message channel closed")
    if (typeof window !== 'undefined') {
        const originalError = console.error;
        console.error = (...args) => {
            if (args[0]?.message?.includes?.('message channel closed') ||
                (typeof args[0] === 'string' && args[0].includes('message channel closed'))) {
                return;
            }
            originalError.apply(console, args);
        };

        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason?.message?.includes('message channel closed')) {
                event.preventDefault();
            }
        });
    }

    return (
        <ApolloProvider client={client}>
            {children}
        </ApolloProvider>
    );
}
