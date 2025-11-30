import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Link, useLocalSearchParams, useNavigation } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { View, TextInput, StyleSheet, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme, Pressable, Alert, Image } from "react-native";
import { Colors, Spacing, FontSizes } from "@/constants/theme";
import { Feather } from '@expo/vector-icons';
import { useToast } from "@/context/ToastContext";

type Message = {
  id: number;
  content: string;
  created_at: string;
  user_id: string | null;
  message_type: 'text' | 'system';
  profiles: { full_name: string, avatar_url?: string } | null;
};

export default function ChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('Groupe');

  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!groupId) return;
      const { data } = await supabase
        .from('chat_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (data) {
        setGroupName(data.name);
        navigation.setOptions({ title: data.name });
      }
    };
    fetchGroupInfo();
  }, [groupId, navigation]);

  useEffect(() => {
    const checkFirstTime = async () => {
      if (!session || !groupId) return;
      const { data } = await supabase
        .from('group_members')
        .select('joined_at')
        .eq('group_id', groupId)
        .eq('user_id', session.user.id)
        .single();

      if (data && data.joined_at) {
        const joinedDate = new Date(data.joined_at);
        const now = new Date();
        // If joined within the last 15 seconds, show welcome message
        if (now.getTime() - joinedDate.getTime() < 15000) {
          showToast(`Bienvenue dans le groupe ${groupName} !`, 'info');
        }
      }
    };
    checkFirstTime();
  }, [groupId, session, groupName, showToast]);

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, user_id, message_type, profiles(full_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      Alert.alert("Erreur", "Impossible de charger les messages.");
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat:${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` }, async (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.user_id) {
          const { data: profileData, error } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', newMessage.user_id).single();
          if (error) {
            console.error('Error fetching profile for new message:', error);
          } else {
            newMessage.profiles = profileData;
          }
        }
        fetchMessages(); // Re-fetch messages to update the list
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session || !groupId) return;

    const content = newMessage.trim();
    
    // 1. Create an optimistic message
    const optimisticMessage: Message = {
      id: Math.random(), // Temporary unique ID
      content: content,
      created_at: new Date().toISOString(),
      user_id: session.user.id,
      message_type: 'text',
      profiles: {
        full_name: session.user.user_metadata.full_name,
        avatar_url: session.user.user_metadata.avatar_url,
      },
    };

    // 2. Add to local state immediately
    setMessages(currentMessages => [optimisticMessage, ...currentMessages]);
    setNewMessage('');

    // 3. Send to Supabase in the background
    const { error } = await supabase.from('chat_messages').insert({ 
      group_id: groupId, 
      user_id: session.user.id, 
      content: content, 
      message_type: 'text' 
    });

    // 4. If sending fails, remove the optimistic message and show an error
    if (error) {
      setMessages(currentMessages => currentMessages.filter(m => m.id !== optimisticMessage.id));
      showToast("Erreur d'envoi", 'error');
      console.error(error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.message_type === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <ThemedText style={styles.systemMessageText}>{item.content}</ThemedText>
        </View>
      );
    }

    const isMine = item.user_id === session?.user.id;
    return (
      <Pressable onLongPress={() => isMine && handleDeleteMessage(item.id)}>
        <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
          {!isMine && (
            <View style={styles.avatar}>
              {item.profiles?.avatar_url ? (
                <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Feather name="user" size={20} color={themeColors.textSecondary} />
              )}
            </View>
          )}
          <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
            {!isMine && 
              <Link href={`/profile/${item.user_id}`} asChild>
                <Pressable>
                  <ThemedText style={styles.authorName}>{item.profiles?.full_name || 'Anonyme'}</ThemedText>
                </Pressable>
              </Link>
            }
            <ThemedText style={isMine ? styles.myMessageText : styles.otherMessageText}>{item.content}</ThemedText>
            <ThemedText style={[styles.timestamp, isMine ? styles.myTimestamp : styles.otherTimestamp]}>{new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={themeColors.primary} style={{ flex: 1 }} />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        inverted
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Votre message..."
          placeholderTextColor={themeColors.textSecondary}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSendMessage} disabled={!newMessage.trim()}>
          <Feather name="send" size={24} color={themeColors.primary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    list: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
    messageRow: { flexDirection: 'row', marginBottom: Spacing.lg, alignItems: 'flex-end' },
    myMessageRow: { justifyContent: 'flex-end' },
    otherMessageRow: { justifyContent: 'flex-start' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.border, marginRight: Spacing.sm, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    messageBubble: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 20, maxWidth: '80%' },
    myMessage: { backgroundColor: themeColors.primary, borderBottomRightRadius: 4 },
    otherMessage: { backgroundColor: themeColors.card, borderBottomLeftRadius: 4 },
    authorName: { fontWeight: 'bold', marginBottom: 4, fontSize: FontSizes.caption, color: themeColors.primary },
    myMessageText: { color: 'white', fontSize: FontSizes.body },
    otherMessageText: { color: themeColors.text, fontSize: FontSizes.body },
    timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
    myTimestamp: { color: '#E0E0E0' },
    otherTimestamp: { color: themeColors.textSecondary },
    systemMessageContainer: { alignItems: 'center', marginVertical: Spacing.md },
    systemMessageText: { color: themeColors.textSecondary, fontStyle: 'italic', fontSize: FontSizes.caption },
    inputContainer: { flexDirection: 'row', padding: Spacing.md, borderTopWidth: 1, borderTopColor: themeColors.border, backgroundColor: themeColors.card, alignItems: 'center' },
    input: { flex: 1, backgroundColor: themeColors.background, borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSizes.body, lineHeight: 20, maxHeight: 100, marginRight: Spacing.md, color: themeColors.text },
    sendButton: { padding: Spacing.sm },
  });
};