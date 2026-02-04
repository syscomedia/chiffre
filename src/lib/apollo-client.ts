import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
    link: new HttpLink({
        uri: '/api/graphql',
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'network-only',
            nextFetchPolicy: 'network-only',
        },
        query: {
            fetchPolicy: 'network-only',
        },
    },
});

export default client;
