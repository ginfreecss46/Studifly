import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { FlatList, StyleSheet, ActivityIndicator, View, Pressable, useColorScheme, Alert } from "react-native";
import { Colors, Spacing, FontSizes } from "@/constants/theme";
import { Feather } from '@expo/vector-icons';

type Group = {
  id: string;
  name: string;
  description: string;
  group_type: string;
};

const getGroupIcon = (groupType: string) => {
  switch (groupType) {
    case 'level':
      return 'users';
    case 'pole':
      return 'briefcase';
    case 'filiere':
      return 'book';
    case 'option':
      return 'tag';
    default:
      return 'message-circle';
  }
};

const formatGroupName = (name: string, groupType: string): string => {
  if (groupType === 'level') {
    const nameLower = name.toLowerCase();
    if (nameLower === 'l1 - tous') return 'Étudiants Licence 1';
    if (nameLower === 'l2 - tous') return 'Étudiants Licence 2';
    if (nameLower === 'l3 - tous') return 'Étudiants Licence 3';
  } else if (groupType === 'pole') {
    if (name === 'polytechnique') return 'Pôle Polytechnique';
    if (name === 'commerce') return 'Pôle Commerce';
    if (name === 'droit') return 'Pôle Droit';
  } else if (groupType === 'filiere') {
    if (name === 'gi') return 'Génie Informatique';
    if (name === 'gm') return 'Génie Mécanique';
    if (name === 'ge') return 'Génie Électrique';
    if (name === 'gc') return 'Génie Civil';
    if (name === 'gs') return 'Géosciences';
  } else if (groupType === 'option') {
    if (name === 'gl') return 'Génie Logiciel';
    if (name === 'rt') return 'Réseaux et Télécommunications';
    if (name === 'di') return 'Développement Informatique';
    if (name === 'ia') return 'Intelligence Artificielle';
    if (name === 'mi') return 'Maintenance Industrielle';
    if (name === 'em') return 'Électromécanique';
    if (name === 'm') return 'Mécatronique';
    if (name === 'et') return 'Électrotechnique';
    if (name === 'aii') return 'Automatisme et Informatique Industrielle';
    if (name === 'ai') return 'Automatisme et Instrumentation';
    if (name === 'gp/gc') return 'Génie des Procédés / Génie Chimique';
    if (name === 'gpa') return 'Génie des Procédés Alimentaire';
    if (name === 'qhse') return 'Qualité, Hygiène, Sécurité & Environnement';
    if (name === 'rp') return 'Raffinage & Pétrochimie';
    if (name === 'btp') return 'Bâtiment & Travaux Publics';
    if (name === 'au') return 'Architecture & Urbanisation';
    if (name === 'gt') return 'Géomètre et Topographe';
    if (name === 'mc') return 'Mines & Carrières';
    if (name === 'gp') return 'Génie Pétrolier';
    if (name === 'gghs') return 'Génie Géologique des Hydrosystèmes';
    if (name === 'ge') return 'Géophysique';
    if (name === 'gga') return 'Géotechnique & Géologie Appliquée';
    if (name === 'ge_env') return 'Gestion de l\'Environnement';
    if (name === 'mco') return 'Management Commercial Opérationnel';
    if (name === 'cge') return 'Comptabilité & Gestion d\'Entreprise';
    if (name === 'tci') return 'Transit & Commerce International';
    if (name === 'grh') return 'Gestion Des Ressources Humaines';
    if (name === 'bf') return 'Banque, Finance & Assurances';
    if (name === 'btm') return 'Business, Trade & Marketing';
    if (name === 'mdc') return 'Marketing Digital & Communication';
    if (name === 'cf') return 'Comptabilité & Finances';
    if (name === 'TL') return 'Transport & Logistique';
    if (name === 'ep') return 'Économie Pétrolière';
    if (name === 'am') return 'Assistant De Manager';
    if (name === 'dri') return 'Diplomatie & Relations Internationales';
    if (name === 'sp') return 'Sciences Politiques';
    if (name === 'da') return 'Droit Des Affaires';
    if (name === 'dp') return 'Droit Public';
    if (name === 'Dv') return 'Droit Privé';
  }
  return name;
};

export default function GroupsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_members')
        .select('chat_groups(id, name, description, group_type)')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const userGroups = data.map(item => item.chat_groups).filter(Boolean) as Group[];
      setGroups(userGroups);
    } catch (error: any) {
      Alert.alert("Erreur", "Impossible de charger vos groupes de discussion.");
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  const renderItem = ({ item }: { item: Group }) => (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push(`/chat/${item.id}`)}>
      <View style={styles.cardIcon}>
        <Feather name={getGroupIcon(item.group_type) as any} size={24} color={themeColors.primary} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{formatGroupName(item.name, item.group_type)}</ThemedText>
        <ThemedText style={styles.cardDescription}>{item.description || 'Appuyez pour voir les messages'}</ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={themeColors.icon} />
    </Pressable>
  );

  if (loading) {
    return <ActivityIndicator size="large" color={themeColors.primary} style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.header}>Mes Groupes</ThemedText>
      <FlatList
        data={groups}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <ThemedText style={styles.emptyText}>Vous n&apos;êtes dans aucun groupe pour le moment.</ThemedText>
        )}
      />
    </View>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background, paddingTop: 60 },
    header: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, fontSize: FontSizes.title, fontWeight: 'bold', color: themeColors.text },
    card: {
      backgroundColor: themeColors.card,
      borderRadius: 16,
      padding: Spacing.md,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    cardPressed: { transform: [{ scale: 0.99 }], backgroundColor: themeColors.border },
    cardIcon: { marginRight: Spacing.md },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: FontSizes.body, fontWeight: 'bold', color: themeColors.text },
    cardDescription: { fontSize: FontSizes.caption, color: themeColors.textSecondary, marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: Spacing.xl, color: themeColors.textSecondary, fontSize: FontSizes.body },
  });
};