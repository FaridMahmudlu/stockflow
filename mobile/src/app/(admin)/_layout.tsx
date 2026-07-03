import { Stack } from 'expo-router';

/** Admin group — only accessible if role === 'ADMIN' (Phase 12) */
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
