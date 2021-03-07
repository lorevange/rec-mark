import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import Colors from '../constants/Colors';

const ListRecording = props => {

    const title = props.title.length > 21 ? props.title.slice(0, 21) + "..." : props.title;
    const rightActions = (progress, dragX) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp'
        });
        return (
            <TouchableOpacity
                style={{ alignItems: 'flex-end', backgroundColor: 'red', justifyContent: 'center' }}
                onPress={props.onDelete}
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
            </TouchableOpacity>)
    }

    return (
        <View>
            <Swipeable renderRightActions={rightActions}>
                <TouchableOpacity style={styles.recItem} activeOpacity={0.6} onPress={props.onSelect}>
                    <View style={styles.infoContainer}>
                        <Text style={{ fontSize: 20 }}>{title}</Text>
                        <Text style={{ color: Colors.grey }}>
                            {props.duration.hours ? props.duration.hours + ':' : ''}
                            {props.duration.minutes < 9 ? '0' + props.duration.minutes : props.duration.minutes}:
                    {props.duration.seconds < 9 ? '0' + props.duration.seconds : props.duration.seconds}
                        </Text>
                    </View>
                    <View style={styles.date}>
                        <Text style={{ color: Colors.grey }}>{props.date}</Text>
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
        backgroundColor: Colors.list,
        paddingVertical: 15,
        paddingHorizontal: 15,
        width: '100%'
    },
    infoContainer: {
        height: 45,
        justifyContent: 'space-between'
    },
    date: {
    }
});

export default ListRecording;