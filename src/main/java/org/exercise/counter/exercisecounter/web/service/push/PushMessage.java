package org.exercise.counter.exercisecounter.web.service.push;

/**
 * What the service worker shows as notification ({@code frontend/public/sw.js}).
 *
 * @param url opened when the notification is tapped
 * @param tag a newer notification with the same tag replaces the older one
 */
public record PushMessage(String title, String body, String url, String tag) {
}
