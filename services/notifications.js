import * as Notifications from 'expo-notifications';

const WIP_NOTIFICATION_ID = 'wip-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleWIPReminder(title, body) {
  await cancelWIPReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: WIP_NOTIFICATION_ID,
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 10,
      minute: 0,
    },
  });
}

export async function cancelWIPReminder() {
  await Notifications.cancelScheduledNotificationAsync(WIP_NOTIFICATION_ID);
}
