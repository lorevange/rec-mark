import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import * as Permissions from 'expo-permissions';

import Colors from '../constants/Colors';
import * as recActions from '../store/rec-actions';
import ListRecording from '../components/ListRecording';
import TimeObject from '../models/TimeObject';


const HomeScreen = props => {

    //My saved recordings loaded from reducer
    const recordings = useSelector(state => state.recordings.recordings);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);

    //recordings loaded every time the reducer's state changes
    useEffect(() => {
        const loadState = async () => {
            setLoading(true);
            await dispatch(recActions.loadRecordings());
            setLoading(false);
        }
        loadState();
    }, [dispatch]);

    //Asks for notification permissions if they are not granted
    useEffect(() => {
        Permissions.getAsync(Permissions.NOTIFICATIONS).then(statusObj => {
            if (statusObj.status !== 'granted') {
                return Permissions.askAsync(Permissions.NOTIFICATIONS);
            }
            return statusObj;
        }).then(statusObj => {
            if (statusObj.status !== 'granted') {
                return;
            }
        });
    }, []);

    //On swipe + delete press, deletes recording
    const deleteRecordingHandler = (id, audioUri) => {
        Alert.alert(
            "Delete Recording?",
            "Are you sure to delete this recording?",
            [{
                text: "Yes",
                onPress: () => {
                    dispatch(recActions.deleteRecording(id, audioUri));
                    return;
                }, style: 'destructive'
            },
            { text: "No" }
            ]);
    };

    //When recordings are being loaded, it shows a loading animation
    const loadingScreen = <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} size='large' />
    </View>;

    let list = <FlatList
        contentContainerStyle={{
            width: '100%',
            backgroundColor: Colors.list
        }}
        data={recordings}
        keyExtractor={item => item.id.toString()}
        renderItem={itemData => {
            const duration = new TimeObject(
                Math.floor(itemData.item.duration / 3600000),
                Math.floor(itemData.item.duration / 60000) % 60,
                Math.floor(itemData.item.duration / 1000) % 60,
                Math.floor(itemData.item.duration) % 1000
            );

            return <ListRecording
                title={itemData.item.title}
                date={itemData.item.date}
                duration={duration}
                onDelete={() => { deleteRecordingHandler(itemData.item.id, itemData.item.audioUri) }}
                onSelect={() => props.navigation.navigate(
                    'Listening',
                    {
                        title: itemData.item.title,
                        id: itemData.item.id,
                        audioUri: itemData.item.audioUri,
                        duration
                    }
                )
                }
            />
        }

        }
    />

    if (recordings.length === 0) {
        list = <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, textAlign: 'center', color: 'black' }}>
                <Text>You have no recordings.{'\n'}</Text>
                <Text>Start adding some!</Text>
            </Text>
        </View>
    }


    return (
        <View style={styles.home}>
            <View style={styles.list}>
                {loading ? loadingScreen : list}
            </View>
            <View style={styles.recButtonContainer}>
                <TouchableOpacity style={styles.recButton} activeOpacity={0.6} onPress={() => props.navigation.navigate('Recording')}>
                    <Text style={styles.newRecording}>NEW</Text>
                    <FontAwesome name="microphone" size={30} color={Colors.primary} />
                    <Text style={styles.newRecording}>REC</Text>
                </TouchableOpacity>
            </View>
        </View >
    );
};

HomeScreen.navigationOptions = {
    headerTitle: 'Your recordings',
    headerTitleStyle: {
        alignSelf: 'center',
        color: Colors.primary
    },
    headerStyle: {
        backgroundColor: Colors.dark,
        shadowColor: "transparent"
    }
}

const styles = StyleSheet.create({
    home: {
        flex: 1
    },
    list: {
        height: '85%',
        width: '100%',
        backgroundColor: Colors.list
    },
    recButtonContainer: {
        flex: 1,
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
        elevation: 5,
        zIndex: 1
    },
    newRecording: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: '500'
    },
    recButton: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around'
    }
});

export default HomeScreen;