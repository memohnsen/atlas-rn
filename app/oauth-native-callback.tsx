import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

const OAuthNativeCallback = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(tabs)");
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
};

export default OAuthNativeCallback;
