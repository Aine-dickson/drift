import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:drift.db";
const TABLE_SQL = "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)";
const KEY_NOTES = "notes";
const KEY_SETTINGS = "settings";

let dbPromise: Promise<Database> | null = null;

const getDb = async () => {
    if (!dbPromise) {
        dbPromise = Database.load(DB_URL);
    }
    return dbPromise;
};

const ensureTable = async (db: Database) => {
    await db.execute(TABLE_SQL);
};

export type NotesSnapshot = {
    notes: unknown;
    selectedNoteId: string | null;
};

export type SettingsSnapshot = {
    isInitialSetup?: boolean;
    focusMode?: boolean;
    isSettingsOpen?: boolean;
    isInfoOpen?: boolean;
};

export const readNotesSnapshot = async (): Promise<NotesSnapshot | null> => {
    try {
        const db = await getDb();
        await ensureTable(db);
        const rows = (await db.select<{ value: string }[]>("SELECT value FROM kv WHERE key = ?", [KEY_NOTES])) ?? [];
        const value = rows[0]?.value;
        if (!value) return null;
        const parsed = JSON.parse(value) as NotesSnapshot;
        return parsed;
    } catch (error) {
        return console.log("Error reading notes snapshot:", error), null;
    }
};

export const writeNotesSnapshot = async (snapshot: NotesSnapshot) => {
    try {
        const db = await getDb();
        await ensureTable(db);
        await db.execute("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [KEY_NOTES, JSON.stringify(snapshot)]);
    } catch (error) {
        console.log("Error writing notes snapshot:", error);
    }
};

export const readSettingsSnapshot = async (): Promise<SettingsSnapshot | null> => {
    try {
        const db = await getDb();
        await ensureTable(db);
        const rows = (await db.select<{ value: string }[]>("SELECT value FROM kv WHERE key = ?", [KEY_SETTINGS])) ?? [];
        const value = rows[0]?.value;
        if (!value) return null;
        return JSON.parse(value) as SettingsSnapshot;
    } catch (error) {
        return console.log("Error reading settings snapshot:", error), null;
    }
};

export const writeSettingsSnapshot = async (snapshot: SettingsSnapshot) => {
    try {
        const db = await getDb();
        await ensureTable(db);
        await db.execute("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [KEY_SETTINGS, JSON.stringify(snapshot)]);
    } catch (error) {
        console.log("Error writing settings snapshot:", error);
    }
};
