import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import initDb from '@/lib/initDb';
import { NextRequest, NextResponse } from 'next/server';

// For Next.js App Router - increase body size limit
export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';

// Initialize DB tables
initDb();

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const handler = startServerAndCreateNextHandler(server);

export async function GET(request: Request) {
    return handler(request);
}

export async function POST(request: NextRequest) {
    // Check content length - 100MB limit
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
        return NextResponse.json(
            { error: 'Request body too large' },
            { status: 413 }
        );
    }

    try {
        // Read the body as text first to handle large payloads
        const body = await request.text();

        // Create a new request with the body
        const newRequest = new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: body,
        });

        return handler(newRequest);
    } catch (error) {
        console.error('GraphQL request error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
