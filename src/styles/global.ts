import { StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});