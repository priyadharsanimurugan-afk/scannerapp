// authForm.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { loginStyles } from '@/components/styles/loginStyles';
import { colors } from '../constants/colors';

interface AuthFormsProps {
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPass: string;
  setLoginPass: (pass: string) => void;
  showLoginPass: boolean;
  setShowLoginPass: (show: boolean) => void;
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
  forgotEmail: string;
  setForgotEmail: (email: string) => void;
  activeTab: 'login' | 'signup';
  showForgot: boolean;
  remember: boolean;
  setRemember: (remember: boolean) => void;
  loading: { login: boolean; signup: boolean };
  setActiveTab: (tab: 'login' | 'signup') => void;
  setShowForgot: (show: boolean) => void;
  handleLogin: () => void;
  handleSignup: () => void;
  handleForgot: () => void;
  checkStrength: (val: string) => void;
  fieldErrors: Record<string, string[]>;
  clearFieldError: (field: string) => void;
userNameRef: React.RefObject<TextInput | null>;
loginPassRef: React.RefObject<TextInput | null>;
signupUserNameRef: React.RefObject<TextInput | null>;
signupPhoneRef: React.RefObject<TextInput | null>;
signupEmailRef: React.RefObject<TextInput | null>;
signupPassRef: React.RefObject<TextInput | null>;
confirmPassRef: React.RefObject<TextInput | null>;
forgotEmailRef: React.RefObject<TextInput | null>;

  handleFieldChange: (field: string) => void;
}

const SpinningLoader = ({ size = 18, color = colors.navy }) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [spinValue]);
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Icon name="refresh-outline" size={size} color={color} />
    </Animated.View>
  );
};

