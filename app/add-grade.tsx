import { ThemedText } from '@/components/themed-text';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Assignment } from '@/types/database';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { TextInput, Button, StyleSheet, Alert, View, ScrollView, useColorScheme as useRNColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/theme';

export default function AddGradeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | undefined>();
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!session) return;
      const { data: userCourses, error: userCoursesError } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', session.user.id);

      if (userCoursesError || !userCourses) return;

      const courseIds = userCourses.map((uc) => uc.course_id);

      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .in('course_id', courseIds);

      if (assignmentsData) {
        setAssignments(assignmentsData);
        if (assignmentsData.length > 0) {
          setSelectedAssignment(assignmentsData[0].id);
        }
      }
    };
    fetchAssignments();
  }, [session]);

  const handleSave = async () => {
    if (!session) return Alert.alert('Erreur', 'Session non trouvée.');
    if (!selectedAssignment || !grade) return Alert.alert('Erreur', 'Devoir et note sont obligatoires.');

    const numericGrade = parseFloat(grade.replace(',', '.'));
    if (isNaN(numericGrade)) return Alert.alert('Erreur', 'La note doit être un nombre.');

    try {
      setLoading(true);
      const { data: newGrade, error } = await supabase.from('grades').insert({
        assignment_id: selectedAssignment,
        user_id: session.user.id,
        grade: numericGrade,
      }).select().single();

      if (error) throw error;

      if (newGrade) {
        const { error: notificationError } = await supabase.functions.invoke('new-grade-notification', {
          body: { record: newGrade },
        });
        if (notificationError) console.warn('Grade notification failed:', notificationError.message);
      }

      Alert.alert('Succès', 'La note a été ajoutée.');
      router.back();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Ajouter une note</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Devoir</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedAssignment}
            onValueChange={(itemValue) => setSelectedAssignment(itemValue)}
            dropdownIconColor={Colors[colorScheme].icon} // For Android
            style={{ color: Colors[colorScheme].text }} // For iOS
          >
            {assignments.map(assignment => <Picker.Item key={assignment.id} label={assignment.title} value={assignment.id} />)}
          </Picker>
        </View>

        <ThemedText style={styles.label}>Note</ThemedText>
        <TextInput
          placeholder="Ex: 15.5"
          value={grade}
          onChangeText={setGrade}
          style={styles.input}
          keyboardType="numeric"
          placeholderTextColor={Colors[colorScheme].icon}
        />

        <View style={styles.buttonContainer}>
          <Button title={loading ? 'Enregistrement...' : 'Enregistrer'} onPress={handleSave} disabled={loading} color={Colors[colorScheme].tint} />
          <View style={{ marginTop: 10 }}>
            <Button title="Annuler" onPress={() => router.back()} color={Colors[colorScheme].icon} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
    paddingTop: 50,
  },
  title: {
    marginBottom: 20,
    paddingHorizontal: 16,
    color: Colors[colorScheme].text,
  },
  card: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colorScheme === 'light' ? 0.08 : 0.2,
    shadowRadius: 8,
    elevation: colorScheme === 'light' ? 3 : 5,
    borderWidth: colorScheme === 'dark' ? StyleSheet.hairlineWidth : 0,
    borderColor: colorScheme === 'dark' ? Colors[colorScheme].border : 'transparent',
  },
  label: {
    fontSize: 16,
    color: Colors[colorScheme].text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: Colors[colorScheme].background,
    color: Colors[colorScheme].text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: Colors[colorScheme].background,
  },
  buttonContainer: {
    marginTop: 20,
  },
});
