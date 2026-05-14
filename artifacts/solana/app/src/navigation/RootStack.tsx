import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabs';
import {
  ChallengeDetailScreen,
  CreateChallengeScreen,
  MeditationScreen,
  ExercisesScreen,
  NFTCollectionScreen,
  GovernanceScreen,
} from '../screens';

export type RootStackParamList = {
  Main: undefined;
  ChallengeDetail: { pda: string };
  CreateChallenge: undefined;
  Meditation: undefined;
  Exercises: undefined;
  NFTs: undefined;
  Governance: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} />
      <Stack.Screen name="Meditation" component={MeditationScreen} />
      <Stack.Screen name="Exercises" component={ExercisesScreen} />
      <Stack.Screen name="NFTs" component={NFTCollectionScreen} />
      <Stack.Screen name="Governance" component={GovernanceScreen} />
    </Stack.Navigator>
  );
};