export const AuthForms: React.FC<AuthFormsProps> = ({
  loginEmail, setLoginEmail,
  loginPass, setLoginPass,
  showLoginPass, setShowLoginPass,
  userName, setUserName,
  phoneNumber, setPhoneNumber,
  signupEmail, setSignupEmail,
  signupPass, setSignupPass,
  confirmPass, setConfirmPass,
  showSignupPass, setShowSignupPass,
  showConfirmPass, setShowConfirmPass,
  passStrength,
  forgotEmail, setForgotEmail,
  activeTab, showForgot, remember, setRemember,
  loading, setActiveTab, setShowForgot,
  handleLogin, handleSignup, handleForgot,
  checkStrength,
  fieldErrors,
  clearFieldError,
  userNameRef,
  loginPassRef,
  signupUserNameRef,
  signupPhoneRef,
  signupEmailRef,
  signupPassRef,
  confirmPassRef,
  forgotEmailRef,
  handleFieldChange,
}) => {
  const handleInputChange = (setter: (value: string) => void, value: string, fieldName: string) => {
    setter(value);
    if (fieldErrors[fieldName]) {
      clearFieldError(fieldName);
    }
    handleFieldChange(fieldName);
  };

  const getFieldError = (field: string): string | null => {
    const errors = fieldErrors[field];
    return errors && errors.length > 0 ? errors[0] : null;
  };

  const renderLoginForm = () => {
    const userNameError = getFieldError('UserName') || getFieldError('username');
    const passwordError = getFieldError('Password') || getFieldError('password');
    
    return (
      <View>
        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>User Name</Text>
          <View style={[
            loginStyles.inputWrap,
            userNameError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="person-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={userNameRef}
              style={loginStyles.input}
              placeholder="Enter username"
              placeholderTextColor={colors.inputPlaceholder}
              value={userName}
              onChangeText={(text) => handleInputChange(setUserName, text, 'UserName')}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => loginPassRef.current?.focus()}
            />
          </View>
          {userNameError && (
            <Text style={loginStyles.errorText}>{userNameError}</Text>
          )}
        </View>

        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Password</Text>
          <View style={[
            loginStyles.inputWrap,
            passwordError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="lock-closed-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={loginPassRef}
              style={loginStyles.input}
              placeholder="Enter password"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showLoginPass}
              value={loginPass}
              onChangeText={(text) => handleInputChange(setLoginPass, text, 'Password')}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowLoginPass(!showLoginPass)}>
              <Icon name={showLoginPass ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {passwordError && (
            <Text style={loginStyles.errorText}>{passwordError}</Text>
          )}
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
          style={[loginStyles.btn, loading.login && loginStyles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading.login}>
          {loading.login ? (
            <><SpinningLoader size={18} color={colors.navy} /><Text style={loginStyles.btnText}>Signing in...</Text></>
          ) : (
            <><Icon name="log-in-outline" size={18} color={colors.navy} /><Text style={loginStyles.btnText}>Sign In</Text></>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('signup')}>
          <Text style={loginStyles.switchLink}>Don't have an account? Create one →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSignupForm = () => {
    const userNameError = getFieldError('UserName') || getFieldError('username');
    const phoneError = getFieldError('PhoneNumber') || getFieldError('phonenumber');
    const emailError = getFieldError('Email') || getFieldError('email');
    const passwordError = getFieldError('Password') || getFieldError('password');
    const confirmError = getFieldError('ConfirmPassword') || getFieldError('confirmpassword');
    
    return (
      <View>
        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>User Name</Text>
          <View style={[
            loginStyles.inputWrap,
            userNameError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="person-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={signupUserNameRef}
              style={loginStyles.input}
              placeholder="Enter username"
              placeholderTextColor={colors.inputPlaceholder}
              value={userName}
              onChangeText={(text) => handleInputChange(setUserName, text, 'UserName')}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => signupPhoneRef.current?.focus()}
            />
          </View>
          {userNameError && (
            <Text style={loginStyles.errorText}>{userNameError}</Text>
          )}
        </View>

        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Phone Number</Text>
          <View style={[
            loginStyles.inputWrap,
            phoneError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="call-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={signupPhoneRef}
              style={loginStyles.input}
              keyboardType="phone-pad"
              maxLength={10}
              onChangeText={(text) => handleInputChange(setPhoneNumber, text.replace(/[^0-9]/g, ""), 'PhoneNumber')}
              placeholder="9876543210"
              placeholderTextColor={colors.inputPlaceholder}
              value={phoneNumber}
              returnKeyType="next"
              onSubmitEditing={() => signupEmailRef.current?.focus()}
            />
          </View>
          {phoneError && (
            <Text style={loginStyles.errorText}>{phoneError}</Text>
          )}
        </View>

        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}> Email Id</Text>
          <View style={[
            loginStyles.inputWrap,
            emailError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="mail-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={signupEmailRef}
              style={loginStyles.input}
              placeholder="Enter email"
              placeholderTextColor={colors.inputPlaceholder}
              value={signupEmail}
              onChangeText={(text) => handleInputChange(setSignupEmail, text, 'Email')}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => signupPassRef.current?.focus()}
            />
          </View>
          {emailError && (
            <Text style={loginStyles.errorText}>{emailError}</Text>
          )}
        </View>

        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Password</Text>
          <View style={[
            loginStyles.inputWrap,
            passwordError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="lock-closed-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={signupPassRef}
              style={loginStyles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showSignupPass}
              value={signupPass}
              onChangeText={(val) => {
                handleInputChange(setSignupPass, val, 'Password');
                checkStrength(val);
              }}
              returnKeyType="next"
              onSubmitEditing={() => confirmPassRef.current?.focus()}
            />
            <TouchableOpacity onPress={() => setShowSignupPass(!showSignupPass)}>
              <Icon name={showSignupPass ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {passwordError && (
            <Text style={loginStyles.errorText}>{passwordError}</Text>
          )}
          <View style={loginStyles.strengthRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[loginStyles.strengthBar, i <= passStrength && loginStyles.strengthActive]} />
            ))}
          </View>
        </View>

        <View style={loginStyles.inputGroup}>
          <Text style={loginStyles.label}>Confirm Password</Text>
          <View style={[
            loginStyles.inputWrap,
            confirmError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="shield-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={confirmPassRef}
              style={loginStyles.input}
              placeholder="Repeat password"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showConfirmPass}
              value={confirmPass}
              onChangeText={(text) => handleInputChange(setConfirmPass, text, 'ConfirmPassword')}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
            <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
              <Icon name={showConfirmPass ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {confirmError && (
            <Text style={loginStyles.errorText}>{confirmError}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[loginStyles.btn, loading.signup && loginStyles.btnDisabled]}
          onPress={handleSignup}
          disabled={loading.signup}>
          {loading.signup ? (
            <><SpinningLoader size={18} color={colors.navy} /><Text style={loginStyles.btnText}>Creating account...</Text></>
          ) : (
            <><Icon name="person-add-outline" size={18} color={colors.navy} /><Text style={loginStyles.btnText}>Create Account</Text></>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('login')}>
          <Text style={loginStyles.switchLink}>Already have an account? Sign in →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderForgotForm = () => {
    const emailError = getFieldError('Email') || getFieldError('email');
    
    return (
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
          <View style={[
            loginStyles.inputWrap,
            emailError && { borderColor: '#E24B4A' }
          ]}>
            <Icon name="mail-outline" size={16} color={colors.muted} style={loginStyles.inputIcon} />
            <TextInput
              ref={forgotEmailRef}
              style={loginStyles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={forgotEmail}
              onChangeText={(text) => handleInputChange(setForgotEmail, text, 'Email')}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleForgot}
            />
          </View>
          {emailError && (
            <Text style={loginStyles.errorText}>{emailError}</Text>
          )}
        </View>

        <TouchableOpacity style={loginStyles.btn} onPress={handleForgot}>
          <Icon name="paper-plane-outline" size={18} color={colors.navy} />
          <Text style={loginStyles.btnText}>Send Reset Link</Text>
        </TouchableOpacity>
      </View>
    );
  };

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