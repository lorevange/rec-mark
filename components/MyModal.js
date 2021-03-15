import React from 'react';
import { View, Text, Modal, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '../constants/Colors';

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
                <TouchableOpacity
                    style={{ width: '40%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}
                    onPress={props.onCloseModal}
                >
                    <Ionicons name="close" size={16} color={Colors.grey} />
                </TouchableOpacity>
                <Text style={{ color: Colors.primary }}>Rec-Mark</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={props.titleValue}
                        onChangeText={props.onChangeText}
                        autoFocus
                        selectTextOnFocus
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
                <TouchableOpacity onPress={props.renaming ? props.onRename : props.onSubmitEditing} >
                    <Text style={{ color: Colors.primary, fontSize: 18 }}>Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>);
}

const styles = StyleSheet.create({
    card: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9DDDE',
        padding: 10,
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
        marginBottom: 15,
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
        fontSize: 14,
        textAlign: 'center',
        width: '40%'
    }
});

export default MyModal;