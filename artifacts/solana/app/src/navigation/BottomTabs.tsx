import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';

import { DashboardScreen } from '../screens/Dashboard';
import { StakingScreen } from '../screens/Staking';
import { ProfileScreen } from '../screens/Profile';
import {
  ChallengesScreen,
  CoachScreen,
  HistoryScreen,
} from '../screens';

export type BottomTabParamList = {
  Home: undefined;
  Challenges: undefined;
  Coach: undefined;
  History: undefined;
  Staking: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.tabBar.active,
        tabBarInactiveTintColor: Colors.tabBar.inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: string;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Challenges':
              iconName = focused ? 'flash' : 'flash-outline';
              break;
            case 'Coach':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Staking':
              iconName = focused ? 'lock-closed' : 'lock-closed-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle';
          }
          return <Icon name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} options={{ tabBarLabel: 'Battles' }} />
      <Tab.Screen name="Coach" component={CoachScreen} options={{ tabBarLabel: 'Coach' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'History' }} />
      <Tab.Screen name="Staking" component={StakingScreen} options={{ tabBarLabel: 'Stake' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};
