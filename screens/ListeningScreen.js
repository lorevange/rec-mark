import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { FlatList, TextInput } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

import * as recordingActions from '../store/rec-actions';
import Colors from '../constants/Colors';
import Flag from '../models/Flag';
import { useInterval } from '../helpers/hooks';
import ListRecMark from '../components/ListRecMark';
import TimeObject from '../models/TimeObject';
import MyModal from '../components/MyModal';

//This is also the screen where the recording can be managed and modified (title, rec-marks);
const ListeningScreen = props => {

    //IOS plays from speaker. If allowsRecordingIOS wasn't set to false, it would play from receiver!
    //Also it plays in silent mode on IOS, which would otherwise not happen 
    Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true
    });

    //The dispatch() function allows to manage the redux state using actions defined in '../store/rec-actions'. 
    const dispatch = useDispatch();

    //The state. Uri, title and duration retrieved by nav params. 
    const audioUri = props.navigation.getParam('audioUri');
    const titleParam = props.navigation.getParam('title');
    const id = props.navigation.getParam('id');

    //Looks for the recording in the state. Allows to know if the user is coming from the home screen or the recording screen.
    const rec = useSelector(state => state.recordings.recordings.find(rec => rec.id === id));

    //Duration of the recording in milliseconds (seconds * 1000), hhmmss and starting position of the slider.
    const durationMillis = rec ? rec.duration : props.navigation.getParam('duration');
    const duration = new TimeObject(
        Math.floor(durationMillis / 3600000),
        Math.floor(durationMillis / 60000) % 60,
        Math.floor(durationMillis / 1000) % 60,
        Math.floor(durationMillis) % 1000);
    const [countDown, setCountDown] = useState(duration);
    const [positionMillis, setPositionMillis] = useState(0);
    const [position, setPosition] = useState(new TimeObject(0, 0, 0, 0));
    const [recMarkPosition, setRecMarkPosition] = useState(new TimeObject(0, 0, 0, 0));

    //State variables. Playing says wether the recording is playing, title manages the title which can be modified in this screen.
    //sound stores the Audio.Sound() object to be played from the audioUri source.
    const [playing, setPlaying] = useState(false);
    const [title, setTitle] = useState(titleParam ? titleParam : '');
    const [sound, setSound] = useState();
    const [shouldPlay, setShouldPlay] = useState(false);
    const flags = useRef(rec ? [...rec.flags] : props.navigation.getParam('flags'));
    const [recMarkTitle, setRecMarkTitle] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [timeOfRecMark, setTimeOfRecMark] = useState();
    const [rerender, setRerender] = useState(0);

    //Loads and reloads functions to be used from the navigation header buttons (accordingly to dependency changes).
    useEffect(() => {
        props.navigation.setParams({
            saveRecording: saveRecordingHandler,
            toHomeScreen: toHomeScreenHandler
        })
    }, [saveRecordingHandler, toHomeScreenHandler, unloadAndGoHome, title, playing, sound]);

    useEffect(() => {
        const willFocusSub = props.navigation.addListener('willFocus', createAndLoadSound);
        return () => { willFocusSub.remove(); }
    }, [createAndLoadSound]);

    useEffect(() => {
        createAndLoadSound();
    }, [createAndLoadSound])

    //Hook to update position of the slider
    useInterval(() => {
        const updateSlider = async () => {
            try {
                const status = await sound.getStatusAsync();
                //checks if the audio is finished playing
                if (status.positionMillis === positionMillis) {
                    await sound.stopAsync();
                    setPositionMillis(0);
                    setPosition(new TimeObject(0, 0, 0, 0));
                    setCountDown(duration);
                    setPlaying(false);
                    return;
                }
                setPositionMillis(status.positionMillis);
                setPosition(new TimeObject(
                    Math.floor(status.positionMillis / 3600000),
                    Math.floor(status.positionMillis / 60000) % 60,
                    Math.floor(status.positionMillis / 1000) % 60,
                    Math.floor(status.positionMillis) % 1000));

                const difference = (durationMillis - status.positionMillis);
                if (difference < 0) {
                    setCountDown(new TimeObject(0, 0, 0, 0));
                } else {
                    setCountDown(new TimeObject(
                        Math.floor(difference / 3600000),
                        Math.floor(difference / 60000) % 60,
                        Math.ceil(difference / 1000) % 60,
                        Math.floor(difference) % 1000
                    ))
                }

            } catch (err) {
                console.log(err);
            }
        }
        if (sound && playing) {
            updateSlider();
        }
    }, 1000);

    const createAndLoadSound = async () => {
        try {
            console.log('Loading Sound');
            const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
            setSound(sound);
        } catch (err) {
            console.log(err);
        }
    }

    //When the play button is pressed
    const playRecording = async () => {
        try {
            //If the sound object has been already loaded
            console.log('Playing Sound');
            await sound.playAsync();
            setPlaying(true);
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    //Stops the playing
    const stopPlaying = async () => {
        try {
            console.log('Stopping Sound');
            await sound.stopAsync();
            setPlaying(false);
            setPositionMillis(0);
        } catch (err) {
            console.log(err);
        }
    }

    //Pauses the playing
    const pausePlaying = async () => {
        try {
            console.log('Pausing sound');
            await sound.pauseAsync();
            const status = await sound.getStatusAsync();
            setPositionMillis(status.positionMillis);
            setPlaying(false);
        } catch (err) {
            console.log(err);
        }
    }

    //Function called by the pressing of the header buttons. Used to unload the sound object from memory.
    const unloadAndGoHome = async () => {
        try {
            //In case the sound is playing it stops from doing so
            if (playing) {
                console.log('Stopping sound');
                await sound.stopAsync();
            }
            //Unloading (frees memory space) only if the sound was loaded to be played, which happens only the first time the play button is pressed
            if (sound) {
                console.log('Unloading sound');
                await sound.unloadAsync();
            }
        } catch (err) {
            console.log(err);
        }
        //Navigates to the home screen (the first stack navigation screen, so it actually goes back by two screens).
        props.navigation.navigate('Home');
    }

    //Manages the saving of a recording
    const saveRecordingHandler = () => {
        //Title length should be > 0 an alert is shown
        if (title.length === 0) {
            Alert.alert("Invalid title", "Please enter a valid title", [{ text: 'Okay' }]);
            return;
        }
        //If a new recording is being saved or an existing one is being modified
        //Case it's modified
        if (rec) {
            if (flags.current.toString() !== rec.flags.toString()) {
                dispatch(recordingActions.updateRecMarks(rec.id, flags.current));
            }
            if (!(title === titleParam)) {
                dispatch(recordingActions.updateRecTitle(title, rec.id));
            }
        } else {
            //Case it's new
            const date = new Date();
            const month = date.getMonth() + 1;
            const realMonth = month > 9 ? month : "0" + month;
            const recDate = date.getDate() + "/" + realMonth + "/" + date.getFullYear();
            dispatch(recordingActions.addRecording(title, audioUri, recDate, durationMillis, flags.current));
        }
        //Go back to the home screen
        unloadAndGoHome();
    }

    //When the home button is pressed
    const toHomeScreenHandler = () => {
        //Case the recording has just been recorded (it means we're coming from the recording screen)
        if (!rec) {
            Alert.alert(
                "Are you sure?",
                "You're going back to the home screen without saving!",
                [
                    { text: "Go Home without saving", onPress: unloadAndGoHome, style: 'destructive' },
                    { text: "Stay on this screen" }
                ]);
            return;
        }
        //Alert if title length is invalid, in case it's an existing recording being modified
        if (title.length === 0) {
            Alert.alert("Invalid title", "Please enter a valid title", [{ text: 'Okay' }]);
            return;
        }
        //Case the recording existed and it has been modified 
        if (title !== titleParam || flags.current.toString() !== rec.flags.toString()) {
            Alert.alert(
                "Are you sure?",
                "You're going back to the home screen without saving!",
                [
                    { text: "Go Home without saving", onPress: unloadAndGoHome, style: 'destructive' },
                    { text: "Stay on this screen" }
                ]);
            return;
        }
        //All the cases when going home is allowed without implications
        unloadAndGoHome();
    }


    //Handler for the text changes in the title input.
    const titleChangeHandler = text => {
        setTitle(text);
    }

    const recMarkTitleChangeHandler = text => {
        setRecMarkTitle(text);
    }

    const seekSliderHandler = async () => {
        try {
            if (playing) {
                await sound.stopAsync();
                setShouldPlay(true);
            } else {
                setShouldPlay(false);
            }
        } catch (err) {
            console.log(err);
        }
    }

    const finishedSeeking = async value => {
        try {
            await sound.setPositionAsync(value);
            setPositionMillis(value);
            setPosition(new TimeObject(
                Math.floor(value / 3600000),
                Math.floor(value / 60000) % 60,
                Math.floor(value / 1000) % 60,
                Math.floor(value) % 1000));

            const difference = (durationMillis - value)
            setCountDown(new TimeObject(
                Math.floor(difference / 3600000),
                Math.floor(difference / 60000) % 60,
                Math.ceil(difference / 1000) % 60,
                Math.floor(difference) % 1000
            ))

            if (shouldPlay) {
                playRecording();
            }
        } catch (err) {
            console.log(err);
        }
    }

    const openModal = async () => {
        let position;
        try {
            if (playing) {
                const status = await sound.getStatusAsync();
                position = status.positionMillis;
            } else {
                position = positionMillis;
            }
        } catch (err) {
            console.log(err);
        }
        if (flags.current.find(item => item.timestamp === position)) {
            Alert.alert(
                "This action is not possible!",
                "You already have a Rec-Mark registered at the same time. Try deleting or modifying that one!",
                [
                    { text: "Ok" }
                ]);
            return;
        }
        setTimeOfRecMark(position);
        setRecMarkPosition(new TimeObject(
            Math.floor(position / 3600000),
            Math.floor(position / 60000) % 60,
            Math.floor(position / 1000) % 60,
            Math.floor(position) % 1000));
        setModalVisible(true);
    }

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
        let sort = true;
        let i = 0;
        while (sort && i < flags.current.length) {
            if (flags.current[i].timestamp > newFlag.timestamp) {
                sort = false;
            } else {
                i++;
            }
        }
        flags.current.splice(i, 0, newFlag);
        setModalVisible(false);
        setRecMarkTitle('');
        setTimeOfRecMark();
    }

    const recMarkSelection = async timestamp => {
        try {
            await sound.stopAsync();
            await sound.setPositionAsync(timestamp);
            setPositionMillis(timestamp);
            if (playing) {
                await sound.playAsync();
            }
        } catch (err) {
            console.log(err);
        }
    }

    const deleteRecMark = flag => {
        flags.current.splice(flags.current.indexOf(flag), 1);
        setRerender(rerender + 1);
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
        return;
    }

    return (
        <View style={styles.page} >
                <View style={styles.details}>
                    <Text style={styles.title}>Title</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Instert title here"
                            value={title}
                            onChangeText={titleChangeHandler}
                            keyboardType='default'
                            autoCorrect={false}
                        />
                        <Ionicons name={Platform.OS === 'android' ? "md-pencil" : "ios-pencil"} size={20} color={Colors.grey} />
                    </View>
                    <Text style={{ marginTop: 5, color: Colors.grey, marginTop: -10 }}>Duration:{' '}
                        {duration.hours ? duration.hours + ':' : ''}
                        {duration.minutes < 10 ? '0' + duration.minutes : duration.minutes}:
                            {duration.seconds < 10 ? '0' + duration.seconds : duration.seconds}
                    </Text>
                </View>
                <MyModal
                    recMarkPosition={recMarkPosition}
                    isVisible={modalVisible}
                    titleValue={recMarkTitle}
                    onChangeText={recMarkTitleChangeHandler}
                    onSubmitEditing={addRecMark}
                />
                <FlatList
                    style={styles.flags}
                    data={flags.current}
                    keyExtractor={item => item.timestamp.toString()}
                    renderItem={itemData => {
                        return <ListRecMark
                            title={itemData.item.title}
                            duration={itemData.item.timestamp}
                            onSelect={() => { recMarkSelection(itemData.item.timestamp) }}
                            onDelete={() => { deleteRecMark(itemData.item) }}
                            onLongPress={() => { detailShow(itemData.item) }}
                        />
                    }}
                />
            <View style={styles.flagContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={durationMillis}
                    minimumTrackTintColor={Platform.OS === 'android' ? 'white' : Colors.primary}
                    maximumTrackTintColor={Platform.OS === 'android' ? 'black' : ''}
                    value={positionMillis}
                    onValueChange={seekSliderHandler}
                    onSlidingComplete={finishedSeeking}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '85%' }}>
                    <Text>
                        {position.hours ? position.hours + ':' : ''}
                        {position.minutes < 10 ? '0' + position.minutes : position.minutes}:
                        {position.seconds < 10 ? '0' + position.seconds : position.seconds}
                    </Text>
                    <Text>
                        -{countDown.hours ? countDown.hours + ':' : ''}
                        {countDown.minutes < 10 ? '0' + countDown.minutes : countDown.minutes}:
                        {countDown.seconds < 10 ? '0' + countDown.seconds : countDown.seconds}
                    </Text>
                </View>
                {playing ? (
                    <View style={styles.pauseStop}>
                        <TouchableOpacity activeOpacity={0.6} onPress={pausePlaying}>
                            <Ionicons name={Platform.OS === 'android' ? "md-pause-circle-outline" : "ios-pause-circle-outline"} size={50} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                            <Ionicons name={Platform.OS === 'android' ? "md-flag" : "ios-flag"} size={70} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={stopPlaying}>
                            <Ionicons name={Platform.OS === 'android' ? "md-stop-circle-outline" : "ios-stop-circle-outline"} size={50} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                        </TouchableOpacity>
                    </View>) :
                    <View style={styles.playFlag}>
                        <TouchableOpacity activeOpacity={0.6} onPress={playRecording}>
                            <Ionicons name={Platform.OS === 'android' ? 'md-play-circle-outline' : 'ios-play-circle-outline'} size={75} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                            <Ionicons name={Platform.OS === 'android' ? "md-flag" : "ios-flag"} size={70} color={Platform.OS === 'android' ? 'white' : Colors.primary} />
                        </TouchableOpacity>
                    </View>
                }
            </View>
        </View>
    );
};

