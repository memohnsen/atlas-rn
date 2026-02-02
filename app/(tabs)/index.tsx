import { Card } from 'heroui-native';
import { ScrollView, View } from 'react-native';


export default function BottomSheetExample() {
  return (
    <ScrollView className='bg-background'>
      <View className='mt-20 px-4'>
        <Card>
          <Card.Title>Next Meet</Card.Title>
        </Card>
      </View>
    </ScrollView>
  );
}