import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';

type LocationPickerParams = {
  latitude?: number;
  longitude?: number;
  which?: string;
  onLocationSelect?: (lat: number, long: number) => void;
};

const LocationPicker = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    latitude = 26.4757, // fallback to IIT Jodhpur coordinates
    longitude = 73.1146,
    which,
    onLocationSelect
  } = (route.params as LocationPickerParams) || {};

  const [lat, setLatitude] = useState(latitude);
  const [long, setLongitude] = useState(longitude);

  const handleSaveLocation = () => {
    if (onLocationSelect) {
      onLocationSelect(lat, long);
    }
    navigation.goBack();
  };

  const isValidCoord = (val: number): boolean => typeof val === 'number' && !isNaN(val);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: lat,
          longitude: long,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        }}
        scrollEnabled
        zoomEnabled
        onPress={(e) => {
          setLatitude(e.nativeEvent.coordinate.latitude);
          setLongitude(e.nativeEvent.coordinate.longitude);
        }}
      >
        {
          isValidCoord(lat) && isValidCoord(long) && (
            <Marker
              draggable
              coordinate={{
                latitude: lat,
                longitude: long,
              }}
              title="IIT Jodhpur"
              description="NH-62, Rajasthan"
              onDragEnd={e => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                console.log('New location:', latitude, longitude);
                setLatitude(latitude);
                setLongitude(longitude);
              }}
            />
          )
        }
      </MapView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveLocation}>
          <Text style={styles.saveButtonText}>
            Set {which === "start" ? "Start" : "End"} Location
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LocationPicker;
