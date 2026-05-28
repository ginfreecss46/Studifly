import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Assignment } from '@/types/database';
import { useFocusEffect, useRouter } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, ActivityIndicator, View, useColorScheme as useRNColorScheme, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

type AssignmentWithVotes = Assignment & { votes: number, user_vote: number };

export default function AssignmentsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);
  const themeColors = Colors[colorScheme];

  const [assignments, setAssignments] = useState<AssignmentWithVotes[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);

      // 1. Get current user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('level, filiere, option')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      // 2. Find users in the same class
      const { data: classmates, error: classmatesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('level', profile.level)
        .eq('filiere', profile.filiere)
        .eq('option', profile.option);

      if (classmatesError) throw classmatesError;
      const classmateIds = classmates.map((c) => c.id);

      // 3. Fetch assignments from those users
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*, courses(title)')
        .in('user_id', classmateIds)
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      // 4. Fetch votes for each assignment
      const assignmentsWithVotes = await Promise.all(
        assignmentsData.map(async (assignment) => {
          const { data: votes, error: votesError } = await supabase
            .from('assignment_votes')
            .select('vote')
            .eq('assignment_id', assignment.id);
          
          const { data: userVote, error: userVoteError } = await supabase
            .from('assignment_votes')
            .select('vote')
            .eq('assignment_id', assignment.id)
            .eq('user_id', session.user.id)
            .single();

          if (votesError) console.error(votesError);
          if (userVoteError && userVoteError.code !== 'PGRST116') console.error(userVoteError); // PGRST116: no rows found

          const totalVotes = votes ? votes.reduce((acc, v) => acc + v.vote, 0) : 0;
          return { ...assignment, votes: totalVotes, user_vote: userVote ? userVote.vote : 0 };
        })
      );

      setAssignments(assignmentsWithVotes);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { fetchAssignments(); }, [fetchAssignments]));

  const handleVote = async (assignmentId: string, vote: number) => {
    if (!session) return;
    try {
      // Check if the user has already voted
      const { data: existingVote, error: existingVoteError } = await supabase
        .from('assignment_votes')
        .select('id, vote')
        .eq('assignment_id', assignmentId)
        .eq('user_id', session.user.id)
        .single();

      if (existingVoteError && existingVoteError.code !== 'PGRST116') throw existingVoteError;

      if (existingVote) {
        // If the user is casting the same vote again, remove the vote
        if (existingVote.vote === vote) {
          const { error } = await supabase.from('assignment_votes').delete().eq('id', existingVote.id);
          if (error) throw error;
        } else {
          // If the user is changing their vote, update the vote
          const { data: updatedVote, error } = await supabase
            .from('assignment_votes')
            .update({ vote })
            .eq('id', existingVote.id)
            .select()
            .single();
          if (error) throw error;

          if (updatedVote) {
            const { error: notificationError } = await supabase.functions.invoke('assignment-vote-notification', {
              body: { record: updatedVote },
            });
            if (notificationError) console.warn('Assignment vote notification failed:', notificationError.message);
          }
        }
      } else {
        // If the user has not voted yet, insert a new vote
        const { data: newVote, error } = await supabase
          .from('assignment_votes')
          .insert({ assignment_id: assignmentId, user_id: session.user.id, vote })
          .select()
          .single();
        if (error) throw error;

        if (newVote) {
          const { error: notificationError } = await supabase.functions.invoke('assignment-vote-notification', {
            body: { record: newVote },
          });
          if (notificationError) console.warn('Assignment vote notification failed:', notificationError.message);
        }
      }

      fetchAssignments(); // Refresh assignments to show new vote count
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce devoir ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
              if (error) throw error;

              await Notifications.cancelScheduledNotificationAsync(assignmentId);
              Alert.alert('Succès', 'Devoir supprimé et notification annulée.');
              fetchAssignments();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: AssignmentWithVotes }) => (
    <View style={styles.card}>
      <View style={styles.voteContainer}>
        <Pressable style={({ pressed }) => [styles.voteButton, pressed && styles.buttonPressed]} onPress={() => handleVote(item.id, 1)}>
          <Feather name="arrow-up" size={20} color={item.user_vote === 1 ? themeColors.primary : themeColors.textSecondary} />
        </Pressable>
        <ThemedText style={[styles.voteCount, { color: item.votes > 0 ? themeColors.primary : item.votes < 0 ? themeColors.destructive : themeColors.textSecondary }]}>{item.votes}</ThemedText>
        <Pressable style={({ pressed }) => [styles.voteButton, pressed && styles.buttonPressed]} onPress={() => handleVote(item.id, -1)}>
          <Feather name="arrow-down" size={20} color={item.user_vote === -1 ? themeColors.destructive : themeColors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{item.title}</ThemedText>
        <ThemedText style={styles.cardSubtitle}>{item.courses.title}</ThemedText>
        {item.due_date && <ThemedText style={styles.dueDate}>Pour le {new Date(item.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</ThemedText>}
      </View>
      {session?.user.id === item.user_id && (
        <View style={styles.cardActions}>
          <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]} onPress={() => router.push(`/edit-assignment/${item.id}`)}>
            <Feather name="edit-2" size={20} color={themeColors.primary} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]} onPress={() => handleDeleteAssignment(item.id)}>
            <Feather name="trash-2" size={20} color={themeColors.destructive} />
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.header}>Devoirs de la classe</ThemedText>
      {loading ? (
        <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={assignments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <ThemedText style={styles.emptyText}>Aucun devoir pour le moment. Soyez le premier à en ajouter un !</ThemedText>
          )}
        />
      )}
      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.buttonPressed]} onPress={() => router.push('/add-assignment')}>
        <Feather name="plus" size={30} color={Colors.dark.text} />
      </Pressable>
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
      padding: Spacing.lg,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    voteContainer: { alignItems: 'center', marginRight: Spacing.lg, gap: Spacing.xs },
    voteButton: { padding: Spacing.xs },
    voteCount: { fontSize: FontSizes.subtitle, fontWeight: 'bold' },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: FontSizes.subtitle, color: themeColors.text },
    cardSubtitle: { color: themeColors.textSecondary, marginVertical: Spacing.xs },
    dueDate: { fontSize: FontSizes.caption, color: themeColors.textSecondary, fontWeight: 'bold', marginTop: Spacing.sm },
    cardActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: Spacing.lg },
    actionButton: { padding: Spacing.sm },
    buttonPressed: { opacity: 0.7 },
    emptyText: { textAlign: 'center', marginTop: Spacing.xl, color: themeColors.textSecondary, fontSize: FontSizes.body },
    fab: {
      position: 'absolute',
      right: 30,
      bottom: 40,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: themeColors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
  });
};