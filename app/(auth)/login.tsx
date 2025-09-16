import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, SafeAreaView } from 'react-native';
import AppLogo from '@/components/AppLogo';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential, getAuth, signInWithPopup } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthProvider';
import Constants from 'expo-constants';
export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async () => {
    try {
      setError(null);
      await signInWithEmail(email.trim(), password);
      router.replace('/(company)');
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar sesión');
    }
  };
  const handleRegister = async () => {
    try {
      setError(null);
      await signUpWithEmail(email.trim(), password);
      router.replace('/(company)');
    } catch (e: any) {
      setError(e?.message || 'Error al registrarse');
    }
  };
  WebBrowser.maybeCompleteAuthSession();
  const handleGoogle = async () => {
    try {
      setError(null);
      if (Platform.OS === 'web') {
        const webAuth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(webAuth, provider);
        router.replace('/(company)');
        return;
      }
      const googleClientId = (Constants?.expoConfig?.extra as any)?.googleClientId as string | undefined;
      if (!googleClientId) {
        throw new Error('Falta configurar googleClientId en app.json -> expo.extra.googleClientId');
      }
      const redirectUri = AuthSession.makeRedirectUri();
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      } as const;
      const request = new AuthSession.AuthRequest({
        clientId: googleClientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
        extraParams: { prompt: 'select_account' },
      });
      const result = await request.promptAsync(discovery);
      const idToken = (result as any)?.params?.id_token as string | undefined;
      if (!idToken) {
        throw new Error('No se obtuvo idToken de Google');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      router.replace('/(company)');
    } catch (e: any) {
      setError(e?.message || 'Error con Google');
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBg}>
        <AppLogo size="large" showText={true} style={styles.logoContainer} />
        <Text style={styles.subtitle}>Gestión simple y segura</Text>
      </View>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Bienvenido</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor="#9aa0a6"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#9aa0a6"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryText}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRegister}>
            <Text style={styles.secondaryText}>Crear cuenta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogle}>
            <Text style={styles.googleText}>Entrar con Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'rgb(235, 235, 235)' },
  headerBg: {
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderColor: '#20B2AA',
  },
  logoContainer: {
    marginBottom: 8,
  },
  subtitle: { color: '#414141', marginTop: 8, fontSize: 16, opacity: 0.9 },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: 'rgb(242, 242, 242)', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: 'rgba(37, 180, 189, 0.15)' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#1f2937', textAlign: 'center' },
  inputGroup: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, backgroundColor: '#fff', color: '#111827' },
  primaryButton: { backgroundColor: '#2E8B57', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 }, // Verde del logo
  primaryText: { color: '#fff', fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#20B2AA', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 }, // Turquoise del logo
  secondaryText: { color: '#00333a', fontWeight: 'bold' },
  googleButton: { backgroundColor: '#ffffff', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  googleText: { color: '#111827', fontWeight: '600' },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});
