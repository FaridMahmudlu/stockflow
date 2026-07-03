import { Stack } from 'expo-router';

/** Auth group layout — login screen (Phase 9) */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
