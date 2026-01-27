import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

const Layout = () => {
  if (Platform.OS === 'android') {
    return (
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: '#0F0F0F', borderTopColor: '#1A1A1A' },
          tabBarIcon: ({ color, size }) => {
            const iconName =
              route.name === 'index'
                ? 'home-variant'
                : route.name === 'exercises'
                  ? 'brain'
                  : route.name === 'trends'
                    ? 'chart-bar'
                    : 'cog';
            return <MaterialCommunityIcons name={iconName} size={size ?? 22} color={color} />;
          },
        })}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="trainingCalendar" options={{ title: 'Training Calendar' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
      </Tabs>
    );
  } else {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <Icon
                sf={{ default: 'house', selected: 'house.fill' }}
                androidSrc={<VectorIcon family={MaterialCommunityIcons} name="home-variant" />}
                />
                <Label hidden>Home</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="trainingCalendar">
                <Icon
                sf={{ default: 'calendar', selected: 'calendar' }}
                androidSrc={<VectorIcon family={MaterialCommunityIcons} name="brain" />}
                />
                <Label hidden>Training Calendar</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="progress">
                <Icon
                sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
                androidSrc={<VectorIcon family={MaterialCommunityIcons} name="chart-bar" />}
                />
                <Label hidden>Progress</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="history">
                <Icon
                sf={{ default: 'clock.arrow.trianglehead.counterclockwise.rotate.90', selected: 'clock.arrow.trianglehead.counterclockwise.rotate.90' }}
                androidSrc={<VectorIcon family={MaterialCommunityIcons} name="cog" />}
                />
                <Label hidden>History</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
  }
}

export default Layout