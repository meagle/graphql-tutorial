import React, { Component } from 'react';
import { BrowserRouter, Link, Route, Switch } from 'react-router-dom';
import './App.css';

import { ApolloLink } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { toIdValue, getMainDefinition } from 'apollo-utilities';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';
import { setContext } from 'apollo-link-context';
import ChannelsListWithData from './components/ChannelsListWithData';
import NotFound from './components/NotFound';
import ChannelDetails from './components/ChannelDetails';

const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' });

const wsLink = new WebSocketLink({
  uri: 'ws://localhost:4000/subscriptions',
  options: {
    reconnect: true,
  },
});

// const hasSubscriptionOperation = ({ query: { definitions } }) =>
//   definitions.some(
//     ({ kind, operation }) =>
//       kind === 'OperationDefinition' && operation === 'subscription'
//   );

const hasSubscriptionOperation = ({ query }) => {
  const { kind, operation } = getMainDefinition(query);
  return kind === 'OperationDefinition' && operation === 'subscription';
};

const asyncMiddleware = setContext(
  request =>
    new Promise((success, fail) => {
      // fake some async lookup here and simulate a 500 ms delay
      setTimeout(() => {
        success({});
      }, 500);
    })
);

const httpLinkWithMiddleware = asyncMiddleware.concat(httpLink);

const link = ApolloLink.split(
  hasSubscriptionOperation,
  wsLink,
  httpLinkWithMiddleware
);

function dataIdFromObject(result) {
  if (result.__typename) {
    if (result.id !== undefined) {
      return `${result.__typename}:${result.id}`;
    }
  }
  return null;
}

const cache = new InMemoryCache({
  // fragmentMatcher: // matcher,
  dataIdFromObject,
  addTypename: true,

  // Since the channels and channel queries result in different paths
  // to the same object, Apollo Client doesn’t know that they are the
  // same unless you explicitly tell it that the channel query might
  // resolve to an object that was retrieved by the channels query. We
  // can tell Apollo Client about this relationship by adding a custom
  // resolver to the ApolloClient constructor in App.js. This custom
  // resolver tells Apollo Client to check its cache for a Channel
  // object with ID $channelId whenever we make a channel query. If
  // it finds a channel with that ID in the cache, it will not make
  // a request to the server.
  cacheResolvers: {
    Query: {
      channel: (_, args) => {
        return toIdValue(
          dataIdFromObject({ __typename: 'Channel', id: args['id'] })
        );
      },
    },
  },
});

const client = new ApolloClient({
  link,
  cache: cache.restore(window.__APOLLO_STATE__ || {}),
});

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <BrowserRouter>
          <div className="App">
            <Link to="/" className="navbar">
              React + GraphQL Tutorial
            </Link>
            <Switch>
              <Route exact path="/" component={ChannelsListWithData} />
              <Route path="/channel/:channelId" component={ChannelDetails} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </BrowserRouter>
      </ApolloProvider>
    );
  }
}

const WrappedApp = (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);

export default WrappedApp;
