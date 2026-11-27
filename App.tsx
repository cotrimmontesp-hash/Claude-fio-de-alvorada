import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Jogo from './src/Jogo';

// O jogo (motor 3D em WebGL2) roda dentro de uma WebView no celular e de um iframe no site.
export default function App() {
  return (
    <View style={styles.tela}>
      <StatusBar hidden />
      <Jogo />
    </View>
  );
}

const styles = StyleSheet.create({ tela: { flex: 1, backgroundColor: '#0d0b0a' } });
