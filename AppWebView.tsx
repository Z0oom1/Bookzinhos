import React, { useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

/**
 * Em desenvolvimento: carrega do servidor Vite local.
 * Em produção (APK): carrega o web app bundlado dentro do APK (assets/www/index.html).
 *
 * Para fazer o build de produção:
 *   1. Configure VITE_API_URL com a URL do Railway
 *   2. npm run build:web   (gera repositorio/Bookdahelo/dist/)
 *   3. npm run copy:web    (copia dist/ para android/app/src/main/assets/www/)
 *   4. eas build --platform android --profile production
 */

const IS_DEV = __DEV__;

const DEV_URL =
  Platform.OS === "android" ? "http://10.0.2.2:5173" : "http://localhost:5173";

// No Android, arquivos em android/app/src/main/assets/ ficam acessíveis via file:///android_asset/
const PROD_URL = Platform.OS === "android"
  ? "file:///android_asset/www/index.html"
  : "http://localhost:5173";

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const source = useMemo(() => {
    if (IS_DEV) return { uri: DEV_URL };
    return { uri: PROD_URL };
  }, [reloadKey]);

  if (hasError) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <Text style={styles.title}>Não foi possível abrir o Books da Helo</Text>
        <Text style={styles.body}>
          {IS_DEV
            ? `Certifique-se que o servidor Vite está rodando:\n\`cd repositorio/Bookdahelo && npm run dev\``
            : "Erro ao carregar o app. Tente reinstalar."}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setHasError(false);
            setIsLoading(true);
            setReloadKey((v) => v + 1);
          }}
        >
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        key={reloadKey}
        source={source}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        originWhitelist={["*"]}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8FA98E" />
          <Text style={styles.loadingText}>Carregando Books da Helo...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function AppWebView() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF8F5" },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250,248,245,0.94)",
    gap: 10,
  },
  loadingText: { color: "#2D2D2D", fontWeight: "600" },
  centered: {
    flex: 1,
    backgroundColor: "#FAF8F5",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#2D2D2D", textAlign: "center" },
  body: { color: "#5F5F5F", textAlign: "center", lineHeight: 20 },
  button: {
    marginTop: 10,
    backgroundColor: "#8FA98E",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
