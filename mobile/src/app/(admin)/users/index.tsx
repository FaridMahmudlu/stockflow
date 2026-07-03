import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassBackground } from '../../../components/glass-background';

export default function UsersScreen() {
  return (
    <GlassBackground>
      <View style={styles.container}>
        <Text style={styles.text}>İstifadəçilərin İdarə Edilməsi — Mərhələ 12</Text>
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 24,
  },
  text: { 
    fontSize: 16, 
    color: '#cbd5e1',
    fontWeight: '600',
    textAlign: 'center',
  },
});
