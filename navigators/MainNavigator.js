import React from 'react';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import HomeScreen from '../Screens/HomeScreen';
import ListeningScreen from '../Screens/ListeningScreen';
import RecordingScreen from '../Screens/RecordingScreen';
import Colors from '../constants/Colors';

const defaultStackNavOptions = {
    headerStyle: {
        backgroundColor: Platform.OS === 'android' ? Colors.primary : ''
      },
      headerTintColor: Platform.OS === 'android' ? 'white' : Colors.primary,
      headerTitle: 'A Screen'
}


const MainNavigator = createStackNavigator({
    Home: HomeScreen,
    Recording: RecordingScreen,
    Listening: ListeningScreen
}, {
    defaultNavigationOptions: defaultStackNavOptions
});

export default createAppContainer(MainNavigator);