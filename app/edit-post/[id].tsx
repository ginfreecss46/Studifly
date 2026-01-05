import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, View, ActivityIndicator, ScrollView, useColorScheme as useRNColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [originalUserId, setOriginalUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !session) return;

      const { data: postData, error } = await supabase.from('forum_posts').select('*').eq('id', id).single();
      if (error || !postData) {
        Alert.alert('Erreur', 'Impossible de charger le message.');
        setLoading(false);
        return;
      }

      if (postData.user_id !== session.user.id) {
        Alert.alert('Accès refusé', 'Vous n\'êtes pas l\'auteur de ce message.');
        router.back();
        return;
      }

      setTitle(postData.title);
      setContent(postData.content || '');
      setSelectedCourse(postData.course_id);
      setOriginalUserId(postData.user_id);

      const { data: courseData } = await supabase.from('user_courses').select('courses(*)').eq('user_id', session.user.id);
      if (courseData) {
        const userCourses = courseData.map(item => item.courses).filter((c): c is Course => c !== null && typeof c === 'object');
        setCourses(userCourses);
      }

      setLoading(false);
    };
    fetchData();
  }, [id, session, router]);

  const handleUpdate = async () => {
    if (!id || !session || session.user.id !== originalUserId) return Alert.alert('Erreur', 'Action non autorisée.');
    if (!title) return Alert.alert('Erreur', 'Le titre est obligatoire.');

    try {
      setLoading(true);
      const { error } = await supabase.from('forum_posts').update({
        title,
        content,
        course_id: selectedCourse,
      }).eq('id', id);

      if (error) throw error;

      Alert.alert('Succès', 'Votre message a été mis à jour.');
      router.replace(`/post/${id}`);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={themeColors.primary} style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Modifier le message</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Titre</ThemedText>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={themeColors.textSecondary} />

        <ThemedText style={styles.label}>Contenu</ThemedText>
        <TextInput value={content} onChangeText={setContent} style={[styles.input, styles.textArea]} multiline placeholderTextColor={themeColors.textSecondary} />

        <ThemedText style={styles.label}>Matière</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={selectedCourse} onValueChange={(itemValue) => setSelectedCourse(itemValue)} dropdownIconColor={themeColors.icon} style={{ color: themeColors.text }}>
            <Picker.Item label="Aucune matière spécifique" value={undefined} />
            {courses.map(course => <Picker.Item key={course.id} label={course.title || 'Sans titre'} value={course.id} />)}
          </Picker>
        </View>

        <View style={styles.buttonContainer}>
          <Button title={loading ? 'Enregistrement...' : 'Enregistrer'} onPress={handleUpdate} disabled={loading} />
          <View style={{ marginTop: Spacing.sm }}>
            <Button title="Annuler" onPress={() => router.back()} variant="secondary" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
      paddingTop: 50,
    },
    title: {
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      color: themeColors.text,
      fontSize: FontSizes.title,
      fontWeight: 'bold',
    },
    card: {
      backgroundColor: themeColors.card,
      borderRadius: 16,
      padding: Spacing.lg,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    label: {
      fontSize: FontSizes.body,
      color: themeColors.text,
      marginBottom: Spacing.sm,
      fontWeight: 'bold',
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: Spacing.md,
      borderRadius: 12,
      marginBottom: Spacing.md,
      backgroundColor: themeColors.background,
      color: themeColors.text,
      fontSize: FontSizes.body,
    },
    textArea: {
      height: 150,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginBottom: Spacing.md,
      backgroundColor: themeColors.background,
    },
    buttonContainer: {
      marginTop: Spacing.md,
    },
  });
}