import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { ClientSelectionProvider } from '@/context/ClientSelectionProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { RealtimeDataProvider } from '@/context/RealtimeDataProvider';
import { ToastProvider } from '@/context/ToastProvider';
import OfflineStatusBar from '@/components/OfflineStatusBar';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RealtimeDataProvider>
              <ClientSelectionProvider>
                <AppNavigator />
                <OfflineStatusBar />
                <StatusBar style="auto" />
              </ClientSelectionProvider>
            </RealtimeDataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </NavigationThemeProvider>
  );
}

function AppNavigator() {
  const router = useRouter();
  const { user, empresaId, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (!empresaId) {
      router.replace('/(company)');
      return;
    }
    router.replace('/(tabs)');
  }, [user, empresaId, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(company)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}
