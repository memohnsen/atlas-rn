// BOTTOM SHEET EXAMPLE

import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar, BottomSheet, Button, Card, Dialog, Skeleton, Toast, useToast } from 'heroui-native';
import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { withUniwind } from 'uniwind';

const StyledIonicons = withUniwind(Ionicons);

export default function BottomSheetExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();


  return (
    <ScrollView className='mt-12'>
      <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
        <BottomSheet.Trigger asChild>
          <Button variant="primary">Open Bottom Sheet</Button>
        </BottomSheet.Trigger>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content>
            <View className="items-center mb-5">
              <View className="size-20 items-center justify-center rounded-full bg-green-500/10">
                <StyledIonicons
                  name="shield-checkmark"
                  size={40}
                  className="text-green-500"
                />
              </View>
            </View>
            <View className="mb-8 gap-2 items-center">
              <BottomSheet.Title className="text-center">
                Keep yourself safe
              </BottomSheet.Title>
              <BottomSheet.Description className="text-center">
                Update your software to the latest version for better security and
                performance.
              </BottomSheet.Description>
            </View>
            <View className="gap-3">
              <Button onPress={() => setIsOpen(false)}>Update Now</Button>
              <Button variant="tertiary" onPress={() => setIsOpen(false)}>
                Later
              </Button>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <Dialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Trigger asChild>
          <Button variant="primary" className="mt-10">Open Dialog</Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Close />
            <View className="mb-5 gap-1.5">
              <Dialog.Title>Confirm Action</Dialog.Title>
              <Dialog.Description>
                Are you sure you want to proceed with this action? This cannot be
                undone.
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button size="sm">Confirm</Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <Button
       className="mt-10"
        onPress={() =>
          toast.show({
            variant: 'success',
            label: 'You have upgraded your plan',
            description: 'You can continue using HeroUI Chat',
            actionLabel: 'Close',
            onActionPress: ({ hide }) => hide(),
          })
        }
      >
        Show Success Toast
      </Button>
      <Button
       className="mt-10"
        onPress={() =>
          toast.show({
            component: (props) => (
              <Toast variant="accent" {...props}>
                <Toast.Title>Custom Toast</Toast.Title>
                <Toast.Description>
                  This uses a custom component
                </Toast.Description>
                <Toast.Action onPress={() => props.hide()}>Undo</Toast.Action>
                <Toast.Close className="absolute top-0 right-0" />
              </Toast>
            ),
          })
        }
      >
        Show Custom Toast
      </Button>


      <Card className="p-4 mt-10">
        <View className="flex-row items-center gap-3 mb-4">
          <Skeleton isLoading={isLoading} className="h-10 w-10 rounded-full">
            <Avatar size="sm" alt="Avatar">
              <Avatar.Image source={{ uri: 'https://i.pravatar.cc/150?img=4' }} />
              <Avatar.Fallback />
            </Avatar>
          </Skeleton>
          <View className="flex-1 gap-1">
            <Skeleton isLoading={isLoading} className="h-3 w-32 rounded-md">
              <Text className="font-semibold text-foreground">John Doe</Text>
            </Skeleton>
            <Skeleton isLoading={isLoading} className="h-3 w-24 rounded-md">
              <Text className="text-sm text-muted">@johndoe</Text>
            </Skeleton>
          </View>
        </View>
        <Skeleton
          isLoading={isLoading}
          className="h-48 w-full rounded-lg"
          animation={{
            shimmer: {
              duration: 1500,
              speed: 1,
            },
          }}
        >
          <View className="h-48 bg-surface-tertiary rounded-lg overflow-hidden">
            <Image
              source={{
                uri: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/backgrounds/cards/car1.jpg',
              }}
              className="h-full w-full"
            />
          </View>
        </Skeleton>
      </Card>

      <Card className='mt-10'>
        <View className="gap-4">
          <Card.Body className="mb-4">
            <View className="gap-1 mb-2">
              <Card.Title className="text-pink-500">$450</Card.Title>
              <Card.Title>Living room Sofa • Collection 2025</Card.Title>
            </View>
            <Card.Description>
              This sofa is perfect for modern tropical spaces, baroque inspired
              spaces.
            </Card.Description>
          </Card.Body>
          <Card.Footer className="gap-3">
            <Button variant="primary">Buy now</Button>
            <Button variant="ghost">
              <Button.Label>Add to cart</Button.Label>
              <Ionicons name="bag-outline" size={16} />
            </Button>
          </Card.Footer>
        </View>
      </Card>
    </ScrollView>
  );
}