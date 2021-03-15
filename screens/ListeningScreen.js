import React, { useState, useEffect, useRef, useReducer } from 'react';
import { Text, View, StyleSheet, Platform, TouchableOpacity, Alert, FlatList, TextInput } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';
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

//Reducer function. Depending on the type of the action it modifies the state accordingly.
const reducer = (state, action) => {
    switch (action.type) {
        case 'toBeginning':
            return {
                ...state,
                countDown: action.duration,
                positionMillis: 0,
                position: new TimeObject(0, 0, 0, 0),
                playing: false
            }
        case 'updateSlider':
            return {
                ...state,
                position: action.position,
                positionMillis: action.positionMillis
            }
        case 'setCountDown':
            return {
                ...state,
                countDown: action.countDown
            }
        case 'setSound':
            return {
                ...state,
                sound: action.sound
            }
        case 'play':
            return {
                ...state,
                playing: true
            }
        case 'stop':
            return {
                ...state,
                playing: false,
                positionMillis: 0
            }
        case 'pause':
            return {
                ...state,
                positionMillis: action.positionMillis,
                playing: false
            }
        case 'titleChange':
            return {
                ...state,
                title: action.title
            }
        case 'recMarkTitleChange':
            return {
                ...state,
                recMarkTitle: action.recMarkTitle
            }
        case 'shouldPlay':
            return {
                ...state,
                shouldPlay: true
            }
        case 'shouldNotPlay':
            return {
                ...state,
                shouldPlay: false
            }
        case 'finishedSeeking':
            return {
                ...state,
                positionMillis: action.positionMillis,
                position: action.position,
                countDown: action.countDown
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
                timeOfRecMark: null,
                renaming: false
            }
        case 'recMarkSelection':
            return {
                ...state,
                positionMillis: action.positionMillis
            }
        case 'rerender':
            return {
                ...state,
                rerender: !state.rerender
            }
        case 'renameRecMark':
            return {
                ...state,
                modalVisible: true,
                recMarkTitle: action.flag.title,
                timeOfRecMark: action.flag.timestamp,
                renaming: true
            }
        default:
            return state;
    }
}

