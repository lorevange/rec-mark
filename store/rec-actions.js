import * as FileSystem from 'expo-file-system';
import { insertRecording, fetchRecordings, removeRecording, updateRecordingTitle, updateRecordingRecMarks } from '../helpers/db';
import Flag from '../models/Flag';

export const ADD_REC = 'ADD_REC';
export const SET_RECS = 'SET_RECS';
export const DELETE_REC = 'DELETE_REC';
export const UPDATE_REC_TITLE = 'UPDATE_REC';
export const UPDATE_REC_MARKS = 'UPDATE_REC_MARKS';

export const updateRecTitle = (title, id) => {
    return async dispatch => {
        try {
            const dbResult = await updateRecordingTitle(title, id);
            console.log(dbResult);
            dispatch({
                type: UPDATE_REC_TITLE,
                recData: {
                    id,
                    title
                }
            })
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}

export const updateRecMarks = (id, flags) => {
    return async dispatch => {
        let flagsToString = '';
        for (const flag of flags) {
            if (flags.indexOf(flag) < flags.length - 1) {
                flagsToString = flagsToString + flag.title + ":" + flag.timestamp.toString() + ";";
            } else {
                flagsToString = flagsToString + flag.title + ":" + flag.timestamp.toString();
            }
        }
        try {
            const dbResult = await updateRecordingRecMarks(id, flagsToString);
            console.log(dbResult);
            dispatch({
                type: UPDATE_REC_MARKS,
                recData: {
                    id,
                    flags
                }
            })
        } catch (err) {
            console.log(err);
        }
    }
}

export const addRecording = (title, audioUri, date, duration, flags) => {
    return async dispatch => {
        const fileName = audioUri.split('/').pop();
        const newPath = FileSystem.documentDirectory + fileName;

        try {
            await FileSystem.moveAsync({
                from: audioUri,
                to: newPath
            });
            let flagsToString = '';
            for (const flag of flags) {
                if (flags.indexOf(flag) < flags.length - 1) {
                    flagsToString = flagsToString + flag.title + ":" + flag.timestamp.toString() + ";";
                } else {
                    flagsToString = flagsToString + flag.title + ":" + flag.timestamp.toString();
                }
            }
            const dbResult = await insertRecording(
                title,
                newPath,
                date,
                duration,
                flagsToString
            );
            console.log(dbResult);
            dispatch({
                type: ADD_REC,
                recData: {
                    id: dbResult.insertId,
                    title,
                    audioUri: newPath,
                    date,
                    duration,
                    flags
                }
            })
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}

export const deleteRecording = (id, audioUri) => {
    return async dispatch => {
        try {
            await FileSystem.deleteAsync(audioUri);
            const dbResult = await removeRecording(id);
            console.log(dbResult);
            dispatch({ type: DELETE_REC, id });
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}

export const loadRecordings = () => {
    return async dispatch => {
        try {
            const dbResult = await fetchRecordings();
            let recordings = dbResult.rows._array;

            for (let recording of recordings) {
                if (recording.flags) {
                    let flags = recording.flags.split(';');
                    for (let i = 0; i < flags.length; i++) {
                        const titleAndTimeStamp = flags[i].split(':');
                        flags[i] = new Flag(titleAndTimeStamp[0], Number(titleAndTimeStamp[1]));
                    }
                    recording.flags = flags;
                }
            }

            dispatch({ type: SET_RECS, recordings: recordings });
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}