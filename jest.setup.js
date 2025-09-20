// Mock de React Native
jest.mock(
  'react-native/Libraries/Animated/NativeAnimatedHelper',
  () => ({}),
  { virtual: true }
);

// Mock de AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock de react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

// Mock de expo modules
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `healing-forest://${path}`),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve())
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    MD5: 'MD5'
  },
  digestStringAsync: jest.fn((algo, str) => Promise.resolve('mocked-hash'))
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([]))
}));

// Mock de Supabase
jest.mock('./src/lib/supabase', () => {
  const createQueryBuilder = () => {
    const builder = {
      select: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      neq: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      match: jest.fn(() => builder),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return builder;
  };

  return {
    supabase: {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
      },
      from: jest.fn(() => createQueryBuilder()),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }
  };
});

// Mock de Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    finish: jest.fn()
  })),
  getCurrentHub: jest.fn(() => ({
    getScope: jest.fn(() => ({
      setSpan: jest.fn()
    }))
  })),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn()
}));

// Mock de navegación
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      push: jest.fn(),
      replace: jest.fn()
    }),
    useFocusEffect: jest.fn(),
    useRoute: () => ({
      params: {}
    })
  };
});

// Variables de entorno para tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_PAYU_TEST = 'true';
process.env.EXPO_PUBLIC_PAYU_MERCHANT_ID = '508029';
process.env.EXPO_PUBLIC_PAYU_ACCOUNT_ID = '512321';
process.env.EXPO_PUBLIC_PAYU_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_PAYU_API_LOGIN = 'test-api-login';
process.env.EXPO_PUBLIC_PAYU_PUBLIC_KEY = 'test-public-key';
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

// Configuración global para tests
global.__DEV__ = true;

// Silence console durante tests (opcional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
