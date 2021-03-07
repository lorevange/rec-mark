import { ADD_REC, SET_RECS, DELETE_REC, UPDATE_REC_TITLE, UPDATE_REC_MARKS } from './rec-actions';
import Recording from '../models/Recording';

const initialState = {
    recordings: []
}

export default (state = initialState, action) => {
    switch (action.type) {
        case ADD_REC:
            const newRec = new Recording(
                action.recData.id.toString(),
                action.recData.title,
                action.recData.audioUri,
                action.recData.date.toString(),
                action.recData.duration,
                action.recData.flags
            )
            return {
                recordings: state.recordings.concat(newRec)
            }
        case SET_RECS:
            return {
                recordings: action.recordings
            };
        case DELETE_REC:
            return {
                recordings: state.recordings.filter(rec => rec.id !== action.id)
            }
        case UPDATE_REC_TITLE:
            let newRecording = state.recordings[state.recordings.findIndex(rec => rec.id === action.recData.id)];
            newRecording.title = action.recData.title;
            return {
                recordings: state.recordings.map(rec => rec.id === action.recData.id ? newRecording : rec)
            }
        case UPDATE_REC_MARKS:
            let newRecMarks = state.recordings[state.recordings.findIndex(rec => rec.id === action.recData.id)];
            newRecMarks.flags = action.recData.flags;
            return {
                recordings: state.recordings.map(rec => rec.id === action.recData.id ? newRecMarks : rec)
            }
        default:
            return state;
    }
}