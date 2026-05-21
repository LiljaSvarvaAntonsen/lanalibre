// Real push notifications require an EAS build and will be implemented in Slice 14
// during deployment. expo-notifications is not supported in Expo Go SDK 53+.
// These are no-op mocks for development.

export async function scheduleWIPReminder(title, body) {
  console.log('[notifications] scheduleWIPReminder (mock):', title, body);
}

export async function cancelWIPReminder() {
  console.log('[notifications] cancelWIPReminder (mock)');
}
