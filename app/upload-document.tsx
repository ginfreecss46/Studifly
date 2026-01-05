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

export default function UploadDocumentScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [title, setTitle] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
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
      setSelectedFile(result);
    }
  };

  const handleUpload = async () => {
    if (!session) return Alert.alert('Erreur', 'Session non trouvée.');
    if (!title) return Alert.alert('Erreur', 'Le titre est obligatoire.');
    if (!selectedFile || selectedFile.canceled) return Alert.alert('Erreur', 'Veuillez sélectionner un fichier.');

    try {
      setLoading(true);
      const file = selectedFile.assets[0];
      
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const filePath = `public/${selectedCourse || 'general'}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: file.mimeType,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      if (!urlData) throw new Error("Impossible d'obtenir l'URL publique du fichier.");

      const { error: dbError } = await supabase.from('documents').insert({
        title,
        course_id: selectedCourse,
        user_id: session.user.id,
        file_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      Alert.alert('Succès', 'Le document a été uploadé.');
      router.back();

    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Uploader un document</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Titre du document</ThemedText>
        <TextInput
          placeholder="Ex: Résumé du chapitre 5"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
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

        <Button title="Choisir un fichier" onPress={pickDocument} variant="secondary" />
        {selectedFile && !selectedFile.canceled && (
          <ThemedText style={styles.fileName}>Fichier: {selectedFile.assets[0].name}</ThemedText>
        )}

        <View style={styles.buttonContainer}>
          <Button title={loading ? 'Upload en cours...' : 'Uploader'} onPress={handleUpload} disabled={loading} />
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
    pickerContainer: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginBottom: Spacing.md,
      backgroundColor: themeColors.background,
    },
    fileName: {
      textAlign: 'center',
      marginVertical: Spacing.md,
      color: themeColors.text,
      fontSize: FontSizes.body,
    },
    buttonContainer: {
      marginTop: Spacing.lg,
    },
  });
}