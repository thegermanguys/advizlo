import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OnboardingProfileScreen from '../screens/onboarding/OnboardingProfileScreen';
import OnboardingPricingScreen from '../screens/onboarding/OnboardingPricingScreen';
import OnboardingAvailabilityScreen from '../screens/onboarding/OnboardingAvailabilityScreen';
import OnboardingPayoutsScreen from '../screens/onboarding/OnboardingPayoutsScreen';
import OnboardingVideoScreen from '../screens/onboarding/OnboardingVideoScreen';
import BrowseScreen from '../screens/BrowseScreen';
import ConsultantDetailScreen from '../screens/ConsultantDetailScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Sign up' }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Advizlo' }} />
        <Stack.Screen
          name="OnboardingProfile"
          component={OnboardingProfileScreen}
          options={{ title: 'Your profile' }}
        />
        <Stack.Screen
          name="OnboardingPricing"
          component={OnboardingPricingScreen}
          options={{ title: 'Pricing' }}
        />
        <Stack.Screen
          name="OnboardingAvailability"
          component={OnboardingAvailabilityScreen}
          options={{ title: 'Availability' }}
        />
        <Stack.Screen
          name="OnboardingPayouts"
          component={OnboardingPayoutsScreen}
          options={{ title: 'Payouts' }}
        />
        <Stack.Screen
          name="OnboardingVideo"
          component={OnboardingVideoScreen}
          options={{ title: 'Video' }}
        />
        <Stack.Screen name="Browse" component={BrowseScreen} options={{ title: 'Find a consultant' }} />
        <Stack.Screen
          name="ConsultantDetail"
          component={ConsultantDetailScreen}
          options={{ title: 'Book a consultation' }}
        />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My bookings' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
