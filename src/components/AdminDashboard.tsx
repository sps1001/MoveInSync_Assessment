import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../service/themeContext';
import { auth, db } from '../service/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { rideSharingService } from '../service/rideSharingService';
import { notificationService } from '../service/notificationService';

interface RideShareData {
  id: string;
  rideId: string;
  userId: string;
  userName: string;
  shareType: string;
  status: string;
  createdAt: Date;
  metadata: {
    from: string;
    to: string;
    driverName?: string;
    rideStatus: string;
  };
  analytics: {
    views: number;
    clicks: number;
    shares: number;
  };
}

interface FeedbackData {
  id: string;
  userId: string;
  userName: string;
  rideId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  category: string;
}

interface AdminStats {
  totalRides: number;
  totalShares: number;
  activeShares: number;
  totalFeedback: number;
  averageRating: number;
  popularDestinations: Array<{ location: string; count: number }>;
}

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rideShares, setRideShares] = useState<RideShareData[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'shares' | 'feedback'>('overview');

  useEffect(() => {
    checkAdminAccess();
    loadDashboardData();
  }, []);

  const checkAdminAccess = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Access Denied', 'Please log in to access admin dashboard');
        return;
      }

      const userDoc = await getDocs(
        query(collection(db, 'users'), where('uid', '==', auth.currentUser.uid))
      );

      if (userDoc.empty) {
        Alert.alert('Access Denied', 'User not found');
        return;
      }

      const userData = userDoc.docs[0].data();
      if (userData.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin access required');
        return;
      }

      console.log('✅ Admin access verified');
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadRideShares(),
        loadFeedback(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total rides
      const ridesSnapshot = await getDocs(collection(db, 'history'));
      const totalRides = ridesSnapshot.size;

      // Get total shares
      const sharesSnapshot = await getDocs(collection(db, 'rideShares'));
      const totalShares = sharesSnapshot.size;
      const activeShares = sharesSnapshot.docs.filter(doc => doc.data().status === 'active').length;

      // Get total feedback
      const feedbackSnapshot = await getDocs(collection(db, 'feedback'));
      const totalFeedback = feedbackSnapshot.size;

      // Calculate average rating
      let totalRating = 0;
      let ratingCount = 0;
      feedbackSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.rating) {
          totalRating += data.rating;
          ratingCount++;
        }
      });
      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // Get popular destinations
      const destinations = new Map<string, number>();
      sharesSnapshot.forEach(doc => {
        const data = doc.data();
        const dest = data.metadata?.to || 'Unknown';
        destinations.set(dest, (destinations.get(dest) || 0) + 1);
      });

      const popularDestinations = Array.from(destinations.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalRides,
        totalShares,
        activeShares,
        totalFeedback,
        averageRating,
        popularDestinations,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRideShares = async () => {
    try {
      const q = query(
        collection(db, 'rideShares'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const shares: RideShareData[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          shares.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as RideShareData);
        });
        setRideShares(shares);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading ride shares:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      const q = query(
        collection(db, 'feedback'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const feedbackData: FeedbackData[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          feedbackData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as FeedbackData);
        });
        setFeedback(feedbackData);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderStatsCard = (title: string, value: string | number, subtitle?: string) => (
    <View style={[styles.statsCard, isDarkMode && styles.darkStatsCard]}>
      <Text style={[styles.statsValue, isDarkMode && styles.darkText]}>{value}</Text>
      <Text style={[styles.statsTitle, isDarkMode && styles.darkText]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statsSubtitle, isDarkMode && styles.darkSubtitle]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderRideShareItem = ({ item }: { item: RideShareData }) => (
    <View style={[styles.card, isDarkMode && styles.darkCard]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
          {item.metadata.from} → {item.metadata.to}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={[styles.cardSubtitle, isDarkMode && styles.darkSubtitle]}>
        Shared by: {item.userName} via {item.shareType}
      </Text>
      
      <Text style={[styles.cardSubtitle, isDarkMode && styles.darkSubtitle]}>
        Driver: {item.metadata.driverName || 'Not assigned'}
      </Text>
      
      <View style={styles.analyticsRow}>
        <Text style={[styles.analyticsText, isDarkMode && styles.darkSubtitle]}>
          👁️ {item.analytics.views} views
        </Text>
        <Text style={[styles.analyticsText, isDarkMode && styles.darkSubtitle]}>
          🔗 {item.analytics.clicks} clicks
        </Text>
        <Text style={[styles.analyticsText, isDarkMode && styles.darkSubtitle]}>
          📤 {item.analytics.shares} shares
        </Text>
      </View>
      
      <Text style={[styles.cardDate, isDarkMode && styles.darkSubtitle]}>
        {item.createdAt.toLocaleDateString()}
      </Text>
    </View>
  );

  const renderFeedbackItem = ({ item }: { item: FeedbackData }) => (
    <View style={[styles.card, isDarkMode && styles.darkCard]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
          {item.userName}
        </Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text key={star} style={styles.star}>
              {star <= item.rating ? '⭐' : '☆'}
            </Text>
          ))}
        </View>
      </View>
      
      <Text style={[styles.cardSubtitle, isDarkMode && styles.darkSubtitle]}>
        Category: {item.category}
      </Text>
      
      <Text style={[styles.feedbackComment, isDarkMode && styles.darkText]}>
        {item.comment}
      </Text>
      
      <Text style={[styles.cardDate, isDarkMode && styles.darkSubtitle]}>
        {item.createdAt.toLocaleDateString()}
      </Text>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'expired': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.darkBackground]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
          Loading admin dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkBackground]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Admin Dashboard
        </Text>
        <Text style={[styles.headerSubtitle, isDarkMode && styles.darkSubtitle]}>
          Manage ride shares and user feedback
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shares' && styles.activeTab]}
          onPress={() => setActiveTab('shares')}
        >
          <Text style={[styles.tabText, activeTab === 'shares' && styles.activeTabText]}>
            Ride Shares
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feedback' && styles.activeTab]}
          onPress={() => setActiveTab('feedback')}
        >
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.activeTabText]}>
            Feedback
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && stats && (
          <View>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              {renderStatsCard('Total Rides', stats.totalRides)}
              {renderStatsCard('Total Shares', stats.totalShares)}
              {renderStatsCard('Active Shares', stats.activeShares)}
              {renderStatsCard('Total Feedback', stats.totalFeedback)}
            </View>

            {/* Average Rating */}
            <View style={[styles.ratingCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.ratingTitle, isDarkMode && styles.darkText]}>
                Average User Rating
              </Text>
              <View style={styles.ratingDisplay}>
                <Text style={[styles.ratingValue, isDarkMode && styles.darkText]}>
                  {stats.averageRating.toFixed(1)}
                </Text>
                <Text style={styles.ratingStars}>
                  {'⭐'.repeat(Math.round(stats.averageRating))}
                </Text>
              </View>
            </View>

            {/* Popular Destinations */}
            <View style={[styles.destinationsCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.destinationsTitle, isDarkMode && styles.darkText]}>
                Popular Destinations
              </Text>
              {stats.popularDestinations.map((dest, index) => (
                <View key={index} style={styles.destinationRow}>
                  <Text style={[styles.destinationName, isDarkMode && styles.darkText]}>
                    {dest.location}
                  </Text>
                  <Text style={[styles.destinationCount, isDarkMode && styles.darkSubtitle]}>
                    {dest.count} rides
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'shares' && (
          <View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Recent Ride Shares ({rideShares.length})
            </Text>
            <FlatList
              data={rideShares}
              renderItem={renderRideShareItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {activeTab === 'feedback' && (
          <View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              User Feedback ({feedback.length})
            </Text>
            <FlatList
              data={feedback}
              renderItem={renderFeedbackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkBackground: {
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#3b82f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkStatsCard: {
    backgroundColor: '#1f1f1f',
  },
  statsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 5,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 5,
  },
  ratingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: '#1f1f1f',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  ratingDisplay: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 10,
  },
  ratingStars: {
    fontSize: 24,
  },
  destinationsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  destinationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  destinationName: {
    fontSize: 16,
    color: '#374151',
  },
  destinationCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  analyticsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginLeft: 2,
  },
  feedbackComment: {
    fontSize: 14,
    color: '#374151',
    marginTop: 10,
    marginBottom: 10,
    lineHeight: 20,
  },
  darkText: {
    color: '#f3f4f6',
  },
  darkSubtitle: {
    color: '#9ca3af',
  },
});

export default AdminDashboard;
