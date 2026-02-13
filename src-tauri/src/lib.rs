use std::{collections::HashMap, sync::Arc, time::Duration};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State, WindowEvent};
use tauri_plugin_notification::NotificationExt;
use tokio::{sync::Mutex, time::sleep};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReminderPayload {
    pub id: String,
    pub note_id: String,
    pub at: String, // ISO8601
    pub title: String,
    pub body: String,
}

type ReminderGuards = Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>;

fn fire_notification(app: AppHandle, payload: ReminderPayload) {
    let _ = app
        .notification()
        .builder()
        .title(if payload.title.is_empty() { "Drift reminder" } else { &payload.title })
        .body(if payload.body.is_empty() { "Check your note." } else { &payload.body })
        .show();

    // Also emit an in-app event so the frontend can play an alarm sound.
    let _ = app.emit("reminder_fired", &payload);
}

async fn schedule_once(app: AppHandle, guards: ReminderGuards, payload: ReminderPayload) {
    let at: DateTime<Utc> = payload
        .at
        .parse()
        .unwrap_or_else(|_| Utc::now() + chrono::Duration::minutes(1));
    
    let now = Utc::now();
    let wait_ms = (at - now).num_milliseconds();
    if wait_ms <= 0 {
        // Skip immediate fire for past-due reminders when (re)scheduling
        return;
    }
    let guards_for_task = guards.clone();
    let app_for_task = app.clone();
    let id_for_task = payload.id.clone();
    let payload_for_task = payload.clone();

    let handle = tokio::spawn(async move {
        sleep(Duration::from_millis(wait_ms as u64)).await;
        fire_notification(app_for_task, payload_for_task);
        let mut map = guards_for_task.lock().await;
        map.remove(&id_for_task);
    });

    let mut map = guards.lock().await;
    map.insert(payload.id.clone(), handle);
}

#[tauri::command]
async fn schedule_reminders(state: State<'_, ReminderGuards>, app: AppHandle, reminders: Vec<ReminderPayload>) -> Result<(), String> {
    // Clear previous guards for incoming IDs to avoid duplicates
    let mut map = state.lock().await;
    for r in reminders.iter() {
        if let Some(handle) = map.remove(&r.id) {
            handle.abort();
        }
    }
    drop(map);

    for payload in reminders {
        schedule_once(app.clone(), state.inner().clone(), payload).await;
    }

    Ok(())
}

#[tauri::command]
async fn cancel_reminders(state: State<'_, ReminderGuards>, ids: Vec<String>) -> Result<(), String> {
    let mut map = state.lock().await;
    for id in ids {
        if let Some(handle) = map.remove(&id) {
            handle.abort();
        }
    }

    Ok(())
}

#[tauri::command]
async fn request_notification_permission(app: AppHandle) -> Result<(), String> {
    let _ = app
        .notification()
        .request_permission()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage::<ReminderGuards>(Arc::new(Mutex::new(HashMap::new())));

    #[cfg(not(mobile))]
    {
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));
    }

    builder
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(not(mobile))]
                {
                    let _ = window.minimize();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![schedule_reminders, cancel_reminders, request_notification_permission])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
