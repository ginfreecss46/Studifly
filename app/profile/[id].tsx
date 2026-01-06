import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { useLocalSearchParams } from 'expo-router';
import { getFullName } from '../../lib/data-mappers';
import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, useColorScheme, ScrollView } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" color={themeColors.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  if (!profile) {
    return <View style={styles.container}><ThemedText>Profil non trouvé.</ThemedText></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Image source={{ uri: profile.avatar_url || undefined }} style={styles.avatar} />
        <ThemedText type="title" style={styles.name}>{profile.full_name}</ThemedText>
      </View>
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Informations</ThemedText>
        <View style={styles.infoGrid}>
          <InfoItem icon="award" label="Niveau" value={profile.level} />
          <InfoItem icon="briefcase" label="Pôle" value={getFullName('pole', profile.pole)} />
          <InfoItem icon="book" label="Filière" value={getFullName('filiere', profile.filiere)} />
          <InfoItem icon="tag" label="Option" value={getFullName('option', profile.option)} />
          <InfoItem icon="home" label="Université" value={profile.university} />
          <InfoItem icon="calendar" label="Année" value={profile.academic_year} />
        </View>
      </View>
    </ScrollView>
  );
}

const InfoItem = ({ icon, label, value }: { icon: any; label: string; value: string | null }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  return (
    <View style={styles.infoGridItem}>
      <Feather name={icon} size={18} color={themeColors.primary} style={styles.infoIcon} />
      <ThemedText style={styles.infoText}>{label}: {value || 'N/A'}</ThemedText>
    </View>
  );
};

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    headerContainer: {
      backgroundColor: themeColors.card,
      padding: Spacing.lg,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: themeColors.border,
    },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: themeColors.border, marginBottom: Spacing.md },
    name: { fontSize: FontSizes.title, fontWeight: 'bold', color: themeColors.text },
    card: { backgroundColor: themeColors.card, padding: Spacing.lg, margin: Spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: themeColors.border },
    cardTitle: { fontSize: FontSizes.subtitle, fontWeight: 'bold', color: themeColors.text, marginBottom: Spacing.md },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    infoGridItem: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    infoIcon: { marginRight: Spacing.sm },
    infoText: { fontSize: FontSizes.body, color: themeColors.text, flexShrink: 1 },
  });
};
