import React from 'react';
import { View, Text, Modal, TextInput, Button, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '../constants/Colors';
import { TouchableOpacity } from 'react-native-gesture-handler';

const MyModal = props => {
    const recMarkPosition = props.recMarkPosition;

    return (<Modal
        animationType="slide"
        transparent={true}
        visible={props.isVisible}
        style={styles.modal}
    >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={styles.card}>
                <Text style={{ color: Colors.primary }}>Rec-Mark</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={props.titleValue}
                        onChangeText={props.onChangeText}
                        autoFocus
                        keyboardType='default'
                        autoCorrect={false}
                        onSubmitEditing={props.onSubmitEditing}
                    />
                </View>
                <Text>Position: {recMarkPosition.hours ? recMarkPosition.hours + ':' : ''}
                    {recMarkPosition.minutes < 10 ? '0' + recMarkPosition.minutes : recMarkPosition.minutes}:
                    {recMarkPosition.seconds < 10 ? '0' + recMarkPosition.seconds : recMarkPosition.seconds}.
                    {Math.floor(recMarkPosition.millis / 10) < 10 ? '0' + Math.floor(recMarkPosition.millis / 10) : Math.floor(recMarkPosition.millis / 10)}
                </Text>
                <TouchableOpacity style={{ marginTop: 5 }} onPress={props.onSubmitEditing} >
                    <Text style={{ color: 'blue', fontSize: 20 }}>Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>);
}

const styles = StyleSheet.create({
    card: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "white",
        padding: 20,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    inputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
    },
    modal: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        marginBottom: 20,
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
        fontSize: 14,
        textAlign: 'center',
        width: '50%'
    }
});

export default MyModal;