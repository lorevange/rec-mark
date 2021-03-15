import React, { useEffect, useReducer } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Alert, FlatList } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons, FontAwesome, Entypo } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import TimeObject from '../models/TimeObject';
import { useInterval } from '../helpers/hooks';
import Colors from '../constants/Colors';
import ListRecMark from '../components/ListRecMark';
import MyModal from '../components/MyModal';
import Flag from '../models/Flag';

Notifications.setNotificationHandler({
    handleNotification: async () => {
        return {
            shouldShowAlert: true,
            shouldPlaySound: false
        }
    }
})

//Reducer function. Depending on the type of the action it modifies the state accordingly.
const reducer = (state, action) => {
    switch (action.type) {
        case 'updateInterval':
            return {
                ...state,
                time: action.time,
                points: action.points
            }
        case 'prepareRecording':
            return {
                ...state,
                time: action.time,
                baseTime: action.baseTime,
                recording: action.recording
            }
        case 'startRecording':
            return {
                ...state,
                isRecording: true,
                starting: true
            }
        case 'keepOnRecording': {
            return {
                ...state,
                baseTime: action.baseTime,
                isRecording: true
            }
        }
        case 'stop':
            return {
                ...state,
                isRecording: false,
                recording: null
            }
        case 'pause':
            return {
                ...state,
                paused: action.paused,
                isRecording: false
            }
        case 'setRecMarkTitle':
            return {
                ...state,
                recMarkTitle: action.text
            }
        case 'openModal':
            return {
                ...state,
                timeOfRecMark: action.timeOfRecMark,
                recMarkPosition: action.recMarkPosition,
                modalVisible: true,
                recMarkTitle: "Rec-Mark " + (state.flags.length + 1)
            }
        case 'addRecMark':
            return {
                ...state,
                modalVisible: false,
                recMarkTitle: '',
                timeOfRecMark: null
            }


        default:
            return state
    }
}

