import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { auth } from "../service/firebase";
import { useTheme } from "../service/themeContext";

const DashboardTemplate = ({ children }: { children: React.ReactNode }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDarkMode } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const slideAnim = new Animated.Value(menuOpen ? 0 : -250);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    Animated.timing(slideAnim, {
      toValue: menuOpen ? -250 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // const handleLogout = async () => {
  //   await auth.signOut(); // Sign out user
  //   navigation.dispatch(
  //     CommonActions.reset({
  //       index: 0,
  //       routes: [{ name: 'Login' }], // Navigate back to Login screen
  //     })
  //   );
  // };

  // Add this function to your settings component or dashboard components
  const handleLogout = async () => {
    try {
      // Clear auth token and other stored data
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("tokenExpiry");
      await AsyncStorage.removeItem("uid");
      await AsyncStorage.removeItem("userType");

      // Sign out from Firebase
      await auth.signOut();

      // Navigate to landing page and reset navigation stack
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "LandingPage" }],
        })
      );
    } catch (error) {
      console.error("Error during logout:", error);
      Alert.alert("Error", "Failed to log out completely.");
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
      >
        <Pressable onPress={toggleMenu} style={styles.closeButton}>
          <Text style={styles.icon}>&#x2715;</Text>
        </Pressable>
        <TouchableOpacity
          onPress={async () => {
            const userType = await AsyncStorage.getItem('userType');
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: userType === 'driver' ? 'DriverDashboard' : 'Dashboard' }],
              })
            );
          }}
        >
          <Text style={styles.menuItem}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>navigation.navigate('AnalyticsScreen')}>
          <Text style={styles.menuItem}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async() => {
            const userType = await AsyncStorage.getItem('userType');
            if(userType === 'driver') {
              navigation.navigate("DriverSettings");
            }
            navigation.navigate("Settings");
          }}
        >
          <Text style={styles.menuItem}>Settings</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={toggleMenu}>
          <Text style={styles.icon}>&#9776;</Text>
        </Pressable>
        <Text style={styles.topBarText}>RideWise</Text>
        <Pressable onPress={() => setProfileOpen(!profileOpen)}>
          <Text style={styles.icon}>&#128100;</Text>
        </Pressable>
      </View>

      {/* Profile Dropdown */}
      {profileOpen && (
        <View style={styles.profileDropdown}>
        {/* make change for profile */}
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.profileText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>{children}</View>
    </View>
  );
};

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#f9f9f9",
      flex: 1,
    },
    sidebar: {
      position: "absolute",
      left: 0,
      top: 0,
      height: "100%",
      width: 250,
      backgroundColor: isDarkMode ? "#1e1e1e" : "white",
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 15,
      zIndex: 1,
    },
    closeButton: {
      marginBottom: 16,
    },
    icon: {
      fontSize: 24,
      color: isDarkMode ? "#f9fafb" : "black",
    },
    menuItem: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
      color: isDarkMode ? "#e5e7eb" : "#1f2937",
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: isDarkMode ? "#2563eb" : "#3b82f6",
    },
    topBarText: {
      color: "white",
      fontSize: 18,
      fontWeight: "bold",
    },
    profileDropdown: {
      position: "absolute",
      right: 16,
      top: 64,
      backgroundColor: isDarkMode ? "#2a2a2a" : "white",
      padding: 16,
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 15,
      zIndex: 1,
    },
    profileText: {
      fontSize: 18,
      fontWeight: "600",
      color: isDarkMode ? "#f3f4f6" : "#111827",
    },
    logoutText: {
      fontSize: 16,
      color: "red",
      marginTop: 8,
    },
    mainContent: {
      flex: 1,
      padding: 16,
      backgroundColor: isDarkMode ? "#121212" : "#ffffff",
    },
  });

export default DashboardTemplate;