//Dynamic navigation options to use functions declared in the component, to bind to the header buttons
ListeningScreen.navigationOptions = navData => {
    const titleParam = navData.navigation.getParam('title');
    const title = titleParam ? (titleParam.length > 18 ? titleParam.slice(0, 18) + "..." : titleParam) : '';
    const saveFunction = navData.navigation.getParam('saveRecording');
    const homeScreenFunction = navData.navigation.getParam('toHomeScreen');
    return {
        headerTitle: title ? title : 'Add New Recording',
        headerTitleStyle: {
            alignSelf: 'center'
        },
        headerStyle: {
            backgroundColor: Platform.OS === 'android' ? Colors.primary : Colors.pink,
            shadowColor: 'transparent'
        },
        headerRight: () => {
            return (
                <TouchableOpacity style={styles.headerButton} onPress={saveFunction}>
                    <Text style={styles.headerButtonText}>Save</Text>
                </TouchableOpacity>
            )
        },
        headerLeft: () => {
            return (
                <TouchableOpacity style={styles.headerButton} onPress={homeScreenFunction}>
                    <Text style={styles.headerButtonText}>Home</Text>
                </TouchableOpacity>
            )
        }

    }
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: Colors.list
    },
    headerButtonText: {
        color: Platform.OS === 'android' ? 'white' : Colors.primary,
        fontSize: 18
    },
    headerButton: {
        marginHorizontal: 20
    },
    title: {
        fontSize: 22
    },
    details: {
        justifyContent: 'space-between',
        height: '20%',
        backgroundColor: Colors.pink,
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
    textInput: {
        marginBottom: 20,
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
        fontSize: 18,
        width: '90%'
    },
    deleteContainer: {
        paddingRight: 30
    },
    inputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
    },
    bottomContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '85%',
        marginTop: -10
    },
    flagContainer: {
        width: '100%',
        height: '25%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Platform.OS === 'android' ? Colors.primary : Colors.pink,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    pauseStop: {
        flexDirection: 'row',
        width: '70%',
        justifyContent: 'space-between'
    },
    slider: {
        height: 35,
        width: '80%'
    },
    playFlag: {
        flexDirection: 'row',
        width: '50%',
        justifyContent: 'space-between'
    },
    flags: {
        height: '50%'
    }
});

export default ListeningScreen;