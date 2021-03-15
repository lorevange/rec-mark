import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import HomeScreen from '../screens/HomeScreen';
import ListeningScreen from '../screens/ListeningScreen';
import RecordingScreen from '../screens/RecordingScreen';
import Colors from '../constants/Colors';

const defaultStackNavOptions = {
    headerTitleAlign: 'center',
    headerTitleStyle: {
        color: Colors.primary
    }
}


const MainNavigator = createStackNavigator({
    Home: HomeScreen,
    Recording: RecordingScreen,
    Listening: ListeningScreen
}, {
    defaultNavigationOptions: defaultStackNavOptions
});

export default createAppContainer(MainNavigator);