const RecordingScreen = props => {

    //State initialized on screen mounting
    const initialState = {
        recording: null,                                //The audio recording
        time: new TimeObject(0, 0, 0, 0),               //timeObject to show timer on screen
        baseTime: null,                                 //time when recording starts
        points: '',                                     //Recording...
        isRecording: false,                             //set to true when recording starts
        paused: false,                                  //on Android version <= 24 always false
        starting: false,                                //when starting recording set to true
        flags: [],                                      //list of rec-marks set while recording
        recMarkTitle: '',
        timeOfRecMark: 0,                               //position of rec-mark in ms
        recMarkPosition: new TimeObject(0, 0, 0, 0),    //position of recmark in timeObject
        modalVisible: false                             //opens modal if set to true, false to close it
    }

    //Setup of the reducer, dispatchState(action) with action = {type, params} will be used
    const [state, dispatchState] = useReducer(reducer, initialState);

    //The custom hook that runs every second to get the actual duration of the recording
    useInterval(() => {
        if (state.isRecording) {
            const newTime = getTime();
            const newPoints = getPoints();
            dispatchState({ type: 'updateInterval', time: newTime, points: newPoints });
        }
    }, 1000);

    //Sets function to be used by nav buttons
    useEffect(() => {
        props.navigation.setParams({
            toHomeScreen: toHomeScreenHandler,
        })
    }, [toHomeScreenHandler, state.recording]);

    //The helper function to run useInterval every second
    const getTime = () => {
        const date = new Date().getTime();
        const diffTime = Math.abs(date - state.baseTime);
        const hours = Math.floor(diffTime / 3600000);
        const minutes = Math.floor(diffTime / 60000) % 60;
        const seconds = Math.floor(diffTime / 1000) % 60;
        return new TimeObject(hours, minutes, seconds);
    }

    //The function to manage the three points: Recording --> Recording. --> Recording.. --> Recording...
    const getPoints = () => {
        if (state.points.length < 3) {
            return state.points + ".";
        }
        return '';
    };

    //When the recording button is pressed
    const startRecording = async () => {
        try {
            if (!state.recording) {
                //Permissions request
                console.log('Requesting permissions...');
                await Audio.requestPermissionsAsync();
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                //Start recording
                console.log('Starting recording...');
                //Initialization of my state
                const recording = new Audio.Recording();
                await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
                dispatchState({ type: 'prepareRecording', time: new TimeObject(0, 0, 0, 0), baseTime: new Date().getTime(), recording: recording });
                await recording.startAsync();
                dispatchState({ type: 'startRecording' });
                console.log('Recording started');
                //Launches notification to let the user know the app is recording
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Rec-Mark is recording',
                        body: 'Recording in progress...'
                    },
                    trigger: {
                        seconds: 1
                    }
                })
            } else if (state.paused) {
                const now = new Date().getTime();
                dispatchState({ type: 'keepOnRecording', baseTime: Math.abs(state.baseTime + now - state.paused) });
                await state.recording.startAsync();
                console.log('Recording started');
            }

        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Failure', 'Failed to start recording.', [{ text: 'Okay' }]);
        }
    }

    //When the stop button is pressed
    const stopRecording = async () => {
        console.log('Stopping recording...');
        const newRec = await state.recording.stopAndUnloadAsync();
        const uri = state.recording.getURI();
        dispatchState({ type: 'stop' });
        props.navigation.navigate('Listening', {
            audioUri: uri,
            duration: newRec.durationMillis,
            flags: state.flags
        })
    };

    //Pause button is pressed (not an option on Android versions <= 24)
    const pauseRecording = async () => {
        try {
            console.log('Pausing recording...');
            await state.recording.pauseAsync();
            dispatchState({ type: 'pause', paused: new Date().getTime() });
        } catch (err) {
            console.log(err);
        }
    }

    //When the home button is pressed
    const toHomeScreenHandler = () => {
        if (state.recording) {
            Alert.alert(
                "Are you sure?",
                "You're going back to the home screen without saving!",
                [
                    {
                        text: "Go Home without saving",
                        onPress: async () => {
                            console.log('Unloading recording...')
                            await state.recording.stopAndUnloadAsync();
                            dispatchState({ type: 'stop' });
                            props.navigation.goBack();
                        },
                        style: 'destructive'
                    },
                    { text: "Continue recording" }
                ]);
            return;
        }
        props.navigation.goBack();
    }

    //Updates the state when rec-mark title changes
    const recMarkTitleChangeHandler = text => {
        dispatchState({ type: 'setRecMarkTitle', text: text });
    }

    //Flag button is pressed, modal opens, sets parameters to save rec-mark
    const openModal = async () => {
        let position;
        try {
            const status = await state.recording.getStatusAsync();
            position = status.durationMillis;
        } catch (err) {
            console.log(err);
        }
        const newPosition = new TimeObject(
            Math.floor(position / 3600000),
            Math.floor(position / 60000) % 60,
            Math.floor(position / 1000) % 60,
            Math.floor(position) % 1000);
        dispatchState({ type: 'openModal', timeOfRecMark: position, recMarkPosition: newPosition });
    };

    //Closes modal, saves rec-mark in state.flags (push)
    const addRecMark = () => {
        if (state.recMarkTitle.length === 0) {
            Alert.alert("Invalid Rec-Mark title", "Please enter a valid title", [{ text: 'Okay' }]);
            return;
        }
        if (state.recMarkTitle.indexOf('~') !== -1 || state.recMarkTitle.indexOf('§') !== -1) {
            Alert.alert(
                "Invalid Rec-Mark title",
                "These characters are not allowed:\ntilde ~ and paragraph §",
                [
                    { text: "Ok" }
                ]);
            return;
        };
        const newFlag = new Flag(state.recMarkTitle, state.timeOfRecMark);
        state.flags.push(newFlag);
        dispatchState({ type: 'addRecMark' });
    }

    //Removes rec-mark on swipe left + delete button press
    const deleteRecMark = flag => {
        state.flags.splice(state.flags.indexOf(flag), 1);
        dispatchState({ type: 'force' });
    }

    //On long press of a rec-mark an alert with details is shown
    const detailShow = flag => {
        const position = new TimeObject(
            Math.floor(flag.timestamp / 3600000),
            Math.floor(flag.timestamp / 60000) % 60,
            Math.floor(flag.timestamp / 1000) % 60,
            Math.floor(flag.timestamp) % 1000);
        const postring = "Position: " + (position.hours ? position.hours + ':' : '') +
            (position.minutes < 10 ? '0' + position.minutes : position.minutes) + ':' +
            (position.seconds < 10 ? '0' + position.seconds : position.seconds) + '.' +
            (Math.floor(position.millis / 10) < 10 ? '0' + Math.floor(position.millis / 10) : Math.floor(position.millis / 10));
        Alert.alert(
            flag.title,
            postring,
            [
                { text: 'Done' },
                {
                    text: "Rename",
                    onPress: () => renameHandler(flag)
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteRecMark(flag)
                }]);
    }

    const renameHandler = flag => {
        dispatchState({ type: 'renameRecMark', flag: flag });
    }

    const renameRecMark = () => {
        const newFlag = new Flag(state.recMarkTitle, state.timeOfRecMark);
        const index = state.flags.findIndex(flag => flag.timestamp === newFlag.timestamp);
        state.flags.splice(index, 1, newFlag);
        dispatchState({ type: 'addRecMark' });
    }

    const closeModalHandler = () => {
        dispatchState({ type: 'addRecMark' });
    }

    let recButton = <View style={styles.flagContainer} >
        <TouchableOpacity activeOpacity={0.6} onPress={startRecording}>
            <FontAwesome name="microphone" size={60} color={Colors.primary} />
        </TouchableOpacity>
    </View>;

    let flagButtons = (
        <View style={styles.flagContainer}>
            <View style={styles.pauseStop}>
                <TouchableOpacity activeOpacity={0.6} onPress={pauseRecording}>
                    <Ionicons name={Platform.OS === 'android' ? "md-pause-circle-outline" : "ios-pause-circle-outline"} size={50} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                    <Entypo name="flag" size={70} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={stopRecording}>
                    <Ionicons name={Platform.OS === 'android' ? "md-stop-circle-outline" : "ios-stop-circle-outline"} size={50} color={Colors.primary} />
                </TouchableOpacity>
            </View>
        </View>)

    if (state.recording && state.starting) {
        recButton = <View style={styles.flagContainer} >
            <View style={styles.recSave}>
                <TouchableOpacity activeOpacity={0.6} onPress={startRecording}>
                    <FontAwesome name="microphone" size={60} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={stopRecording}>
                    <Ionicons name={Platform.OS === 'android' ? 'md-save' : 'ios-save'} size={50} color={Colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    }

    if (Platform.OS === 'android' && Device.platformApiLevel <= 24) {
        flagButtons = (
            <View style={styles.flagContainer}>
                <View style={styles.markStop}>
                    <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                        <Entypo name="flag" size={70} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.6} onPress={stopRecording}>
                        <Ionicons name={Platform.OS === 'android' ? "md-stop-circle-outline" : "ios-stop-circle-outline"} size={50} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>)
    }

    return (
        <View style={styles.container}>
            <View style={styles.timeViewIOS}>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                        {state.time.hours > 0 && (<Text>{state.time.hours}:</Text>)}
                        {state.time.minutes <= 9 ? <Text>0{state.time.minutes}:</Text> : <Text>{state.time.minutes}:</Text>}
                        {state.time.seconds <= 9 ? <Text>0{state.time.seconds}</Text> : <Text>{state.time.seconds}</Text>}
                    </Text>
                </View>
                <View style={{ paddingVertical: 20 }}>
                    <Text style={{ color: Colors.text }}>
                        {state.isRecording ? 'Recording' + state.points :
                            'Start recording!'}
                    </Text>
                </View>
            </View>
            <MyModal
                recMarkPosition={state.recMarkPosition}
                isVisible={state.modalVisible}
                titleValue={state.recMarkTitle}
                onChangeText={recMarkTitleChangeHandler}
                onSubmitEditing={addRecMark}
                onCloseModal={closeModalHandler}
                renaming={state.renaming}
                onRename={renameRecMark}
            />
            <FlatList
                style={styles.list}
                data={state.flags}
                keyExtractor={item => item.timestamp.toString()}
                renderItem={itemData => {
                    return <ListRecMark
                        title={itemData.item.title}
                        duration={itemData.item.timestamp}
                        onDelete={() => { deleteRecMark(itemData.item) }}
                        onSelect={() => { detailShow(itemData.item) }}
                        onRename={() => { renameHandler(itemData.item) }}
                    />
                }}
            />
            {state.isRecording ? flagButtons : recButton}
        </View>
    );
}

