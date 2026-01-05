import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, View, useColorScheme as useRNColorScheme, TouchableOpacity, Platform, Pressable } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { ClassSchedule } from '@/types/database';

const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

type Schedule = {
  id?: string; 
  day: number;
  startTime: Date;
  endTime: Date;
};

export default function EditCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useRNColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const themeColors = Colors[colorScheme];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showPicker, setShowPicker] = useState<{show: boolean, index: number, type: 'start' | 'end'}>({show: false, index: -1, type: 'start'});

  useEffect(() => {
    const fetchCourseAndSchedules = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
        if (error) throw error;
        if (data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
        }

        const { data: scheduleData, error: scheduleError } = await supabase.from('class_schedules').select('*').eq('course_id', id);
        if (scheduleError) throw scheduleError;
        if (scheduleData) {
          const loadedSchedules = scheduleData.map((s: ClassSchedule) => {
            const [startH, startM] = s.start_time.split(':').map(Number);
            const [endH, endM] = s.end_time.split(':').map(Number);
            const startTime = new Date();
            startTime.setHours(startH, startM, 0);
            const endTime = new Date();
            endTime.setHours(endH, endM, 0);
            return { id: s.id, day: s.day_of_week, startTime, endTime };
          });
          setSchedules(loadedSchedules);
        }

      } catch (error: any) {
        Alert.alert('Erreur', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndSchedules();
  }, [id]);

    const addSchedule = () => {
        setSchedules([...schedules, { day: 1, startTime: new Date(), endTime: new Date() }]);
    };

    const removeSchedule = (index: number) => {
        const newSchedules = [...schedules];
        newSchedules.splice(index, 1);
        setSchedules(newSchedules);
    };

    const handleScheduleChange = (index: number, field: keyof Schedule, value: any) => {
        const newSchedules = [...schedules];
        newSchedules[index] = { ...newSchedules[index], [field]: value };
        setSchedules(newSchedules);
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        const { index, type } = showPicker;
        setShowPicker({ show: Platform.OS === 'ios', index, type });
        if (selectedDate) {
            handleScheduleChange(index, type === 'start' ? 'startTime' : 'endTime', selectedDate);
        }
    };

  const handleUpdate = async () => {
    if (!id) return;
    if (!title) {
      Alert.alert('Erreur', 'Le titre est obligatoire.');
      return;
    }

    try {
      setLoading(true);
      const { error: courseError } = await supabase
        .from('courses')
        .update({ title, description })
        .eq('id', id);
      if (courseError) throw courseError;

      const { data: oldSchedules, error: fetchOldError } = await supabase.from('class_schedules').select('id').eq('course_id', id);
      if(fetchOldError) console.error("Error fetching old schedules:", fetchOldError.message);
      else {
        for (const oldSchedule of oldSchedules) {
            await Notifications.cancelScheduledNotificationAsync(oldSchedule.id);
        }
      }
      
      const { error: deleteError } = await supabase.from('class_schedules').delete().eq('course_id', id);
      if(deleteError) throw deleteError;

      for (const schedule of schedules) {
        const { data: newSchedule, error: scheduleError } = await supabase.from('class_schedules').insert({
          course_id: id,
          day_of_week: schedule.day,
          start_time: schedule.startTime.toTimeString().slice(0, 8),
          end_time: schedule.endTime.toTimeString().slice(0, 8),
        }).select('id').single();

        if (scheduleError) {
            console.error("Error saving new schedule:", scheduleError.message);
            continue;
        }

        if(newSchedule) {
            try {
                const reminderTime = new Date(schedule.startTime);
                reminderTime.setMinutes(reminderTime.getMinutes() - 15);
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Rappel de cours',
                        body: `Votre cours de "${title}" commence dans 15 minutes.`,
                    },
                    trigger: {
                        weekday: schedule.day + 1,
                        hour: reminderTime.getHours(),
                        minute: reminderTime.getMinutes(),
                        repeats: true,
                    },
                    identifier: newSchedule.id
                });
            } catch(e) {
                console.error('Error scheduling notification:', e);
            }
        }
      }

      Alert.alert('Succès', 'La matière a été mise à jour.');
      router.back();
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
      <ThemedText type="title" style={styles.title}>Modifier la matière</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>Titre de la matière</ThemedText>
        <TextInput
          placeholder="Titre de la matière"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={themeColors.textSecondary}
        />
        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={themeColors.textSecondary}
        />

        <ThemedText style={styles.label}>Emploi du temps</ThemedText>
        {schedules.map((schedule, index) => (
            <View key={index} style={styles.scheduleContainer}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <ThemedText style={styles.scheduleTitle}>Séance {index + 1}</ThemedText>
                    <Pressable onPress={() => removeSchedule(index)}>
                        <Feather name="x-circle" size={22} color={themeColors.destructive} />
                    </Pressable>
                </View>
                <Picker selectedValue={schedule.day} onValueChange={(itemValue) => handleScheduleChange(index, 'day', itemValue)} style={styles.picker} itemStyle={{ color: themeColors.text }}>
                    {daysOfWeek.map((day, i) => <Picker.Item key={i} label={day} value={i} />)}
                </Picker>
                <View style={styles.timeRow}>
                    <TouchableOpacity onPress={() => setShowPicker({show: true, index, type: 'start'})} style={styles.timeButton}>
                        <ThemedText>Début: {schedule.startTime.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowPicker({show: true, index, type: 'end'})} style={styles.timeButton}>
                        <ThemedText>Fin: {schedule.endTime.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        ))}
        {showPicker.show && (
            <DateTimePicker
                value={showPicker.type === 'start' ? schedules[showPicker.index].startTime : schedules[showPicker.index].endTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
            />
        )}
        <Button title="Ajouter une séance" onPress={addSchedule} variant="outline" />

        <View style={{marginTop: Spacing.lg}}>
            <Button title={loading ? 'Enregistrement...' : 'Enregistrer les modifications'} onPress={handleUpdate} disabled={loading} />
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
      marginTop: Spacing.md,
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
    scheduleContainer: {
        borderWidth: 1,
        borderColor: themeColors.border,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    scheduleTitle: {
        fontSize: FontSizes.body,
        fontWeight: 'bold',
        marginBottom: Spacing.md,
        color: themeColors.text,
    },
    picker: {
        marginBottom: Spacing.md,
        color: themeColors.text,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeButton: {
        borderWidth: 1,
        borderColor: themeColors.border,
        padding: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: Spacing.xs,
        backgroundColor: themeColors.background,
    },
  });
}
