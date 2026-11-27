import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';

export default function Jogo() {
  const [uri, setUri] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    (async () => {
      try {
        const arquivo = Asset.fromModule(require('../assets/jogo.html'));
        await arquivo.downloadAsync();
        setUri(arquivo.localUri ?? arquivo.uri);
      } catch (e) {
        setErro(String(e));
      }
    })();
  }, []);

  if (!uri) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator color="#f3d9a0" size="large" />
        <Text style={styles.texto}>{erro ? 'Erro ao abrir o jogo: ' + erro : 'Costurando Orlavento…'}</Text>
      </View>
    );
  }
  return (
    <WebView
      source={{ uri }}
      style={styles.tela}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      overScrollMode="never"
      bounces={false}
    />
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0d0b0a' },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0b0a', gap: 16 },
  texto: { color: '#f3d9a0', fontSize: 18 },
});