//This is also the screen where the recording can be managed and modified (title, rec-marks);
const ListeningScreen = props => {

    //IOS plays from speaker. If allowsRecordingIOS wasn't set to false, it would play from receiver!
    //Also it plays in silent mode on IOS, which would otherwise not happen 
    Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true
    });

    //Looks for the recording in the state. Allows to know if the user is coming from the home screen or the recording screen.
    //The recording has an id only if coming from the home screen (the rec was saved already).
    const id = props.navigation.getParam('id');
    const lookedForRec = useSelector(appState => appState.recordings.recordings.find(rec => rec.id === id));

    //Checks for other nav params
    const durationMillis = lookedForRec ? lookedForRec.duration : props.navigation.getParam('duration');
    const audioUri = props.navigation.getParam('audioUri');
    const titleParam = props.navigation.getParam('title');
    const duration = new TimeObject(
        Math.floor(durationMillis / 3600000),
        Math.floor(durationMillis / 60000) % 60,
        Math.floor(durationMillis / 1000) % 60,
        Math.floor(durationMillis) % 1000);
    const flags = lookedForRec ? [...lookedForRec.flags] : props.navigation.getParam('flags');

    //State initialized on screen mounting
    const initialState = {
        rec: lookedForRec,                              //null if not found
        countDown: duration,                            //right end of slider
        positionMillis: 0,                              //position in milliseconds of the audio
        position: new TimeObject(0, 0, 0, 0),           //position shown on left end of slider
        recMarkPosition: new TimeObject(0, 0, 0, 0),    //updated whenever a rec-mark is set
        recMarkTitle: '',                               //same as above
        timeOfRecMark: null,                            //time of rec-mark in milliseconds
        flags: [...flags],                              //list of rec-marks
        playing: false,                                 //if audio is playing it's set to true otherwise the value it's set to false
        title: titleParam ? titleParam : '',            //title of audio
        sound: null,                                    //instance in memory of the audio loaded with the help of the Audio library
        shouldPlay: false,                              //if set to true it means that the audio should play immediately after the action has completed
        modalVisible: false,                            //set to true opens the modal        
        renaming: false,
        rerender: false
    }

    //Setup of the reducer, dispatchState(action) with action = {type, params} will be used
    const [state, dispatchState] = useReducer(reducer, initialState);

    //The dispatch() function allows to manage the redux state using actions defined in '../store/rec-actions'. 
    const dispatch = useDispatch();

    //Loads and reloads functions to be used from the navigation header buttons (accordingly to dependency changes).
    useEffect(() => {
        props.navigation.setParams({
            saveRecording: saveRecordingHandler,
            toHomeScreen: toHomeScreenHandler
        })
    }, [saveRecordingHandler, toHomeScreenHandler, unloadAndGoHome, state.title, state.playing, state.sound]);


    //Sets up the listener so whenever the screen is loaded, the audio is loaded in memory as well, ready to be played
    useEffect(() => {
        const willFocusSub = props.navigation.addListener('willFocus', createAndLoadSound);
        return () => { willFocusSub.remove(); }
    }, [createAndLoadSound]);

    //Runs the function createAndLoadSound when the screen is mounted
    useEffect(() => {
        createAndLoadSound();
    }, [createAndLoadSound])

    //Hook to update position of the slider
    useInterval(() => {
        const updateSlider = async () => {
            try {
                const status = await state.sound.getStatusAsync();
                //checks if the audio is finished playing
                if (status.positionMillis === state.positionMillis) {
                    await state.sound.stopAsync();
                    dispatchState({ type: 'toBeginning', duration: duration });
                    return;
                }
                const newPosition = new TimeObject(
                    Math.floor(status.positionMillis / 3600000),
                    Math.floor(status.positionMillis / 60000) % 60,
                    Math.floor(status.positionMillis / 1000) % 60,
                    Math.floor(status.positionMillis) % 1000);
                dispatchState({ type: 'updateSlider', positionMillis: status.positionMillis, position: newPosition });

                const difference = (durationMillis - status.positionMillis);
                let diffObj;
                if (difference < 0) {
                    diffObj = new TimeObject(0, 0, 0, 0);
                } else {
                    diffObj = new TimeObject(
                        Math.floor(difference / 3600000),
                        Math.floor(difference / 60000) % 60,
                        Math.ceil(difference / 1000) % 60,
                        Math.floor(difference) % 1000
                    );
                }
                dispatchState({ type: 'setCountDown', countDown: diffObj });

            } catch (err) {
                console.log(err);
            }
        }
        if (state.sound && state.playing) {
            updateSlider();
        }
    }, 1000);


    //Creates sound object to be played, memorizes it in the state
    const createAndLoadSound = async () => {
        try {
            console.log('Loading Sound');
            const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
            dispatchState({ type: 'setSound', sound: sound });
        } catch (err) {
            console.log(err);
        }
    }

    //When the play button is pressed
    const playRecording = async () => {
        try {
            //If the sound object has been already loaded
            console.log('Playing Sound');
            await state.sound.playAsync();
            dispatchState({ type: 'play' });
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    //Stops the playing
    const stopPlaying = async () => {
        try {
            console.log('Stopping Sound');
            await state.sound.stopAsync();
            dispatchState({ type: 'stop' });
        } catch (err) {
            console.log(err);
        }
    }

    //Pauses the playing
    const pausePlaying = async () => {
        try {
            console.log('Pausing sound');
            await state.sound.pauseAsync();
            const status = await state.sound.getStatusAsync();
            dispatchState({ type: 'pause', positionMillis: status.positionMillis });
        } catch (err) {
            console.log(err);
        }
    }

    //Function called by the pressing of the header buttons. Used to unload the sound object from memory.
    const unloadAndGoHome = async () => {
        try {
            //In case the sound is playing it stops from doing so
            if (state.playing) {
                console.log('Stopping sound');
                await state.sound.stopAsync();
            }
            //Unloading (frees memory space) only if the sound was loaded to be played, which happens only the first time the play button is pressed
            if (state.sound) {
                console.log('Unloading sound');
                await state.sound.unloadAsync();
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
        if (state.title.length === 0) {
            Alert.alert("Invalid title", "Please enter a valid title", [{ text: 'Okay' }]);
            return;
        }
        //If a new recording is being saved or an existing one is being modified
        //Case it's modified
        if (state.rec) {
            if (JSON.stringify(state.flags) !== JSON.stringify(state.rec.flags)) {
                dispatch(recordingActions.updateRecMarks(state.rec.id, state.flags));
            }
            if (!(state.title === titleParam)) {
                dispatch(recordingActions.updateRecTitle(state.title, state.rec.id));
            }
        } else {
            //Case it's new
            const date = new Date();
            const month = date.getMonth() + 1;
            const realMonth = month > 9 ? month : "0" + month;
            const recDate = date.getDate() + "/" + realMonth + "/" + date.getFullYear();
            dispatch(recordingActions.addRecording(state.title, audioUri, recDate, durationMillis, state.flags));
        }
        //Go back to the home screen
        unloadAndGoHome();
    }

    //When the home button is pressed
    const toHomeScreenHandler = () => {
        //Case the recording has just been recorded (it means we're coming from the recording screen)
        if (!state.rec) {
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
        if (state.title.length === 0) {
            Alert.alert("Invalid title", "Please enter a valid title", [{ text: 'Okay' }]);
            return;
        }
        //Case the recording existed and it has been modified 
        if (state.title !== titleParam || JSON.stringify(state.flags) !== JSON.stringify(state.rec.flags)) {
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
        dispatchState({ type: 'titleChange', title: text });
    }

    //Handler for the text changes in the rec-mark title input
    const recMarkTitleChangeHandler = text => {
        dispatchState({ type: 'recMarkTitleChange', recMarkTitle: text });
    }

    //Stops the audio from playing when the slider changes position, then allows to play if it was already playing
    const seekSliderHandler = async () => {
        try {
            if (state.playing) {
                await state.sound.stopAsync();
                dispatchState({ type: 'shouldPlay' });
            } else {
                dispatchState({ type: 'shouldNotPlay' });
            }
        } catch (err) {
            console.log(err);
        }
    }

    //Updates the audio position accordingly with the slider coordinates
    const finishedSeeking = async value => {
        try {
            await state.sound.setPositionAsync(value);
            const difference = (durationMillis - value);
            const position = new TimeObject(
                Math.floor(value / 3600000),
                Math.floor(value / 60000) % 60,
                Math.floor(value / 1000) % 60,
                Math.floor(value) % 1000);
            const countDown = new TimeObject(
                Math.floor(difference / 3600000),
                Math.floor(difference / 60000) % 60,
                Math.ceil(difference / 1000) % 60,
                Math.floor(difference) % 1000
            );
            dispatchState({ type: 'finishedSeeking', positionMillis: value, position: position, countDown: countDown });

            if (state.shouldPlay) {
                playRecording();
            }
        } catch (err) {
            console.log(err);
        }
    }

    //Opens the modal and sets parameters to save the newly created rec-mark
    const openModal = async () => {
        let position;
        try {
            if (state.playing) {
                const status = await state.sound.getStatusAsync();
                position = status.positionMillis;
            } else {
                position = state.positionMillis;
            }
        } catch (err) {
            console.log(err);
        }
        if (state.flags.find(item => item.timestamp === position)) {
            Alert.alert(
                "This action is not possible!",
                "You already have a Rec-Mark registered at the same time. Try deleting or modifying that one!",
                [
                    { text: "Ok" }
                ]);
            return;
        }
        const positionObj = new TimeObject(
            Math.floor(position / 3600000),
            Math.floor(position / 60000) % 60,
            Math.floor(position / 1000) % 60,
            Math.floor(position) % 1000);
        dispatchState({ type: 'openModal', timeOfRecMark: position, recMarkPosition: positionObj });
    }

    //Uses the parameters set in openModal to save the rec-mark, also checks if recMarkTitle is valid
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
        let sort = true;
        let i = 0;
        while (sort && i < state.flags.length) {
            if (state.flags[i].timestamp > newFlag.timestamp) {
                sort = false;
            } else {
                i++;
            }
        }
        state.flags.splice(i, 0, newFlag);
        dispatchState({ type: 'addRecMark' });
    }

    //When a rec-mark is pressed it jumps to position
    const recMarkSelection = async timestamp => {
        try {
            await state.sound.stopAsync();
            await state.sound.setPositionAsync(timestamp);
            dispatchState({ type: 'recMarkSelection', positionMillis: timestamp });
            if (state.playing) {
                await state.sound.playAsync();
            }
        } catch (err) {
            console.log(err);
        }
    }

    //Deletes rec-mark
    const deleteRecMark = flag => {
        const index = state.flags.indexOf(flag);
        state.flags.splice(index, 1);
        dispatchState({ type: 'rerender' });
    }

    //On long pression of rec-mark one is able to see the complete title, which otherwise could be truncated due to its length
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
        Alert.alert(flag.title, postring, [{ text: 'Done' },
        {
            text: "Rename",
            onPress: () => renameHandler(flag)
        },
        {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteRecMark(flag)
        }]);
        return;
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

    return (
        <View style={styles.page} >
            <View style={styles.detailsIOS}>
                <Text style={styles.title}>Title</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Instert title here"
                        value={state.title}
                        onChangeText={titleChangeHandler}
                        keyboardType='default'
                        autoCorrect={false}
                        placeholderTextColor={Colors.grey}
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
                style={styles.flags}
                data={state.flags}
                keyExtractor={item => item.timestamp.toString()}
                renderItem={itemData => {
                    return <ListRecMark
                        title={itemData.item.title}
                        duration={itemData.item.timestamp}
                        onSelect={() => { recMarkSelection(itemData.item.timestamp) }}
                        onDelete={() => { deleteRecMark(itemData.item) }}
                        onLongPress={() => { detailShow(itemData.item) }}
                        onRename={() => { renameHandler(itemData.item) }}
                    />
                }}
            />
            <View style={styles.flagContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={durationMillis}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.grey}
                    value={state.positionMillis}
                    onValueChange={seekSliderHandler}
                    onSlidingComplete={finishedSeeking}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '85%' }}>
                    <Text style={{ color: Colors.text }}>
                        {state.position.hours ? state.position.hours + ':' : ''}
                        {state.position.minutes < 10 ? '0' + state.position.minutes : state.position.minutes}:
                        {state.position.seconds < 10 ? '0' + state.position.seconds : state.position.seconds}
                    </Text>
                    <Text style={{ color: Colors.text }}>
                        -{state.countDown.hours ? state.countDown.hours + ':' : ''}
                        {state.countDown.minutes < 10 ? '0' + state.countDown.minutes : state.countDown.minutes}:
                        {state.countDown.seconds < 10 ? '0' + state.countDown.seconds : state.countDown.seconds}
                    </Text>
                </View>
                {state.playing ? (
                    <View style={styles.pauseStop}>
                        <TouchableOpacity activeOpacity={0.6} onPress={pausePlaying}>
                            <Ionicons name={Platform.OS === 'android' ? "md-pause-circle-outline" : "ios-pause-circle-outline"} size={50} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ paddingBottom: 5 }} activeOpacity={0.6} onPress={openModal}>
                            <Entypo name="flag" size={70} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={stopPlaying}>
                            <Ionicons name={Platform.OS === 'android' ? "md-stop-circle-outline" : "ios-stop-circle-outline"} size={50} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>) :
                    <View style={styles.playFlag}>
                        <TouchableOpacity activeOpacity={0.6} onPress={playRecording}>
                            <Ionicons name={Platform.OS === 'android' ? 'md-play-circle-outline' : 'ios-play-circle-outline'} size={75} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={openModal}>
                            <Entypo name="flag" size={70} color={Colors.primary} />
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
        headerStyle: {
            backgroundColor: Colors.dark,
            shadowColor: 'transparent',
            elevation: 0
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
        color: Colors.primary,
        fontSize: 18
    },
    headerButton: {
        marginHorizontal: 20
    },
    title: {
        fontSize: 22,
        color: Colors.text
    },
    detailsIOS: {
        justifyContent: 'space-between',
        height: '20%',
        backgroundColor: Colors.dark,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        padding: 10,
        alignItems: "center",
        shadowColor: '#000',
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
        width: '90%',
        color: Colors.text
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
        backgroundColor: Colors.dark,
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