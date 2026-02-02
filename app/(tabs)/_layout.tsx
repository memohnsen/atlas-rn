import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useThemeColor } from 'heroui-native';
import { Platform } from 'react-native';

const Layout = () => {
    const androidTabBackground = useThemeColor('background');
    const androidTabIndicatorColor = useThemeColor('blue-energy');

  return (
      <NativeTabs
        backgroundColor={Platform.OS === 'android' ? androidTabBackground : ''}
        indicatorColor={Platform.OS === 'android' ? androidTabIndicatorColor : ''}
      >
          <NativeTabs.Trigger name="index">
              <Icon
              sf={{ default: 'house', selected: 'house.fill' }}
              androidSrc={<VectorIcon family={MaterialCommunityIcons} name="home-variant" />}
              />
              {Platform.OS === 'android' ? <Label>Home</Label> : <Label hidden /> }
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="trainingCalendar">
              <Icon
              sf={{ default: 'calendar', selected: 'calendar' }}
              androidSrc={<VectorIcon family={MaterialCommunityIcons} name="brain" />}
              />
              {Platform.OS === 'android' ? <Label>Training</Label> : <Label hidden /> }
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="progress">
              <Icon
              sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
              androidSrc={<VectorIcon family={MaterialCommunityIcons} name="chart-bar" />}
              />
              {Platform.OS === 'android' ? <Label>Progress</Label> : <Label hidden /> }
          </NativeTabs.Trigger>
          {/* <NativeTabs.Trigger name="history">
              <Icon
              sf={{ default: 'clock.arrow.trianglehead.counterclockwise.rotate.90', selected: 'clock.arrow.trianglehead.counterclockwise.rotate.90' }}
              androidSrc={<VectorIcon family={MaterialCommunityIcons} name="cog" />}
              />
              {Platform.OS === 'android' ? <Label>History</Label> : <Label hidden /> }
          </NativeTabs.Trigger> */}
      </NativeTabs>
  );
}

export default Layout