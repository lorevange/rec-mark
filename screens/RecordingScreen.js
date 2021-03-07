import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Alert, Button, RecyclerViewBackedScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import TimeObject from '../models/TimeObject';
import { useInterval } from '../helpers/hooks';
import Colors from '../constants/Colors';
import { FlatList } from 'react-native-gesture-handler';
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

const RecordingScreen = props => {
    //My state is made of my recording, timestamp and baseTime to manage the timer, points for the three points visual effect
    const [recording, setRecording] = useState();
    const [time, setTime] = useState(new TimeObject(0, 0, 0, 0));
    const [baseTime, setBaseTime] = useState();
    const [points, setPoints] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [paused, setPaused] = useState();
    const [starting, setStarting] = useState(false);
    const flags = useRef([]);
    const [recMarkTitle, setRecMarkTitle] = useState('');
    const [timeOfRecMark, setTimeOfRecMark] = useState(0);
    const [recMarkPosition, setRecMarkPosition] = useState(new TimeObject(0, 0, 0, 0));
    const [modalVisible, setModalVisible] = useState(false);

    //The custom hook that runs every second to get the actual duration of the recording
    useInterval(() => {
        if (isRecording) {
            setTime(getTime);
            setPoints(getPoints);
        }
    }, 1000);

    useEffect(() => {
        props.navigation.setParams({
            toHomeScreen: toHomeScreenHandler,

        })
    }, [toHomeScreenHandler, recording]);

    //The helper function to run useInterval every second
    const getTime = () => {
        const date = new Date().getTime();
        const diffTime = Math.abs(date - baseTime);
        const hours = Math.floor(diffTime / 3600000);
        const minutes = Math.floor(diffTime / 60000) % 60;
        const seconds = Math.floor(diffTime / 1000) % 60;
        return new TimeObject(hours, minutes, seconds);
    }

    //The function to manage the three points: Recording --> Recording. --> Recording.. --> Recording...
    const getPoints = () => {
        if (points.length < 3) {
            return points + ".";
        }
        return '';
    };

    //When the recording button is pressed
    const startRecording = async () => {
        try {
            if (!recording) {
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
                setTime(new TimeObject(0, 0, 0));
                setBaseTime(new Date().getTime());
                setRecording(recording);
                await recording.startAsync();
                setIsRecording(true);
                console.log('Recording started');
                setStarting(true);
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Rec-Mark is recording',
                        body: 'Recording in progress...'
                    },
                    trigger: {
                        seconds: 1
                    }
                })
            } else if (paused) {
                const now = new Date().getTime();
                setBaseTime(Math.abs(baseTime + now - paused));
                await recording.startAsync();
                setIsRecording(true);
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
        const newRec = await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setIsRecording(false);
        setRecording(null);
        props.navigation.navigate('Listening', {
            audioUri: uri,
            duration: newRec.durationMillis,
            flags: flags.current
        })
    };

    const pauseRecording = async () => {
        try {
            console.log('Pausing recording...');
            await recording.pauseAsync();
            setPaused(new Date().getTime());
            setIsRecording(false);
        } catch (err) {
            console.log(err);
        }
    }

    //When the home button is pressed
    const toHomeScreenHandler = () => {
        if (recording) {
            Alert.alert(
                "Are you sure?",
                "You're going back to the home screen without saving!",
                [
                    {
                        text: "Go Home without saving", onPress: async () => {
                            console.log('Unloading recording...')
                            await recording.stopAndUnloadAsync();
                            setRecording(undefined)
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

    const recMarkTitleChangeHandler = text => {
        setRecMarkTitle(text);
    }

    const openModal = async () => {
        let position;
        try {
            const status = await recording.getStatusAsync();
            position = status.durationMillis;
        } catch (err) {
            console.log(err);
        }
        setTimeOfRecMark(position);
        setRecMarkPosition(new TimeObject(
            Math.floor(position / 3600000),
            Math.floor(position / 60000) % 60,
            Math.floor(position / 1000) % 60,
            Math.floor(position) % 1000));
        setModalVisible(true);
    };

    const addRecMark = () => {
        if (recMarkTitle.length === 0) {
            Alert.alert("Invalid Rec-Mark title", "Please enter a valid title", [{ text: 'Okay' }]);
            return;
        }
        if (recMarkTitle.indexOf(':') !== -1 || recMarkTitle.indexOf(';') !== -1) {
            Alert.alert(
                "Invalid Rec-Mark title",
                "These characters are not allowed:\ncolon : and semicolon ;",
                [
                    { text: "Ok" }
                ]);
            return;
        };
        const newFlag = new Flag(recMarkTitle, timeOfRecMark);
        flags.current.push(newFlag);
        console.log(flags.current);
        setModalVisible(false);
        setRecMarkTitle('');
        setTimeOfRecMark();
    }

    const deleteRecMark = flag => {
        flags.current.splice(flags.current.indexOf(flag), 1);
    }

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
        Alert.alert(flag.title, postring, [{ text: 'Done' }]);
    }

    let recButton = <View style={styles.flagContainer} >
        <TouchableOpacity activeOpacity={0.6} onPress={startRecording}>
            <FontAwesome name="microphone" size={60} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
        </TouchableOpacity>
    </View>;

    let flagButtons = (
        <View style={styles.flagContainer}>
            <View style={styles.pauseStop}>
                <TouchableOpacity activeOpacity={0.6} onPress={pauseRecording}>
                    <Ionicons name={Platform.OS === 'android' ? "md-pause-circle-outline" : "ios-pause-circle-outline"} size={50} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                    <Ionicons name={Platform.OS === 'android' ? "md-flag" : "ios-flag"} size={70} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={stopRecording}>
                    <Ionicons name={Platform.OS === 'android' ? "md-stop-circle-outline" : "ios-stop-circle-outline"} size={50} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                </TouchableOpacity>
            </View>
        </View>)

    if (recording && starting) {
        recButton = <View style={styles.flagContainer} >
            <View style={styles.recSave}>
                <TouchableOpacity activeOpacity={0.6} onPress={startRecording}>
                    <FontAwesome name="microphone" size={60} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.6} onPress={stopRecording}>
                    <Ionicons name={Platform.OS === 'android' ? 'md-save' : 'ios-save'} size={50} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    }

    if (Platform.OS === 'android' && Device.platformApiLevel <= 24) {
        flagButtons = (
            <View style={styles.flagContainer}>
                <View style={styles.markStop}>
                    <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                        <Ionicons name={Platform.OS === 'android' ? "md-flag" : "ios-flag"} size={70} color={'white'} />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.6} onPress={stopRecording}>
                        <Ionicons name={Platform.OS === 'android' ? "md-stop-circle-outline" : "ios-stop-circle-outline"} size={50} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>)
    }

    return (
        <View style={styles.container}>
            <View style={Platform.OS === 'android' ? styles.timeViewAndroid : styles.timeViewIOS}>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                        {time.hours > 0 && (<Text>{time.hours}:</Text>)}
                        {time.minutes <= 9 ? <Text>0{time.minutes}:</Text> : <Text>{time.minutes}:</Text>}
                        {time.seconds <= 9 ? <Text>0{time.seconds}</Text> : <Text>{time.seconds}</Text>}
                    </Text>
                </View>
                <View style={{ paddingVertical: 20 }}>
                    <Text style={{color: 'black'}}>
                        {isRecording ? 'Recording' + points :
                            'Start recording!'}
                    </Text>
                </View>
            </View>
            <MyModal
                recMarkPosition={recMarkPosition}
                isVisible={modalVisible}
                titleValue={recMarkTitle}
                onChangeText={recMarkTitleChangeHandler}
                onSubmitEditing={addRecMark}
            />
            <FlatList
                style={styles.list}
                data={flags.current}
                keyExtractor={item => item.timestamp.toString()}
                renderItem={itemData => {
                    return <ListRecMark
                        title={itemData.item.title}
                        duration={itemData.item.timestamp}
                        onDelete={() => { deleteRecMark(itemData.item) }}
                        onSelect={() => { detailShow(itemData.item) }}
                    />
                }}
            />
            {isRecording ? flagButtons : recButton}
        </View>
    );
}

RecordingScreen.navigationOptions = navData => {
    const homeFunction = navData.navigation.getParam('toHomeScreen');
    return {
        headerTitle: 'New Recording',
        headerTitleAlign: 'center',
        headerStyle: {
            backgroundColor: Platform.OS === 'android' ? Colors.primary : Colors.pink,
            shadowColor: 'transparent'
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
        alignItems: 'center'
    },
    flagContainer: {
        width: '100%',
        height: '25%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Platform.OS === 'android' ? Colors.primary : Colors.pink,
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
        backgroundColor: Platform.OS === 'android' ? Colors.primary : Colors.pink,
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
    timeViewAndroid: {
        height: '20%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15
    },
    timeText: {
        fontSize: 30,
        color: Colors.primary
    },
    headerButtonText: {
        color: Platform.OS === 'android' ? 'white' : Colors.primary,
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