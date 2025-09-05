import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle
} from 'react-native';
import { Colors } from '../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          props.multiline && styles.multilineInput,
          error && styles.inputError,
          style
        ]}
        placeholderTextColor={Colors.text.light}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.ui.surface,
  },
  multilineInput: {
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  inputError: {
    borderColor: Colors.ui.error,
  },
  errorText: {
    fontSize: 14,
    color: Colors.ui.error,
    marginTop: 4,
  },
});