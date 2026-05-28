import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/database';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, View, TouchableOpacity, Platform, ScrollView, useColorScheme as useRNColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function AddAssignmentScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!session) return;
      const { data } = await supabase
        .from('user_courses')
        .select('courses(*)')
        .eq('user_id', session.user.id);

      if (data) {
        const userCourses = data.map(item => item.courses).flat().filter((c): c is Course => c !== null && typeof c === 'object');
        setCourses(userCourses);
        if (userCourses.length > 0) {
          setSelectedCourse(userCourses[0].id);
        }
      }
    };
    fetchUserCourses();

    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission de notification', 'Veuillez activer les notifications pour recevoir des rappels de devoirs.');
      }
    })();
  }, [session]);

  const handleSave = async () => {
    if (!session) return Alert.alert('Erreur', 'Session non trouvée.');
    if (!title || !selectedCourse) return Alert.alert('Erreur', 'Titre et matière sont obligatoires.');

    try {
      setLoading(true);
      const { data: newAssignment, error } = await supabase.from('assignments').insert({
        title,
        description,
        course_id: selectedCourse,
        user_id: session.user.id,
        due_date: dueDate.toISOString(),
      }).select().single();

      if (error) throw error;

      if (newAssignment) {
        const secondsUntilDue = (dueDate.getTime() - new Date().getTime()) / 1000;
        if (secondsUntilDue > 0) {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Rappel de devoir",
              body: `N'oubliez pas votre devoir: ${title} pour le ${dueDate.toLocaleDateString('fr-FR')}`,
            },
            trigger: { date: dueDate },
          });
          console.log('Notification scheduled with ID:', notificationId);
        }
      }

      Alert.alert('Succès', 'Le devoir a été ajouté et une notification a été planifiée.');
      router.back();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowDatePicker(Platform.OS === 'ios' ? false : true);
    setDueDate(currentDate);
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Ajouter un devoir</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Matière</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCourse}
            onValueChange={(itemValue: string) => setSelectedCourse(itemValue)}
            dropdownIconColor={themeColors.icon}
            style={{ color: themeColors.text }}
          >
            {courses.map(course => <Picker.Item key={course.id} label={course.title || 'Sans titre'} value={course.id} />)}
          </Picker>
        </View>

        <ThemedText style={styles.label}>Titre du devoir</ThemedText>
        <TextInput
          placeholder="Ex: Rendre le projet de maths"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={themeColors.textSecondary}
        />

        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          placeholder=""
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={themeColors.textSecondary}
        />

        <ThemedText style={styles.label}>Date d&apos;échéance</ThemedText>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
          <ThemedText style={{ color: themeColors.text }}>{dueDate.toLocaleDateString('fr-FR')}</ThemedText>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={dueDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
            textColor={themeColors.text}
          />
        )}

        <View style={styles.buttonContainer}>
          <Button title={loading ? 'Enregistrement...' : 'Enregistrer'} onPress={handleSave} disabled={loading} />
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
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 5,
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
      height: 100,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginBottom: Spacing.md,
      backgroundColor: themeColors.background,
    },
    dateButton: {
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: Spacing.md,
      borderRadius: 12,
      marginBottom: Spacing.md,
      alignItems: 'flex-start',
      backgroundColor: themeColors.background,
    },
    buttonContainer: {
      marginTop: Spacing.md,
    },
  });
}
