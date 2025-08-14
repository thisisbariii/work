import { registerRootComponent } from 'expo';
import { View, Text } from 'react-native';

function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>App is working!</Text>
    </View>
  );
}

registerRootComponent(App);