import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { useFocusEffect, useRouter } from 'expo-router';
import { getFullName } from '../../lib/data-mappers';
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Switch, ScrollView, useColorScheme as useRNColorScheme, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Picker } from '@react-native-picker/picker';

export default function ProfileScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);
  const themeColors = Colors[colorScheme];

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [assignmentReminder, setAssignmentReminder] = useState('1_day_before');
  const [forumReplyNotifs, setForumReplyNotifs] = useState(true);
  const [newGradeNotifs, setNewGradeNotifs] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const { data, error, status } = await supabase.from('profiles').select(`*`).eq('id', session.user.id).single();
      if (error && status !== 406) throw error;
      if (data) {
        setProfile(data);
        setAssignmentReminder(data.assignment_reminder_preference || '1_day_before');
        setForumReplyNotifs(data.forum_reply_notifications_enabled ?? true);
        setNewGradeNotifs(data.new_grade_notifications_enabled ?? true);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Erreur', error.message);
  };

  const updateProfileSetting = async (setting: Partial<Profile>) => {
    if (!session) return;
    const { error } = await supabase.from('profiles').update(setting).eq('id', session.user.id);
    if (error) {
      Alert.alert('Erreur de sauvegarde', error.message);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={themeColors.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[themeColors.gradientStart, themeColors.gradientEnd]} style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/images/icon.png')}
              style={styles.avatar}
            />
            <View style={styles.statusIndicator} />
          </View>
          <ThemedText type="title" style={styles.headerName}>{profile?.full_name || 'Utilisateur'}</ThemedText>
          <ThemedText style={styles.headerEmail}>{session?.user.email}</ThemedText>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Informations</ThemedText>
            <Pressable onPress={() => router.push('/edit-profile')} style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}>
              <Feather name="edit-3" size={18} color={themeColors.primary} />
            </Pressable>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoGridItem}>
              <Feather name="user" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Nom: {profile?.full_name || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoGridItem}>
              <Feather name="briefcase" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Pôle: {getFullName('pole', profile?.pole) || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoGridItem}>
              <Feather name="book" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Filière: {getFullName('filiere', profile?.filiere) || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoGridItem}>
              <Feather name="book-open" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Option: {getFullName('option', profile?.option) || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoGridItem}>
              <Feather name="award" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Niveau: {profile?.level || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoGridItem}>
              <Feather name="home" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Université: {profile?.university || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoGridItem}>
              <Feather name="calendar" size={18} color={themeColors.primary} style={styles.infoIcon} />
              <ThemedText style={styles.infoText}>Année: {profile?.academic_year || 'N/A'}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Paramètres de Notification</ThemedText>
          
          <View style={styles.settingItemPicker}>
            <ThemedText>Rappels de devoirs</ThemedText>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={assignmentReminder}
                onValueChange={(itemValue) => {
                  setAssignmentReminder(itemValue);
                  updateProfileSetting({ assignment_reminder_preference: itemValue });
                }}
                dropdownIconColor={themeColors.text}
                style={{ color: themeColors.text }}
              >
                <Picker.Item label="2 jours avant" value="2_days_before" />
                <Picker.Item label="1 jour avant" value="1_day_before" />
                <Picker.Item label="Le matin même" value="same_day_morning" />
                <Picker.Item label="1 heure avant" value="1_hour_before" />
                <Picker.Item label="Jamais" value="none" />
              </Picker>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={{ flexShrink: 1, marginRight: 10 }}>
              <ThemedText>Nouvelle note</ThemedText>
              <ThemedText style={styles.settingDescription}>Recevoir une alerte quand une note est publiée.</ThemedText>
            </View>
            <Switch 
              value={newGradeNotifs} 
              onValueChange={(value) => {
                setNewGradeNotifs(value);
                updateProfileSetting({ new_grade_notifications_enabled: value });
              }}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor={themeColors.card}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={{ flexShrink: 1, marginRight: 10 }}>
              <ThemedText>Réponse à mes posts</ThemedText>
              <ThemedText style={styles.settingDescription}>Être notifié quand quelqu&apos;un répond à mes posts sur le forum.</ThemedText>
            </View>
            <Switch 
              value={forumReplyNotifs} 
              onValueChange={(value) => {
                setForumReplyNotifs(value);
                updateProfileSetting({ forum_reply_notifications_enabled: value });
              }}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor={themeColors.card}
            />
          </View>
        </View>

        <Button title="Déconnexion" onPress={handleLogout} style={{ backgroundColor: themeColors.destructive }} />
      </View>
    </ScrollView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    headerBackground: {
      paddingTop: 70,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      marginBottom: Spacing.lg,
      alignItems: 'center',
    },
    headerContent: { alignItems: 'center' },
    headerName: { color: Colors.dark.text, marginTop: Spacing.md, fontSize: FontSizes.title, fontWeight: 'bold' },
    headerEmail: { color: Colors.dark.text, fontSize: FontSizes.body, opacity: 0.8 },
    avatarContainer: { position: 'relative', marginBottom: Spacing.sm },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.dark.text },
    statusIndicator: { position: 'absolute', bottom: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: themeColors.background },
    contentContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
    card: { 
      backgroundColor: themeColors.card, 
      padding: Spacing.lg, 
      borderRadius: 16, 
      marginBottom: Spacing.lg, 
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    cardTitle: { fontSize: FontSizes.subtitle, fontWeight: 'bold', color: themeColors.text },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },
    infoGridItem: { width: '50%', flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    infoIcon: { marginRight: Spacing.sm },
    infoText: { fontSize: FontSizes.body, color: themeColors.text, flexShrink: 1 },
    editButton: { padding: Spacing.sm },
    buttonPressed: { opacity: 0.7 },
    settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md },
    settingItemPicker: { marginVertical: Spacing.md },
    settingDescription: { fontSize: FontSizes.caption, color: themeColors.textSecondary, marginTop: Spacing.xs },
    pickerContainer: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginTop: Spacing.sm,
      backgroundColor: themeColors.background,
    },
  });
}