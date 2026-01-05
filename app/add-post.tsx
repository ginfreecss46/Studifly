import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/database';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, View, ScrollView, useColorScheme as useRNColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function AddPostScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!session) return;
      const { data } = await supabase
        .from('user_courses')
        .select('courses(*)')
        .eq('user_id', session.user.id);

      if (data) {
        const userCourses = data.map(item => item.courses).filter((c): c is Course => c !== null && typeof c === 'object');
        setCourses(userCourses);
      }
    };
    fetchUserCourses();
  }, [session]);

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled) {
      setDocument(result);
    }
  };

  const handleSave = async () => {
    console.log('handleSave called');
    if (!session) return Alert.alert('Erreur', 'Vous devez être connecté pour publier un message.');
    if (!title) return Alert.alert('Erreur', 'Le titre du message est obligatoire.');
    if (!content.trim()) return Alert.alert('Erreur', 'Le contenu du message ne peut pas être vide.');

    console.log('Guard clauses passed');

    try {
      setLoading(true);
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (document && !document.canceled) {
        console.log('Document found, preparing for upload');
        const file = document.assets[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${session.user.id}/${new Date().getTime()}.${fileExt}`;

        console.log('Fetching file from URI:', file.uri);
        const response = await fetch(file.uri);
        console.log('File fetched');
        const arrayBuffer = await response.arrayBuffer();
        console.log('ArrayBuffer created');

        console.log('Uploading to Supabase Storage');
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, arrayBuffer, {
            contentType: file.mimeType || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw uploadError;
        }
        console.log('Upload successful');

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
        fileName = file.name;
      }

      const { data: postData, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          title,
          content,
          course_id: selectedCourse,
          user_id: session.user.id,
        })
        .select('id')
        .single();

      if (postError) throw postError;

      if (fileUrl && fileName && postData) {
        const { error: docError } = await supabase.from('documents').insert({
          title: fileName,
          file_url: fileUrl,
          user_id: session.user.id,
          course_id: selectedCourse,
          post_id: postData.id,
        });

        if (docError) throw docError;
      }

      Alert.alert('Succès', 'Votre message a été publié.');
      router.back();
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Nouveau message</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Titre</ThemedText>
        <TextInput
          placeholder="Sujet de votre message"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={themeColors.textSecondary}
        />

        <ThemedText style={styles.label}>Contenu</ThemedText>
        <TextInput
          placeholder="Posez votre question en détail ici..."
          value={content}
          onChangeText={setContent}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={themeColors.textSecondary}
        />

        <ThemedText style={styles.label}>Matière</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCourse}
            onValueChange={(itemValue) => setSelectedCourse(itemValue)}
            dropdownIconColor={themeColors.icon}
            style={{ color: themeColors.text }}
          >
            <Picker.Item label="Aucune matière spécifique" value={undefined} />
            {courses.map(course => <Picker.Item key={course.id} label={course.title || 'Sans titre'} value={course.id} />)}
          </Picker>
        </View>

        <ThemedText style={styles.label}>Pièce jointe</ThemedText>
        <Button title="Choisir un document" onPress={pickDocument} variant="secondary" />
        {document && !document.canceled && (
          <ThemedText style={styles.documentName}>{document.assets[0].name}</ThemedText>
        )}

        <View style={styles.buttonContainer}>
          <Button title={loading ? 'Publication...' : 'Publier'} onPress={handleSave} disabled={loading} />
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
    documentName: {
      marginTop: Spacing.sm,
      color: themeColors.textSecondary,
    },
  });
}