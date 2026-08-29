import { Alert, Platform } from 'react-native';

type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function confirmAction({
  title,
  message,
  confirmLabel,
  destructive = false,
}: ConfirmationOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
