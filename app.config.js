const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "Atlas Dev" : "Atlas",
    slug: "atlas",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/atlas.icon",
    scheme: "atlas",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? "com.memohnsen.atlas.dev"
        : "com.memohnsen.atlas",
      runtimeVersion: "1.0.0",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/atlas_android.png",
        backgroundImage: "./assets/images/atlas_android.png",
        monochromeImage: "./assets/images/atlas_android.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: IS_DEV ? "com.memohnsen.atlas.dev" : "com.memohnsen.atlas",
      runtimeVersion: "1.0.0",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/atlas_android.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "@react-native-community/datetimepicker",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "a7687e59-43ce-4461-b680-94556369a374",
      },
    },
    owner: "memohnsen",
    updates: {
      url: "https://u.expo.dev/a7687e59-43ce-4461-b680-94556369a374",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
  },
};
