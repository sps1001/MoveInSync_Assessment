import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../service/themeContext';
import { companionService } from '../service/companionService';
import { notificationService } from '../service/notificationService';
import { auth } from '../service/firebase';

interface TravelerLink {
  id: string;
  travelerName: string;
  status: string;
  createdAt: Date;
}

interface ActiveTracking {
  id: string;
  travelerName: string;
  rideId: string;
  destination: string;
  status: string;
  startTime: Date;
}

const CompanionDashboard = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLinks: 0,
    activeLinks: 0,
    totalTrackingSessions: 0,
    completedTrackingSessions: 0,
  });
  const [activeLinks, setActiveLinks] = useState<TravelerLink[]>([]);
  const [activeTracking, setActiveTracking] = useState<ActiveTracking[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load companion stats
      const companionStats = await companionService.getCompanionStats();
      setStats(companionStats);

      // Load active links
      const links = companionService.getActiveLinks();
      setActiveLinks(links);

      // Load active tracking
      const tracking = companionService.getActiveTracking();
      setActiveTracking(tracking);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLinkToTraveler = () => {
    navigation.navigate('LinkToTraveler');
  };

  const handleViewTracking = (trackingId: string) => {
    navigation.navigate('CompanionTracking', { trackingId });
  };

  const handleViewRideHistory = () => {
    navigation.navigate('CompanionRideHistory');
  };

  const handleSettings = () => {
    navigation.navigate('CompanionSettings');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'LandingPage' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const renderStatsCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statsCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff' }]}>
      <Text style={styles.statsIcon}>{icon}</Text>
      <Text style={[styles.statsValue, { color: color }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: isDarkMode ? '#cccccc' : '#666666' }]}>{title}</Text>
    </View>
  );

  const renderTravelerLink = ({ item }: { item: TravelerLink }) => (
    <View style={[styles.linkCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff' }]}>
      <View style={styles.linkHeader}>
        <Text style={[styles.travelerName, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
          {item.travelerName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.linkDate, { color: isDarkMode ? '#cccccc' : '#666666' }]}>
        Linked since: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderTrackingItem = ({ item }: { item: ActiveTracking }) => (
    <TouchableOpacity
      style={[styles.trackingCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff' }]}
      onPress={() => handleViewTracking(item.id)}
    >
      <View style={styles.trackingHeader}>
        <Text style={[styles.travelerName, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
          {item.travelerName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.destinationText, { color: isDarkMode ? '#cccccc' : '#666666' }]}>
        🎯 {item.destination}
      </Text>
      <Text style={[styles.trackingTime, { color: isDarkMode ? '#cccccc' : '#666666' }]}>
        Started: {new Date(item.startTime).toLocaleTimeString()}
      </Text>
      <Text style={styles.tapToView}>Tap to view tracking</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={[styles.loadingText, { color: isDarkMode ? '#cccccc' : '#666666' }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Companion Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track your loved ones' journeys</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
            Your Activity
          </Text>
          <View style={styles.statsGrid}>
            {renderStatsCard('Total Links', stats.totalLinks, '👥', '#4CAF50')}
            {renderStatsCard('Active Links', stats.activeLinks, '✅', '#2196F3')}
            {renderStatsCard('Tracking Sessions', stats.totalTrackingSessions, '📍', '#FF9800')}
            {renderStatsCard('Completed', stats.completedTrackingSessions, '🎯', '#9C27B0')}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
            Quick Actions
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleLinkToTraveler}
            >
              <Text style={styles.actionButtonText}>🔗 Link to Traveler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={handleViewRideHistory}
            >
              <Text style={styles.actionButtonText}>📊 Ride History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={handleSettings}
            >
              <Text style={styles.actionButtonText}>⚙️ Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Links */}
        <View style={styles.linksSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
            Linked Travelers ({activeLinks.length})
          </Text>
          {activeLinks.length > 0 ? (
            <FlatList
              data={activeLinks}
              renderItem={renderTravelerLink}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff' }]}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
                No Travelers Linked
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#cccccc' : '#666666' }]}>
                Link to travelers to start tracking their rides
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionButton, { backgroundColor: '#4CAF50' }]}
                onPress={handleLinkToTraveler}
              >
                <Text style={styles.emptyActionButtonText}>Link to Traveler</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Active Tracking */}
        <View style={styles.trackingSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
            Active Tracking ({activeTracking.length})
          </Text>
          {activeTracking.length > 0 ? (
            <FlatList
              data={activeTracking}
              renderItem={renderTrackingItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff' }]}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#333333' }]}>
                No Active Tracking
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#cccccc' : '#666666' }]}>
                When travelers start rides, you'll see them here
              </Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsSection: {
    marginBottom: 25,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statsTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 25,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  linksSection: {
    marginBottom: 25,
  },
  linkCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  travelerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  linkDate: {
    fontSize: 14,
  },
  trackingSection: {
    marginBottom: 25,
  },
  trackingCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  destinationText: {
    fontSize: 16,
    marginBottom: 8,
  },
  trackingTime: {
    fontSize: 14,
    marginBottom: 10,
  },
  tapToView: {
    fontSize: 12,
    color: '#2196F3',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompanionDashboard;
