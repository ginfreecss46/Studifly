import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/database';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, View, TouchableOpacity, Platform, ScrollView, useColorScheme as useRNColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function AddScheduleScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [showPicker, setShowPicker] = useState<{show: boolean, type: 'start' | 'end'}>({show: false, type: 'start'});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.date) {
      const date = new Date(params.date as string);
      setDayOfWeek(date.getDay());
      setStartTime(date);
    }
  }, [params.date]);

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!session) return;
      const { data } = await supabase.from('user_courses').select('courses(*)').eq('user_id', session.user.id);
      if (data) {
        const userCourses = data.map(item => item.courses).filter((c): c is Course => c !== null && typeof c === 'object');
        setCourses(userCourses);
        if (userCourses.length > 0) setSelectedCourse(userCourses[0].id);
      }
    };
    fetchUserCourses();
  }, [session]);

  const handleSave = async () => {
    if (!session || !selectedCourse) return Alert.alert('Erreur', 'Veuillez sélectionner une matière.');

    try {
      setLoading(true);
      const { error } = await supabase.from('class_schedules').insert({
        course_id: selectedCourse,
        day_of_week: dayOfWeek,
        start_time: startTime.toTimeString().slice(0, 8),
        end_time: endTime.toTimeString().slice(0, 8),
        location,
      });

      if (error) throw error;
      Alert.alert('Succès', 'L\'horaire a été ajouté.');
      router.back();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || (showPicker.type === 'start' ? startTime : endTime);
    setShowPicker({show: Platform.OS === 'ios', type: showPicker.type});
    if (showPicker.type === 'start') {
      setStartTime(currentDate);
    } else {
      setEndTime(currentDate);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Ajouter un Horaire</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Matière</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCourse}
            onValueChange={(itemValue) => setSelectedCourse(itemValue)}
            dropdownIconColor={themeColors.icon}
            style={{ color: themeColors.text }}
          >
            {courses.map(course => <Picker.Item key={course.id} label={course.title || 'Sans titre'} value={course.id} />)}
          </Picker>
        </View>

        <ThemedText style={styles.label}>Jour de la semaine</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={dayOfWeek}
            onValueChange={(itemValue) => setDayOfWeek(itemValue)}
            dropdownIconColor={themeColors.icon}
            style={{ color: themeColors.text }}
          >
            {daysOfWeek.map((day, index) => <Picker.Item key={index} label={day} value={index} />)}
          </Picker>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeContainer}>
            <ThemedText style={styles.label}>Heure de début</ThemedText>
            <TouchableOpacity onPress={() => setShowPicker({show: true, type: 'start'})} style={styles.timeButton}>
              <ThemedText style={{ color: themeColors.text }}>{startTime.toLocaleTimeString('fr-FR').slice(0, 5)}</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.timeContainer}>
            <ThemedText style={styles.label}>Heure de fin</ThemedText>
            <TouchableOpacity onPress={() => setShowPicker({show: true, type: 'end'})} style={styles.timeButton}>
              <ThemedText style={{ color: themeColors.text }}>{endTime.toLocaleTimeString('fr-FR').slice(0, 5)}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {showPicker.show && (
          <DateTimePicker
            testID="timePicker"
            value={showPicker.type === 'start' ? startTime : endTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onTimeChange}
            textColor={themeColors.text}
          />
        )}

        <ThemedText style={styles.label}>Lieu</ThemedText>
        <TextInput
          placeholder="Ex: Salle B203"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholderTextColor={themeColors.textSecondary}
        />

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
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    timeContainer: {
      flex: 1,
    },
    timeButton: {
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: Spacing.md,
      borderRadius: 12,
      marginBottom: Spacing.md,
      alignItems: 'flex-start',
      backgroundColor: themeColors.background,
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
