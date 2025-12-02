import { useState, useMemo } from 'react';
import { View, TextInput, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useColorScheme, Pressable } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing, FontSizes } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useToast } from '@/context/ToastContext';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { Picker } from '@react-native-picker/picker';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState('');
  const [university, setUniversity] = useState('2I');
  const [academicYear, setAcademicYear] = useState('');
  const [pole, setPole] = useState('');
  const [filiere, setFiliere] = useState('');
  const [option, setOption] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => getStyles(colorScheme), [colorScheme]);

  const handlePoleChange = (itemValue) => {
    setPole(itemValue);
    if (itemValue === 'commerce' || itemValue === 'droit') {
      setFiliere('');
    }
  };

  const isFiliereDisabled = pole === 'commerce' || pole === 'droit';

  async function signUpWithEmail() {
    if (!fullName || !level || !email || !password || !university || !academicYear || !pole || (pole === 'polytechnique' && !filiere) || !option || !phoneNumber || !gender) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          level,
          university,
          academic_year: academicYear,
          pole,
          filiere,
          option,
          phone_number: phoneNumber,
          gender,
        },
        emailRedirectTo: Linking.createURL('/login'),
      },
    });
    if (error) {
      Alert.alert("Erreur lors de l'inscription", error.message);
      showToast("Erreur lors de l'inscription", 'error');
    } else if (!data.session) {
      Alert.alert('Inscription réussie', 'Veuillez vérifier votre boîte de réception pour valider votre email.');
      showToast('Vérifiez votre email pour valider votre compte', 'info');
      router.push('/login');
    } else {
      showToast('Inscription réussie !', 'success');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={{flex: 1, justifyContent: 'center'}}>
          <View style={styles.logoContainer}>
            <Feather name="user-plus" size={50} color={styles.header.color} />
          </View>

          <ThemedText type="title" style={styles.header}>Créer un compte</ThemedText>

          <View style={styles.card}>
            <TextInput placeholder="Nom complet" value={fullName} onChangeText={setFullName} style={styles.input} placeholderTextColor={styles.input.placeholderTextColor} />
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor={styles.input.placeholderTextColor} />
                        <View style={styles.passwordContainer}>
              <TextInput placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} style={styles.passwordInput} placeholderTextColor={styles.input.placeholderTextColor} />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={styles.input.placeholderTextColor} />
              </Pressable>
            </View>
            <TextInput placeholder="Numéro de téléphone" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" style={styles.input} placeholderTextColor={styles.input.placeholderTextColor} />
            
            <View style={styles.pickerContainer}>
              <Picker selectedValue={gender} onValueChange={(itemValue) => setGender(itemValue)} style={styles.picker} dropdownIconColor={styles.picker.color}>
                <Picker.Item label="Sexe" value="" />
                <Picker.Item label="Homme" value="homme" />
                <Picker.Item label="Femme" value="femme" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker selectedValue={university} onValueChange={(itemValue) => setUniversity(itemValue)} style={styles.picker} dropdownIconColor={styles.picker.color} enabled={false}>
                <Picker.Item label="Université" value="" />
                <Picker.Item label="Université Marien Ngouabi (UMNG)" value="umng" />
                <Picker.Item label="École Supérieure d'Administration des Affaires (ESAA)" value="esaa" />
                <Picker.Item label="Université Libre du Congo (ULC)" value="ulc" />
                <Picker.Item label="École Supérieure de Gestion et d'Administration des Entreprises (ESGAE)" value="esgae" />
                <Picker.Item label="École Supérieure de Technologie (Brazzaville)" value="estb" />
                <Picker.Item label="Haute École de Gestion (HEG-Brazza)" value="heg-brazza" />
                <Picker.Item label="Henri Lopes" value="henri_lopes" />
                <Picker.Item label="ECAM" value="ecam" />
                <Picker.Item label="EMEC" value="emec" />
                <Picker.Item label="DGC" value="dgc" />
                <Picker.Item label="Sueco" value="sueco" />
                <Picker.Item label="EAD" value="ead" />
                <Picker.Item label="ISTC" value="istc" />
                <Picker.Item label="Loango" value="loango" />
                
                <Picker.Item label="Hemip-Haute Ecole De Management Et D'ingenierie (HEMIP)" value="hemip" />
                <Picker.Item label="Leonard de Vinci" value="leonard_de_vinci" />
                <Picker.Item label="UCAC" value="ucac" />
                <Picker.Item label="IFIM - Informatique (IFIM)" value="ifim" />
                <Picker.Item label="IHEM-ISTI" value="ihem-isti" />
                <Picker.Item label="Institut Comptalia Training I.C.T. (ICT)" value="ict" />
                <Picker.Item label="IUT-FACOB" value="iut-facob" />
                <Picker.Item label="Insitut International 2i" value="2I" />
                <Picker.Item label="SUECO" value="SC" />
                <Picker.Item label="ISTC" value="ISTC" />
                <Picker.Item label="Estam" value="EM" />
                <Picker.Item label="DGC" value="DGC" />
                <Picker.Item label="EAD" value="EAD" />
                <Picker.Item label="École Supérieure de Technologie du Littoral (EST-Littoral)" value="est-littoral" />
                <Picker.Item label="Institut Supérieur de Technologie d'Afrique Centrale (ISTAC)" value="istac" />
                <Picker.Item label="Institut Ucac-Icam" value="ucac-icam" />
                <Picker.Item label="IUT-AC (Institut Universitaire de Technologie d'Afrique Centrale)" value="iut-ac" />
              </Picker>
            </View>

            <TextInput placeholder="Année Académique" value={academicYear} onChangeText={setAcademicYear} style={styles.input} placeholderTextColor={styles.input.placeholderTextColor} />

            <View style={styles.pickerContainer}>
              <Picker selectedValue={pole} onValueChange={handlePoleChange} style={styles.picker} dropdownIconColor={styles.picker.color}>
                
                <Picker.Item label="Polytechnique" value="polytechnique" />
                <Picker.Item label="Commerce" value="commerce" />
                <Picker.Item label="Droit" value="droit" />    
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker selectedValue={filiere} onValueChange={(itemValue) => setFiliere(itemValue)} style={styles.picker} dropdownIconColor={styles.picker.color} enabled={!isFiliereDisabled}>
                <Picker.Item label="Filière" value="" />
                <Picker.Item label="Génie Informatique" value="gi" />
                <Picker.Item label="Génie Mécanique" value="gm" />
                <Picker.Item label="Génie Electrique" value="ge" />
                <Picker.Item label="Génie industriel" value="gi" />
                <Picker.Item label="Génie civil" value="gc" />
                <Picker.Item label="Geosciences" value="gs" />
              </Picker>
            </View>
            {isFiliereDisabled && (
              <ThemedText style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>
                aller choisis votre option la fonction filière est bloqué
              </ThemedText>
            )}

            <View style={styles.pickerContainer}>
              <Picker selectedValue={option} onValueChange={(itemValue) => setOption(itemValue)} style={styles.picker} dropdownIconColor={styles.picker.color}>
                <Picker.Item label="Option" value="" />
                <Picker.Item label="Génie Logiciel" value="gl" />
                <Picker.Item label="Réseaux et Télécommunications" value="rt" />
                <Picker.Item label="Développement Informatique" value="di" />
                <Picker.Item label="Intelligence Artificielle" value="ia" />
                <Picker.Item label="Maintenance Industrielle" value="mi" />
                <Picker.Item label="Electromecanique" value="em" />
                <Picker.Item label="Mécatronique" value="m" />
                <Picker.Item label="Electrotechnique" value="et" />
                <Picker.Item label="Automatisme et Informatique industrielle" value="aii" />
                <Picker.Item label="Automatisme et instrumentation" value="ai" />
                <Picker.Item label="Génie des procedés/ Genie chimique" value="gp/gc" />
                <Picker.Item label="Génie des procédés alimentaire" value="gpa" />
                <Picker.Item label="Qualité hygiène décurité & environnement" value="qhse" />
                <Picker.Item label="Raffinage & pétrochimie" value="rp" />
                <Picker.Item label="Bâtiment & travaux publics" value="btp" />
                <Picker.Item label="Architecture & urbanisation" value="au" />
                <Picker.Item label="Géomètre et topographe" value="gt" />
                <Picker.Item label="Mines & carrières" value="mc" />
                <Picker.Item label="Génie pétrolier" value="gp" />
                <Picker.Item label="Génie géologique de hydro systèmes" value="gghs" />
                <Picker.Item label="Géophysique" value="ge" />
                <Picker.Item label="Géotechnique & géologie appliquée" value="gga" />
                <Picker.Item label="Gestion de l'environnement " value="ge" />
                <Picker.Item label="Management commercial Opérationnel" value="mco" />
                <Picker.Item label="Comptabilité&Gestion entreprise" value="cge" />
                <Picker.Item label="Transit& Commerce International" value="tci" />
                <Picker.Item label="Gestions Des Resources Humaines" value="grh" />
                <Picker.Item label="Banke & Finance & assurances" value="bf" />
                <Picker.Item label="Business Trade & Marketing" value="btm" />
                <Picker.Item label="Marketing digital & Communication" value="mdc" />
                <Picker.Item label="Comptabilité é finances" value="cf" />
                <Picker.Item label="Transport & Logistique" value="TL" />
                <Picker.Item label="Economie Pétrolière" value="ep" />
                <Picker.Item label="Assistant De Manager" value="am" />
                <Picker.Item label="Diplomatie & Relations Internationales" value="dri" />
                <Picker.Item label="Sciences Politiques" value="sp" />
                <Picker.Item label="Droit Des Affaires" value="da" />
                <Picker.Item label="Droit Public" value="dp" />
                <Picker.Item label="Droit Privé" value="Dv" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker selectedValue={level} onValueChange={(itemValue) => setLevel(itemValue)} style={styles.picker} dropdownIconColor={styles.picker.color}>
                
                <Picker.Item label="Licence 1" value="L1" />
                <Picker.Item label="Licence 2" value="L2" />
                <Picker.Item label="Licence 3" value="L3" />
              </Picker>
            </View>
            
            <Button title={loading ? 'Création...' : "S'inscrire"} onPress={signUpWithEmail} disabled={loading} />
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <ThemedText style={styles.dividerText}>Ou</ThemedText>
            <View style={styles.divider} />
          </View>

          <Button title="J'ai déjà un compte" onPress={() => router.push('/login')} variant="secondary" />
        </View>
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>Créé par KANG JINHUYK</ThemedText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => {
  const themeColors = Colors[colorScheme];
  return StyleSheet.create({
    keyboardView: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, paddingVertical: Spacing.xl },
    logoContainer: { alignItems: 'center', marginBottom: Spacing.lg },
    header: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.lg, color: themeColors.primary, fontFamily: Fonts.rounded },
    card: { backgroundColor: themeColors.card, borderRadius: 16, padding: Spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 5 },
    input: { height: 52, backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.border, borderRadius: 12, paddingHorizontal: Spacing.md, marginBottom: Spacing.md, fontSize: FontSizes.body, color: themeColors.text, placeholderTextColor: themeColors.textSecondary },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.background,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginBottom: Spacing.md,
    },
    passwordInput: {
      flex: 1,
      height: 52,
      paddingHorizontal: Spacing.md,
      fontSize: FontSizes.body,
      color: themeColors.text,
    },
    eyeIcon: {
      padding: Spacing.md,
    },
    pickerContainer: {
      backgroundColor: themeColors.background,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      marginBottom: Spacing.md,
      height: 52,
      justifyContent: 'center',
    },
    picker: {
      height: 52,
      color: themeColors.text,
    },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
    divider: { flex: 1, height: 1, backgroundColor: themeColors.border },
    dividerText: { marginHorizontal: Spacing.md, color: themeColors.textSecondary },
    footer: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    footerText: {
      fontSize: FontSizes.caption,
      color: themeColors.textSecondary,
    },
  });
};