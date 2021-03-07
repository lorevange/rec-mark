import React from 'react';
import { enableScreens } from 'react-native-screens';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import ReduxThunk from 'redux-thunk';

import recordingsReducer from './store/rec-reducer';
import { init } from './helpers/db';
import MainNavigator from './navigators/MainNavigator';

init().then(() => {
  console.log('Initialized Database!')
}).catch(err => {
  console.log('Initializing db failed :(');
  console.log(err);
});

const rootReducer = combineReducers({
  recordings: recordingsReducer
});

const store = createStore(rootReducer, applyMiddleware(ReduxThunk));

enableScreens();

export default function App() {

  return (
    <Provider store={store}>
      <MainNavigator />
    </Provider>
  );
};
