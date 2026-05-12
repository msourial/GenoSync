import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

// Screens
import { DashboardScreen } from '../screens/Dashboard';
import { StakingScreen } from '../screens/Staking';
import { NFTCollectionScreen } from '../screens/NFTCollection';
import { GovernanceScreen } from '../screens/Governance';
import { ProfileScreen } from '../screens/Profile';
import { HistoryScreen } from '../screens/History';

export type BottomTabParamList = {
  Home: undefined;
  History: undefined;
  Staking: undefined;
  NFTs: undefined;
  Governance: undefined;
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
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Staking':
              iconName = focused ? 'lock-closed' : 'lock-closed-outline';
              break;
            case 'NFTs':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
            case 'Governance':
              iconName = focused ? 'people' : 'people-outline';
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
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Staking"
        component={StakingScreen}
        options={{ tabBarLabel: 'Stake' }}
      />
      <Tab.Screen
        name="NFTs"
        component={NFTCollectionScreen}
        options={{ tabBarLabel: 'NFTs' }}
      />
      <Tab.Screen
        name="Governance"
        component={GovernanceScreen}
        options={{ tabBarLabel: 'DAO' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
