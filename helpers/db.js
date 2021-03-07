import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('recordings.db');

export const init = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction(tx => {
      //tx.executeSql('DROP TABLE recordings;', [], () => { resolve() }, (_, err) => { reject(err)});
      tx.executeSql('CREATE TABLE IF NOT EXISTS recordings (id INTEGER PRIMARY KEY NOT NULL, title TEXT NOT NULL, audioUri TEXT NOT NULL, date TEXT NOT NULL, duration INTEGER NOT NULL, flags TEXT);',
        [],
        //success
        () => { resolve() },
        //rejected
        (_, err) => { reject(err) }
      )
    });
  });
  return promise;
};

export const insertRecording = (title, audioUri, date, duration, flags) => {
  const promise = new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "INSERT INTO recordings (title, audioUri, date, duration, flags) VALUES (?, ?, ?, ?, ?);",
        [title, audioUri, date, duration, flags],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        }
      );
    });
  });
  return promise;
};

export const fetchRecordings = () => {
  const promise = new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM recordings;',
        [],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        }
      );
    });
  });
  return promise;
};

export const removeRecording = (id) => {
  const promise = new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "DELETE FROM recordings WHERE id = ?;",
        [id],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        }
      );
    });
  });
  return promise;
}

export const updateRecordingTitle = (title, id) => {
  const promise = new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "UPDATE recordings SET title=? WHERE id=?;",
        [title, id],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        }
      );
    });
  });
  return promise;
}

export const updateRecordingRecMarks = (id, flags) => {
  const promise = new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "UPDATE recordings SET flags=? WHERE id=?;",
        [flags, id],
        (_, result) => {
          resolve(result);
        },
        (_, err) => {
          reject(err);
        }
      );
    });
  });
  return promise;
}