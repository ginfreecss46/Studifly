import { useState, useMemo } from 'react';
import { View, TextInput, Alert, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, Pressable } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Spacing, FontSizes } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Erreur de connexion', error.message);
      showToast('Erreur de connexion', 'error');
    } else {
      showToast('Connexion réussie !', 'success');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
      <ThemedView style={styles.container}>
        <View style={{flex: 1, justifyContent: 'center'}}>
          <View style={styles.logoContainer}>
            <Feather name="book-open" size={60} color={Colors[colorScheme].primary} />
          </View>

          <ThemedText type="title" style={styles.header}>Studifly</ThemedText>
          <ThemedText style={styles.subtitle}>Ravi de vous revoir !</ThemedText>

          <View style={styles.card}>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={Colors[colorScheme].textSecondary}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                placeholderTextColor={Colors[colorScheme].textSecondary}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors[colorScheme].textSecondary} />
              </Pressable>
            </View>
            <Button title={loading ? 'Connexion...' : 'Se connecter'} onPress={signInWithEmail} disabled={loading} />
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <ThemedText style={styles.dividerText}>Ou</ThemedText>
            <View style={styles.divider} />
          </View>

          <Button title="Créer un compte" onPress={() => router.push('/register')} variant="secondary" />
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>Créé par KANG JINHUYK</ThemedText>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    keyboardView: { flex: 1, backgroundColor: themeColors.background },
    container: { flex: 1, padding: Spacing.lg, backgroundColor: themeColors.background },
    logoContainer: { alignItems: 'center', marginBottom: Spacing.xl },
    header: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.sm, color: themeColors.primary, fontFamily: Fonts.rounded },
    subtitle: { textAlign: 'center', marginBottom: Spacing.xl, fontSize: FontSizes.body, color: themeColors.textSecondary },
    card: {
      backgroundColor: themeColors.card,
      borderRadius: 16,
      padding: Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 5,
    },
    input: { height: 50, backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.border, borderRadius: 12, paddingHorizontal: Spacing.md, marginBottom: Spacing.md, fontSize: FontSizes.body, color: themeColors.text },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginBottom: Spacing.md,
      backgroundColor: themeColors.background,
    },
    passwordInput: {
      flex: 1,
      height: 50,
      paddingHorizontal: Spacing.md,
      fontSize: FontSizes.body,
      color: themeColors.text,
    },
    eyeIcon: {
      padding: Spacing.md,
    },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
    divider: { flex: 1, height: 1, backgroundColor: themeColors.border },
    dividerText: { marginHorizontal: Spacing.md, color: themeColors.textSecondary },
    footer: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    footerText: {
      fontSize: FontSizes.caption,
      color: themeColors.textSecondary,
    },
  });
};