RecordingScreen.navigationOptions = navData => {
    const homeFunction = navData.navigation.getParam('toHomeScreen');
    return {
        headerTitle: 'New Recording',
        headerStyle: {
            backgroundColor: Colors.dark,
            shadowColor: 'transparent',
            elevation: 0
        },
        headerLeft: () => {
            return (
                <TouchableOpacity style={styles.headerButton} onPress={homeFunction}>
                    <Text style={styles.headerButtonText}>Home</Text>
                </TouchableOpacity>
            )
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.list
    },
    flagContainer: {
        width: '100%',
        height: '25%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.dark,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1
    },
    pauseStop: {
        flexDirection: 'row',
        width: '70%',
        justifyContent: 'space-between'
    },
    timeContainer: {
        flexDirection: 'row',
        borderColor: Colors.primary,
        borderWidth: 4,
        borderRadius: 20,
        padding: 5,
        marginTop: 20
    },
    timeViewIOS: {
        height: '20%',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: Colors.dark,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        padding: 10,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1
    },
    timeText: {
        fontSize: 30,
        color: Colors.primary
    },
    headerButtonText: {
        color: Colors.primary,
        fontSize: 18
    },
    headerButton: {
        marginHorizontal: 20
    },
    recSave: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '50%',
        alignItems: 'center'
    },
    markStop: {
        flexDirection: 'row',
        width: '50%',
        justifyContent: 'space-between'
    },
    list: {
        height: '50%',
        width: '100%',
        backgroundColor: Colors.list
    }
});

export default RecordingScreen;