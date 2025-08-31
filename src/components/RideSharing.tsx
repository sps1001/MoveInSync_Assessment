import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useTheme } from '../service/themeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { rideSharingService } from '../service/rideSharingService';
import { notificationService } from '../service/notificationService';
import { auth, db } from '../service/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '../service/firebase';

interface RideSharingProps {
  route: {
    params: {
      rideId: string;
    };
  };
}

interface ShareableRideInfo {
  rideId: string;
  from: string;
  to: string;
  driverName?: string;
  driverPhone?: string;
  cabNumber?: string;
  estimatedArrival?: Date;
  rideStatus: string;
  shareMessage: string;
  shareLink: string;
}

const RideSharing: React.FC<RideSharingProps> = ({ route }) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { rideId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [rideInfo, setRideInfo] = useState<ShareableRideInfo | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareType, setShareType] = useState<'whatsapp' | 'sms' | 'link'>('whatsapp');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareHistory, setShareHistory] = useState<any[]>([]);

  useEffect(() => {
    loadRideInfo();
    loadShareHistory();
  }, [rideId]);

  const loadRideInfo = async () => {
    try {
      setLoading(true);
      
      // Get ride info from Realtime DB
      const rideRef = ref(realtimeDb, `rideRequests/${rideId}`);
      const rideSnapshot = await get(rideRef);
      
      if (!rideSnapshot.exists()) {
        Alert.alert('Error', 'Ride not found');
        return;
      }

      const rideData = rideSnapshot.val();
      
      // Get driver info if available
      let driverInfo = {};
      if (rideData.driverId) {
        const driverDoc = await getDoc(doc(db, 'drivers', rideData.driverId));
        if (driverDoc.exists()) {
          driverInfo = driverDoc.data();
        }
      }

      const shareableInfo: ShareableRideInfo = {
        rideId,
        from: rideData.from,
        to: rideData.to,
        driverName: rideData.driverName || driverInfo.username,
        driverPhone: rideData.driverPhone || driverInfo.phone,
        cabNumber: rideData.vehicleInfo?.licensePlate || driverInfo.vehicleInfo?.licensePlate,
        estimatedArrival: rideData.estimatedArrival ? new Date(rideData.estimatedArrival) : undefined,
        rideStatus: rideData.status,
        shareMessage: `🚗 RideWise Trip Update\n\n📍 From: ${rideData.from}\n🎯 To: ${rideData.to}\n👤 Driver: ${rideData.driverName || 'Assigned'}\n📱 Driver Phone: ${rideData.driverPhone || 'N/A'}\n🚙 Cab Number: ${rideData.vehicleInfo?.licensePlate || 'N/A'}\n⏰ ETA: ${rideData.estimatedArrival ? new Date(rideData.estimatedArrival).toLocaleTimeString() : 'Calculating...'}\n📊 Status: ${rideData.status}`,
        shareLink: `https://ridewise.app/track/${rideId}`,
      };

      setRideInfo(shareableInfo);
    } catch (error) {
      console.error('Error loading ride info:', error);
      Alert.alert('Error', 'Failed to load ride information');
    } finally {
      setLoading(false);
    }
  };

  const loadShareHistory = async () => {
    try {
      if (!auth.currentUser) return;
      
      const shares = await rideSharingService.getRideSharesForRide(rideId);
      setShareHistory(shares);
    } catch (error) {
      console.error('Error loading share history:', error);
    }
  };

  const addRecipient = () => {
    if (recipientInput.trim()) {
      setRecipients([...recipients, recipientInput.trim()]);
      setRecipientInput('');
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const shareRide = async () => {
    if (!rideInfo) return;

    try {
      setSharing(true);

      let shareId: string;

      switch (shareType) {
        case 'whatsapp':
          shareId = await rideSharingService.shareRideViaWhatsApp(rideInfo, recipients);
          break;
        case 'sms':
          shareId = await rideSharingService.shareRideViaSMS(rideInfo, recipients);
          break;
        case 'link':
          shareId = await rideSharingService.shareRideViaLink(rideInfo);
          break;
        default:
          throw new Error('Invalid share type');
      }

      // Send notification
      await notificationService.sendLocalNotification(
        '✅ Ride Shared',
        `Your ride has been shared successfully via ${shareType}`,
        { type: 'ride-shared', shareId }
      );

      Alert.alert('Success', `Ride shared successfully via ${shareType}!`);
      setShareModalVisible(false);
      setRecipients([]);
      
      // Reload share history
      await loadShareHistory();
    } catch (error) {
      console.error('Error sharing ride:', error);
      Alert.alert('Error', 'Failed to share ride. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const renderShareHistoryItem = ({ item }: { item: any }) => (
    <View style={[styles.historyCard, isDarkMode && styles.darkHistoryCard]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyType, isDarkMode && styles.darkText]}>
          {item.shareType.toUpperCase()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={[styles.historyDate, isDarkMode && styles.darkSubtitle]}>
        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString()}
      </Text>
      
      {item.recipients.length > 0 && (
        <Text style={[styles.historyRecipients, isDarkMode && styles.darkSubtitle]}>
          Recipients: {item.recipients.join(', ')}
        </Text>
      )}
      
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
          Loading ride information...
        </Text>
      </View>
    );
  }

  if (!rideInfo) {
    return (
      <View style={[styles.errorContainer, isDarkMode && styles.darkBackground]}>
        <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
          Ride information not found
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadRideInfo}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkBackground]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
          Share Ride Details
        </Text>
        <Text style={[styles.headerSubtitle, isDarkMode && styles.darkSubtitle]}>
          Keep your loved ones updated about your trip
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Ride Information Card */}
        <View style={[styles.rideCard, isDarkMode && styles.darkCard]}>
          <Text style={[styles.rideTitle, isDarkMode && styles.darkText]}>
            {rideInfo.from} → {rideInfo.to}
          </Text>
          
          <View style={styles.rideDetails}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Driver:</Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {rideInfo.driverName || 'Not assigned yet'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Phone:</Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {rideInfo.driverPhone || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Cab Number:</Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {rideInfo.cabNumber || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Status:</Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {rideInfo.rideStatus}
              </Text>
            </View>
            
            {rideInfo.estimatedArrival && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>ETA:</Text>
                <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                  {rideInfo.estimatedArrival.toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Share Options */}
        <View style={[styles.shareOptionsCard, isDarkMode && styles.darkCard]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Share Via
          </Text>
          
          <View style={styles.shareButtons}>
            <TouchableOpacity
              style={[styles.shareButton, shareType === 'whatsapp' && styles.activeShareButton]}
              onPress={() => setShareType('whatsapp')}
            >
              <Text style={styles.shareButtonIcon}>📱</Text>
              <Text style={[styles.shareButtonText, shareType === 'whatsapp' && styles.activeShareButtonText]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.shareButton, shareType === 'sms' && styles.activeShareButton]}
              onPress={() => setShareType('sms')}
            >
              <Text style={styles.shareButtonIcon}>💬</Text>
              <Text style={[styles.shareButtonText, shareType === 'sms' && styles.activeShareButtonText]}>
                SMS
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.shareButton, shareType === 'link' && styles.activeShareButton]}
              onPress={() => setShareType('link')}
            >
              <Text style={styles.shareButtonIcon}>🔗</Text>
              <Text style={[styles.shareButtonText, shareType === 'link' && styles.activeShareButtonText]}>
                Link
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.shareNowButton}
            onPress={() => setShareModalVisible(true)}
          >
            <Text style={styles.shareNowButtonText}>Share Now</Text>
          </TouchableOpacity>
        </View>

        {/* Share History */}
        {shareHistory.length > 0 && (
          <View style={[styles.historyCard, isDarkMode && styles.darkCard]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Share History ({shareHistory.length})
            </Text>
            <FlatList
              data={shareHistory}
              renderItem={renderShareHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Share via {shareType.toUpperCase()}
            </Text>
            
            {(shareType === 'whatsapp' || shareType === 'sms') && (
              <View style={styles.recipientsContainer}>
                <Text style={[styles.recipientsLabel, isDarkMode && styles.darkSubtitle]}>
                  Recipients (Phone Numbers):
                </Text>
                
                <View style={styles.recipientsInput}>
                  <TextInput
                    style={[styles.recipientInputField, isDarkMode && styles.darkInputField]}
                    placeholder="Enter phone number"
                    placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                    value={recipientInput}
                    onChangeText={setRecipientInput}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addRecipient}>
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                
                {recipients.length > 0 && (
                  <View style={styles.recipientsList}>
                    {recipients.map((recipient, index) => (
                      <View key={index} style={styles.recipientItem}>
                        <Text style={[styles.recipientText, isDarkMode && styles.darkText]}>
                          {recipient}
                        </Text>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeRecipient(index)}
                        >
                          <Text style={styles.removeButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.shareButton, sharing && styles.disabledButton]}
                onPress={shareRide}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.shareButtonText}>Share</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  rideCard: {
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
  rideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  rideDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  shareOptionsCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 5,
  },
  activeShareButton: {
    backgroundColor: '#3b82f6',
  },
  shareButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeShareButtonText: {
    color: 'white',
  },
  shareNowButton: {
    backgroundColor: '#10b981',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareNowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  historyCard: {
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
  darkHistoryCard: {
    backgroundColor: '#1f1f1f',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  historyRecipients: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  darkModalContent: {
    backgroundColor: '#1f1f1f',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  recipientsContainer: {
    marginBottom: 20,
  },
  recipientsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 10,
  },
  recipientsInput: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  recipientInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#374151',
    marginRight: 10,
  },
  darkInputField: {
    backgroundColor: '#2d2d2d',
    borderColor: '#4b5563',
    color: '#f3f4f6',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  recipientsList: {
    gap: 8,
  },
  recipientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recipientText: {
    fontSize: 14,
    color: '#374151',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  darkText: {
    color: '#f3f4f6',
  },
  darkSubtitle: {
    color: '#9ca3af',
  },
});

export default RideSharing;
