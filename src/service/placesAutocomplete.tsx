import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { View } from "react-native";

const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"; // Replace with your actual API key

const PlacesAutocomplete = ({ placeholder, onPlaceSelected }) => {
  return (
    <View style={{ flex: 1 }}>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        fetchDetails={true} // Ensures we get full details of the selected place
        onPress={(data, details = null) => {
          if (details) {
            onPlaceSelected({
              address: details.formatted_address,
              lat: details.geometry?.location?.lat || 0, // Prevents undefined errors
              lng: details.geometry?.location?.lng || 0,
            });
          }
        }}
        query={{
          key: GOOGLE_API_KEY,
          language: "en",
          components: "country:in", // Optional: Restricts search to India
        }}
        debounce={200} // Reduces API calls
        minLength={2} // Only search after 2+ characters
        enablePoweredByContainer={false} // Hides 'Powered by Google'
        styles={{
          textInput: {
            height: 50,
            borderRadius: 5,
            paddingHorizontal: 10,
            backgroundColor: "#f1f1f1",
          },
          listView: {
            backgroundColor: "white",
            borderRadius: 5,
            marginHorizontal: 10,
            elevation: 3,
          },
        }}
      />
    </View>
  );
};

export default PlacesAutocomplete;
