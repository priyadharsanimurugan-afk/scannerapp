import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { loginStyles } from '@/components/styles/loginStyles';
import { colors } from '../constants/colors';

interface AuthFormsProps {
  // Login props
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPass: string;
  setLoginPass: (pass: string) => void;
  showLoginPass: boolean;
  setShowLoginPass: (show: boolean) => void;
  
  // Signup props - UPDATED
  userName: string;
  setUserName: (name: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  signupEmail: string;
  setSignupEmail: (email: string) => void;
  signupPass: string;
  setSignupPass: (pass: string) => void;
  confirmPass: string;
  setConfirmPass: (pass: string) => void;
  showSignupPass: boolean;
  setShowSignupPass: (show: boolean) => void;
  showConfirmPass: boolean;
  setShowConfirmPass: (show: boolean) => void;
  passStrength: number;
  
  // Forgot props
  forgotEmail: string;
  setForgotEmail: (email: string) => void;
  
  // UI props
  activeTab: 'login' | 'signup';
  showForgot: boolean;
  remember: boolean;
  setRemember: (remember: boolean) => void;
  loading: { login: boolean; signup: boolean };
  
  // Functions
  setActiveTab: (tab: 'login' | 'signup') => void;
  setShowForgot: (show: boolean) => void;
  handleLogin: () => void;
  handleSignup: () => void;
  handleForgot: () => void;

  checkStrength: (val: string) => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({
  // Login
  loginEmail, setLoginEmail,
  loginPass, setLoginPass,
  showLoginPass, setShowLoginPass,
  
  // Signup - UPDATED with proper names
  userName, setUserName,
  phoneNumber, setPhoneNumber,
  signupEmail, setSignupEmail,
  signupPass, setSignupPass,
  confirmPass, setConfirmPass,
  showSignupPass, setShowSignupPass,
  showConfirmPass, setShowConfirmPass,
  passStrength,
  
  // Forgot
  forgotEmail, setForgotEmail,
  
  // UI
  activeTab, showForgot, remember, setRemember,
  loading, setActiveTab, setShowForgot,
  
  // Functions
  handleLogin, handleSignup, handleForgot,
  checkStrength,
}) => {
  
  const renderSignupForm = () => (
    <View>
      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>User Name</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="person-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="your name"
            placeholderTextColor={colors.inputPlaceholder}
            value={userName}
            onChangeText={setUserName}
          />
        </View>
      </View>

      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Phone Number</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="call-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            keyboardType="phone-pad"
              maxLength={10}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, ""); // allow only digits
                  setPhoneNumber(cleaned);
                }}
            placeholder="9876543210"
            placeholderTextColor={colors.inputPlaceholder}
            value={phoneNumber}
         
          />
        </View>
      </View>

      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Work Email</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="mail-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="you@company.com"
            placeholderTextColor={colors.inputPlaceholder}
            value={signupEmail}
            onChangeText={setSignupEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Password</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="lock-closed-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="Min. 8 characters"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry={!showSignupPass}
            value={signupPass}
            onChangeText={(val) => { setSignupPass(val); checkStrength(val); }}
          />
          <TouchableOpacity onPress={() => setShowSignupPass(!showSignupPass)}>
            <Icon name={showSignupPass ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <View style={loginStyles.strengthRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[loginStyles.strengthBar, i <= passStrength && loginStyles.strengthActive]} />
          ))}
        </View>
      </View>

      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Confirm Password</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="shield-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="Repeat password"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry={!showConfirmPass}
            value={confirmPass}
            onChangeText={setConfirmPass}
          />
          <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
            <Icon name={showConfirmPass ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={loginStyles.btn}
        onPress={handleSignup}
        disabled={loading.signup}>
        {loading.signup ? (
          <Icon name="refresh-outline" size={18} color={colors.navy} />
        ) : (
          <Icon name="person-add-outline" size={18} color={colors.navy} />
        )}
        <Text style={loginStyles.btnText}>{loading.signup ? 'Creating account...' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setActiveTab('login')}>
        <Text style={loginStyles.switchLink}>Already have an account? Sign in →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoginForm = () => (
    <View>
      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Email Address</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="mail-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.inputPlaceholder}
            value={loginEmail}
            onChangeText={setLoginEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Password</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="lock-closed-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="Enter your password"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry={!showLoginPass}
            value={loginPass}
            onChangeText={setLoginPass}
          />
          <TouchableOpacity onPress={() => setShowLoginPass(!showLoginPass)}>
            <Icon name={showLoginPass ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={loginStyles.options}>
        <TouchableOpacity style={loginStyles.remember} onPress={() => setRemember(!remember)}>
          <View style={[loginStyles.checkbox, remember && loginStyles.checked]}>
            {remember && <Icon name="checkmark" size={12} color={colors.navy} />}
          </View>
          <Text style={loginStyles.rememberText}>Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowForgot(true)}>
          <Text style={loginStyles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={loginStyles.btn}
        onPress={handleLogin}
        disabled={loading.login}>
        {loading.login ? (
          <Icon name="refresh-outline" size={18} color={colors.navy} />
        ) : (
          <Icon name="log-in-outline" size={18} color={colors.navy} />
        )}
        <Text style={loginStyles.btnText}>{loading.login ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setActiveTab('signup')}>
        <Text style={loginStyles.switchLink}>Don't have an account? Create one →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotForm = () => (
    <View>
      <TouchableOpacity style={loginStyles.backLink} onPress={() => setShowForgot(false)}>
        <Icon name="arrow-back-outline" size={16} color={colors.muted} />
        <Text style={loginStyles.backText}>Back to Sign In</Text>
      </TouchableOpacity>
      <View style={loginStyles.forgotIcon}>
        <Icon name="key-outline" size={24} color={colors.amberDark} />
      </View>
      <Text style={loginStyles.forgotTitle}>Forgot Password?</Text>
      <Text style={loginStyles.forgotSub}>No worries! Enter your email and we'll send you a reset link right away.</Text>

      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.label}>Email Address</Text>
        <View style={loginStyles.inputWrap}>
          <Icon name="mail-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
          <TextInput
            style={loginStyles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.inputPlaceholder}
            value={forgotEmail}
            onChangeText={setForgotEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity style={loginStyles.btn} onPress={handleForgot}>
        <Icon name="paper-plane-outline" size={18} color={colors.navy} />
        <Text style={loginStyles.btnText}>Send Reset Link</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={loginStyles.card}>
      {!showForgot ? (
        activeTab === 'login' ? renderLoginForm() : renderSignupForm()
      ) : (
        renderForgotForm()
      )}
    </View>
  );
};