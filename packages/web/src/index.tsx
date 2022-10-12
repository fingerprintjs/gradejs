import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Provider as RollbarProvider, ErrorBoundary, LEVEL_WARN } from '@rollbar/react';
import { BrowserRouter } from 'react-router-dom';
import { createApplicationStore } from './store';
import { App } from './components/App';
import { initAnalytics } from './services/analytics';
import 'styles/global.scss';
import { Env, getEnv, getProdEnv } from '../../shared/src/utils/env';

declare global {
  interface Window {
    __INITIAL_STATE__?: object;
  }
}

const store = createApplicationStore([], window.__INITIAL_STATE__ ?? {});
const locationChangeHandler = initAnalytics();

const rollbarConfig = {
  accessToken: getEnv(Env.RollbarApiKey),
  environment: `frontend_${getProdEnv()}`,
};

ReactDOM.hydrate(
  <RollbarProvider config={rollbarConfig}>
    <ErrorBoundary level={LEVEL_WARN}>
      <Provider store={store}>
        <BrowserRouter>
          <App locationChangeHandler={locationChangeHandler} />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </RollbarProvider>,
  document.getElementById('app')
);
