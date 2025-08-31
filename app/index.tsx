import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { registerRootComponent } from 'expo';
import App from '../src/App';

registerRootComponent(App);
export default function Page() {
  return (
    <App/>
    )
}