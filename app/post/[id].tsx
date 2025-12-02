import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { View, TextInput, StyleSheet, Alert, FlatList, ActivityIndicator, useColorScheme as useRNColorScheme, Pressable, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';
import { isAdmin } from '@/lib/auth';

type Reply = {
  id: string;
  created_at: string;
  content: string;
  profiles: { full_name: string } | null;
  post_reactions: { user_id: string }[];
  likes_count?: number;
};
type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  user_id: string;
  profiles: { full_name: string } | null;
  post_reactions: { user_id: string }[];
  likes_count?: number;
  documents: { id: string; title: string; file_url: string }[] | null;
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);

  const userIsAdmin = isAdmin(session?.user);

  const fetchPostAndReplies = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Step 1: Fetch the main post data (already fixed)
      const { data: postData, error: postError } = await supabase
        .from('forum_posts')
        .select('*, profiles(*), documents(*)')
        .eq('id', id)
        .single();
      if (postError) throw postError;

      const { data: postReactionsData, error: postReactionsError } = await supabase
        .from('post_reactions')
        .select('user_id')
        .eq('post_id', id);
      if (postReactionsError) throw postReactionsError;

      const postWithLikes = {
        ...postData,
        post_reactions: postReactionsData || [],
        likes_count: postReactionsData?.length || 0,
      };
      setPost(postWithLikes as Post);

      // Step 2: Fetch replies (without reactions)
      const { data: repliesData, error: repliesError } = await supabase
        .from('forum_post_replies')
        .select('*, profiles!user_id(full_name)') // Remove post_reactions from here
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      // Step 3: Fetch reactions for each reply and combine them
      const repliesWithLikes = await Promise.all(
        (repliesData || []).map(async (reply) => {
          const { data: replyReactionsData, error: replyReactionsError } = await supabase
            .from('post_reactions')
            .select('user_id')
            .eq('reply_id', reply.id);

          // Don't throw here, just log error and continue
          if (replyReactionsError) {
            console.error(`Error fetching reactions for reply ${reply.id}:`, replyReactionsError);
          }

          return {
            ...reply,
            post_reactions: replyReactionsData || [],
            likes_count: replyReactionsData?.length || 0,
          };
        })
      );
      setReplies(repliesWithLikes);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPostAndReplies();

    const channel = supabase.channel(`post-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_post_replies', filter: `post_id=eq.${id}` },
        () => fetchPostAndReplies()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions' }, // Listen for all reactions changes
        () => fetchPostAndReplies()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchPostAndReplies]);

  useEffect(() => {
    if (post) {
      navigation.setOptions({ title: post.title });
    }
  }, [post, navigation]);

  const handleAddReply = async () => {
    if (!session || !post) return;
    if (!newReply.trim()) return;

    try {
      const { error } = await supabase.from('forum_post_replies').insert({ post_id: post.id, user_id: session.user.id, content: newReply });
      if (error) throw error;
      setNewReply('');
      // The UI will update automatically via the realtime subscription
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleLike = async (targetId: string, targetType: 'post' | 'reply') => {
    if (!session) return Alert.alert('Erreur', 'Vous devez être connecté pour aimer.');

    try {
      const { data: existingLike, error: fetchError } = await supabase
        .from('post_reactions')
        .select('id')
        .eq(targetType === 'post' ? 'post_id' : 'reply_id', targetId)
        .eq('user_id', session.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingLike) {
        await supabase.from('post_reactions').delete().eq('id', existingLike.id);
      } else {
        await supabase.from('post_reactions').insert({ [targetType === 'post' ? 'post_id' : 'reply_id']: targetId, user_id: session.user.id, type: 'like' });
      }
      fetchPostAndReplies();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    Alert.alert('Confirmer la suppression', 'Êtes-vous sûr de vouloir supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('forum_posts').delete().eq('id', post.id);
          if (error) {
            Alert.alert('Erreur', error.message);
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  const handleDeleteReply = async (replyId: string) => {
    Alert.alert('Confirmer la suppression', 'Êtes-vous sûr de vouloir supprimer cette réponse ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('forum_post_replies').delete().eq('id', replyId);
          if (error) {
            Alert.alert('Erreur', error.message);
          } else {
            fetchPostAndReplies();
          }
        },
      },
    ]);
  };

  const renderReply = useCallback(({ item }: { item: Reply }) => (
    <View style={styles.replyContainer}>
      <ThemedText style={{ color: themeColors.text }}>{item.content}</ThemedText>
      <ThemedText style={styles.metaText}>
        - {item.profiles?.full_name || 'Anonyme'} le {new Date(item.created_at).toLocaleDateString('fr-FR')}
      </ThemedText>
      <View style={styles.replyActions}>
        <Pressable onPress={() => handleLike(item.id, 'reply')} style={({ pressed }) => [styles.likeButton, pressed && styles.buttonPressed]}>
          <Feather name={item.post_reactions?.some(r => r.user_id === session?.user.id) ? "heart" : "heart"} size={20} color={item.post_reactions?.some(r => r.user_id === session?.user.id) ? themeColors.primary : themeColors.textSecondary} />
          <ThemedText style={styles.likeCount}>{item.likes_count || 0}</ThemedText>
        </Pressable>
        {(userIsAdmin || session?.user.id === item.user_id) && (
          <Pressable onPress={() => handleDeleteReply(item.id)} style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}>
            <Feather name="trash-2" size={20} color={themeColors.destructive} />
          </Pressable>
        )}
      </View>
    </View>
  ), [styles, themeColors, session, userIsAdmin, handleLike, handleDeleteReply]);

  const renderFooter = useCallback(() => (
    <View style={styles.replyInputContainer}>
      <TextInput
        placeholder="Votre réponse..."
        value={newReply}
        onChangeText={setNewReply}
        style={styles.input}
        multiline
        placeholderTextColor={themeColors.textSecondary}
      />
      <Button title="Répondre" onPress={handleAddReply} disabled={!newReply.trim()} />
    </View>
  ), [styles, newReply, themeColors, handleAddReply]);

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} color={themeColors.primary} />;
  }

  if (!post) {
    return <View style={styles.container}><ThemedText style={{ color: themeColors.text }}>Message non trouvé.</ThemedText></View>;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={100}
    >
      <FlatList
        style={styles.container}
        ListHeaderComponent={() => (
          <View style={styles.card}>
            <View style={styles.postHeader}>
              <ThemedText type="title" style={styles.postTitle}>{post.title}</ThemedText>
              {session?.user.id === post.user_id && (
                <Button title="Modifier" onPress={() => { console.log('Editing post with ID:', post.id); router.push(`/edit-post/${post.id}`); }} variant="secondary" />
              )}
              {userIsAdmin && (
                <Button title="Supprimer" onPress={() => { console.log('Deleting post with ID:', post.id); handleDeletePost(); }} variant="secondary" style={{backgroundColor: themeColors.destructive}} />
              )}
            </View>
            <ThemedText style={styles.metaText}>
              Par {post.profiles?.full_name || 'Anonyme'} le {new Date(post.created_at).toLocaleDateString('fr-FR')}
            </ThemedText>
            <ThemedText style={styles.postContent}>{post.content}</ThemedText>
            {post.documents && post.documents.length > 0 && (
              <View style={styles.documentContainer}>
                <ThemedText style={styles.documentTitle}>Pièce jointe :</ThemedText>
                <Pressable onPress={() => Linking.openURL(post.documents[0].file_url)}>
                  <ThemedText style={styles.documentLink}>{post.documents[0].title}</ThemedText>
                </Pressable>
              </View>
            )}
            <View style={styles.likeContainer}>
              <Pressable onPress={() => handleLike(post.id, 'post')} style={({ pressed }) => [styles.likeButton, pressed && styles.buttonPressed]}>
                <Feather name="heart" size={20} color={post.post_reactions?.some(r => r.user_id === session?.user.id) ? themeColors.primary : themeColors.textSecondary} />
                <ThemedText style={styles.likeCount}>{post.likes_count || 0}</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="subtitle" style={styles.repliesHeader}>Réponses</ThemedText>
          </View>
        )}
        data={replies}
        renderItem={renderReply}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: Spacing.lg }}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={() => <ThemedText style={styles.emptyText}>Aucune réponse pour le moment.</ThemedText>}
      />
    </KeyboardAvoidingView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background, paddingTop: 60 },
    card: {
      backgroundColor: themeColors.card,
      borderRadius: 16,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    postTitle: { flex: 1, fontSize: FontSizes.title, fontWeight: 'bold', color: themeColors.text },
    postContent: { marginVertical: Spacing.md, fontSize: FontSizes.body, lineHeight: 24, color: themeColors.text },
    metaText: { color: themeColors.textSecondary, marginVertical: Spacing.xs, fontSize: FontSizes.caption },
    likeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
    likeButton: { flexDirection: 'row', alignItems: 'center' },
    likeCount: { marginLeft: Spacing.xs, fontSize: FontSizes.caption, color: themeColors.textSecondary },
    buttonPressed: { opacity: 0.7 },
    repliesHeader: { marginTop: Spacing.lg, marginBottom: Spacing.md, borderTopWidth: 1, borderTopColor: themeColors.border, paddingTop: Spacing.md, fontSize: FontSizes.subtitle, fontWeight: 'bold', color: themeColors.text },
    replyContainer: { backgroundColor: themeColors.card, padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.sm, borderWidth: 1, borderColor: themeColors.border },
    replyActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
    deleteButton: { padding: Spacing.sm },
    replyInputContainer: { marginTop: Spacing.lg },
    input: { borderWidth: 1, borderColor: themeColors.border, padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.sm, backgroundColor: themeColors.background, color: themeColors.text, fontSize: FontSizes.body },
    emptyText: { textAlign: 'center', color: themeColors.textSecondary, marginTop: Spacing.lg, fontSize: FontSizes.body },
    documentContainer: { marginTop: Spacing.md },
    documentTitle: { fontSize: FontSizes.body, fontWeight: 'bold', color: themeColors.text, marginBottom: Spacing.sm },
    documentLink: { fontSize: FontSizes.body, color: themeColors.primary, textDecorationLine: 'underline' },
  });
}
