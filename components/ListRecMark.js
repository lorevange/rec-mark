import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import Colors from '../constants/Colors';
import TimeObject from '../models/TimeObject';

const ListRecMark = props => {

    const timestamp = new TimeObject(
        Math.floor(props.duration / 3600000),
        Math.floor(props.duration / 60000) % 60,
        Math.floor(props.duration / 1000) % 60,
        Math.floor(props.duration) % 1000);
    const title = props.title.length > 21 ? props.title.slice(0, 21) + "..." : props.title;
    const RightActions = ({progress, dragX, onPress}) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp'
        });
        return (
            <View style={{ alignItems: 'flex-end', backgroundColor: 'red' }}>
                <TouchableOpacity
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                    onPress={onPress}
                >
                    <Animated.Text
                        style={{
                            color: 'white',
                            paddingHorizontal: 20,
                            fontWeight: '600',
                            fontSize: 18,
                            transform: [{ scale }]
                        }}>
                        Delete
                    </Animated.Text>
                </TouchableOpacity>
            </View>)
    }

    return (
        <View>
            <Swipeable renderRightActions={(progress, dragX) => <RightActions progress={progress} dragX={dragX} onPress={props.onDelete}/>}>
                <TouchableOpacity style={styles.recItem} activeOpacity={0.6} onPress={props.onSelect} onLongPress={props.onLongPress}>
                    <View style={styles.infoContainer}>
                        <Text style={{ fontSize: 16, paddingLeft: 10, textAlign: 'left' }} numberOfLines={2}>{title}</Text>
                        <Text style={{ color: Colors.grey, paddingTop: 3 }}>
                            {timestamp.hours ? timestamp.hours + ':' : ''}
                            {timestamp.minutes < 10 ? '0' + timestamp.minutes : timestamp.minutes}:
                            {timestamp.seconds < 10 ? '0' + timestamp.seconds : timestamp.seconds}.
                            {Math.floor(timestamp.millis / 10) < 10 ? '0' + Math.floor(timestamp.millis / 10) : Math.floor(timestamp.millis / 10)}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Swipeable>
            <View style={{ borderBottomColor: '#ccc', borderBottomWidth: 1, width: '100%' }} />
        </View>
    );
};

const styles = StyleSheet.create({
    recItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        width: '100%',
        backgroundColor: Colors.list
    },
    infoContainer: {
        height: 30,
        justifyContent: 'space-between',
        flexDirection: 'row',
        width: '90%',
        alignItems: 'center'
    },
    date: {
    }
});

export default ListRecMark;